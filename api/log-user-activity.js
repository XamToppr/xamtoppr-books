import { createClient } from '@sanity/client';
import { createSanityUserActivity } from '../server/userActivitySync.js';
import { verifyFirebaseIdToken } from '../server/studentProfileSync.js';

const getString = (value) => (typeof value === 'string' ? value.trim() : '');
const ALLOWED_ACTIVITY_ACTIONS = new Set([
  'checkout_initiated',
  'payment_failed',
  'payment_abandoned',
  'payment_dropped',
  'read_sample_pdf',
  'view_book_detail',
  'daily_login_visit',
  'enroll_free_course',
  'add_to_cart',
  'purchase_complete'
]);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const sanityWriteToken = process.env.SANITY_API_WRITE_TOKEN
    || process.env.VITE_SANITY_WRITE_TOKEN
    || process.env.VITE_SANITY_API_WRITE_TOKEN;
  if (!sanityWriteToken) {
    return response.status(503).json({ success: false, error: 'Activity logging is missing the server-side Sanity write token.' });
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
  const action = getString(body.action);
  const bookId = getString(body.bookId);
  const bookTitle = getString(body.bookTitle);
  const productType = getString(body.productType) || 'book';
  const courseId = getString(body.courseId);
  const courseTitle = getString(body.courseTitle);
  const phone = getString(body.phone);
  const reason = getString(body.reason);
  const amount = Number(body.amount) || 0;
  console.log('Logging activity received:', {
    uid,
    action,
    bookId,
    bookTitle,
    amount,
    reason
  });
  const firebaseApiKey = getString(body.firebaseApiKey)
    || process.env.VITE_FIREBASE_API_KEY
    || process.env.FIREBASE_WEB_API_KEY;
  if (!uid || !ALLOWED_ACTIVITY_ACTIONS.has(action) || bookId.length > 200
    || bookTitle.length > 300 || courseId.length > 200 || courseTitle.length > 300
    || phone.length > 32 || reason.length > 500
    || !['book', 'videoCoursePack'].includes(productType)) {
    return response.status(400).json({ success: false, error: 'Activity details are invalid.' });
  }
  if (action === 'purchase_complete') {
    return response.status(403).json({
      success: false,
      error: 'Purchase completion must be recorded by a verified payment-provider webhook.'
    });
  }
  if (!firebaseApiKey) {
    return response.status(503).json({
      success: false,
      error: 'Activity logging is missing the Firebase public API key required to verify the signed-in user.'
    });
  }

  let firebaseUser;
  try {
    firebaseUser = await verifyFirebaseIdToken(idToken, firebaseApiKey);
  } catch (error) {
    if (error.code === 'INVALID_FIREBASE_TOKEN') {
      return response.status(401).json({ success: false, error: 'Authentication is invalid or expired.' });
    }
    console.error('Unable to verify Firebase user for activity logging:', error);
    return response.status(502).json({ success: false, error: 'Unable to verify the account right now.' });
  }

  if (uid !== firebaseUser.localId) {
    return response.status(403).json({ success: false, error: 'The requested user does not match the authenticated account.' });
  }

  const client = createClient({
    projectId: process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || 'rkev3aui',
    dataset: process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    token: sanityWriteToken,
    useCdn: false
  });

  try {
    const payload = {
      action,
      bookId,
      bookTitle,
      productType,
      courseId,
      courseTitle,
      phone,
      reason,
      amount
    };
    const result = await createSanityUserActivity(client, firebaseUser, payload);
    console.log("Logged Activity Successfully:", request.body);
    return response.status(200).json({ success: true, activityId: result.activityId });
  } catch (error) {
    if (error.code === 'COURSE_NOT_ENROLLABLE') {
      return response.status(409).json({ success: false, error: error.message });
    }
    console.error('Failed to write student activity to Sanity:', error);
    return response.status(500).json({ success: false, error: 'Unable to sync student activity to Sanity.' });
  }
}
