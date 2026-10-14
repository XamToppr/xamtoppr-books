import { PortableText } from '@portabletext/react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  Headphones,
  LockKeyhole,
  MessageCircle,
  Pin,
  Send,
  ShoppingCart,
  Sparkles,
  Tag
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModal';
import CouponField from '../components/coupon/CouponField';
import Footer from '../components/Footer';
import UserButton from '../components/auth/UserButton';
import { useAuth } from '../context/AuthContext';
import { initiatePayment } from '../services/paymentService';
import sanityClient from '../sanityClient';
import { BOOK_BY_SLUG_QUERY } from '../sanityQueries';

function YoutubeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  );
}

function InstagramIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

const SOCIAL_CHANNELS = [
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@xamtopprofficial',
    icon: YoutubeIcon,
    className: 'bg-red-50 text-red-600 hover:bg-red-100'
  },
  {
    label: 'Telegram',
    href: 'https://t.me/xamtopprnew',
    icon: Send,
    className: 'bg-sky-50 text-sky-600 hover:bg-sky-100'
  },
  {
    label: 'WhatsApp Channel',
    href: 'https://whatsapp.com/channel/0029Vb5cQ6h3gvWYhr27j63a',
    icon: MessageCircle,
    className: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
  },
  {
    label: 'Instagram',
    href: 'http://instagram.com/xamtoppr',
    icon: InstagramIcon,
    className: 'bg-pink-50 text-pink-600 hover:bg-pink-100'
  },
  {
    label: 'Pinterest',
    href: 'https://in.pinterest.com/erdhirajsingh50',
    icon: Pin,
    className: 'bg-rose-50 text-rose-600 hover:bg-rose-100'
  }
];

const FAQS = [
  {
    question: 'How to download PDF?',
    answer: "After successful payment, the book unlocks instantly in your 'My Library' section."
  },
  {
    question: 'When will I get my PDF after payment?',
    answer: 'Instant access within 3 seconds, accessible anytime in My Library.'
  },
  {
    question: 'What if I purchase the wrong book? Can I choose another book?',
    answer: 'Contact our support team on WhatsApp with your payment ID.'
  },
  {
    question: 'What happens if I accidentally purchase the same book twice?',
    answer: 'Double charges are automatically refunded within 5-7 business days.'
  },
  {
    question: 'How can I request a refund?',
    answer: 'Reach out via WhatsApp support with your payment receipt.'
  }
];

