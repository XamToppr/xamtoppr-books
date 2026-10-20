import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createClient } from '@sanity/client';
import { verifyFirebaseIdToken } from './studentProfileSync.js';
import { getLeadStatus } from './userActivitySync.js';

const API_BASE = 'https://api.razorpay.com/v1';
const PURCHASE_COINS = 50;

export class PaymentRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const getString = (value) => (typeof value === 'string' ? value.trim() : '');

function getPaymentConfig(env) {
  const keyId = env.RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET || env.RAZORPAY_SECRET;
  if (!keyId || !keySecret) {
    throw new PaymentRequestError(503, 'Razorpay server credentials are not configured.');
  }
  return { keyId, keySecret };
}

function getSanityClient(env) {
  const token = env.SANITY_API_WRITE_TOKEN
    || env.VITE_SANITY_WRITE_TOKEN
    || env.VITE_SANITY_API_WRITE_TOKEN;
  if (!token) throw new PaymentRequestError(503, 'The server-side Sanity write token is not configured.');
  return createClient({
    projectId: env.SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || 'rkev3aui',
    dataset: env.SANITY_DATASET || env.VITE_SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    token,
    useCdn: false
  });
}

async function authenticate(authorization, uid, firebaseApiKey) {
  const idToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!idToken) throw new PaymentRequestError(401, 'Authentication is required.');
  if (!uid || !firebaseApiKey) {
    throw new PaymentRequestError(400, 'Authenticated user details are required.');
  }

  let firebaseUser;
  try {
    firebaseUser = await verifyFirebaseIdToken(idToken, firebaseApiKey);
  } catch (error) {
    if (error.code === 'INVALID_FIREBASE_TOKEN') {
      throw new PaymentRequestError(401, 'Authentication is invalid or expired.');
    }
    throw error;
  }
  if (firebaseUser.localId !== uid) {
    throw new PaymentRequestError(403, 'The requested user does not match the authenticated account.');
  }
  return firebaseUser;
}

async function razorpayRequest(path, method, config, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json();
  if (!response.ok) {
    console.error('Razorpay API request failed with status:', response.status);
    throw new PaymentRequestError(502, 'Razorpay could not process the payment request.');
  }
  return result;
}

