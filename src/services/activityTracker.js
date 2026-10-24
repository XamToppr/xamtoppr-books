import {
  collection,
  doc,
  arrayUnion,
  increment,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

export const ACTIVITY_COIN_VALUES = Object.freeze({
  daily_login_visit: 10,
  view_book_detail: 5,
  read_sample_pdf: 15,
  enroll_free_course: 0,
  add_to_cart: 20,
  purchase_complete: 50,
  checkout_initiated: 0,
  payment_failed: 0,
  payment_abandoned: 0,
  payment_dropped: 0,
  video_watch: 0
});

const getLocalDate = () => new Date().toLocaleDateString('en-CA');

const getActivityDetails = (details) => ({
  bookId: typeof details.bookId === 'string' ? details.bookId : '',
  bookTitle: typeof details.bookTitle === 'string' ? details.bookTitle : '',
  productType: typeof details.productType === 'string' ? details.productType : 'book',
  courseId: typeof details.courseId === 'string' ? details.courseId : '',
  courseTitle: typeof details.courseTitle === 'string' ? details.courseTitle : ''
});

export async function logCheckoutActivity({
  user: currentUser = auth.currentUser,
  action,
  bookId,
  bookTitle,
  amount,
  phone = '',
  reason,
  productType = 'book',
  courseId = '',
  courseTitle = ''
}) {
  if (!currentUser) return false;

  try {
    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/log-user-activity', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        uid: currentUser.uid,
        action,
        bookId: productType === 'videoCoursePack' ? '' : bookId,
        bookTitle: productType === 'videoCoursePack' ? '' : bookTitle,
        courseId: courseId || (productType === 'videoCoursePack' ? bookId : ''),
        courseTitle: courseTitle || (productType === 'videoCoursePack' ? bookTitle : ''),
        productType,
        amount,
        phone,
        reason,
        firebaseApiKey: auth.app.options.apiKey
      })
    });
    const responseBody = await response.json();
    if (!response.ok) {
      throw new Error(responseBody.error || `Checkout activity logging failed with status ${response.status}.`);
    }
    return true;
  } catch {
    console.error('Unable to log the checkout activity to Student Activity & Leads.');
    return false;
  }
}

export async function logVideoWatchActivity({
  user = auth.currentUser,
  courseId,
  courseTitle,
  videoId,
  videoTitle,
  watchDurationSeconds,
  videoDurationSeconds,
  videoProgressPercent
}) {
  if (!user || !courseId || !videoId || !videoTitle
    || !Number.isFinite(watchDurationSeconds) || watchDurationSeconds < 1) return false;

  try {
    const idToken = await user.getIdToken();
    const response = await fetch('/api/log-user-activity', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        uid: user.uid,
        action: 'video_watch',
        productType: 'videoCoursePack',
        courseId,
        courseTitle,
        videoId,
        videoTitle,
        watchDurationSeconds: Math.round(watchDurationSeconds),
        videoDurationSeconds: Math.round(videoDurationSeconds),
        videoProgressPercent: Math.round(videoProgressPercent),
        firebaseApiKey: auth.app.options.apiKey
      })
    });
    const responseBody = await response.json();
    if (!response.ok) {
      throw new Error(responseBody.error || `Video watch activity logging failed with status ${response.status}.`);
    }
    return true;
  } catch {
    console.error('Unable to log video watch activity to Student Activity & Leads.');
    return false;
  }
}