const formatPrice = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})}`;

const getHighDefinitionImageUrl = (assetUrl) => {
  if (!assetUrl) return '';
  try {
    const imageUrl = new URL(assetUrl);
    if (imageUrl.hostname === 'cdn.sanity.io') {
      imageUrl.searchParams.set('w', '1600');
      imageUrl.searchParams.set('q', '95');
      imageUrl.searchParams.set('auto', 'format');
    }
    return imageUrl.toString();
  } catch (error) {
    console.error('Unable to prepare the book cover URL:', error);
    return assetUrl;
  }
};

const hasPurchasedBook = (profile, bookId) => {
  const purchaseEntries = Array.isArray(profile?.purchasedBooks)
    ? profile.purchasedBooks
    : [];
  return (Array.isArray(profile?.purchasedBookIds) && profile.purchasedBookIds.includes(bookId))
    || purchaseEntries.some((entry) => (
      typeof entry === 'string'
        ? entry === bookId
        : entry?.bookId === bookId || entry?.sanityId === bookId || entry?.id === bookId
    ));
};

function updateMetaTag(attribute, key, content, createdElements) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
    createdElements.push(element);
  }
  const previousContent = element.getAttribute('content');
  element.setAttribute('content', content);
  return () => {
    if (previousContent === null) element.removeAttribute('content');
    else element.setAttribute('content', previousContent);
  };
}

function updateCanonicalUrl(url, createdElements) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
    createdElements.push(element);
  }
  const previousHref = element.href;
  element.href = url;
  return () => {
    if (!previousHref) element.removeAttribute('href');
    else element.href = previousHref;
  };
}

function FollowIconLink({ channel }) {
  const Icon = channel.icon;
  return (
    <a
      href={channel.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Follow XamToppr on ${channel.label}`}
      title={channel.label}
      className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 ${channel.className}`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow transition group-hover:opacity-100 group-focus-visible:opacity-100">
        {channel.label}
      </span>
    </a>
  );
}

function ChannelButton({ channel, children, className }) {
  const Icon = channel.icon;
  return (
    <a
      href={channel.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </a>
  );
}

export default function BookDetailPage() {
  const { slug } = useParams();
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [book, setBook] = useState(null);
  const [loadedSlug, setLoadedSlug] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [relatedBooksResult, setRelatedBooksResult] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const paymentInProgressRef = useRef(false);
  const toastTimerRef = useRef(null);
  const loading = loadedSlug !== slug;

  useEffect(() => {
    let isCurrentRequest = true;

    sanityClient.fetch(BOOK_BY_SLUG_QUERY, { slug })
      .then((result) => {
        if (isCurrentRequest) {
          setBook(result || null);
          setLoadError('');
          setCoupon(null);
          setPurchaseComplete(false);
          setLoadedSlug(slug);
        }
      })
      .catch((error) => {
        console.error('Unable to load the requested book:', error);
        if (isCurrentRequest) {
          setLoadError('This book could not be loaded. Please try again later.');
          setLoadedSlug(slug);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [slug]);

  useEffect(() => {
    let isCurrentRequest = true;
    sanityClient.fetch(
      `*[_type == "book" && slug.current != $slug][0...3] {
        _id,
        title,
        "slug": slug.current,
        "coverImage": coverImage.asset->url,
        "price": offerPrice,
        "mrp": mrp
      }`,
      { slug }
    ).then((results) => {
      if (!Array.isArray(results)) throw new Error('Sanity related-books query did not return a list.');
      if (isCurrentRequest) {
        setRelatedBooksResult({
          slug,
          books: results.filter((item) => item.title && item.slug),
          error: ''
        });
      }
    }).catch((error) => {
      console.error('Unable to load popular books:', error);
      if (isCurrentRequest) {
        setRelatedBooksResult({
          slug,
          books: [],
          error: 'Popular books could not be loaded right now.'
        });
      }
    });

    return () => {
      isCurrentRequest = false;
    };
  }, [slug]);

  const price = Number(book?.discountPrice ?? book?.price) || 0;
  const originalPrice = Number(book?.price) || 0;
  const finalPrice = coupon?.finalAmount ?? price;
  const alreadyPurchased = Boolean(book && hasPurchasedBook(userProfile, book._id));
  const fullPdfUrl = book?.fullPdfFile?.asset?.url || '';
  const coverImageUrl = getHighDefinitionImageUrl(book?.coverImage);
  const category = useMemo(() => {
    const categories = Array.isArray(book?.examCategory) ? book.examCategory : [];
    const exams = Array.isArray(book?.exam) ? book.exam : [];
    return categories.length ? categories.join(' · ') : exams.join(' · ');
  }, [book]);
  const categoryLabel = category || book?.subject || 'Exam Preparation';
  const samplePdfUrl = book?.samplePdf || '';
  const relatedBooks = relatedBooksResult?.slug === slug ? relatedBooksResult.books : [];
  const relatedBooksError = relatedBooksResult?.slug === slug ? relatedBooksResult.error : '';
  const chapters = book?.tableOfContents || book?.indexTable || book?.chapters || [];

  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(''), 3500);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    if (!book) {
      document.title = loading ? 'Loading book | XamToppr' : 'Book not found | XamToppr';
      return undefined;
    }

    const previousTitle = document.title;
    const createdElements = [];
    const description = `${book.title} - ${category || 'Exam preparation'} study book from XamToppr.`;
    const restoreMeta = [
      updateMetaTag('name', 'description', description, createdElements),
      updateMetaTag('property', 'og:type', 'product', createdElements),
      updateMetaTag('property', 'og:title', `${book.title} | XamToppr`, createdElements),
      updateMetaTag('property', 'og:description', description, createdElements),
      updateMetaTag('property', 'og:url', window.location.href, createdElements),
      updateMetaTag('property', 'og:image', coverImageUrl, createdElements),
      updateMetaTag('name', 'twitter:card', 'summary_large_image', createdElements),
      updateMetaTag('name', 'twitter:title', `${book.title} | XamToppr`, createdElements),
      updateMetaTag('name', 'twitter:description', description, createdElements),
      updateCanonicalUrl(window.location.href, createdElements)
    ];

    document.title = `${book.title} | XamToppr`;
    return () => {
      document.title = previousTitle;
      restoreMeta.forEach((restore) => restore());
      createdElements.forEach((element) => element.remove());
    };
  }, [book, category, coverImageUrl, loading]);

  const copyBookLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Book link copied to clipboard.');
    } catch (error) {
      console.error('Unable to copy the book link:', error);
      showToast('Could not copy the link. Please copy it from your browser address bar.');
    }
  };

  const shareMessage = `Check out this book: ${book?.title || ''} - ${window.location.href}`;
  const shareUrl = encodeURIComponent(window.location.href);

  const handlePurchase = async () => {
    if (paymentInProgressRef.current || !book) return;
    if (!currentUser || !/^[6-9]\d{9}$/.test(userProfile?.phone?.trim() || '')) {
      setShowAuthModal(true);
      return;
    }

    paymentInProgressRef.current = true;
    setPaymentInProgress(true);
    await initiatePayment({
      items: [{
        id: book._id,
        sanityId: book._id,
        title: book.title,
        offerPrice: price
      }],
      totalAmount: finalPrice,
      couponCode: coupon?.code || '',
      user: currentUser,
      phone: userProfile.phone,
      refreshUserProfile,
      onSuccess: () => {
        paymentInProgressRef.current = false;
        setPaymentInProgress(false);
        setPurchaseComplete(true);
        showToast('Purchase complete. Your book is now in My Library.');
      },
      onFailure: (error) => {
        paymentInProgressRef.current = false;
        setPaymentInProgress(false);
        showToast(error.message || 'Payment could not be completed.');
      }
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {toastMessage && (
        <div role="status" className="fixed bottom-5 left-4 right-4 z-[100] mx-auto max-w-md rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white shadow-2xl sm:left-auto sm:right-5">
          {toastMessage}
        </div>
      )}

      <header className="border-b border-blue-950/10 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link to="/" aria-label="XamToppr home" className="shrink-0">
            <img src="/xamtoppr-logo.png" alt="XamToppr" className="h-10 w-auto sm:h-12" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden min-h-11 items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:inline-flex">
              <ArrowLeft className="mr-2 h-4 w-4" /> Explore Books
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-10">
        {loading ? (
          <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading book details…</div>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{loadError}</div>
        ) : !book ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-2xl font-black text-slate-950">Book not found</h1>
            <p className="mt-2 text-slate-600">This book may have been removed or its link may be incorrect.</p>
            <Link to="/" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-blue-950 px-4 py-2.5 text-sm font-bold text-white">Explore Books</Link>
          </div>
        ) : (
          <>
            <Link to="/" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-900 hover:underline lg:hidden">
              <ArrowLeft className="h-4 w-4" /> Explore Books
            </Link>

            <article className="grid min-w-0 grid-cols-1 gap-7 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(260px,300px)] lg:items-start lg:gap-7 xl:gap-9">
              <section aria-label="Book cover and sharing" className="order-1 mx-auto w-full max-w-[360px] min-w-0 lg:sticky lg:top-6 lg:max-w-none">
                <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt={`${book.title} cover`} className="h-full w-full rounded-2xl object-contain" fetchPriority="high" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-br from-blue-950 to-indigo-900 p-8 text-center text-white">
                      <BookOpen className="h-16 w-16 text-amber-300" />
                      <span className="text-xl font-black">{book.title}</span>
                    </div>
                  )}
                </div>

                {samplePdfUrl && (
                  <a href={samplePdfUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 py-3 text-sm font-extrabold text-white shadow transition hover:bg-blue-900">
                    <BookOpen className="h-4 w-4" /> Read Sample PDF
                  </a>
                )}

                <section aria-labelledby="share-book-title" className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 id="share-book-title" className="text-sm font-extrabold text-slate-900">Share Book</h2>
                  <div className="mt-3 grid gap-2">
                    <button type="button" onClick={copyBookLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50">
                      <Copy className="h-4 w-4" /> Copy Link
                    </button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-500">
                      <MessageCircle className="h-4 w-4" /> Share on WhatsApp
                    </a>
                    <a href={`https://t.me/share/url?url=${shareUrl}&text=${encodeURIComponent(`Check out this book: ${book.title}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sky-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-sky-500">
                      <Send className="h-4 w-4" /> Share on Telegram
                    </a>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Follow XamToppr</p>
                    <div className="flex flex-wrap gap-2">
                      {SOCIAL_CHANNELS.map((channel) => <FollowIconLink key={channel.label} channel={channel} />)}
                    </div>
                  </div>
                </section>
              </section>

              <div className="order-2 min-w-0 lg:order-2">
                <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                  <Link to="/" className="min-h-11 inline-flex items-center text-blue-900 hover:underline">Home</Link>
                  <span aria-hidden="true">/</span>
                  <span className="truncate">{categoryLabel}</span>
                </nav>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black tracking-wide text-rose-700">
                    <Sparkles className="h-3.5 w-3.5" /> NEW LAUNCH
                  </span>
                </div>
                <h1 className="mt-3 break-words text-3xl font-black leading-tight tracking-tight text-blue-950 sm:text-4xl">{book.title}</h1>
                {(book.author || book.publisher) && (
                  <p className="mt-2 text-sm text-slate-600">{[book.author, book.publisher].filter(Boolean).join(' · ')}</p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="flex min-h-[68px] items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-800">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold">Pages<br /><strong>{book.totalPages || '300+'}</strong></span>
                  </div>
                  <div className="flex min-h-[68px] items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-800">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold">File size<br /><strong>{book.fileSize || '5.40 MB'}</strong></span>
                  </div>
                  <div className="flex min-h-[68px] items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-800">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold">Edition<br /><strong>2026</strong></span>
                  </div>
                  <div className="flex min-h-[68px] items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-800">
                    <Globe2 className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold">Language<br /><strong>{book.language || 'Hindi'}</strong></span>
                  </div>
                </div>

                <div className="my-3 flex flex-wrap items-center gap-3">
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" /> Easy Refund
                  </span>
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                    <LockKeyhole className="h-4 w-4 shrink-0 text-blue-700" /> Secure Payment
                  </span>
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800">
                    <Headphones className="h-4 w-4 shrink-0 text-violet-600" /> 24/7 Support
                  </span>
                </div>

                <section id="book-pricing" aria-label="Book pricing and purchase" className="mt-5 scroll-mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-3xl font-black text-emerald-700">{price > 0 ? formatPrice(finalPrice) : 'FREE'}</span>
                    {coupon && <span className="text-sm font-semibold text-emerald-700">You save {formatPrice(coupon.discountAmount)}</span>}
                    {originalPrice > price && <span className="text-sm text-slate-500 line-through">{formatPrice(originalPrice)}</span>}
                    {originalPrice > price && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Special price</span>}
                  </div>

                  {price > 0 && !alreadyPurchased && !purchaseComplete && (
                    <CouponField orderAmount={price} onChange={setCoupon} className="mt-4" />
                  )}

                  {alreadyPurchased || purchaseComplete ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link to="/my-library" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-600">
                        <Check className="h-4 w-4" /> Go to My Library
                      </Link>
                      {fullPdfUrl && (
                        <a href={fullPdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-700 px-5 py-3 text-sm font-extrabold text-emerald-800 hover:bg-emerald-50">
                          <BookOpen className="h-4 w-4" /> Read Full Book
                        </a>
                      )}
                    </div>
                  ) : price > 0 ? (
                    <button
                      type="button"
                      onClick={handlePurchase}
                      disabled={paymentInProgress}
                      className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {paymentInProgress ? 'Opening secure checkout…' : coupon ? `Pay • ${formatPrice(finalPrice)}` : `Buy Now • ${formatPrice(finalPrice)}`}
                    </button>
                  ) : fullPdfUrl ? (
                    <a href={fullPdfUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-500">
                      <BookOpen className="h-4 w-4" /> Read / Download Free Book
                    </a>
                  ) : (
                    <p className="mt-4 text-sm font-semibold text-slate-600">Free book. The full PDF will be available soon.</p>
                  )}
                </section>

                <section className="mt-8" aria-labelledby="about-book-title">
                  <h2 id="about-book-title" className="text-xl font-extrabold text-slate-950">About this book</h2>
                  {book.description ? (
                    <div className="prose prose-slate mt-3 max-w-none text-sm leading-7">
                      <PortableText value={book.description} />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slate-600">Get focused preparation material for {categoryLabel} with this XamToppr book.</p>
                  )}
                </section>

                <section className="mt-8" aria-labelledby="book-index-title">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="book-index-title" className="text-xl font-extrabold text-slate-950">Table of Contents / Complete Index</h2>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">{chapters.length} Chapters</span>
                  </div>
                  {Array.isArray(chapters) && chapters.length > 0 ? (
                    <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                      {chapters.map((item, index) => (
                        <li key={item._key || `${item.title}-${index}`} className="flex min-h-16 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:shadow-sm">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-black text-blue-900">{item.chapterNo || index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-bold text-slate-800">{item.title}</p>
                            {(item.pageRange || item.pageNumber) && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                Pages {item.pageRange || item.pageNumber}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">The complete index will be available soon.</p>
                  )}
                </section>

                <section className="mt-8" aria-labelledby="book-faq-title">
                  <h2 id="book-faq-title" className="text-xl font-extrabold text-slate-950">Book FAQs</h2>
                  <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {FAQS.map((faq) => (
                      <details key={faq.question} className="group">
                        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
                          <span>{faq.question}</span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" />
                        </summary>
                        <p className="px-4 pb-4 text-sm leading-6 text-slate-600">{faq.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              </div>

              <aside aria-label="Popular books and community" className="order-3 min-w-0 space-y-5 lg:sticky lg:top-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-extrabold text-slate-950">Popular / Trending Books</h2>
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  </div>
                  {relatedBooksError ? (
                    <p role="status" className="mt-3 text-sm text-slate-500">{relatedBooksError}</p>
                  ) : relatedBooks.length > 0 ? (
                    <ul className="mt-3 space-y-3">
                      {relatedBooks.map((relatedBook) => {
                        const relatedPrice = Number(relatedBook.price) || 0;
                        return (
                          <li key={relatedBook._id} className="flex min-w-0 gap-3 rounded-xl border border-slate-100 p-2.5">
                            <Link to={`/book/${encodeURIComponent(relatedBook.slug)}`} className="h-[76px] w-[58px] shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              {relatedBook.coverImage ? (
                                <img src={relatedBook.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />
                              ) : <BookOpen className="m-4 h-7 w-7 text-slate-400" />}
                            </Link>
                            <div className="flex min-w-0 flex-1 flex-col items-start">
                              <Link to={`/book/${encodeURIComponent(relatedBook.slug)}`} className="line-clamp-2 text-sm font-bold text-slate-800 hover:text-blue-900">
                                {relatedBook.title}
                              </Link>
                              <span className="mt-1 text-sm font-extrabold text-emerald-700">{relatedPrice > 0 ? formatPrice(relatedPrice) : 'FREE'}</span>
                              <Link to={`/book/${encodeURIComponent(relatedBook.slug)}`} className="mt-auto inline-flex min-h-11 items-center gap-1 text-xs font-bold text-blue-900 hover:underline">
                                View Book <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">More books coming soon.</p>
                  )}
                </section>

                <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-5 text-slate-950 shadow-sm">
                  <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide">
                    <Tag className="h-3.5 w-3.5" /> Special Offer Alert!
                  </span>
                  <h2 className="mt-3 text-lg font-black leading-snug">Get exam-ready with this book</h2>
                  <p className="mt-1 text-sm font-medium text-slate-800">Apply an active coupon at checkout and save on your order.</p>
                  <a href="#book-pricing" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700">
                    View Price &amp; Coupons
                  </a>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <h2 className="text-base font-extrabold text-slate-950">Join Our Community</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Join XamToppr Official Channels for Free PDFs &amp; Daily Updates</p>
                  <div className="mt-4 grid gap-2">
                    <ChannelButton channel={SOCIAL_CHANNELS[0]} className="bg-red-600 text-white hover:bg-red-500">Subscribe for Solutions</ChannelButton>
                    <ChannelButton channel={SOCIAL_CHANNELS[1]} className="bg-sky-600 text-white hover:bg-sky-500">Join for Free PDFs</ChannelButton>
                    <ChannelButton channel={SOCIAL_CHANNELS[2]} className="bg-emerald-600 text-white hover:bg-emerald-500">Follow for Exam Alerts</ChannelButton>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SOCIAL_CHANNELS.slice(3).map((channel) => (
                      <ChannelButton key={channel.label} channel={channel} className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50">{channel.label}</ChannelButton>
                    ))}
                  </div>
                </section>
              </aside>
            </article>
          </>
        )}
      </main>

      <Footer className="mt-16" />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
