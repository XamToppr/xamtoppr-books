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

export function syncStudentDocument(client, firebaseUser, phone) {
  const createdAtTimestamp = Number(firebaseUser.createdAt);
  const createdAt = Number.isFinite(createdAtTimestamp)
    ? new Date(createdAtTimestamp).toISOString()
    : new Date().toISOString();

  return client.createOrReplace({
    _id: `studentUser-${firebaseUser.localId}`,
    _type: 'studentUser',
    fullName: firebaseUser.displayName || 'Student',
    email: firebaseUser.email || '',
    phone,
    firebaseUid: firebaseUser.localId,
    createdAt
  });
}