export async function logUserActivity(actionType, details = {}) {
  const user = auth.currentUser;
  const coinsEarned = ACTIVITY_COIN_VALUES[actionType];
  const verifiedPayment = details.verifiedPayment;
  if (!user || coinsEarned == null
    || (actionType === 'purchase_complete'
      && (!verifiedPayment?.paymentId || !Array.isArray(verifiedPayment.purchases)
        || verifiedPayment.purchases.length === 0))) return false;

  const activityDetails = getActivityDetails(details);
  let courseEnrollment = null;
  if (actionType === 'enroll_free_course') {
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/log-user-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid: user.uid,
          action: actionType,
          ...activityDetails,
          productType: activityDetails.productType,
          phone: typeof details.phone === 'string' ? details.phone : '',
          firebaseApiKey: auth.app.options.apiKey
        })
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw new Error(responseBody.error || `Course enrollment failed with status ${response.status}.`);
      }
      courseEnrollment = responseBody.courseEnrollment || null;
    } catch {
      console.error('Unable to validate and save the free course enrollment.');
      return false;
    }
  }

  const userRef = doc(db, 'users', user.uid);
  const activityRef = doc(collection(db, 'userActivities'));

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const profile = userSnapshot.data() || {};
      if (actionType === 'purchase_complete'
        && (profile.processedPaymentIds || []).includes(verifiedPayment.paymentId)) {
        return { logged: true, totalCoins: Number(profile.totalCoins) || 0, phone: '' };
      }

      const visitDate = getLocalDate();
      if (actionType === 'daily_login_visit' && profile.lastDailyVisitDate === visitDate) {
        return { logged: false, totalCoins: Number(profile.totalCoins) || 0, phone: '' };
      }

      const totalCoins = (Number(profile.totalCoins) || 0) + coinsEarned;
      const phone = typeof profile.phone === 'string' ? profile.phone : '';
      const activity = {
        uid: user.uid,
        email: user.email || '',
        phone,
        action: actionType,
        ...activityDetails,
        coinsEarned,
        totalCoins,
        timestamp: serverTimestamp()
      };
      if (actionType === 'purchase_complete') {
        activity.paymentId = verifiedPayment.paymentId;
        activity.bookTitle = verifiedPayment.purchases.length === 1
          ? verifiedPayment.purchases[0].title
          : `${verifiedPayment.purchases.length} books`;
        if (Number.isFinite(verifiedPayment.amount)) activity.amount = verifiedPayment.amount;
      }

      const userUpdates = {
        totalCoins: increment(coinsEarned),
        lastActiveAt: serverTimestamp()
      };
      if (actionType === 'daily_login_visit') userUpdates.lastDailyVisitDate = visitDate;
      if (actionType === 'purchase_complete') {
        const bookPurchases = verifiedPayment.purchases.filter((purchase) => (purchase.productType || 'book') === 'book');
        const coursePurchases = verifiedPayment.purchases.filter((purchase) => purchase.productType === 'videoCoursePack');
        if (bookPurchases.length) {
          userUpdates.purchasedBookIds = arrayUnion(...bookPurchases.map((purchase) => purchase.productId || purchase.bookId));
          userUpdates.purchasedBooks = arrayUnion(...bookPurchases.map((purchase) => ({
            bookId: purchase.bookId,
            bookTitle: purchase.title,
            price: purchase.finalAmount ?? purchase.amount,
            amount: purchase.amount,
            finalAmount: purchase.finalAmount ?? purchase.amount,
            appliedCoupon: purchase.appliedCoupon || '',
            paymentId: verifiedPayment.paymentId,
            purchasedAt: purchase.purchasedAt
          })));
        }
        if (coursePurchases.length) {
          userUpdates.purchasedCourseIds = arrayUnion(...coursePurchases.map((purchase) => purchase.productId || purchase.courseId));
          userUpdates.purchasedCourses = arrayUnion(...coursePurchases.map((purchase) => ({
            courseId: purchase.productId || purchase.courseId,
            courseTitle: purchase.title,
            price: purchase.finalAmount ?? purchase.amount,
            amount: purchase.amount,
            finalAmount: purchase.finalAmount ?? purchase.amount,
            appliedCoupon: purchase.appliedCoupon || '',
            paymentId: verifiedPayment.paymentId,
            purchasedAt: purchase.purchasedAt,
            duration: purchase.duration || '',
            expiresAt: purchase.expiresAt || null
          })));
        }
        userUpdates.processedPaymentIds = arrayUnion(verifiedPayment.paymentId);
      }
      if (actionType === 'enroll_free_course' && activityDetails.courseId) {
        userUpdates.enrolledCourseIds = arrayUnion(activityDetails.courseId);
        if (courseEnrollment) {
          userUpdates.enrolledCourses = arrayUnion({
            courseId: courseEnrollment.courseId,
            courseTitle: courseEnrollment.courseTitle,
            duration: courseEnrollment.duration || '',
            enrolledAt: courseEnrollment.enrolledAt,
            expiresAt: courseEnrollment.expiresAt || null
          });
        }
      }

      transaction.set(activityRef, activity);
      transaction.set(userRef, userUpdates, { merge: true });
      return { logged: true, totalCoins, phone };
    });

    if (!result.logged) return false;
    if (actionType === 'purchase_complete' || actionType === 'enroll_free_course') return true;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/log-user-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid: user.uid,
          action: actionType,
          ...activityDetails,
          phone: result.phone,
          firebaseApiKey: auth.app.options.apiKey
        })
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw new Error(responseBody.error || `Sanity activity sync failed with status ${response.status}.`);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('Unable to sync user activity to Sanity.');
      }
    }
    return true;
  } catch {
    console.warn('Unable to log user activity while offline or unavailable.');
    return false;
  }
}
