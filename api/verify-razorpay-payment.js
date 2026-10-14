import { PaymentRequestError, verifyRazorpayPayment } from '../server/razorpayPayments.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  let body = request.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return response.status(400).json({ success: false, error: 'Request body must be valid JSON.' });
    }
  }

  try {
    const result = await verifyRazorpayPayment({
      body,
      authorization: request.headers.authorization,
      env: process.env
    });
    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof PaymentRequestError) {
      return response.status(error.status).json({ success: false, error: error.message });
    }
    console.error('Failed to verify Razorpay payment:', error);
    return response.status(500).json({ success: false, error: 'Unable to verify the payment.' });
  }
}
