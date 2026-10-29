import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, PlayCircle, ShoppingBag, ShoppingCart } from 'lucide-react';
import AuthModal from '../auth/AuthModal';
import UserButton from '../auth/UserButton';
import CartDrawer from '../cart/CartDrawer';
import Footer from '../Footer';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { initiatePayment } from '../../services/paymentService';
import { fetchUserLibrary, formatPurchaseDate } from '../../services/userLibrary';
import { getCourseValidity } from '../../utils/courseValidity';

export default function MyLibrary() {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const { cartItems, clearCart } = useCart();
  const [libraryItems, setLibraryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const paymentInProgressRef = useRef(false);
  const ebooks = libraryItems.filter((item) => item.itemType === 'book');
  const videoCourses = libraryItems.filter((item) => item.itemType === 'course');
  const visibleItems = activeTab === 'ebooks'
    ? ebooks
    : activeTab === 'courses'
      ? videoCourses
      : libraryItems;

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;

    const loadLibrary = async () => {
      if (!currentUser) {
        setLibraryItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError('');
      try {
        const libraryBooks = await fetchUserLibrary(currentUser);
        if (isCurrentRequest) setLibraryItems(libraryBooks);
      } catch {
        console.error('Unable to load the user library.');
        if (isCurrentRequest) setLoadError('Your library could not be loaded. Please try again.');
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };

    void loadLibrary();
    return () => {
      isCurrentRequest = false;
    };
  }, [currentUser]);

  const handleCartCheckout = async (items, coupon = null) => {
    if (paymentInProgressRef.current) return;
    if (!currentUser || !/^[6-9]\d{9}$/.test(userProfile?.phone?.trim() || '')) {
      setShowAuthModal(true);
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      setLoadError('Your cart is empty.');
      return;
    }

    setShowCartDrawer(false);
    setLoadError('');
    paymentInProgressRef.current = true;
    await initiatePayment({
      items,
      totalAmount: coupon?.finalAmount ?? items.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
      couponCode: coupon?.code || '',
      user: currentUser,
      phone: userProfile.phone,
      refreshUserProfile,
      clearCart,
      onSuccess: () => {
        paymentInProgressRef.current = false;
        window.location.assign('/my-library');
      },
      onFailure: (error) => {
        paymentInProgressRef.current = false;
        setLoadError(error.message || 'Payment could not be completed.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-blue-950/10 bg-[#0c2356] px-4 py-3 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a href="/" className="rounded-lg bg-white px-1.5 py-1">
            <img src="/xamtoppr-logo.png" alt="XamToppr" className="h-10 w-auto sm:h-12" />
          </a>
          <div className="flex items-center gap-3">
            <a href="/" className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 sm:text-sm">
              Explore Books
            </a>
            <button
              type="button"
              onClick={() => setShowCartDrawer(true)}
              aria-label={`Open cart with ${cartItems.length} items`}
              className="relative rounded-lg border border-white/25 p-2 text-white hover:bg-white/10"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItems.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-950">
                  {cartItems.length}
                </span>
              )}
            </button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-7 flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-700"><ShoppingBag className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">My Library &amp; Purchases</h1>
            <p className="mt-1 text-sm text-slate-600">Your ebooks and video courses, all in one place.</p>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading your library…</p>
        ) : loadError ? (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}</p>
        ) : !currentUser ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <BookOpen className="mx-auto h-12 w-12 text-blue-200" />
            <h2 className="mt-4 text-lg font-extrabold">Sign in to view your library</h2>
            <button type="button" onClick={() => setShowAuthModal(true)} className="mt-5 rounded-lg bg-blue-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900">
              Log In
            </button>
          </section>
        ) : libraryItems.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <BookOpen className="mx-auto h-12 w-12 text-blue-200" />
            <h2 className="mt-4 text-lg font-extrabold">Your library is empty</h2>
            <p className="mt-2 text-sm text-slate-600">Explore books and video courses to find your next study resource.</p>
            <a href="/" className="mt-5 inline-flex rounded-lg bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-300">
              Explore Catalog
            </a>
          </section>
        ) : (
          <>
          <div role="tablist" aria-label="Library categories" className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {[
              { id: 'all', label: 'All Items', count: libraryItems.length },
              { id: 'ebooks', label: 'My Ebooks', count: ebooks.length },
              { id: 'courses', label: 'My Video Courses', count: videoCourses.length }
            ].map((tab) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${
                  activeTab === tab.id
                    ? 'bg-blue-950 text-white'
                    : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-950'
                }`}
              >
                {tab.label} <span className="ml-1 opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>
          {visibleItems.length === 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <BookOpen className="mx-auto h-12 w-12 text-blue-200" />
              <h2 className="mt-4 text-lg font-extrabold">
                {activeTab === 'ebooks' ? 'No ebooks yet' : 'No video courses yet'}
              </h2>
              <p className="mt-2 text-sm text-slate-600">Your purchases and enrollments will appear here.</p>
              <a href={activeTab === 'ebooks' ? '/' : '/video-courses'} className="mt-5 inline-flex rounded-lg bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-300">
                Explore {activeTab === 'ebooks' ? 'Books' : 'Video Courses'}
              </a>
            </section>
          ) : (
          <div role="tabpanel" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => {
              const validity = item.itemType === 'course'
                ? getCourseValidity(item.expiresAt, currentTime)
                : null;
              const courseIsExpired = validity?.isExpired || false;
              const fullPdfUrl = item.fullPdfFile?.asset?.url || item.pdfUrl || '';
              return (
              <article key={`${item.itemType}-${item.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {item.coverImage ? (
                  <img src={item.coverImage} alt="" className="h-56 w-full bg-slate-100 object-cover" />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-300">
                    {item.itemType === 'course' ? <PlayCircle className="h-14 w-14" /> : <BookOpen className="h-14 w-14" />}
                  </div>
                )}
                <div className="p-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                    {item.itemType === 'course' ? 'Video Course' : 'Ebook'}
                  </span>
                  <h2 className="mt-1 line-clamp-2 min-h-12 font-extrabold text-slate-900">{item.title}</h2>
                  {item.itemType === 'course' ? (
                    <>
                      <p className="mt-2 text-xs text-slate-500">
                        {item.purchasedAt
                          ? `Purchased ${formatPurchaseDate(item.purchasedAt)}`
                          : `Enrolled ${formatPurchaseDate(item.enrolledAt)}`}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        Access period: {item.duration || 'Not specified'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Expires {formatPurchaseDate(item.expiresAt)}
                      </p>
                      <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
                        courseIsExpired ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {courseIsExpired ? 'Expired' : validity.remaining}
                      </p>
                      <a
                        href={courseIsExpired ? item.courseUrl.replace('?play=1', '?renew=1') : item.courseUrl}
                        className={`mt-4 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-center text-sm font-bold text-white ${
                          courseIsExpired ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-950 hover:bg-blue-900'
                        }`}
                      >
                        <PlayCircle className="h-4 w-4" /> {courseIsExpired ? 'Renew Course' : 'Start Learning'}
                      </a>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-xs text-slate-500">Purchased {formatPurchaseDate(item.purchasedAt)}</p>
                      {fullPdfUrl ? (
                        <>
                          <a href={fullPdfUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block rounded-lg bg-blue-950 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-blue-900">
                            📖 Read Full Book
                          </a>
                          <a href={fullPdfUrl} download className="mt-2 block rounded-lg border border-blue-200 px-4 py-2 text-center text-xs font-bold text-blue-950 hover:bg-blue-50">
                            ⬇ Download PDF
                          </a>
                        </>
                      ) : (
                        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-800">
                          Full book PDF is not available yet.
                        </p>
                      )}
                      {item.samplePdfUrl && (
                        <a href={item.samplePdfUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block rounded-lg border border-slate-200 px-4 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50">
                          Preview Sample PDF
                        </a>
                      )}
                    </>
                  )}
                </div>
              </article>
            )})}
          </div>
          )}
          </>
        )}
      </main>
      <CartDrawer
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        onProceedCheckout={handleCartCheckout}
      />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <Footer />
    </div>
  );
}
