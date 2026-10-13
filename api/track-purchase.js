import { randomUUID } from 'node:crypto';
import { createClient } from '@sanity/client';
import { appendStudentPurchase, verifyFirebaseIdToken } from '../server/studentProfileSync.js';

const getString = (value) => (typeof value === 'string' ? value.trim() : '');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const sanityWriteToken = process.env.SANITY_API_WRITE_TOKEN
    || process.env.VITE_SANITY_WRITE_TOKEN
    || process.env.VITE_SANITY_API_WRITE_TOKEN;
  if (!sanityWriteToken) {
    console.error('Purchase tracking is missing a server-side Sanity write token.');
    return response.status(503).json({
      success: false,
      error: 'Purchase tracking is unavailable because the server-side Sanity write token is missing.'
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

  const uid = getString(body.uid);
  const bookId = getString(body.bookId);
  const phone = getString(body.phone);
  const firebaseApiKey = getString(body.firebaseApiKey)
    || process.env.VITE_FIREBASE_API_KEY
    || process.env.FIREBASE_WEB_API_KEY;
  if (!uid || !bookId || bookId.length > 200 || phone.length > 32) {
    return response.status(400).json({ success: false, error: 'Purchase details are invalid.' });
  }
  if (!firebaseApiKey) {
    return response.status(503).json({
      success: false,
      error: 'Purchase tracking is missing the Firebase public API key required to verify the signed-in user.'
    });
  }

  let firebaseUser;
  try {
    firebaseUser = await verifyFirebaseIdToken(idToken, firebaseApiKey);
  } catch (error) {
    if (error.code === 'INVALID_FIREBASE_TOKEN') {
      return response.status(401).json({ success: false, error: 'Authentication is invalid or expired.' });
    }
    console.error('Failed to verify Firebase identity for purchase tracking:', error);
    return response.status(502).json({ success: false, error: 'Unable to verify the account right now.' });
  }

  if (uid !== firebaseUser.localId) {
    return response.status(403).json({ success: false, error: 'The requested user does not match the authenticated account.' });
  }

  const sanityClient = createClient({
    projectId: process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || 'rkev3aui',
    dataset: process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || 'production',
    apiVersion: '2023-01-01',
    token: sanityWriteToken,
    useCdn: false
  });

  try {
    const orderId = `checkout_${randomUUID()}`;
    const result = await appendStudentPurchase(sanityClient, firebaseUser, {
      bookId,
      phone,
      orderId
    });
    console.log('Student purchase event synced to Sanity:', result);
    return response.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.code === 'BOOK_NOT_FOUND') {
      return response.status(404).json({ success: false, error: error.message });
    }
    if (error.code === 'BOOK_NOT_PURCHASABLE') {
      return response.status(400).json({ success: false, error: error.message });
    }
    console.error('Failed to sync a student purchase event to Sanity:', error);
    return response.status(500).json({ success: false, error: 'Unable to sync the purchase event.' });
  }
}
