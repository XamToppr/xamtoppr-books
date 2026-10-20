import { randomUUID } from 'node:crypto';
import {
  calculateCourseExpiryDate,
  isCourseEntitlementActive
} from '../src/utils/courseValidity.js';

export const USER_ACTIVITY_COIN_VALUES = Object.freeze({
  daily_login_visit: 10,
  view_book_detail: 5,
  read_sample_pdf: 15,
  enroll_free_course: 0,
  add_to_cart: 20,
  purchase_complete: 50,
  checkout_initiated: 0,
  payment_failed: 0,
  payment_abandoned: 0,
  payment_dropped: 0
});

const isPaymentDrop = (action) => (
  action === 'payment_failed' || action === 'payment_abandoned' || action === 'payment_dropped'
);
const isCheckoutEvent = (action) => action === 'checkout_initiated' || isPaymentDrop(action);

export const getLeadStatus = (action, totalCoins) => {
  if (action === 'purchase_complete') return 'CONVERTED';
  if (isPaymentDrop(action)) return 'ULTRA_HOT';
  if (action === 'add_to_cart' || totalCoins >= 100) return 'HOT';
  if (action === 'read_sample_pdf') return 'WARM';
  return 'COLD';
};

export async function createSanityUserActivity(client, firebaseUser, {
  action,
  bookId = '',
  bookTitle = '',
  productType = 'book',
  courseId = '',
  courseTitle = '',
  phone = '',
  reason = '',
  amount
}) {
  const coinsEarned = USER_ACTIVITY_COIN_VALUES[action];
  if (coinsEarned == null) {
    const error = new Error('Unsupported user activity.');
    error.code = 'INVALID_ACTIVITY';
    throw error;
  }

  const studentId = `student_${firebaseUser.localId}`;
  let course = null;
  if (action === 'enroll_free_course') {
    course = await client.getDocument(courseId);
    if (!course || course._type !== 'videoCoursePack' || course.packType !== 'Free'
      || !['Instant', 'Scheduled'].includes(course.publishingStatus)
      || (course.publishingStatus === 'Scheduled'
        && (!course.publishingDate || new Date(course.publishingDate).getTime() > Date.now()))) {
      const error = new Error('This free course is not available for enrollment.');
      error.code = 'COURSE_NOT_ENROLLABLE';
      throw error;
    }
  }
  await client.createIfNotExists({
    _id: studentId,
    _type: 'studentUser',
    fullName: firebaseUser.displayName || 'Student',
    email: firebaseUser.email || '',
    phone,
    firebaseUid: firebaseUser.localId,
    createdAt: new Date().toISOString(),
    totalCoins: 0,
    purchasedBooks: []
  });

  const currentStudent = await client.getDocument(studentId);
  const studentPhone = phone || currentStudent?.phone || '';
  const totalCoins = (Number(currentStudent?.totalCoins) || 0) + coinsEarned;
  const leadStatus = action === 'purchase_complete'
    ? 'CONVERTED'
    : isPaymentDrop(action)
      ? 'ULTRA_HOT'
      : currentStudent?.leadStatus === 'CONVERTED'
        ? 'CONVERTED'
        : getLeadStatus(action, totalCoins);
  const timestamp = new Date().toISOString();
  const previousEnrollments = action === 'enroll_free_course'
    ? (currentStudent?.enrolledCourses || []).filter((entry) => entry?.course?._ref === course._id)
    : [];
  const latestEnrollment = previousEnrollments[previousEnrollments.length - 1];
  const existingEnrollment = latestEnrollment
    && isCourseEntitlementActive(latestEnrollment, course?.duration)
    ? latestEnrollment
    : null;
  const enrollmentDate = existingEnrollment?.enrolledAt || timestamp;
  const enrollmentExpiry = existingEnrollment?.expiresAt
    || calculateCourseExpiryDate(enrollmentDate, course?.duration);
  const courseEnrollment = action === 'enroll_free_course'
    ? {
      courseId: course._id,
      courseTitle: course.title || courseTitle,
      duration: course.duration || '',
      enrolledAt: enrollmentDate,
      expiresAt: enrollmentExpiry
    }
    : null;
  const activityId = `activity_${randomUUID()}`;
  const activityDocument = {
    _id: activityId,
    _type: 'userActivity',
    uid: firebaseUser.localId,
    student: { _type: 'reference', _ref: studentId },
    ...(productType === 'book' && bookId ? { book: { _type: 'reference', _ref: bookId } } : {}),
    ...(courseId ? { videoCoursePack: { _type: 'reference', _ref: courseId } } : {}),
    studentName: firebaseUser.displayName || 'Student',
    phone: studentPhone,
    email: firebaseUser.email || '',
    bookId,
    courseId,
    bookTitle: courseTitle || bookTitle,
    productType,
    action,
    ...(isCheckoutEvent(action) ? { context: reason, amount } : {}),
    coinsEarned,
    totalCoins,
    leadStatus,
    timestamp
  };
  const transaction = client.transaction()
    .create(activityDocument)
    .patch(studentId, (patch) => {
      let updatedPatch = patch
        .set({
          fullName: firebaseUser.displayName || 'Student',
          email: firebaseUser.email || '',
          phone: studentPhone,
          firebaseUid: firebaseUser.localId,
          latestActivityTimestamp: timestamp,
          ...(action === 'purchase_complete' || isPaymentDrop(action) ? { leadStatus } : {}),
          ...(isPaymentDrop(action) ? { latestDroppedBook: bookTitle } : {})
        })
        .setIfMissing({ totalCoins: 0, activities: [] })
        .append('activities', [{
          _key: randomUUID(),
          _type: 'reference',
          _ref: activityId
        }])
        .inc({ totalCoins: coinsEarned });
      if (action === 'enroll_free_course' && !existingEnrollment) {
        updatedPatch = updatedPatch
          .setIfMissing({ enrolledCourses: [] })
          .append('enrolledCourses', [{
            _key: randomUUID(),
            _type: 'object',
            course: { _type: 'reference', _ref: course._id },
            courseTitle: course.title || courseTitle,
            duration: course.duration || '',
            enrolledAt: timestamp,
            expiresAt: calculateCourseExpiryDate(timestamp, course.duration)
          }]);
      }
      return updatedPatch;
    });
  try {
    await transaction.commit();
    console.log('Sanity transaction committed successfully for action:', action);
  } catch (error) {
    console.error('Sanity transaction error in createSanityUserActivity:', error);
    throw error;
  }

  return { activityId, totalCoins, courseEnrollment };
}
