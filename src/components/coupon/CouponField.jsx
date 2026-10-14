import { useState } from 'react';
import { validateCoupon } from '../../services/couponService';

const formatPrice = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})}`;

export default function CouponField({ orderAmount, onChange, className = '' }) {
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const applyCoupon = async (event) => {
    event.preventDefault();
    setApplying(true);
    setError('');
    try {
      const validatedCoupon = await validateCoupon(code, orderAmount);
      setCoupon(validatedCoupon);
      onChange(validatedCoupon);
    } catch (validationError) {
      setCoupon(null);
      onChange(null);
      setError(validationError.message || 'Unable to apply this coupon.');
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCode('');
    setError('');
    onChange(null);
  };

  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-3 ${className}`}>
      {coupon ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-emerald-800">Coupon {coupon.code} applied!</p>
            <p className="text-xs text-emerald-700">Saved {formatPrice(coupon.discountAmount)}</p>
          </div>
          <button type="button" onClick={removeCoupon} className="text-xs font-bold text-rose-700 hover:underline">
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={applyCoupon} className="flex gap-2">
          <label className="sr-only" htmlFor="coupon-code">Coupon code</label>
          <input
            id="coupon-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Enter coupon code"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={applying || !code.trim()}
            className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? 'Applying…' : 'Apply'}
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-medium text-rose-700">{error}</p>}
    </section>
  );
}
