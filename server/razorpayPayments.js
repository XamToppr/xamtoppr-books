import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createClient } from '@sanity/client';
import { verifyFirebaseIdToken } from './studentProfileSync.js';
import { getLeadStatus } from './userActivitySync.js';
import { getSanityWriteToken } from './environment.js';
import { calculateCourseExpiryDate, isCourseEntitlementActive } from '../src/utils/courseValidity.js';

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
  const keyId = env.RAZORPAY_KEY_ID?.trim() || env.VITE_RAZORPAY_KEY_ID?.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim()
    || env.RAZORPAY_SECRET?.trim()
    || env.VITE_RAZORPAY_KEY_SECRET?.trim()
    || '';
  if (!keyId || !keySecret) {
    throw new PaymentRequestError(503, 'Razorpay server credentials are not configured.');
  }
  return { keyId, keySecret };
}

function getSanityClient(env) {
  const token = getSanityWriteToken(env);
  if (!token) throw new PaymentRequestError(503, 'The server-side Sanity write token is not configured.');
  return createClient({
    projectId: env.SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || 'rkev3aui',
    dataset: env.SANITY_DATASET || env.VITE_SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    token,
    useCdn: false,
    perspective: 'published'
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
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch (error) {
    console.error('Unable to connect to the Razorpay API:', error instanceof Error ? error.message : 'Unknown network error.');
    throw new PaymentRequestError(502, 'Unable to connect to Razorpay. Please try again.');
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    console.error('Razorpay returned an invalid response:', {
      status: response.status,
      message: error instanceof Error ? error.message : 'Invalid JSON response.'
    });
    throw new PaymentRequestError(502, 'Razorpay returned an invalid response. Please try again.');
  }
  if (!response.ok) {
    console.error('Razorpay API request was rejected:', {
      status: response.status,
      code: result?.error?.code || 'UNKNOWN',
      description: result?.error?.description || 'No provider description returned.'
    });
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
    productId: getString(item?.productId || item?.bookId),
    selectedPricingPlan: item?.selectedPricingPlan && typeof item.selectedPricingPlan === 'object'
      && !Array.isArray(item.selectedPricingPlan)
      ? {
        key: getString(item.selectedPricingPlan._key),
        title: getString(item.selectedPricingPlan.planTitle),
        price: Number(item.selectedPricingPlan.price)
      }
      : null,
    selectedPlanId: getString(item?.selectedPlanId),
    selectedPlanTitle: getString(item?.selectedPlanTitle)
  }));
  const productIds = products.map((item) => item.productId);
  if (products.length === 0 || products.length > 20
    || products.some((item) => !['book', 'videoCoursePack'].includes(item.productType)
      || !item.productId || item.productId.length > 200
      || item.selectedPlanId.length > 200 || item.selectedPlanTitle.length > 200
      || (item.selectedPricingPlan
        && (!item.selectedPricingPlan.key || item.selectedPricingPlan.key.length > 200
          || item.selectedPricingPlan.title.length > 200
          || !Number.isFinite(item.selectedPricingPlan.price)
          || item.selectedPricingPlan.price <= 0))
      || (item.productType === 'book'
        && (item.selectedPlanId || item.selectedPlanTitle || item.selectedPricingPlan)))
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
        && coalesce(hideFromStore, false) == false
        && packType == "Paid"
        && (
          !defined(publishingStatus)
          ||
          publishingStatus != "Scheduled"
          || (defined(publishingDate) && publishingDate <= now())
        )
      )
    )]{
      _id,
      _type,
      title,
      offerPrice,
      price,
      duration,
      packPurpose,
      pricingPlans[] { _key, planTitle, price, isAvailable, isRecommended }
    }`,
    { productIds }
  );
  const catalogById = new Map(catalog.map((product) => [product._id, product]));
  const requestedCourseIds = products
    .filter((item) => item.productType === 'videoCoursePack')
    .map((item) => item.productId);
  if (requestedCourseIds.length) {
    const student = await sanity.getDocument(`student_${firebaseUser.localId}`);
    const existingPurchases = (student?.purchasedCourses || []).filter((purchase) => (
      requestedCourseIds.includes(purchase?.course?._ref)
    ));
    if (existingPurchases.some((purchase) => {
      const course = catalogById.get(purchase.course?._ref);
      return isCourseEntitlementActive(purchase, course?.duration);
    })) {
      throw new PaymentRequestError(409, 'You already own one of the selected video courses.');
    }
  }
  const items = products.map(({
    productType,
    productId,
    selectedPricingPlan,
    selectedPlanId,
    selectedPlanTitle
  }) => {
    const product = catalogById.get(productId);
    if (product?._type !== productType) {
      throw new PaymentRequestError(400, 'A selected product is unavailable for purchase.');
    }
    let selectedPlan = null;
    const requestedPlanId = selectedPricingPlan?.key || selectedPlanId;
    const requestedPlanTitle = selectedPricingPlan?.title || selectedPlanTitle;
    if (productType === 'videoCoursePack' && product) {
      const plans = Array.isArray(product.pricingPlans) ? product.pricingPlans : [];
      if (plans.length) {
        selectedPlan = requestedPlanId
          ? plans.find((plan) => plan._key === requestedPlanId)
          : requestedPlanTitle
            ? plans.find((plan) => plan.planTitle === requestedPlanTitle)
            : plans.find((plan) => plan.isAvailable !== false && plan.isRecommended)
              || plans.find((plan) => plan.isAvailable !== false);
        if (!selectedPlan || selectedPlan.isAvailable === false) {
          throw new PaymentRequestError(400, 'The selected course pricing plan is unavailable.');
        }
        if (selectedPricingPlan
          && Math.round(selectedPricingPlan.price * 100) !== Math.round(Number(selectedPlan.price) * 100)) {
          throw new PaymentRequestError(409, 'The course pricing plan price changed. Refresh the course page and try again.');
        }
      } else if (requestedPlanId) {
        throw new PaymentRequestError(409, 'The course pricing plan changed. Refresh the course page and try again.');
      }
    }
    const amount = Number(productType === 'book'
      ? product?.offerPrice
      : selectedPlan?.price ?? product?.price);
    if (!product || !Number.isFinite(amount) || amount <= 0) {
      throw new PaymentRequestError(400, 'A selected product is unavailable or has no valid price.');
    }
    const resolvedSelectedPlan = selectedPlan || null;
    return {
      productType,
      productId,
      title: product.title || 'Product',
      packPurpose: product.packPurpose || '',
      ...(productType === 'videoCoursePack' ? {
        duration: product.duration || '',
        selectedPlanId: resolvedSelectedPlan?._key || '',
        selectedPlanTitle: resolvedSelectedPlan?.planTitle || ''
      } : {}),
      amount
    };
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
  if (!Number.isSafeInteger(amountPaise)) {
    throw new PaymentRequestError(400, 'The order amount is invalid.');
  }
  if (amountPaise < 100) {
    throw new PaymentRequestError(400, 'Razorpay requires a payable amount of at least ₹1.00.');
  }
  if (amountPaise !== expectedAmount) {
    throw new PaymentRequestError(409, 'The catalog price changed. Refresh the catalog and try again.');
  }

  const config = getPaymentConfig(env);
  const razorpayNotes = { firebaseUid: uid };
  if (discountedItems.length === 1) {
    const [item] = discountedItems;
    razorpayNotes.productType = item.productType;
    razorpayNotes.productId = item.productId;
    if (item.productType === 'videoCoursePack') {
      razorpayNotes.pricingPlanKey = item.selectedPlanId || '';
      razorpayNotes.pricingPlanPrice = String(Math.round(item.amount * 100));
    }
  } else {
    razorpayNotes.productType = 'mixed';
  }
  const order = await razorpayRequest('/orders', 'POST', config, {
    amount: amountPaise,
    currency: 'INR',
    receipt: `xam_${randomUUID().replaceAll('-', '').slice(0, 28)}`,
    notes: razorpayNotes
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

async function recordSanityPurchase(client, firebaseUser, phone, paymentId, orderPayload, purchasedAt) {
  const studentId = `student_${firebaseUser.localId}`;
  const activityId = `purchase_${createHash('sha256').update(paymentId).digest('hex')}`;
  const existingActivity = await client.getDocument(activityId);
  if (existingActivity) {
    return { activityId, alreadyRecorded: true };
  }

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
      pricingPlanId: item.selectedPlanId || '',
      pricingPlanTitle: item.selectedPlanTitle || '',
      amount: item.amount,
      finalAmount: item.finalAmount,
      duration: item.duration || '',
      expiresAt: calculateCourseExpiryDate(purchasedAt, item.duration),
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

  const paymentTimestamp = Number(payment.captured_at || payment.created_at);
  const purchasedAt = Number.isFinite(paymentTimestamp) && paymentTimestamp > 0
    ? new Date(paymentTimestamp * 1000).toISOString()
    : new Date().toISOString();
  const purchases = orderPayload.items.map((item) => ({
    productType: item.productType,
    productId: item.productId,
    ...(item.productType === 'book' ? { bookId: item.productId } : { courseId: item.productId }),
    title: item.title,
    amount: item.amount,
    finalAmount: item.finalAmount,
    ...(item.productType === 'videoCoursePack'
      ? {
        duration: item.duration || '',
        pricingPlanId: item.selectedPlanId || '',
        pricingPlanTitle: item.selectedPlanTitle || '',
        expiresAt: calculateCourseExpiryDate(purchasedAt, item.duration)
      }
      : {}),
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
      '*[_type == "book" && _id in $bookIds]{_id, "pdfUrl": coalesce(fullPdfFile.asset->url, pdfUrl)}',
      { bookIds: purchasedBookIds }
    );
    const pdfUrlsByBookId = new Map(books.map((book) => [book._id, book.pdfUrl || null]));
    pdfUrls = purchasedBookIds.map((bookId) => ({
      bookId,
      pdfUrl: pdfUrlsByBookId.get(bookId) || null
    }));
  } catch {
    console.error('Unable to resolve purchased PDF URLs from Sanity.');
  }
  const profile = await sanity.getDocument(`student_${uid}`);
  await recordSanityPurchase(
    sanity,
    firebaseUser,
    getString(profile?.phone || firebaseUser.phoneNumber),
    paymentId,
    orderPayload,
    purchasedAt
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
