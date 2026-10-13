export async function verifyFirebaseIdToken(idToken, apiKey) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );

  if (!response.ok) {
    const error = new Error('Firebase ID token is invalid.');
    error.code = 'INVALID_FIREBASE_TOKEN';
    throw error;
  }

  const result = await response.json();
  const user = result.users?.[0];
  if (!user?.localId) {
    const error = new Error('Firebase ID token did not resolve to a user.');
    error.code = 'INVALID_FIREBASE_TOKEN';
    throw error;
  }

  return user;
}

export function syncStudentDocument(client, firebaseUser, phone, profile = {}) {
  const documentId = `student_${firebaseUser.localId}`;
  const createdAt = new Date().toISOString();
  return client.createIfNotExists({
    _id: documentId,
    _type: 'studentUser',
    fullName: profile.fullName || firebaseUser.displayName || 'Student',
    email: profile.email || firebaseUser.email || '',
    phone,
    firebaseUid: firebaseUser.localId,
    createdAt,
    purchasedBooks: []
  }).then(() => client.patch(documentId)
    .set({
      fullName: profile.fullName || firebaseUser.displayName || 'Student',
      email: profile.email || firebaseUser.email || '',
      phone,
      firebaseUid: firebaseUser.localId
    })
    .setIfMissing({ createdAt, purchasedBooks: [] })
    .commit());
}

export async function appendStudentPurchase(client, firebaseUser, { bookId, phone, orderId }) {
  const book = await client.getDocument(bookId);
  if (!book || book._type !== 'book') {
    const error = new Error('The selected book could not be found.');
    error.code = 'BOOK_NOT_FOUND';
    throw error;
  }

  const amount = Number(book.offerPrice);
  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error('The selected book is not available for purchase.');
    error.code = 'BOOK_NOT_PURCHASABLE';
    throw error;
  }

  const studentId = `student_${firebaseUser.localId}`;
  const purchasedAt = new Date().toISOString();
  await client.createIfNotExists({
    _id: studentId,
    _type: 'studentUser',
    fullName: firebaseUser.displayName || 'Student',
    email: firebaseUser.email || '',
    phone,
    firebaseUid: firebaseUser.localId,
    createdAt: purchasedAt,
    purchasedBooks: []
  });

  const purchase = {
    _key: orderId,
    _type: 'object',
    book: { _type: 'reference', _ref: book._id },
    bookTitle: book.title,
    amount,
    orderId,
    purchasedAt
  };

  await client.patch(studentId)
    .setIfMissing({ purchasedBooks: [] })
    .append('purchasedBooks', [purchase])
    .commit();

  return { documentId: studentId, orderId };
}
