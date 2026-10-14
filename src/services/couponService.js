import sanityClient from '../sanityClient';

const normalizeCode = (code) => String(code || '').trim().toUpperCase();
const roundCurrency = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

export async function validateCoupon(code, orderAmount) {
  const normalizedCode = normalizeCode(code);
  const amount = Number(orderAmount);
  if (!normalizedCode) throw new Error('Enter a coupon code.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('The order amount is invalid.');

  const coupon = await sanityClient.withConfig({ useCdn: false }).fetch(
    '*[_type == "coupon" && code == $code][0]{code, discountType, discountValue, minOrderAmount, validTill, isActive}',
    { code: normalizedCode }
  );
  if (!coupon || coupon.isActive !== true) throw new Error('This coupon is invalid or inactive.');
  if (coupon.validTill) {
    const validTill = new Date(coupon.validTill).getTime();
    if (!Number.isFinite(validTill)) throw new Error('This coupon has an invalid expiry date.');
    if (validTill < Date.now()) throw new Error('This coupon has expired.');
  }
  if (amount < (Number(coupon.minOrderAmount) || 0)) {
    throw new Error(`This coupon requires a minimum order of ₹${Number(coupon.minOrderAmount).toLocaleString('en-IN')}.`);
  }

  const value = Number(coupon.discountValue);
  if (!Number.isFinite(value) || value <= 0
    || (coupon.discountType === 'percentage' && value > 100)) {
    throw new Error('This coupon has an invalid discount.');
  }
  let discount = coupon.discountType === 'flat'
    ? value
    : coupon.discountType === 'percentage'
      ? amount * value / 100
      : NaN;
  if (!Number.isFinite(discount)) throw new Error('This coupon has an unsupported discount type.');
  discount = roundCurrency(Math.min(discount, amount));

  const finalAmount = roundCurrency(amount - discount);
  if (finalAmount < 0.01) throw new Error('The coupon must leave at least ₹0.01 payable.');
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: value,
    discountAmount: discount,
    finalAmount
  };
}
