import {
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

export const ACTIVITY_COIN_VALUES = Object.freeze({
  daily_login_visit: 10,
  view_book_detail: 5,
  read_sample_pdf: 15,
  add_to_cart: 20,
  purchase_complete: 50
});

const getLocalDate = () => new Date().toLocaleDateString('en-CA');

const getActivityDetails = (details) => ({
  bookId: typeof details.bookId === 'string' ? details.bookId : '',
  bookTitle: typeof details.bookTitle === 'string' ? details.bookTitle : ''
});

export async function logUserActivity(actionType, details = {}) {
  const user = auth.currentUser;
  const coinsEarned = ACTIVITY_COIN_VALUES[actionType];
  if (!user || !coinsEarned || actionType === 'purchase_complete') return false;

  const userRef = doc(db, 'users', user.uid);
  const activityRef = doc(collection(db, 'userActivities'));
  const activityDetails = getActivityDetails(details);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const profile = userSnapshot.data() || {};
      const visitDate = getLocalDate();
      if (actionType === 'daily_login_visit' && profile.lastDailyVisitDate === visitDate) {
        return { logged: false, totalCoins: Number(profile.totalCoins) || 0 };
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
      const userUpdates = {
        totalCoins: increment(coinsEarned),
        lastActiveAt: serverTimestamp()
      };
      if (actionType === 'daily_login_visit') userUpdates.lastDailyVisitDate = visitDate;

      transaction.set(activityRef, activity);
      transaction.set(userRef, userUpdates, { merge: true });
      return { logged: true, totalCoins, phone };
    });

    if (!result.logged) return false;

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
        console.warn(`Unable to sync ${actionType} activity to Sanity.`, error);
      }
    }
    return true;
  } catch (error) {
    console.warn(`Unable to log ${actionType} activity while offline or unavailable.`, error);
    return false;
  }
}
