import { createClient } from '@sanity/client';

const getString = (value) => (typeof value === 'string' ? value.trim() : '');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const sanityWriteToken = process.env.SANITY_API_WRITE_TOKEN;
  if (!sanityWriteToken) {
    console.error('Book request endpoint is missing a server-side Sanity write token.');
    return response.status(503).json({
      success: false,
      error: 'Book requests are unavailable because the server-side Sanity write token is missing.'
    });
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

  const requestedBookTitle = getString(body.requestedBookTitle);
  if (!requestedBookTitle) {
    return response.status(400).json({ success: false, error: 'Requested book title is required.' });
  }

  const document = {
    _type: 'bookRequest',
    studentName: getString(body.studentName),
    contactNumber: getString(body.contactNumber),
    email: getString(body.email),
    requestedBookTitle,
    examCategory: getString(body.examCategory),
    additionalDetails: getString(body.additionalDetails),
    status: 'Pending',
    requestedAt: new Date().toISOString()
  };

  try {
    const sanityClient = createClient({
      projectId: process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || 'rkev3aui',
      dataset: process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: sanityWriteToken,
      useCdn: false
    });
    await sanityClient.create(document);
    return response.status(200).json({ success: true });
  } catch {
    console.error('Failed to create a book request in Sanity.');
    return response.status(500).json({ success: false, error: 'Unable to submit the book request.' });
  }
}
