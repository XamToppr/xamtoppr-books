import { logUserActivity } from './activityTracker';
import loadRazorpay from '../utils/loadRazorpay';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

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
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || `Payment request failed with status ${response.status}.`);
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
  const fail = (error) => {
    if (failureNotified || paymentCompleted) return;
    failureNotified = true;
    onFailure?.(error instanceof Error ? error : new Error('Payment could not be completed.'));
  };

  try {
    if (!user?.uid || typeof user.getIdToken !== 'function') {
      throw new Error('Sign in before purchasing books.');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Add at least one book before checkout.');
    }
    if (!Number.isFinite(Number(totalAmount)) || Number(totalAmount) <= 0) {
      throw new Error('The total purchase amount is invalid.');
    }
    if (!RAZORPAY_KEY_ID) {
      throw new Error('Razorpay is not configured. Set VITE_RAZORPAY_KEY_ID and server payment credentials.');
    }
    const loaded = await loadRazorpay();
    if (!loaded) throw new Error('Unable to load the Razorpay payment window. Please try again.');

    const order = await postPaymentRequest('/api/create-razorpay-order', {
      items: items.map((item) => ({ bookId: item.sanityId || item.id })),
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
        : `Purchase of ${order.items.length} Books`,
      prefill: {
        name: user.displayName || '',
        email: user.email || '',
        contact: user.phoneNumber || phone || user.phone || ''
      },
      theme: { color: '#0d9488' },
      handler: async (response) => {
        try {
          const verification = await postPaymentRequest('/api/verify-razorpay-payment', {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            orderToken: order.orderToken
          }, user);

          const logged = await logUserActivity('purchase_complete', {
            verifiedPayment: {
              paymentId: response.razorpay_payment_id,
              purchases: verification.purchases
            }
          });
          if (!logged) {
            throw new Error('Payment was verified, but your library could not be updated. Please contact support with payment ID '
              + response.razorpay_payment_id + '.');
          }

          await refreshUserProfile?.();
          paymentCompleted = true;
          if (clearCart) clearCart();
          await onSuccess?.({
            ...response,
            items: verification.purchases,
            amount: order.amount / 100
          });
        } catch (error) {
          console.error('Failed to finalize the verified Razorpay payment:', error);
          fail(error);
        }
      },
      modal: {
        ondismiss: () => fail(new Error('Payment was cancelled.'))
      }
    });

    razorpay.on('payment.failed', (event) => {
      fail(new Error(event?.error?.description || 'Razorpay could not complete the payment.'));
    });
    razorpay.open();
    return true;
  } catch (error) {
    console.error('Unable to initiate Razorpay payment:', error);
    fail(error);
    return false;
  }
}
