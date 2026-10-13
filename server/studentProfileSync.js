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
  return client.createOrReplace({
    _id: `student_${firebaseUser.localId}`,
    _type: 'studentUser',
    fullName: profile.fullName || firebaseUser.displayName || 'Student',
    email: profile.email || firebaseUser.email || '',
    phone,
    firebaseUid: firebaseUser.localId,
    createdAt: new Date().toISOString()
  });
}
