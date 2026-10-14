import React, { useEffect, useState } from 'react';
import { BookOpen, ShoppingBag, ShoppingCart } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import AuthModal from '../auth/AuthModal';
import UserButton from '../auth/UserButton';
import CartDrawer from '../cart/CartDrawer';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { db } from '../../services/firebase';
import sanityClient from '../../sanityClient';

const formatPurchaseDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function MyLibrary() {
  const { currentUser, userProfile } = useAuth();
  const { cartItems } = useCart();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;

    const loadLibrary = async () => {
      if (!currentUser) {
        setBooks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError('');
      try {
        const profileSnapshot = await getDoc(doc(db, 'users', currentUser.uid));
        const profile = profileSnapshot.exists() ? profileSnapshot.data() : {};
        const purchaseEntries = Array.isArray(profile.purchasedBooks)
          ? profile.purchasedBooks.map((entry) => (
            typeof entry === 'string' ? { bookId: entry } : entry
          ))
          : [];
        const bookIds = [...new Set([
          ...(Array.isArray(profile.purchasedBookIds) ? profile.purchasedBookIds : []),
          ...purchaseEntries.map((entry) => entry?.bookId || entry?.sanityId || entry?.id).filter(Boolean)
        ])];

        if (!bookIds.length) {
          if (isCurrentRequest) setBooks([]);
          return;
        }

        const catalogBooks = await sanityClient.fetch(
          `*[_type == "book" && _id in $ids] {
            _id,
            title,
            "coverImageUrl": coverImage.asset->url,
            "samplePdfUrl": samplePdfFile.asset->url
          }`,
          { ids: bookIds }
        );
        const catalogById = new Map(catalogBooks.map((book) => [book._id, book]));
        const entriesById = new Map(
          purchaseEntries
            .filter((entry) => entry?.bookId || entry?.sanityId || entry?.id)
            .map((entry) => [entry.bookId || entry.sanityId || entry.id, entry])
        );
        const libraryBooks = bookIds.map((bookId) => {
          const entry = entriesById.get(bookId) || {};
          const catalogBook = catalogById.get(bookId) || {};
          return {
            id: bookId,
            title: catalogBook.title || entry.title || entry.bookTitle || 'Purchased book',
            coverImage: catalogBook.coverImageUrl || entry.coverImage || '',
            readUrl: catalogBook.samplePdfUrl || entry.readUrl || entry.viewUrl || '',
            purchasedAt: entry.purchasedAt || entry.purchaseDate || entry.createdAt || null
          };
        }).sort((left, right) => new Date(right.purchasedAt || 0) - new Date(left.purchasedAt || 0));

        if (isCurrentRequest) setBooks(libraryBooks);
      } catch (error) {
        console.error('Unable to load the user library:', error);
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

  const handleCartCheckout = (book) => {
    if (!currentUser || !/^[6-9]\d{9}$/.test(userProfile?.phone?.trim() || '')) {
      setShowAuthModal(true);
      return;
    }
    if (!book.pdfUrl) {
      setLoadError('This book does not have a checkout link yet.');
      return;
    }

    window.open(book.pdfUrl, '_blank', 'noopener,noreferrer');
    setShowCartDrawer(false);
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
            <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">My Library</h1>
            <p className="mt-1 text-sm text-slate-600">Books linked to your account.</p>
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
        ) : books.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <BookOpen className="mx-auto h-12 w-12 text-blue-200" />
            <h2 className="mt-4 text-lg font-extrabold">No books in your library yet</h2>
            <p className="mt-2 text-sm text-slate-600">Explore the catalog and choose your next study resource.</p>
            <a href="/" className="mt-5 inline-flex rounded-lg bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-300">
              Explore Books
            </a>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <article key={book.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {book.coverImage ? (
                  <img src={book.coverImage} alt="" className="h-56 w-full bg-slate-100 object-cover" />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-300"><BookOpen className="h-14 w-14" /></div>
                )}
                <div className="p-4">
                  <h2 className="line-clamp-2 min-h-12 font-extrabold text-slate-900">{book.title}</h2>
                  <p className="mt-2 text-xs text-slate-500">Purchased {formatPurchaseDate(book.purchasedAt)}</p>
                  {book.readUrl ? (
                    <a href={book.readUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block rounded-lg bg-blue-950 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-blue-900">
                      Read Now
                    </a>
                  ) : (
                    <button type="button" disabled className="mt-4 w-full rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500">
                      View link unavailable
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <CartDrawer
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        onProceedCheckout={handleCartCheckout}
      />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
