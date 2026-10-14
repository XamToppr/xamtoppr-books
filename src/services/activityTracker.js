import {
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';

export const ACTIVITY_COIN_VALUES = Object.freeze({
  VIEW_BOOK_DETAILS: 5,
  READ_SAMPLE_PDF: 15,
  ADD_TO_CART: 20,
  DAILY_VISIT: 10
});

const getLocalDate = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const getActivityDetails = (details) => ({
  bookId: typeof details.bookId === 'string' ? details.bookId : '',
  bookTitle: typeof details.bookTitle === 'string' ? details.bookTitle : ''
});

export async function logUserActivity(actionType, details = {}) {
  const user = auth.currentUser;
  const coinsEarned = ACTIVITY_COIN_VALUES[actionType];
  if (!user || !coinsEarned) return false;

  const userRef = doc(db, 'users', user.uid);
  const activityRef = doc(collection(db, 'userActivities'));
  const activityDetails = getActivityDetails(details);
  const activity = {
    uid: user.uid,
    email: user.email || '',
    phone: '',
    action: actionType,
    ...activityDetails,
    coinsEarned,
    timestamp: serverTimestamp()
  };

  try {
    if (actionType === 'DAILY_VISIT') {
      const visitDate = getLocalDate();
      return await runTransaction(db, async (transaction) => {
        const userSnapshot = await transaction.get(userRef);
        if (userSnapshot.data()?.lastDailyVisitDate === visitDate) return false;

        transaction.set(activityRef, {
          ...activity,
          phone: typeof userSnapshot.data()?.phone === 'string' ? userSnapshot.data().phone : ''
        });
        transaction.set(userRef, {
          totalCoins: increment(coinsEarned),
          lastActiveAt: serverTimestamp(),
          lastDailyVisitDate: visitDate
        }, { merge: true });
        return true;
      });
    }

    const userSnapshot = await getDoc(userRef);
    activity.phone = typeof userSnapshot.data()?.phone === 'string'
      ? userSnapshot.data().phone
      : '';

    const batch = writeBatch(db);
    batch.set(activityRef, activity);
    batch.set(userRef, {
      totalCoins: increment(coinsEarned),
      lastActiveAt: serverTimestamp()
    }, { merge: true });
    await batch.commit();
    return true;
  } catch (error) {
    console.warn(`Unable to log ${actionType} activity while offline or unavailable.`, error);
    return false;
  }
}
