import { createClient } from '@sanity/client';
import { syncStudentDocument, verifyFirebaseIdToken } from '../server/studentProfileSync.js';

const getString = (value) => (typeof value === 'string' ? value.trim() : '');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const sanityWriteToken = process.env.SANITY_API_WRITE_TOKEN;
  const projectId = process.env.SANITY_PROJECT_ID
    || process.env.VITE_SANITY_PROJECT_ID
    || 'rkev3aui';
  const dataset = process.env.SANITY_DATASET
    || process.env.VITE_SANITY_DATASET
    || 'production';
  if (!sanityWriteToken) {
    const missingConfiguration = ['SANITY_API_WRITE_TOKEN'];
    console.error('Student profile sync is missing server configuration.');
    return response.status(503).json({
      success: false,
      error: 'Profile sync is unavailable because server configuration is missing.',
      missingConfiguration
    });
  }

  const idToken = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!idToken) {
    return response.status(401).json({ success: false, error: 'Authentication is required.' });
  }

  const body = typeof request.body === 'string'
    ? (() => {
      try {
        return JSON.parse(request.body);
      } catch {
        return null;
      }
    })()
    : request.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return response.status(400).json({ success: false, error: 'A valid request body is required.' });
  }

  const requestedUid = getString(body.uid);
  const phone = getString(body.phone);
  const profile = {
    fullName: getString(body.name),
    email: getString(body.email)
  };
  const firebaseApiKey = getString(body.firebaseApiKey)
    || process.env.VITE_FIREBASE_API_KEY
    || process.env.FIREBASE_WEB_API_KEY;
  if (!requestedUid || phone.length > 32 || profile.fullName.length > 200 || profile.email.length > 320) {
    return response.status(400).json({ success: false, error: 'Student profile fields are invalid.' });
  }
  if (!firebaseApiKey) {
    return response.status(503).json({
      success: false,
      error: 'Profile sync is missing the Firebase public API key required to verify the signed-in user.'
    });
  }

  let firebaseUser;
  try {
    firebaseUser = await verifyFirebaseIdToken(idToken, firebaseApiKey);
  } catch (error) {
    if (error.code === 'INVALID_FIREBASE_TOKEN') {
      return response.status(401).json({ success: false, error: 'Authentication is invalid or expired.' });
    }
    console.error('Failed to verify Firebase identity for student profile sync.');
    return response.status(502).json({ success: false, error: 'Unable to verify the account right now.' });
  }

  if (requestedUid !== firebaseUser.localId) {
    return response.status(403).json({ success: false, error: 'The requested user does not match the authenticated account.' });
  }

  const sanityClient = createClient({
    projectId,
    dataset,
    apiVersion: '2023-01-01',
    token: sanityWriteToken,
    useCdn: false
  });

  try {
    const document = await syncStudentDocument(sanityClient, firebaseUser, phone, profile);
    const result = { success: true, documentId: document._id };
    return response.status(200).json(result);
  } catch (error) {
    console.error('Failed to sync a student profile to Sanity.');
    return response.status(500).json({
      success: false,
      error: 'Unable to sync the student profile.',
      details: error.message
    });
  }
}
