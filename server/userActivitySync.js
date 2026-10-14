export const USER_ACTIVITY_COIN_VALUES = Object.freeze({
  daily_login_visit: 10,
  view_book_detail: 5,
  read_sample_pdf: 15,
  add_to_cart: 20,
  purchase_complete: 50
});

export const getLeadStatus = (action, totalCoins) => {
  if (action === 'purchase_complete') return 'CONVERTED';
  if (action === 'add_to_cart' || totalCoins >= 100) return 'HOT';
  if (action === 'read_sample_pdf') return 'WARM';
  return 'COLD';
};

export async function createSanityUserActivity(client, firebaseUser, {
  action,
  bookId = '',
  bookTitle = '',
  phone = ''
}) {
  const coinsEarned = USER_ACTIVITY_COIN_VALUES[action];
  if (!coinsEarned) {
    const error = new Error('Unsupported user activity.');
    error.code = 'INVALID_ACTIVITY';
    throw error;
  }

  const studentId = `student_${firebaseUser.localId}`;
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

  const student = await client.patch(studentId)
    .set({
      fullName: firebaseUser.displayName || 'Student',
      email: firebaseUser.email || '',
      phone,
      firebaseUid: firebaseUser.localId
    })
    .setIfMissing({ totalCoins: 0 })
    .inc({ totalCoins: coinsEarned })
    .commit();
  const activityTotal = Number(student.totalCoins) || coinsEarned;
  const activityDocument = await client.create({
    _type: 'userActivity',
    uid: firebaseUser.localId,
    student: { _type: 'reference', _ref: studentId },
    ...(bookId ? { book: { _type: 'reference', _ref: bookId } } : {}),
    studentName: firebaseUser.displayName || 'Student',
    phone,
    email: firebaseUser.email || '',
    bookId,
    bookTitle,
    action,
    coinsEarned,
    totalCoins: activityTotal,
    leadStatus: getLeadStatus(action, activityTotal),
    timestamp: new Date().toISOString()
  });

  return { activityId: activityDocument._id, totalCoins: activityTotal };
}