function signOrderMetadata(encodedPayload, secret) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function createOrderToken(payload, secret) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${signOrderMetadata(encodedPayload, secret)}`;
}

async function priceCoupon(sanity, code, subtotalPaise) {
  const normalizedCode = getString(code).toUpperCase();
  if (!normalizedCode) return { discountPaise: 0, coupon: null };
  if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
    throw new PaymentRequestError(400, 'The coupon code is invalid.');
  }

  const coupon = await sanity.fetch(
    '*[_type == "coupon" && code == $code][0]{code, discountType, discountValue, minOrderAmount, validTill, isActive}',
    { code: normalizedCode }
  );
  if (!coupon || coupon.isActive !== true) {
    throw new PaymentRequestError(400, 'This coupon is invalid or inactive.');
  }
  if (coupon.validTill) {
    const validTill = new Date(coupon.validTill).getTime();
    if (!Number.isFinite(validTill)) {
      throw new PaymentRequestError(400, 'This coupon has an invalid expiry date.');
    }
    if (validTill < Date.now()) throw new PaymentRequestError(400, 'This coupon has expired.');
  }
  const subtotal = subtotalPaise / 100;
  const minimum = Number(coupon.minOrderAmount) || 0;
  const value = Number(coupon.discountValue);
  if (subtotal < minimum) {
    throw new PaymentRequestError(400, `This coupon requires a minimum order of ₹${minimum.toLocaleString('en-IN')}.`);
  }
  if (!Number.isFinite(value) || value <= 0
    || (coupon.discountType === 'percentage' && value > 100)
    || !['percentage', 'flat'].includes(coupon.discountType)) {
    throw new PaymentRequestError(400, 'This coupon has an invalid discount.');
  }

  const requestedDiscount = coupon.discountType === 'flat'
    ? Math.round(value * 100)
    : Math.round(subtotalPaise * value / 100);
  const discountPaise = Math.min(requestedDiscount, subtotalPaise);
  if (discountPaise >= subtotalPaise) {
    throw new PaymentRequestError(400, 'The coupon must leave at least ₹0.01 payable.');
  }
  return {
    discountPaise,
    coupon: { code: coupon.code, discountAmount: discountPaise / 100 }
  };
}

function readOrderToken(orderToken, secret) {
  const [encodedPayload, signature, extra] = getString(orderToken).split('.');
  if (!encodedPayload || !signature || extra) {
    throw new PaymentRequestError(400, 'Payment order details are invalid.');
  }
  const expected = Buffer.from(signOrderMetadata(encodedPayload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new PaymentRequestError(403, 'Payment order verification failed.');
  }
  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new PaymentRequestError(400, 'Payment order details are invalid.');
  }
}

export async function createRazorpayOrder({ body, authorization, env }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PaymentRequestError(400, 'A valid request body is required.');
  }
  const uid = getString(body.uid);
  const firebaseApiKey = getString(body.firebaseApiKey)
    || env.VITE_FIREBASE_API_KEY
    || env.FIREBASE_WEB_API_KEY;
  const firebaseUser = await authenticate(authorization, uid, firebaseApiKey);

  const requestedItems = Array.isArray(body.items) ? body.items : [];
  const expectedAmount = Number(body.expectedAmount);
  const products = requestedItems.map((item) => ({
    productType: getString(item?.productType) || 'book',
    productId: getString(item?.productId || item?.bookId)
  }));
  const productIds = products.map((item) => item.productId);
  if (products.length === 0 || products.length > 20
    || products.some((item) => !['book', 'videoCoursePack'].includes(item.productType)
      || !item.productId || item.productId.length > 200)
    || new Set(productIds).size !== productIds.length
    || !Number.isSafeInteger(expectedAmount) || expectedAmount <= 0) {
    throw new PaymentRequestError(400, 'The selected products are invalid.');
  }

  const sanity = getSanityClient(env);
  const catalog = await sanity.fetch(
    `*[_id in $productIds && (
      _type == "book"
      || (
        _type == "videoCoursePack"
        && packType == "Paid"
        && publishingStatus in ["Instant", "Scheduled"]
        && (
          publishingStatus == "Instant"
          || (defined(publishingDate) && publishingDate <= now())
        )
      )
    )]{
      _id,
      _type,
      title,
      offerPrice,
      price,
      packPurpose
    }`,
    { productIds }
  );
  const catalogById = new Map(catalog.map((product) => [product._id, product]));
  const requestedCourseIds = products
    .filter((item) => item.productType === 'videoCoursePack')
    .map((item) => item.productId);
  if (requestedCourseIds.length) {
    const student = await sanity.getDocument(`student_${firebaseUser.localId}`);
    const purchasedCourseIds = new Set((student?.purchasedCourses || [])
      .map((purchase) => purchase?.course?._ref)
      .filter(Boolean));
    if (requestedCourseIds.some((courseId) => purchasedCourseIds.has(courseId))) {
      throw new PaymentRequestError(409, 'You already own one of the selected video courses.');
    }
  }
  const items = products.map(({ productType, productId }) => {
    const product = catalogById.get(productId);
    const amount = Number(productType === 'book' ? product?.offerPrice : product?.price);
    if (product?._type !== productType) {
      throw new PaymentRequestError(400, 'A selected product is unavailable for purchase.');
    }
    if (!product || !Number.isFinite(amount) || amount <= 0) {
      throw new PaymentRequestError(400, 'A selected product is unavailable or has no valid price.');
    }
    return { productType, productId, title: product.title || 'Product', packPurpose: product.packPurpose || '', amount };
  });

  const subtotalPaise = Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100);
  const { discountPaise, coupon } = await priceCoupon(sanity, body.couponCode, subtotalPaise);
  let remainingDiscount = discountPaise;
  let assignedGross = 0;
  let cumulativeAmount = 0;
  const discountedItems = items.map((item, index) => {
    cumulativeAmount += item.amount;
    const itemPaise = index === items.length - 1
      ? subtotalPaise - assignedGross
      : Math.round(cumulativeAmount * 100) - assignedGross;
    assignedGross += itemPaise;
    const allocatedDiscount = Math.min(itemPaise, remainingDiscount);
    remainingDiscount -= allocatedDiscount;
    return { ...item, finalAmount: (itemPaise - allocatedDiscount) / 100 };
  });
  const amountPaise = subtotalPaise - discountPaise;
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new PaymentRequestError(400, 'The order amount is invalid.');
  }
  if (amountPaise !== expectedAmount) {
    throw new PaymentRequestError(409, 'The catalog price changed. Refresh the catalog and try again.');
  }

  const config = getPaymentConfig(env);
  const order = await razorpayRequest('/orders', 'POST', config, {
    amount: amountPaise,
    currency: 'INR',
    payment_capture: 1,
    receipt: `xam_${randomUUID().replaceAll('-', '').slice(0, 28)}`,
    notes: { firebaseUid: uid }
  });
  const orderToken = createOrderToken({
    uid,
    orderId: order.id,
    amount: amountPaise,
    items: discountedItems,
    coupon,
    createdAt: Date.now()
  }, config.keySecret);

  return {
    keyId: config.keyId,
    orderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    items: discountedItems,
    coupon,
    orderToken
  };
}

async function recordSanityPurchase(client, firebaseUser, phone, paymentId, orderPayload) {
  const studentId = `student_${firebaseUser.localId}`;
  const activityId = `purchase_${createHash('sha256').update(paymentId).digest('hex')}`;
  const existingActivity = await client.getDocument(activityId);
  if (existingActivity) {
    return { activityId, alreadyRecorded: true };
  }

  const purchasedAt = new Date().toISOString();
  const bookPurchases = orderPayload.items.filter((item) => item.productType === 'book')
    .map((item) => ({
      _key: randomUUID(),
      _type: 'object',
      book: { _type: 'reference', _ref: item.productId },
      bookTitle: item.title,
      amount: item.amount,
      finalAmount: item.finalAmount,
      appliedCoupon: orderPayload.coupon?.code || '',
      orderId: paymentId,
      purchasedAt
    }));
  const coursePurchases = orderPayload.items.filter((item) => item.productType === 'videoCoursePack')
    .map((item) => ({
      _key: randomUUID(),
      _type: 'object',
      course: { _type: 'reference', _ref: item.productId },
      courseTitle: item.title,
      amount: item.amount,
      finalAmount: item.finalAmount,
      appliedCoupon: orderPayload.coupon?.code || '',
      orderId: paymentId,
      purchasedAt
    }));
  const singleItem = orderPayload.items.length === 1 ? orderPayload.items[0] : null;
  const student = await client.getDocument(studentId);
  const totalCoins = (Number(student?.totalCoins) || 0) + PURCHASE_COINS;
  const activity = {
    _id: activityId,
    _type: 'userActivity',
    uid: firebaseUser.localId,
    student: { _type: 'reference', _ref: studentId },
    studentName: firebaseUser.displayName || 'Student',
    phone,
    email: firebaseUser.email || '',
    ...(singleItem?.productType === 'book'
      ? {
        book: { _type: 'reference', _ref: singleItem.productId },
        bookId: singleItem.productId,
        bookTitle: singleItem.title,
        productType: 'book'
      }
      : {}),
    ...(singleItem?.productType === 'videoCoursePack'
      ? {
        videoCoursePack: { _type: 'reference', _ref: singleItem.productId },
        courseId: singleItem.productId,
        bookTitle: singleItem.title,
        productType: 'videoCoursePack'
      }
      : {}),
    ...(orderPayload.items.length > 1
      ? { bookTitle: `${orderPayload.items.length} products`, productType: 'mixed' }
      : {}),
    action: 'purchase_complete',
    amount: orderPayload.amount / 100,
    coinsEarned: PURCHASE_COINS,
    totalCoins,
    leadStatus: getLeadStatus('purchase_complete', totalCoins),
    timestamp: purchasedAt
  };
  const newStudent = {
    _id: studentId,
    _type: 'studentUser',
    fullName: firebaseUser.displayName || 'Student',
    email: firebaseUser.email || '',
    phone,
    firebaseUid: firebaseUser.localId,
    createdAt: new Date().toISOString(),
    totalCoins: 0,
    purchasedBooks: [],
    purchasedCourses: []
  };
  await client.createIfNotExists(newStudent);
  try {
    await client.transaction()
      .patch(studentId, (patch) => {
        let updatedPatch = patch
          .set({
            fullName: firebaseUser.displayName || 'Student',
            email: firebaseUser.email || '',
            phone,
            firebaseUid: firebaseUser.localId,
            leadStatus: 'CONVERTED',
            latestActivityTimestamp: purchasedAt
          })
          .setIfMissing({ totalCoins: 0, purchasedBooks: [], purchasedCourses: [], activities: [] });
        if (bookPurchases.length) updatedPatch = updatedPatch.append('purchasedBooks', bookPurchases);
        if (coursePurchases.length) updatedPatch = updatedPatch.append('purchasedCourses', coursePurchases);
        return updatedPatch
          .append('activities', [{
            _key: randomUUID(),
            _type: 'reference',
            _ref: activityId
          }])
          .inc({ totalCoins: PURCHASE_COINS });
      })
      .create(activity)
      .commit();
  } catch (error) {
    if (error.statusCode === 409 && await client.getDocument(activityId)) {
      return { activityId, alreadyRecorded: true };
    }
    throw error;
  }
  return { activityId, alreadyRecorded: false };
}

export async function verifyRazorpayPayment({ body, authorization, env }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PaymentRequestError(400, 'A valid request body is required.');
  }
  const orderId = getString(
    body.razorpay_order_id || body.order_id || body.razorpayOrderId || body.orderId
  );
  const paymentId = getString(
    body.razorpay_payment_id || body.payment_id || body.razorpayPaymentId || body.paymentId
  );
  const signature = getString(
    body.razorpay_signature || body.signature || body.razorpaySignature
  );
  if (!orderId || !paymentId || !signature) {
    throw new PaymentRequestError(400, 'Missing order_id, payment_id, or signature.');
  }
  if (!/^[a-f\d]{64}$/i.test(signature)) {
    throw new PaymentRequestError(400, 'Payment verification details are invalid.');
  }

  const uid = getString(body.uid);
  const firebaseApiKey = getString(body.firebaseApiKey)
    || env.VITE_FIREBASE_API_KEY
    || env.FIREBASE_WEB_API_KEY;
  const firebaseUser = await authenticate(authorization, uid, firebaseApiKey);
  const config = getPaymentConfig(env);
  const orderPayload = readOrderToken(body.orderToken, config.keySecret);
  if (orderPayload.uid !== uid || orderPayload.orderId !== orderId
    || !Number.isSafeInteger(orderPayload.amount) || !Array.isArray(orderPayload.items)) {
    throw new PaymentRequestError(403, 'Payment order does not match the signed-in account.');
  }

  const expectedSignature = createHmac('sha256', config.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const receivedSignature = Buffer.from(signature, 'hex');
  const signatureIsValid = expectedSignature.length === receivedSignature.length
    && timingSafeEqual(expectedSignature, receivedSignature);
  console.log('Razorpay signature valid:', signatureIsValid);
  if (!signatureIsValid) {
    throw new PaymentRequestError(403, 'Razorpay payment signature is invalid.');
  }

  const [order, fetchedPayment] = await Promise.all([
    razorpayRequest(`/orders/${encodeURIComponent(orderId)}`, 'GET', config),
    razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`, 'GET', config)
  ]);
  if (order.notes?.firebaseUid !== uid
    || order.amount !== orderPayload.amount
    || order.currency !== 'INR'
    || fetchedPayment.order_id !== orderId
    || fetchedPayment.amount !== orderPayload.amount
    || fetchedPayment.currency !== 'INR') {
    throw new PaymentRequestError(409, 'The payment details do not match this order.');
  }

  let payment = fetchedPayment;
  if (payment.status === 'authorized') {
    payment = await razorpayRequest(
      `/payments/${encodeURIComponent(paymentId)}/capture`,
      'POST',
      config,
      { amount: payment.amount, currency: payment.currency }
    );
  }
  if (payment.status !== 'captured'
    || payment.order_id !== orderId
    || payment.amount !== orderPayload.amount
    || payment.currency !== 'INR') {
    throw new PaymentRequestError(409, 'The payment has not been captured for this order.');
  }

  const purchasedAt = new Date().toISOString();
  const purchases = orderPayload.items.map((item) => ({
    productType: item.productType,
    productId: item.productId,
    ...(item.productType === 'book' ? { bookId: item.productId } : { courseId: item.productId }),
    title: item.title,
    amount: item.amount,
    finalAmount: item.finalAmount,
    appliedCoupon: orderPayload.coupon?.code || '',
    orderId: paymentId,
    purchasedAt
  }));
  let pdfUrls = [];

  const sanity = getSanityClient(env);
  try {
    const purchasedBookIds = orderPayload.items
      .filter((item) => item.productType === 'book')
      .map((item) => item.productId);
    const books = await sanity.fetch(
      '*[_type == "book" && _id in $bookIds]{_id, "pdfUrl": fullPdfFile.asset->url}',
      { bookIds: purchasedBookIds }
    );
    const pdfUrlsByBookId = new Map(books.map((book) => [book._id, book.pdfUrl || null]));
    pdfUrls = purchasedBookIds.map((bookId) => ({
      bookId,
      pdfUrl: pdfUrlsByBookId.get(bookId) || null
    }));
  } catch (sanityErr) {
    console.error('Unable to resolve purchased PDF URLs from Sanity:', sanityErr);
  }
  const profile = await sanity.getDocument(`student_${uid}`);
  await recordSanityPurchase(
    sanity,
    firebaseUser,
    getString(profile?.phone || firebaseUser.phoneNumber),
    paymentId,
    orderPayload
  );

  return {
    success: true,
    message: 'Payment verified successfully',
    paymentId,
    pdfUrl: pdfUrls[0]?.pdfUrl || null,
    pdfUrls,
    purchases
  };
}
