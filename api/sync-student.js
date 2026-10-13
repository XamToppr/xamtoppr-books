import { createClient } from '@sanity/client';
import { syncStudentDocument, verifyFirebaseIdToken } from '../server/studentProfileSync.js';

const getString = (value) => (typeof value === 'string' ? value.trim() : '');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const sanityWriteToken = process.env.SANITY_API_WRITE_TOKEN;
  const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY;
  if (!sanityWriteToken || !firebaseApiKey) {
    console.error('Student profile sync requires Sanity and Firebase server configuration.');
    return response.status(503).json({ success: false, error: 'Profile sync is unavailable right now.' });
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

  const phone = getString(body.phone);
  if (phone.length > 32) {
    return response.status(400).json({ success: false, error: 'Phone number is too long.' });
  }

  let firebaseUser;
  try {
    firebaseUser = await verifyFirebaseIdToken(idToken, firebaseApiKey);
  } catch (error) {
    if (error.code === 'INVALID_FIREBASE_TOKEN') {
      return response.status(401).json({ success: false, error: 'Authentication is invalid or expired.' });
    }
    console.error('Failed to verify Firebase identity for student profile sync:', error);
    return response.status(502).json({ success: false, error: 'Unable to verify the account right now.' });
  }

  const sanityClient = createClient({
    projectId: process.env.SANITY_PROJECT_ID || 'rkev3aui',
    dataset: process.env.SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    token: sanityWriteToken,
    useCdn: false
  });

  try {
    await syncStudentDocument(sanityClient, firebaseUser, phone);
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to sync a student profile to Sanity:', error);
    return response.status(500).json({ success: false, error: 'Unable to sync the student profile.' });
  }
}
