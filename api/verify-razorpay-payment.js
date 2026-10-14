import { PaymentRequestError, verifyRazorpayPayment } from '../server/razorpayPayments.js';

async function readRequestBody(request) {
  const rawBody = request.body;
  if (rawBody && typeof rawBody === 'object' && !Buffer.isBuffer(rawBody)
    && !(rawBody instanceof Uint8Array)) {
    return rawBody;
  }

  let bodyText = '';
  if (typeof rawBody === 'string') {
    bodyText = rawBody;
  } else if (Buffer.isBuffer(rawBody) || rawBody instanceof Uint8Array) {
    bodyText = Buffer.from(rawBody).toString('utf8');
  } else if (rawBody == null && typeof request[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    bodyText = Buffer.concat(chunks).toString('utf8');
  } else if (rawBody != null) {
    throw new PaymentRequestError(400, 'Request body must be a JSON object.');
  }

  if (!bodyText.trim()) throw new PaymentRequestError(400, 'A request body is required.');
  try {
    return JSON.parse(bodyText);
  } catch {
    throw new PaymentRequestError(400, 'Request body must be valid JSON.');
  }
}

export default async function handler(request, response) {
  console.log('Incoming verification request method:', request.method);
  console.log('Has secret:', Boolean(process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET));

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    const body = await readRequestBody(request);
    console.log('Verification payload fields present:', {
      orderId: Boolean(body?.razorpay_order_id || body?.order_id || body?.razorpayOrderId || body?.orderId),
      paymentId: Boolean(body?.razorpay_payment_id || body?.payment_id || body?.razorpayPaymentId || body?.paymentId),
      signature: Boolean(body?.razorpay_signature || body?.signature || body?.razorpaySignature),
      orderToken: Boolean(body?.orderToken),
      uid: Boolean(body?.uid)
    });
    const result = await verifyRazorpayPayment({
      body,
      authorization: request.headers.authorization,
      env: process.env
    });
    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof PaymentRequestError) {
      return response.status(error.status).json({
        success: false,
        error: error.message,
        message: error.message
      });
    }
    console.error('Failed to verify Razorpay payment:', error);
    return response.status(500).json({
      success: false,
      error: 'Unable to verify the payment.',
      message: 'Unable to verify the payment.'
    });
  }
}
