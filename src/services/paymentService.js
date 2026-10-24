import { logCheckoutActivity, logUserActivity } from './activityTracker';
import loadRazorpay from '../utils/loadRazorpay';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const getPaymentItem = (item) => ({
  productType: item.productType || 'book',
  productId: item.sanityId || item.id
});

async function postPaymentRequest(path, body, user) {
  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({
      ...body,
      uid: user.uid,
      firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY
    })
  });
  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error(`Payment request returned an invalid response (status ${response.status}).`, { cause: error });
  }
  if (!response.ok) {
    const error = new Error(
      result.error || result.message || `Payment request failed with status ${response.status}.`
    );
    error.responseData = result;
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function initiatePayment({
  items,
  totalAmount,
  couponCode = '',
  user,
  phone = '',
  refreshUserProfile,
  onSuccess,
  onFailure,
  clearCart
}) {
  let failureNotified = false;
  let paymentCompleted = false;
  const logPaymentDrop = async (action, reason) => {
    if (paymentCompleted) return;
    const logResults = await Promise.all(items.map((item) => logCheckoutActivity({
      user,
      action,
      bookId: item.productType === 'videoCoursePack' ? '' : item.sanityId || item.id,
      bookTitle: item.productType === 'videoCoursePack' ? '' : item.title,
      courseId: item.productType === 'videoCoursePack' ? item.sanityId || item.id : '',
      courseTitle: item.productType === 'videoCoursePack' ? item.title : '',
      productType: item.productType || 'book',
      amount: Number(item.finalAmount ?? item.amount ?? item.price ?? item.offerPrice),
      phone: phone || user.phoneNumber || user.phone || '',
      reason
    })));
    if (logResults.some((logged) => !logged)) {
      console.error('One or more payment drop activities could not be logged.');
    }
  };
  const fail = (error) => {
    if (failureNotified || paymentCompleted) return;
    failureNotified = true;
    onFailure?.(error instanceof Error ? error : new Error('Payment could not be completed.'));
  };

  try {
    if (!user?.uid || typeof user.getIdToken !== 'function') {
      throw new Error('Sign in before completing checkout.');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Add at least one item before checkout.');
    }
    if (!Number.isFinite(Number(totalAmount)) || Number(totalAmount) <= 0) {
      throw new Error('The total purchase amount is invalid.');
    }
    const checkoutResults = await Promise.all(items.map((item) => logCheckoutActivity({
      user,
      action: 'checkout_initiated',
      bookId: item.productType === 'videoCoursePack' ? '' : item.sanityId || item.id,
      bookTitle: item.productType === 'videoCoursePack' ? '' : item.title,
      courseId: item.productType === 'videoCoursePack' ? item.sanityId || item.id : '',
      courseTitle: item.productType === 'videoCoursePack' ? item.title : '',
      productType: item.productType || 'book',
      amount: Number(item.finalAmount ?? item.amount ?? item.price ?? item.offerPrice),
      phone: phone || user.phoneNumber || user.phone || '',
      reason: 'User initiated checkout'
    })));
    if (checkoutResults.some((logged) => !logged)) {
      console.error('One or more checkout initiation activities could not be logged.');
    }
    if (!RAZORPAY_KEY_ID) {
      throw new Error('Razorpay is not configured. Set VITE_RAZORPAY_KEY_ID and server payment credentials.');
    }
    const loaded = await loadRazorpay();
    if (!loaded) throw new Error('Unable to load the Razorpay payment window. Please try again.');

    const order = await postPaymentRequest('/api/create-razorpay-order', {
      items: items.map(getPaymentItem),
      expectedAmount: Math.round(Number(totalAmount) * 100),
      couponCode
    }, user);
    if (!window.Razorpay) throw new Error('Razorpay checkout did not initialize correctly.');

    const razorpay = new window.Razorpay({
      key: order.keyId || RAZORPAY_KEY_ID,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'XamToppr',
      description: order.items.length === 1
        ? order.items[0].title
        : `Purchase of ${order.items.length} Items`,
      prefill: {
        name: user.displayName || '',
        email: user.email || '',
        contact: user.phoneNumber || phone || user.phone || ''
      },
      theme: { color: '#0d9488' },
      handler: async (response) => {
        try {
          let verification;
          try {
            verification = await postPaymentRequest('/api/verify-razorpay-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderToken: order.orderToken
            }, user);
          } catch (error) {
            console.error('Verify payment request failed.');
            throw error;
          }
          if (verification.success !== true || !Array.isArray(verification.purchases)) {
            throw new Error(verification.message || 'The payment could not be verified.');
          }

          try {
            const logged = await logUserActivity('purchase_complete', {
              verifiedPayment: {
                paymentId: response.razorpay_payment_id,
                purchases: verification.purchases,
                amount: order.amount / 100
              }
            });
            if (!logged) {
              console.warn('Payment was verified, but the Firestore library update did not complete.');
            }
          } catch {
            console.error('Unable to update the Firestore library after verified payment.');
          }

          try {
            await refreshUserProfile?.();
          } catch {
            console.error('Unable to refresh the user profile after verified payment.');
          }
          paymentCompleted = true;
          if (clearCart) clearCart();
          await onSuccess?.({
            ...response,
            items: verification.purchases,
            pdfUrl: verification.pdfUrl || null,
            pdfUrls: verification.pdfUrls || [],
            amount: order.amount / 100
          });
        } catch (error) {
          console.error('Failed to finalize the verified Razorpay payment.');
          fail(error);
        }
      },
      modal: {
        ondismiss: async () => {
          await logPaymentDrop('payment_abandoned', 'Modal dismissed');
          fail(new Error('Payment was cancelled.'));
        }
      }
    });

    razorpay.on('payment.failed', async (event) => {
      const reason = event?.error?.description
        || event?.error?.reason
        || 'Bank/UPI declined';
      await logPaymentDrop('payment_failed', reason);
      fail(new Error(reason));
    });
    razorpay.open();
    return true;
  } catch (error) {
    console.error('Unable to initiate Razorpay payment.');
    fail(error);
    return false;
  }
}
