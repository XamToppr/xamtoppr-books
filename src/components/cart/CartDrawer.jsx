import React from 'react';
import { useState } from 'react';
import { ShoppingCart, Trash2, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import CouponField from '../coupon/CouponField';

const formatPrice = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

export default function CartDrawer({ isOpen, onClose, onProceedCheckout }) {
  const { cartItems, cartTotal, removeFromCart } = useCart();
  const [couponState, setCouponState] = useState(null);
  const cartKey = cartItems.map((item) => `${item.id}:${item.price}`).join('|');
  const coupon = couponState?.items === cartItems ? couponState.value : null;
  if (!isOpen) return null;
  const payableTotal = coupon?.finalAmount ?? cartTotal;

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/50"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-900" />
            <h2 id="cart-title" className="text-lg font-extrabold text-slate-900">Your Cart</h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900">
              {cartItems.length}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close cart" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        {cartItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingCart className="h-12 w-12 text-slate-300" />
            <p className="mt-4 font-bold text-slate-800">Your cart is empty</p>
            <p className="mt-1 text-sm text-slate-500">Add a book to get started.</p>
            <a href="/" onClick={onClose} className="mt-5 rounded-lg bg-blue-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-900">
              Explore Books
            </a>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
              {cartItems.map((book) => (
                <li key={book.id} className="flex gap-3 py-4">
                  {book.coverImage ? (
                    <img src={book.coverImage} alt="" className="h-20 w-14 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-20 w-14 items-center justify-center rounded-md bg-slate-100 text-xl">📖</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-bold text-slate-900">{book.title}</h3>
                    <p className="mt-1 text-sm font-extrabold text-emerald-700">{formatPrice(book.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(book.id)}
                    aria-label={`Remove ${book.title} from cart`}
                    className="self-start rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <footer className="border-t border-slate-200 bg-slate-50 p-5">
              <CouponField
                key={cartKey}
                orderAmount={cartTotal}
                onChange={(value) => setCouponState(value ? { items: cartItems, value } : null)}
                className="mb-4"
              />
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">{coupon ? 'Payable total' : 'Order total'}</span>
                <span className="text-lg font-black text-slate-950">{formatPrice(payableTotal)}</span>
              </div>
              <button
                type="button"
                onClick={() => onProceedCheckout(cartItems, coupon)}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-500"
              >
                {coupon ? `Pay • ${formatPrice(payableTotal)}` : 'Proceed to Checkout'}
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
