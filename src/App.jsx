import UserButton from './components/auth/UserButton';
import AuthModal from './components/auth/AuthModal';
import CartDrawer from './components/cart/CartDrawer';
import CouponField from './components/coupon/CouponField';
import Footer from './components/Footer';
import MyLibrary from './components/profile/MyLibrary';
import VideoCoursesPage from './pages/VideoCoursesPage';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { logUserActivity } from './services/activityTracker';
import { initiatePayment } from './services/paymentService';
import { calculateCourseExpiryDate, getCourseValidity } from './utils/courseValidity';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { PortableText } from '@portabletext/react';
import sharedPortableTextComponents from './components/PortableTextComponents';
import { Studio } from 'sanity';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import sanityConfig from '../sanity.config.js';
import sanityClient from './sanityClient';
import BookDetailPage from './pages/BookDetailPage';
import {
  BOOKS_FOR_STORE_QUERY,
  examNotificationDetailQuery,
  examNotificationsQuery,
  siteSettingsQuery
} from './sanityQueries';
import {
  Search,
  BookOpen,
  Download,
  Eye,
  Filter,
  X,
  Star,
  ChevronRight,
  ChevronLeft,
  BookMarked,
  FileText,
  Share2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Menu,
  RotateCcw,
  Languages,
  Layers,
  Award,
  Clock,
  ExternalLink,
  ShoppingCart,
  Maximize2,
  CalendarDays,
  Bell,
  ClipboardList,
  FileCheck2,
  PlayCircle
} from 'lucide-react';

const EXAM_CATEGORIES = [
  'All Exams',
  'SSC',
  'Banking',
  'Railway',
  'UPSC',
  'State Exams',
  'Defence',
  'Teaching'
];

const getPortableTextPlainText = (content) => {
  if (Array.isArray(content)) {
    return content
      .flatMap((block) => {
        if (block?._type === 'table') {
          return (block.rows || []).flatMap((row) => row.cells || []);
        }
        if (block?._type === 'image') return block.alt ? [block.alt] : [];
        return (block.children || []).map((child) => child.text || '');
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return String(content || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/(\*\*|__|`|~~|\*)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const hasRealContent = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasRealContent);
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => key !== '_key' && key !== '_type')
      .some(([, item]) => hasRealContent(item));
  }
  return false;
};

const isAbortError = (error) => error?.name === 'AbortError';

const normalizeBookIdentifier = (value) => (
  typeof value === 'string' ? value.trim().replace(/^drafts\./, '') : ''
);

const hasBookAlreadyBeenPurchased = (profile, book) => {
  if (!profile || !book) return false;

  const bookIdentifiers = new Set([
    book.sanityId,
    book.id
  ].map(normalizeBookIdentifier).filter(Boolean));
  const bookSlug = typeof book.slug === 'string' ? book.slug.trim() : '';
  const bookTitle = typeof book.title === 'string' ? book.title.trim().toLocaleLowerCase() : '';
  const matchesPurchase = (purchase) => {
    if (typeof purchase === 'string') {
      return bookIdentifiers.has(normalizeBookIdentifier(purchase))
        || (Boolean(bookSlug) && purchase === bookSlug)
        || (Boolean(bookTitle) && purchase.trim().toLocaleLowerCase() === bookTitle);
    }
    if (!purchase || typeof purchase !== 'object') return false;

    const identifiers = [
      purchase._ref,
      purchase.book?._ref,
      purchase.bookId,
      purchase.id,
      purchase.sanityId,
      purchase._id
    ];
    if (identifiers.some((identifier) => (
      bookIdentifiers.has(normalizeBookIdentifier(identifier))
    ))) return true;

    const slugs = [purchase.slug, purchase.bookSlug]
      .map((value) => typeof value === 'string' ? value : value?.current)
      .filter(Boolean);
    if (bookSlug && slugs.includes(bookSlug)) return true;

    const titles = [purchase.title, purchase.bookTitle]
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim().toLocaleLowerCase());
    return Boolean(bookTitle) && titles.includes(bookTitle);
  };

  return (Array.isArray(profile.purchasedBookIds)
    && profile.purchasedBookIds.some(matchesPurchase))
    || (Array.isArray(profile.purchasedBooks)
      && profile.purchasedBooks.some(matchesPurchase));
};

const getHighDefinitionSanityImageUrl = (assetUrl) => {
  if (!assetUrl) return '';
  try {
    const imageUrl = new URL(assetUrl);
    if (imageUrl.hostname !== 'cdn.sanity.io') return assetUrl;
    imageUrl.searchParams.set('w', '1600');
    imageUrl.searchParams.set('q', '95');
    imageUrl.searchParams.set('auto', 'format');
    imageUrl.searchParams.set('dpr', String(window.devicePixelRatio || 1));
    return imageUrl.toString();
  } catch {
    console.error('Unable to prepare Sanity image URL.');
    return assetUrl;
  }
};

const formatNotificationDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const getNotificationGradient = (category = '') => {
  const palettes = [
    'from-indigo-950 via-blue-800 to-cyan-600',
    'from-fuchsia-950 via-purple-800 to-indigo-600',
    'from-emerald-950 via-teal-800 to-cyan-600',
    'from-rose-950 via-red-800 to-orange-500',
    'from-slate-950 via-blue-900 to-violet-700'
  ];
  const paletteIndex = [...category].reduce((sum, character) => sum + character.charCodeAt(0), 0) % palettes.length;
  return palettes[paletteIndex];
};

const DEFAULT_SITE_SETTINGS = {
  supportHelpline: '+91 77177 07121',
  supportEmail: 'info@xamtoppr.com'
};

const SITE_CONTENT_PAGES = {
  '/about-us': { title: 'About Us', field: 'aboutContent' },
  '/terms-conditions': { title: 'Terms & Conditions', field: 'termsContent' },
  '/privacy-policy': { title: 'Privacy Policy', field: 'privacyContent' },
  '/refund-policy': { title: 'Refund Policy', field: 'refundContent' }
};

const MEDIUM_OPTIONS = ['All Mediums', 'Bilingual (Hindi + English)', 'Hindi Medium', 'English Medium'];

const getTaxonomyValues = (book, key) => {
  const value = book[key];
  return Array.isArray(value) ? value : value ? [value] : [];
};

const getActiveTaxonomyNames = (books, key) => [...new Set(
  books
    .flatMap((book) => getTaxonomyValues(book, key)
      .map((taxonomy) => taxonomy?.isActive === false ? '' : taxonomy?.name || ''))
    .filter(Boolean)
)].sort((a, b) => a.localeCompare(b));

const SORT_OPTIONS = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Highest Rated', value: 'rating' },
  { label: 'Downloads: High to Low', value: 'downloads' },
  { label: 'Book Title (A-Z)', value: 'title-asc' },
  { label: 'Pages: High to Low', value: 'pages-desc' }
];

const formatDownloadCount = (count) => (
  count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count
);

function BookStoreApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile, refreshUserProfile, logout } = useAuth();
  const { cartItems, addToCart, clearCart } = useCart();
  const [booksList, setBooksList] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('All Exams');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedMedium, setSelectedMedium] = useState('All Mediums');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [showPreviousYearPapers, setShowPreviousYearPapers] = useState(false);
  const [showMockTests, setShowMockTests] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [savedBooks, setSavedBooks] = useState(['xt-bk-001']);
  const [selectedBookForModal, setSelectedBookForModal] = useState(null);
  const [bookCoupon, setBookCoupon] = useState(null);
  const [ratingSelections, setRatingSelections] = useState({});
  const [ratedBooks, setRatedBooks] = useState(() => new Set());
  const [showFlipbookModal, setShowFlipbookModal] = useState(null);
  const [showRequestBookModal, setShowRequestBookModal] = useState(false);
  const [showCheckoutAuthModal, setShowCheckoutAuthModal] = useState(false);
  const [showMobileAuthModal, setShowMobileAuthModal] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [isSubmittingBookRequest, setIsSubmittingBookRequest] = useState(false);
  const [bookRequestError, setBookRequestError] = useState('');
  const [siteSettings, setSiteSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(true);
  const [bookLoadError, setBookLoadError] = useState('');
  const [featuredBookIndex, setFeaturedBookIndex] = useState(0);
  const [isFeaturedCarouselPaused, setIsFeaturedCarouselPaused] = useState(false);
  const [quickFilterBadge, setQuickFilterBadge] = useState('ALL');
  const [flipPageNumber, setFlipPageNumber] = useState(0);
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [currentTab, setCurrentTab] = useState('books');
  const visibleTab = location.pathname.startsWith('/video-courses') ? 'video' : currentTab;
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [selectedBlogDetail, setSelectedBlogDetail] = useState(null);
  const [isLoadingBlogDetail, setIsLoadingBlogDetail] = useState(false);
  const [blogDetailError, setBlogDetailError] = useState('');
  const [blogPosts, setBlogPosts] = useState([]);
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(true);
  const [blogLoadError, setBlogLoadError] = useState('');
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [selectedBlogCategory, setSelectedBlogCategory] = useState('All');
  const [selectedBlogState, setSelectedBlogState] = useState('All');
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }));

  const flipBookRef = useRef(null);
  const paymentInProgressRef = useRef(false);
  const flipAudioRef = useRef(null);
  const downloadedBooksRef = useRef(new Set());
  const lastViewedBookIdRef = useRef(null);
  const selectedBookAmount = Number(selectedBookForModal?.offerPrice) || 0;
  const selectedBookCoupon = bookCoupon
    && bookCoupon.bookId === selectedBookForModal?.sanityId
    && (Number(bookCoupon.orderAmount) || 0) === selectedBookAmount
    ? bookCoupon.value || null
    : null;

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  useEffect(() => {
    const bookId = selectedBookForModal?.sanityId;
    if (!bookId) {
      lastViewedBookIdRef.current = null;
      return;
    }
    if (lastViewedBookIdRef.current === bookId) return;

    lastViewedBookIdRef.current = bookId;
    void logUserActivity('view_book_detail', {
      bookId,
      bookTitle: selectedBookForModal.title
    });
  }, [selectedBookForModal?.sanityId, selectedBookForModal?.title]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setIsMobileFullscreen(isFullscreen);
      if (!isFullscreen && showFlipbookModal) {
        flipBookRef.current?.pageFlip()?.turnToPage(activeSlideIndex);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [activeSlideIndex, showFlipbookModal]);

  // Realistic Page Flip Sound (Direct user-interaction play)
  const playPageFlipSound = () => {
    try {
      const audio = new Audio('/page-flip.mp3');
      audio.volume = 1.0;
      audio.play().catch((error) => {
        if (error.name !== 'NotAllowedError') {
          console.error('Unable to play page-turn audio.');
        }
      });
    } catch {
      console.error('Unable to play page-turn audio.');
    }
  };

  // 1. PDF DETAIL MODAL KE LIYE: Light background par Sharp Black Bold Text
  const renderPdfModalDescription = (text) => {
    if (!text) return '';
    if (Array.isArray(text)) {
      return <PortableText value={text} components={sharedPortableTextComponents} />;
    }
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-extrabold text-slate-950">
            {part.slice(2, -2)}
          </strong>
        );
      }

      return part.replace(/\*/g, '');
    });
  };

  // 2. HANDWRITTEN 3D FLIPBOOK KE LIYE: Dark background par Glowing Amber-Yellow Bold Text
  const renderFlipbookDescription = (text) => {
    if (!text) return '';
    if (Array.isArray(text)) {
      return (
        <div className="prose prose-invert prose-sm max-w-none">
          <PortableText value={text} components={sharedPortableTextComponents} />
        </div>
      );
    }
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-black text-amber-300 drop-shadow-sm">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part.replace(/\*/g, '');
    });
  };

  // Load the catalog from Sanity and adapt its documents to the existing store card model.
  useEffect(() => {
    let isCurrentRequest = true;
    sanityClient.fetch(BOOKS_FOR_STORE_QUERY)
      .then((documents) => {
        if (!isCurrentRequest) return;
        if (!Array.isArray(documents)) {
          throw new Error('Sanity books query did not return a list.');
        }
        const books = documents
          .filter((book) => book.title)
          .map((book) => {
            const offerPrice = Number(book.offerPrice) || 0;
            const isFree = offerPrice === 0;
            const badge = book.badge || (isFree ? 'Free Sample' : 'Bestseller');
            const language = book.language === 'Bilingual'
              ? 'Bilingual (Hindi + English)'
              : book.language === 'English' ? 'English Medium' : 'Hindi Medium';

            return {
              sanityId: book._id,
              id: book.bookId || book._id,
              slug: book.slug || book.bookId || book._id,
              title: book.title,
              author: book.author || 'XamToppr Editorial Team',
              publisher: book.publisher || 'XamToppr Publications',
              exam: Array.isArray(book.exam) && book.exam.length
                ? book.exam.join(' / ')
                : book.exam || 'All Exams',
              examCategory: Array.isArray(book.examCategory)
                ? book.examCategory.join(' / ') || 'All Competitive Exams'
                : book.examCategory || 'All Competitive Exams',
              subject: book.subject || 'General Studies',
              tracks: Array.isArray(book.tracks) ? book.tracks : [],
              platforms: Array.isArray(book.platforms) ? book.platforms : [],
              masterSubject: book.masterSubject || null,
              module: book.module || null,
              topic: book.topic || null,
              language,
              pages: Number(book.totalPages) || 0,
              fileSize: book.fileSize || '',
              rating: Number(book.rating) || 4.8,
              totalReviews: Number(book.totalReviews ?? 1),
              downloadsCount: Number(book.downloadsCount) || 0,
              badge,
              badgeColor: isFree ? 'bg-amber-500' : 'bg-emerald-600',
              coverGradient: 'from-blue-900 via-indigo-950 to-slate-900',
              coverAccent: 'text-amber-400',
              coverImage: getHighDefinitionSanityImageUrl(book.coverImageUrl),
              samplePdfUrl: book.samplePdfUrl || '',
              pdfUrl: isFree ? book.pdfUrl || book.samplePdfUrl || '' : '',
              samplePages: Array.isArray(book.samplePages)
                ? book.samplePages.filter(Boolean).map(getHighDefinitionSanityImageUrl)
                : [],
              isFree,
              isPaid: !isFree,
              packType: isFree ? 'Free' : 'Paid',
              price: isFree ? 'FREE' : `₹${offerPrice}`,
              mrp: Number(book.mrp) || 0,
              offerPrice,
              format: book.format || 'eBook (PDF)',
              amazonUrl: book.amazonUrl || '',
              flipkartUrl: book.flipkartUrl || '',
              sampleFlipbookUrl: book.sampleFlipbookUrl || '',
              isFeatured: Boolean(book.isFeatured),
              isPreviousYear: Boolean(book.isPreviousYear),
              isMockTest: Boolean(book.isMockTest),
              publishedYear: new Date().getFullYear().toString(),
              description: book.description || '',
              descriptionText: getPortableTextPlainText(book.description),
              tableOfContents: Array.isArray(book.tableOfContents)
                ? book.tableOfContents.filter((chapter) => chapter?.title)
                : []
            };
          });
        setBooksList(books);
        setBookLoadError('');
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        console.error('Failed to load books from Sanity.');
        if (isCurrentRequest) {
          setBookLoadError('Books could not be loaded from Sanity. Please try again later.');
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoadingSkeleton(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;
    sanityClient.fetch(siteSettingsQuery)
      .then((settings) => {
        if (isCurrentRequest && settings) {
          setSiteSettings({
            supportHelpline: settings.supportHelpline || DEFAULT_SITE_SETTINGS.supportHelpline,
            supportEmail: settings.supportEmail || DEFAULT_SITE_SETTINGS.supportEmail
          });
        }
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        console.error('Failed to load site settings from Sanity.');
      });

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;
    sanityClient.fetch(examNotificationsQuery)
      .then((notifications) => {
        if (!isCurrentRequest) return;
        if (!Array.isArray(notifications)) {
          throw new Error('Sanity notifications query did not return a list.');
        }
        setBlogPosts(notifications);
        setBlogLoadError('');
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        console.error('Failed to load exam notifications from Sanity.');
        if (isCurrentRequest) {
          setBlogLoadError('Exam notifications could not be loaded. Please try again later.');
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoadingBlogs(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  useEffect(() => {
    const notification = selectedBlogDetail || selectedBlog;
    if (!notification) return undefined;

    const overviewText = Array.isArray(notification.overview)
      ? notification.overview
        .flatMap((block) => block.children || [])
        .map((child) => child.text || '')
        .join(' ')
      : notification.overview || '';
    const description = overviewText.replace(/\s+/g, ' ').trim().slice(0, 160);
    const pageTitle = `${notification.title} - Eligibility, Syllabus, Exam Pattern | XamToppr`;
    const pageUrl = window.location.href;
    const faqItems = (notification.faqs || [])
      .filter((faq) => faq.question && faq.answer)
      .map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }));
    const structuredData = [
      ...(faqItems.length ? [{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems
      }] : []),
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: window.location.origin },
          { '@type': 'ListItem', position: 2, name: 'Exam Notifications', item: `${window.location.origin}/?tab=blogs` },
          { '@type': 'ListItem', position: 3, name: notification.title, item: pageUrl }
        ]
      }
    ];

    const originalTitle = document.title;
    const changedMeta = [];
    let createdCanonical = false;
    let previousCanonicalHref;
    const upsertMeta = (selector, attribute, key, content) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
        changedMeta.push({ element, originalContent: null });
      } else {
        changedMeta.push({ element, originalContent: element.getAttribute('content') });
      }
      element.setAttribute('content', content);
    };

    document.title = pageTitle;
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'article');

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
      createdCanonical = true;
    } else {
      previousCanonicalHref = canonical.href;
    }
    canonical.href = pageUrl;

    let jsonLd = document.getElementById('notification-structured-data');
    if (!jsonLd) {
      jsonLd = document.createElement('script');
      jsonLd.id = 'notification-structured-data';
      jsonLd.type = 'application/ld+json';
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(structuredData);

    return () => {
      document.title = originalTitle;
      changedMeta.forEach(({ element, originalContent }) => {
        if (originalContent === null) {
          element.remove();
        } else {
          element.setAttribute('content', originalContent);
        }
      });
      if (createdCanonical) {
        canonical.remove();
      } else if (previousCanonicalHref) {
        canonical.href = previousCanonicalHref;
      }
      document.getElementById('notification-structured-data')?.remove();
    };
  }, [selectedBlog, selectedBlogDetail]);

  useEffect(() => {
    let isCurrentRequest = true;
    const notificationId = selectedBlog?._id;
    setSelectedBlogDetail(null);
    setBlogDetailError('');
    setIsLoadingBlogDetail(Boolean(notificationId));

    if (!notificationId) {
      setIsLoadingBlogDetail(false);
      return () => {
        isCurrentRequest = false;
      };
    }

    sanityClient.fetch(examNotificationDetailQuery, { id: notificationId })
      .then((notification) => {
        if (!isCurrentRequest) return;
        if (!notification) {
          setBlogDetailError('This notification could not be found.');
          return;
        }
        setSelectedBlogDetail(notification);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        console.error('Failed to load exam notification details from Sanity.');
        if (isCurrentRequest) {
          setBlogDetailError('Notification details could not be loaded. Please try again.');
        }
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoadingBlogDetail(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [selectedBlog?._id]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const copyBookLink = async (book) => {
    const bookUrl = `${window.location.origin}/book/${encodeURIComponent(book.slug)}`;
    try {
      await navigator.clipboard.writeText(bookUrl);
      showToast('Book link copied to clipboard!');
    } catch {
      console.error('Unable to copy the book link.');
      showToast('Could not copy the book link. Please try again.');
    }
  };

  const toggleBookmark = (bookId, title) => {
    if (savedBooks.includes(bookId)) {
      setSavedBooks(savedBooks.filter((id) => id !== bookId));
      showToast(`Removed "${title.substring(0, 24)}..." from Saved Library`);
    } else {
      setSavedBooks([...savedBooks, bookId]);
      showToast(`Added "${title.substring(0, 24)}..." to Saved Library!`);
    }
  };

  const updateBookMetrics = (book, metrics) => {
    setBooksList((currentBooks) => currentBooks.map((currentBook) => (
      currentBook.sanityId === book.sanityId ? { ...currentBook, ...metrics } : currentBook
    )));
    setSelectedBookForModal((currentBook) => (
      currentBook?.sanityId === book.sanityId ? { ...currentBook, ...metrics } : currentBook
    ));
    setShowFlipbookModal((currentBook) => (
      currentBook?.sanityId === book.sanityId ? { ...currentBook, ...metrics } : currentBook
    ));
  };

  const handleBookDownload = (book) => {
    if (!book.sanityId) return;

    if (downloadedBooksRef.current.has(book.sanityId)) return;
    const storageKey = `downloaded_${book.sanityId}`;
    try {
      if (localStorage.getItem(storageKey)) {
        downloadedBooksRef.current.add(book.sanityId);
        return;
      }
      localStorage.setItem(storageKey, 'true');
    } catch {
      console.error('Unable to save the book download state.');
    }

    downloadedBooksRef.current.add(book.sanityId);
    updateBookMetrics(book, { downloadsCount: book.downloadsCount + 1 });
    if (sanityClient.config().token) {
      sanityClient.patch(book.sanityId)
        .inc({ downloadsCount: 1 })
        .commit()
        .catch((error) => {
          if (isAbortError(error)) return;
          console.error('Failed to update the book download count in Sanity.');
        });
    }
  };

  const openSampleFlipbook = (book) => {
    void logUserActivity('read_sample_pdf', {
      bookId: book.sanityId,
      bookTitle: book.title
    });
    setShowFlipbookModal(book);
    setFlipPageNumber(0);
    setActiveSlideIndex(0);
  };

  const handlePaidBookPurchase = async (event, book, coupon = null) => {
    event.preventDefault();
    if (hasBookAlreadyBeenPurchased(userProfile, book) || paymentInProgressRef.current) return;
    const hasPhone = /^[6-9]\d{9}$/.test(userProfile?.phone?.trim() || '');
    if (!currentUser || !hasPhone) {
      setShowCheckoutAuthModal(true);
      return;
    }

    paymentInProgressRef.current = true;
    await initiatePayment({
      items: [book],
      totalAmount: coupon?.finalAmount ?? (Number(book.offerPrice) || 0),
      couponCode: coupon?.code || '',
      user: currentUser,
      phone: userProfile.phone,
      refreshUserProfile,
      onSuccess: () => {
        paymentInProgressRef.current = false;
        window.location.assign('/my-library');
      },
      onFailure: (error) => {
        paymentInProgressRef.current = false;
        showToast(error.message || 'Payment could not be completed.');
      }
    });
  };

  const handleAddToCart = (book) => {
    try {
      addToCart(book);
      if (cartItems.some((item) => item.id === (book.sanityId || book.id))) {
        setShowCartDrawer(true);
      } else {
        showToast(book.productType === 'videoCoursePack'
          ? `Added video course "${book.title}" to your cart.`
          : `Added "${book.title}" to your cart.`);
      }
    } catch {
      console.error('Unable to add this product to the cart.');
      showToast('This item could not be added to your cart.');
    }
  };

  const handleCartCheckout = async (items, coupon = null) => {
    if (paymentInProgressRef.current) return;
    const hasPhone = /^[6-9]\d{9}$/.test(userProfile?.phone?.trim() || '');
    if (!currentUser || !hasPhone) {
      setShowCheckoutAuthModal(true);
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      showToast('Your cart is empty.');
      return;
    }

    setShowCartDrawer(false);
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
        if (items.length === 1 && items[0].productType === 'videoCoursePack' && items[0].slug) {
          navigate(`/video-courses/${encodeURIComponent(items[0].slug)}`);
        } else {
          const containsCourse = items.some((item) => item.productType === 'videoCoursePack');
          if (containsCourse) {
            navigate('/video-courses');
            showToast('Payment successful. Your video course is now available.');
          } else {
            window.location.assign('/my-library');
          }
        }
      },
      onFailure: (error) => {
        paymentInProgressRef.current = false;
        showToast(error.message || 'Payment could not be completed.');
      }
    });
  };

  const handleBuyVideoCourse = (course) => {
    handleAddToCart({
      ...course,
      id: course.id,
      sanityId: course.id,
      productType: 'videoCoursePack',
      offerPrice: course.price,
      displayPrice: `₹${Number(course.price).toLocaleString('en-IN')}`,
      coverImage: course.thumbnailUrl || '',
      packPurpose: course.packPurpose || 'Individual'
    });
    setShowCartDrawer(true);
  };

  const handleEnrollVideoCourse = async (course) => {
    if (!currentUser) {
      setShowCheckoutAuthModal(true);
      return false;
    }
    const enrolled = await logUserActivity('enroll_free_course', {
      courseId: course.id,
      courseTitle: course.title,
      productType: 'videoCoursePack',
      phone: userProfile?.phone || ''
    });
    if (enrolled) await refreshUserProfile();
    return enrolled;
  };

  const courseEntitlements = [
    ...(Array.isArray(userProfile?.enrolledCourses) ? userProfile.enrolledCourses : []),
    ...(Array.isArray(userProfile?.purchasedCourses) ? userProfile.purchasedCourses : [])
  ];
  const courseEntitlementsById = new Map();
  for (const entitlement of courseEntitlements) {
    const courseId = typeof entitlement === 'string'
      ? entitlement
      : entitlement?.courseId || entitlement?.course?._ref || entitlement?._ref;
    if (courseId) courseEntitlementsById.set(courseId, entitlement);
  }
  const courseExpiryById = Object.fromEntries([...courseEntitlementsById].map(([courseId, entitlement]) => {
    const startDate = entitlement?.purchasedAt || entitlement?.enrolledAt || entitlement?.purchaseDate;
    const expiry = entitlement?.expiresAt || calculateCourseExpiryDate(startDate, entitlement?.duration);
    return [courseId, expiry || null];
  }));
  const getCourseIds = (idField, entryField) => [...new Set([
    ...(Array.isArray(userProfile?.[idField]) ? userProfile[idField] : []),
    ...(Array.isArray(userProfile?.[entryField])
      ? userProfile[entryField].map((entry) => (
        typeof entry === 'string'
          ? entry
          : entry?.courseId || entry?.course?._ref || entry?._ref
      )).filter(Boolean)
      : [])
  ])];
  const getActiveCourseIds = (ids) => ids.filter((courseId) => (
    !courseExpiryById[courseId] || getCourseValidity(courseExpiryById[courseId]).isActive
  ));
  const allEnrolledCourseIds = getCourseIds('enrolledCourseIds', 'enrolledCourses');
  const allPurchasedCourseIds = getCourseIds('purchasedCourseIds', 'purchasedCourses');
  const enrolledCourseIds = getActiveCourseIds(allEnrolledCourseIds);
  const purchasedCourseIds = getActiveCourseIds(allPurchasedCourseIds);
  const expiredCourseIds = [...new Set([...allEnrolledCourseIds, ...allPurchasedCourseIds])].filter((courseId) => (
    Boolean(courseExpiryById[courseId]) && getCourseValidity(courseExpiryById[courseId]).isExpired
  ));

  const handleBookRating = (book, userStar) => {
    if (!book.sanityId) return false;

    const storageKey = `rated_${book.sanityId}`;
    try {
      if (localStorage.getItem(storageKey)) return false;
      localStorage.setItem(storageKey, String(userStar));
    } catch {
      console.error('Unable to save the book rating state.');
      return false;
    }

    setRatedBooks((currentRatedBooks) => new Set(currentRatedBooks).add(book.sanityId));
    const totalReviews = book.totalReviews;
    const newAvg = ((book.rating * totalReviews) + userStar) / (totalReviews + 1);
    updateBookMetrics(book, {
      rating: newAvg,
      totalReviews: totalReviews + 1
    });
    if (sanityClient.config().token) {
      sanityClient.patch(book.sanityId)
        .set({ rating: newAvg })
        .inc({ totalReviews: 1 })
        .commit()
        .catch((error) => {
          if (isAbortError(error)) return;
          console.error('Failed to update the book rating in Sanity.');
        });
    }
    return true;
  };

  const handleBookRequestSubmit = async (event) => {
    event.preventDefault();
    setIsSubmittingBookRequest(true);
    setBookRequestError('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const request = {
      studentName: String(formData.get('studentName') || '').trim(),
      contactNumber: String(formData.get('contactNumber') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      requestedBookTitle: String(formData.get('requestedBookTitle') || '').trim(),
      examCategory: String(formData.get('examCategory') || '').trim() || 'Other',
      additionalDetails: String(formData.get('additionalDetails') || '').trim()
    };

    try {
      const response = await fetch('/api/request-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      const responseText = await response.text();
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(
          response.ok
            ? 'The book request service is unavailable. Run the configured Vite or Vercel server.'
            : `The request service returned an invalid response (HTTP ${response.status}).`
        );
      }
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `The request could not be submitted (HTTP ${response.status}).`);
      }

      form.reset();
      setShowRequestBookModal(false);
      showToast('Your book request has been submitted successfully!');
    } catch {
      if (isAbortError(error)) return;
      console.error('Failed to submit the book request.');
      setBookRequestError(error instanceof Error && error.message
        ? error.message
        : 'Your request could not be submitted. Please try again.');
    } finally {
      setIsSubmittingBookRequest(false);
    }
  };

  const hasStoredBookRating = (sanityId) => {
    if (!sanityId) return false;
    try {
      return Boolean(localStorage.getItem(`rated_${sanityId}`));
    } catch {
      console.error('Unable to load the saved book rating state.');
      return false;
    }
  };

  const handleCategoryChange = (exam) => {
    setSelectedExam(exam);
    setIsLoadingSkeleton(true);
    setTimeout(() => {
      setIsLoadingSkeleton(false);
    }, 280);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedExam('All Exams');
    setSelectedTrack('');
    setSelectedPlatform('');
    setSelectedMedium('All Mediums');
    setSelectedSubject('All Subjects');
    setSelectedTopic('');
    setShowPreviousYearPapers(false);
    setShowMockTests(false);
    setQuickFilterBadge('ALL');
    setSortBy('popular');
    showToast('Filters cleared successfully');
  };

  const scopedBooksForTaxonomy = useMemo(() => {
    const byTrack = booksList.filter((book) => (
      !selectedTrack || book.tracks.some((track) => track?.name === selectedTrack)
    ));
    const byPlatform = byTrack.filter((book) => (
      !selectedPlatform || book.platforms.some((platform) => platform?.name === selectedPlatform)
    ));
    return byPlatform;
  }, [booksList, selectedTrack, selectedPlatform]);

  const taxonomyOptions = useMemo(() => {
    const subjectBooks = scopedBooksForTaxonomy.filter((book) => (
      selectedSubject === 'All Subjects'
      || book.masterSubject?.name === selectedSubject
      || book.subject === selectedSubject
    ));
    const subjects = [...new Set(
      scopedBooksForTaxonomy
        .flatMap((book) => [
          book.masterSubject?.isActive === false ? '' : book.masterSubject?.name || '',
          book.subject
        ])
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    return {
      tracks: getActiveTaxonomyNames(booksList, 'tracks'),
      platforms: getActiveTaxonomyNames(
        booksList.filter((book) => !selectedTrack
          || book.tracks.some((track) => track?.name === selectedTrack)),
        'platforms'
      ),
      subjects,
      topics: getActiveTaxonomyNames(subjectBooks, 'topic')
    };
  }, [booksList, scopedBooksForTaxonomy, selectedTrack, selectedSubject]);

  const filteredBooks = useMemo(() => {
    return booksList.filter((book) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = book.title.toLowerCase().includes(query);
        const matchSubject = book.subject.toLowerCase().includes(query);
        const matchExam = book.exam.toLowerCase().includes(query) || book.examCategory.toLowerCase().includes(query);
        const matchTaxonomy = [
          ...book.tracks.map((track) => track?.name),
          ...book.platforms.map((platform) => platform?.name),
          book.masterSubject?.name,
          book.module?.name,
          book.topic?.name
        ].some((value) => value?.toLowerCase().includes(query));
        const matchAuthor = book.author.toLowerCase().includes(query);
        const matchDesc = book.descriptionText.toLowerCase().includes(query);
        if (!matchTitle && !matchSubject && !matchExam && !matchTaxonomy && !matchAuthor && !matchDesc) {
          return false;
        }
      }

      if (selectedExam !== 'All Exams') {
        if (selectedExam === 'NOTES') {
          const isNote = 
            book.badge.toUpperCase().includes('NOTES') || 
            book.title.toUpperCase().includes('NOTES') || 
            book.examCategory.toUpperCase().includes('NOTES') ||
            book.samplePages.length > 0;
          if (!isNote) return false;
        } else {
          if (selectedExam === 'State Exams' && !book.exam.includes('State Exams')) return false;
          if (selectedExam !== 'State Exams' && !book.exam.includes(selectedExam) && book.exam !== 'All Exams') return false;
        }
      }

      if (selectedTrack && !book.tracks.some((track) => track?.name === selectedTrack)) return false;
      if (selectedPlatform && !book.platforms.some((platform) => platform?.name === selectedPlatform)) return false;
      if (selectedTopic && book.topic?.name !== selectedTopic) return false;
      if (showPreviousYearPapers && !book.isPreviousYear) return false;
      if (showMockTests && !book.isMockTest) return false;

      if (selectedMedium !== 'All Mediums') {
        if (!book.language.toLowerCase().includes(selectedMedium.toLowerCase().split(' ')[0])) {
          return false;
        }
      }

      if (selectedSubject !== 'All Subjects') {
        if (book.masterSubject?.name !== selectedSubject && book.subject !== selectedSubject) return false;
      }

      if (quickFilterBadge === 'FREE' && !book.isFree) return false;
      if (quickFilterBadge === 'POPULAR' && !['POPULAR', 'BESTSELLER', 'MOST DOWNLOADED'].includes(book.badge)) return false;
      if (quickFilterBadge === 'TOPPER' && !book.badge.toUpperCase().includes('TOPPER')) return false;
      if (quickFilterBadge === 'NOTES' && !(book.badge.toUpperCase().includes('NOTES') || book.samplePages.length > 0)) return false;
      if (quickFilterBadge === 'NEW' && book.badge !== 'NEW 2026') return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'popular') return b.totalReviews - a.totalReviews;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      if (sortBy === 'pages-desc') return b.pages - a.pages;
      if (sortBy === 'downloads') {
        return b.downloadsCount - a.downloadsCount;
      }
      return 0;
    });
  }, [
    booksList,
    searchQuery,
    selectedExam,
    selectedTrack,
    selectedPlatform,
    selectedMedium,
    selectedSubject,
    selectedTopic,
    showPreviousYearPapers,
    showMockTests,
    quickFilterBadge,
    sortBy
  ]);

  const featuredBooks = useMemo(() => {
    const highlightedBooks = booksList.filter((book) =>
      book.isFeatured || ['bestseller', 'new launch', 'trending'].includes(book.badge.toLowerCase())
    );
    return highlightedBooks.length >= 2 ? highlightedBooks : booksList.slice(0, 4);
  }, [booksList]);

  useEffect(() => {
    setFeaturedBookIndex((index) => featuredBooks.length ? index % featuredBooks.length : 0);
  }, [featuredBooks.length]);

  useEffect(() => {
    if (isFeaturedCarouselPaused || featuredBooks.length < 2) return undefined;
    const intervalId = window.setInterval(() => {
      setFeaturedBookIndex((index) => (index + 1) % featuredBooks.length);
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [featuredBooks.length, isFeaturedCarouselPaused]);

  const blogCategories = useMemo(
    () => ['All', ...new Set([
      'SSC',
      'Railway',
      'Banking',
      'Teaching',
      'Defence',
      'State Exams',
      'UPSC',
      ...blogPosts.map((post) => post.examCategory)
    ].filter(Boolean))],
    [blogPosts]
  );

  const blogStates = useMemo(
    () => ['All', ...new Set([
      'All India / Central',
      'All India',
      'Central',
      'Bihar',
      'Uttar Pradesh',
      'Andhra Pradesh',
      'Arunachal Pradesh',
      'Assam',
      'Chhattisgarh',
      'Goa',
      'Gujarat',
      'Haryana',
      'Himachal Pradesh',
      'Jharkhand',
      'Karnataka',
      'Kerala',
      'Maharashtra',
      'Manipur',
      'Meghalaya',
      'Mizoram',
      'Nagaland',
      'Odisha',
      'Punjab',
      'Rajasthan',
      'Madhya Pradesh',
      'Sikkim',
      'Tamil Nadu',
      'Telangana',
      'Tripura',
      'Uttarakhand',
      'West Bengal',
      'Andaman and Nicobar Islands',
      'Chandigarh',
      'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi',
      'Jammu and Kashmir',
      'Ladakh',
      'Lakshadweep',
      'Puducherry',
      ...blogPosts.map((post) => post.state)
    ].filter(Boolean))],
    [blogPosts]
  );

  const filteredBlogPosts = useMemo(() => {
    const query = blogSearchQuery.trim().toLowerCase();
    return blogPosts.filter((post) => {
      const matchesQuery = !query || [
        post.title,
        post.examCategory,
        post.state
      ].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesCategory = selectedBlogCategory === 'All'
        || String(post.examCategory || '').toLowerCase().includes(selectedBlogCategory.toLowerCase());
      const matchesState = selectedBlogState === 'All'
        || String(post.state || '').toLowerCase().includes(selectedBlogState.toLowerCase())
        || (selectedBlogState === 'MP' && String(post.state || '').toLowerCase().includes('madhya pradesh'))
        || (selectedBlogState === 'Madhya Pradesh' && String(post.state || '').toLowerCase() === 'mp')
        || (selectedBlogState === 'All India / Central'
          && (String(post.state || '').toLowerCase().includes('all india') || String(post.state || '').toLowerCase().includes('central')))
        || (selectedBlogState === 'All India' && String(post.state || '').toLowerCase().includes('central'));
      return matchesQuery && matchesCategory && matchesState;
    });
  }, [blogPosts, blogSearchQuery, selectedBlogCategory, selectedBlogState]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Helpline Bar */}
      <div className="bg-[#0b1f44] text-slate-300 text-xs py-2 px-4 sm:px-8 border-b border-blue-950/60 hidden sm:block">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Sparkles className="w-3.5 h-3.5" /> India's #1 Free Exam Prep Library
            </span>
            <span className="hidden md:inline-block text-slate-400">|</span>
            <a href="tel:+917717707121" className="flex items-center gap-1.5 hover:text-white transition">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> Student Helpline: +91 77177 07121
            </a>
            <a href="mailto:info@xamtoppr.com" className="hidden lg:flex items-center gap-1.5 hover:text-white transition">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> info@xamtoppr.com
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
              2026 Updated Syllabus
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0c2356] text-white shadow-lg border-b border-blue-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-3 py-2 sm:min-h-20 sm:gap-4">
            <div className="flex min-w-0 items-center">
              <a href="https://www.xamtoppr.com/" className="flex shrink-0 items-center rounded-lg bg-white px-1.5 py-1 transition hover:opacity-90">
                <img
                  src="/xamtoppr-logo.png"
                  alt="XamToppr - learning for earning"
                  className="h-10 w-auto sm:h-12"
                  width="139"
                  height="75"
                  fetchPriority="high"
                />
              </a>
            </div>

            <nav className="hidden xl:flex items-center gap-0.5 text-xs font-medium">
              <a href="https://www.xamtoppr.com/" className="whitespace-nowrap rounded-lg px-2 py-2 text-slate-200 transition hover:bg-white/5 hover:text-white">
                Home
              </a>
              <Link to="/video-courses" className="whitespace-nowrap rounded-lg px-2 py-2 text-slate-200 transition hover:bg-white/5 hover:text-white">
                Video Courses
              </Link>
              <a href="https://xamtoppr.com/package/combo" className="whitespace-nowrap rounded-lg px-2 py-2 text-slate-200 transition hover:bg-white/5 hover:text-white">
                Test Series
              </a>
              <a href="/" className="relative flex items-center gap-1 rounded-lg bg-white/15 px-2 py-2 font-bold text-amber-400 shadow-inner">
                <BookOpen className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Books & Notes</span>
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-slate-950">
                  Free
                </span>
              </a>
              <a href="https://xamtoppr.com/weekly-quiz" className="whitespace-nowrap rounded-lg px-2 py-2 text-slate-200 transition hover:bg-white/5 hover:text-white">
                Current Affairs
              </a>
              <a href="https://xamtoppr.com/blog" className="whitespace-nowrap rounded-lg px-2 py-2 text-slate-200 transition hover:bg-white/5 hover:text-white">
                PYQ Papers
              </a>
            </nav>

            <div className="hidden xl:flex shrink-0 items-center gap-2">
              <UserButton />
              {currentUser && (
                <a href="/my-library" className="whitespace-nowrap rounded-lg border border-blue-700/60 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-900">
                  My Library
                </a>
              )}
              <button
                type="button"
                onClick={() => setShowCartDrawer(true)}
                aria-label={`Open cart with ${cartItems.length} items`}
                className="relative rounded-lg border border-blue-700/60 p-2 text-white transition hover:bg-blue-900"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-950">
                    {cartItems.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setBookRequestError('');
                  setShowRequestBookModal(true);
                }}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-700/60 bg-blue-900/60 px-2.5 py-2 text-xs font-semibold text-amber-300 transition hover:bg-blue-900 hover:text-white"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Request Book
              </button>
            </div>

            <div className="xl:hidden flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCartDrawer(true)}
                aria-label={`Open cart with ${cartItems.length} items`}
                className="relative rounded-md border border-blue-700 p-2 text-white"
              >
                <ShoppingCart className="h-4 w-4" />
                {cartItems.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black text-slate-950">
                    {cartItems.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setBookRequestError('');
                  setShowRequestBookModal(true);
                }}
                className="rounded-md border border-blue-700 bg-blue-900/60 px-2.5 py-1.5 text-xs text-amber-300"
              >
                Request Book
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-200 hover:text-white hover:bg-blue-900/80 focus:outline-none"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-blue-900/60 bg-[#0a1b3d]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setCurrentTab('books');
                setSelectedBlog(null);
                navigate('/');
              }}
              className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-bold transition ${
                visibleTab === 'books'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
              aria-pressed={visibleTab === 'books'}
            >
              <BookOpen className="h-4 w-4" />
              Study Notes & Books
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setCurrentTab('video');
                setSelectedBlog(null);
                navigate('/video-courses');
              }}
              className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-bold transition ${
                visibleTab === 'video'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
              aria-pressed={visibleTab === 'video'}
            >
              <PlayCircle className="h-4 w-4" />
              Video Courses
            </button>
            {/* Temporarily disabled; blogs hosted at xamtoppr.com. */}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#0a1b3d] border-b border-blue-900 px-4 pt-3 pb-5 space-y-2">
            <a href="https://www.xamtoppr.com/" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50">
              Home
            </a>
            <Link to="/video-courses" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50">
              Video Courses
            </Link>
            <a href="https://xamtoppr.com/package/combo" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50">
              Test Series
            </a>
            <a href="/" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 rounded-lg text-amber-400 font-bold bg-blue-900/60 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Free Books & PDF Library
              </span>
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded">FREE</span>
            </a>
            <a href="https://xamtoppr.com/weekly-quiz" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50">
              Current Affairs
            </a>
            <a href="https://xamtoppr.com/blog" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50">
              PYQ Papers
            </a>
            {currentUser ? (
              <div className="space-y-2 border-t border-blue-800/70 pt-3">
                <div className="flex items-center gap-3 rounded-lg bg-blue-900/50 p-3">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {(currentUser.displayName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{currentUser.displayName || 'Student'}</p>
                    <p className="truncate text-xs text-slate-300">{currentUser.email}</p>
                  </div>
                </div>
                <a
                  href="/my-library"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg border border-blue-700 px-3 py-2.5 text-center text-sm font-semibold text-amber-300 transition hover:bg-blue-900/60"
                >
                  My Library
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void logout().catch(() => console.error('Failed to log out.'));
                  }}
                  className="w-full rounded-lg border border-rose-400/40 px-3 py-2.5 text-center text-sm font-semibold text-rose-200 transition hover:bg-rose-950/40"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 border-t border-blue-800/70 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowMobileAuthModal(true);
                  }}
                  className="rounded-lg border border-blue-700 px-3 py-2.5 text-center text-sm font-semibold text-slate-100 transition hover:bg-blue-900/60"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowMobileAuthModal(true);
                  }}
                  className="rounded-lg bg-amber-500 px-3 py-2.5 text-center text-sm font-bold text-slate-950 transition hover:bg-amber-400"
                >
                  Sign Up Free
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 pb-16">
        {visibleTab === 'books' ? (
          <>
        {/* Featured Books Carousel */}
        <section
          aria-label="Featured books"
          onMouseEnter={() => setIsFeaturedCarouselPaused(true)}
          onMouseLeave={() => setIsFeaturedCarouselPaused(false)}
          className="relative overflow-hidden bg-gradient-to-br from-[#0c2356] via-[#102d6b] to-[#153a8a] text-white shadow-inner"
        >
          <div className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="relative mx-auto h-[560px] max-w-7xl px-4 py-6 sm:h-[470px] sm:px-6 sm:py-12 lg:h-[500px] lg:px-8">
            {featuredBooks.length > 0 ? (
              <>
                {featuredBooks.map((book, index) => (
                  <article
                    key={book.id}
                    aria-hidden={index !== featuredBookIndex}
                    className={`featured-slide absolute inset-0 grid min-w-0 grid-cols-1 grid-rows-[210px_1fr] items-center gap-3 overflow-hidden px-11 pb-12 pt-5 transition-opacity duration-500 sm:grid-rows-1 sm:gap-7 sm:px-12 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(250px,300px)] lg:gap-10 lg:px-16 ${
                      index === featuredBookIndex ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                  >
                    <div className="relative z-10 order-2 min-w-0 max-w-3xl sm:order-1">
                      <div className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-200">
                        <Sparkles className="h-3.5 w-3.5" />
                        {book.badge === 'New Launch' ? '🔥 HOT LAUNCH' : book.badge.toUpperCase()}
                      </div>
                      <h1 className="mt-2 line-clamp-2 max-w-3xl text-2xl font-black leading-tight tracking-tight text-white sm:mt-4 sm:text-4xl lg:text-5xl">
                        {book.title}
                      </h1>
                      <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-relaxed text-blue-100 sm:mt-4 sm:text-base">
                        {book.descriptionText || `Prepare smarter with ${book.subject} resources curated for ${book.exam} aspirants.`}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedBookForModal(book)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg transition hover:bg-amber-300 sm:mt-6 sm:px-5 sm:py-3 sm:text-sm"
                      >
                        View Details <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="relative z-10 order-1 mx-auto flex h-[190px] w-[142px] items-center justify-center sm:order-2 sm:h-[300px] sm:w-[225px] lg:h-[380px] lg:w-[285px]">
                      <div className="absolute inset-3 rounded-full bg-amber-300/20 blur-3xl" />
                      <div className="relative aspect-[3/4] h-full max-h-full w-full overflow-hidden rounded-r-2xl rounded-l-md border border-white/20 bg-slate-950 shadow-[18px_22px_35px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-2 hover:rotate-1">
                        {book.coverImage ? (
                          <img
                            src={book.coverImage}
                            alt={`${book.title} book cover`}
                            className="h-full w-full object-contain"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                              const fallback = event.currentTarget.nextElementSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`${book.coverImage ? 'hidden' : 'flex'} absolute inset-0 flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-950 p-3 text-center sm:p-6`}>
                          <BookOpen className="mb-2 h-8 w-8 text-amber-300 sm:mb-5 sm:h-12 sm:w-12" />
                          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-amber-300 sm:text-[10px]">{book.exam}</span>
                          <span className="mt-2 line-clamp-5 text-xs font-black leading-tight text-white sm:mt-3 sm:text-xl">{book.title}</span>
                          <span className="mt-2 text-[9px] font-semibold text-blue-200 sm:mt-4 sm:text-xs">{book.subject}</span>
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/50 to-transparent" />
                      </div>
                    </div>
                  </article>
                ))}

                {featuredBooks.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous featured book"
                      onClick={() => setFeaturedBookIndex((featuredBookIndex - 1 + featuredBooks.length) % featuredBooks.length)}
                      className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-slate-950/40 p-2.5 text-white backdrop-blur transition hover:bg-white/20 sm:left-6"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next featured book"
                      onClick={() => setFeaturedBookIndex((featuredBookIndex + 1) % featuredBooks.length)}
                      className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-slate-950/40 p-2.5 text-white backdrop-blur transition hover:bg-white/20 sm:right-6"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
                      {featuredBooks.map((book, index) => (
                        <button
                          type="button"
                          key={book.id}
                          aria-label={`Show featured book ${index + 1}`}
                          aria-current={index === featuredBookIndex ? 'true' : undefined}
                          onClick={() => setFeaturedBookIndex(index)}
                          className={`h-2.5 rounded-full transition-all ${index === featuredBookIndex ? 'w-7 bg-amber-300' : 'w-2.5 bg-white/50 hover:bg-white/80'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="relative z-10 flex min-h-[390px] max-w-3xl flex-col justify-center">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-200">
                  <BookOpen className="h-3.5 w-3.5" /> XamToppr Digital e-Library
                </div>
                <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Competitive Exam Books & Visual Study Notes</h1>
                <p className="mt-3 text-sm leading-relaxed text-blue-100 sm:text-base">
                  Explore curated books, topper notes, and 3D flipbook samples for competitive exams.
                </p>
                {isLoadingSkeleton && <p className="mt-5 text-sm text-blue-200">Loading featured books…</p>}
              </div>
            )}
          </div>
        </section>

        {/* Filter Controls */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-20">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 sm:p-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by book title, subject, exam (e.g., SSC CGL, Quant, Geography Notes, Lucent GK)..."
                className="block w-full pl-11 pr-24 sm:pr-28 py-3.5 text-sm sm:text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 hover:bg-white transition"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 sm:right-3 my-auto h-8 px-2.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              ) : (
                <div className="absolute inset-y-0 right-2 sm:right-3 my-auto h-8 px-3 text-xs font-semibold text-slate-400 flex items-center pointer-events-none">
                  Instant Search
                </div>
              )}
            </div>

            {/* Popular Quick Tags */}
            <div className="mt-3.5 flex items-center gap-2 flex-wrap text-xs text-slate-600">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Popular:
              </span>
              {[
                'Biology Notes',
                'Maths Formula Sheet',
                'General Studies 7500+',
                'Handwritten History',
                'Static GK Atlas'
              ].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="bg-slate-100 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-md transition text-slate-700 font-medium"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Main Category Pills with VISUAL NOTES BUTTON */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-900" /> Select Exam Category
                </span>
                {(selectedExam !== 'All Exams' ||
                  selectedTrack ||
                  selectedPlatform ||
                  selectedMedium !== 'All Mediums' ||
                  selectedSubject !== 'All Subjects' ||
                  selectedTopic ||
                  showPreviousYearPapers ||
                  showMockTests ||
                  quickFilterBadge !== 'ALL' ||
                  searchQuery) && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset All Filters
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
                {EXAM_CATEGORIES.map((cat) => {
                  const isSelected = selectedExam === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm ${
                        isSelected
                          ? 'bg-[#0c2356] text-white ring-2 ring-blue-900 shadow-md transform scale-[1.02]'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}

                {/* VISUAL NOTES SPECIAL BUTTON */}
                <button
                  onClick={() => handleCategoryChange('NOTES')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 shadow-md flex items-center gap-1.5 ${
                    selectedExam === 'NOTES'
                      ? 'bg-gradient-to-r from-purple-700 to-indigo-800 text-white ring-2 ring-purple-600 scale-[1.03]'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Visual & Handwritten Notes</span>
                </button>
              </div>
            </div>

            {/* Dropdown Filters */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 text-xs sm:text-sm">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Track
                </label>
                <select
                  value={selectedTrack}
                  onChange={(e) => {
                    setSelectedTrack(e.target.value);
                    setSelectedPlatform('');
                    setSelectedSubject('All Subjects');
                    setSelectedTopic('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="">All Tracks</option>
                  {taxonomyOptions.tracks.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Platform
                </label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => {
                    setSelectedPlatform(e.target.value);
                    setSelectedSubject('All Subjects');
                    setSelectedTopic('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="">All Platforms</option>
                  {taxonomyOptions.platforms.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setSelectedTopic('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="All Subjects">All Subjects</option>
                  {taxonomyOptions.subjects.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Topic
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="">All Topics</option>
                  {taxonomyOptions.topics.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Medium / Language
                </label>
                <select
                  value={selectedMedium}
                  onChange={(e) => setSelectedMedium(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  {MEDIUM_OPTIONS.map((medium) => (
                    <option key={medium} value={medium}>{medium}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Resource Type
                </label>
                <select
                  value={quickFilterBadge}
                  onChange={(e) => setQuickFilterBadge(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="NOTES">✨ Visual / Infographic Notes</option>
                  <option value="FREE">100% Free Books</option>
                  <option value="POPULAR">Most Popular / Bestsellers</option>
                  <option value="TOPPER">Toppers Handwritten Notes</option>
                  <option value="NEW">New 2026 Editions</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Sort Results By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer font-medium"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={showPreviousYearPapers}
                onClick={() => setShowPreviousYearPapers((selected) => !selected)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                  showPreviousYearPapers
                    ? 'border-blue-950 bg-blue-950 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-blue-50'
                }`}
              >
                Previous Year Papers
              </button>
              <button
                type="button"
                aria-pressed={showMockTests}
                onClick={() => setShowMockTests((selected) => !selected)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                  showMockTests
                    ? 'border-blue-950 bg-blue-950 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-blue-50'
                }`}
              >
                Mock Tests
              </button>
            </div>
          </div>
        </section>

        {/* Books & Notes Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-blue-950">
                Available Books & Study Material
              </h2>
              <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {filteredBooks.length} {filteredBooks.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>
          </div>

          {bookLoadError ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
              {bookLoadError}
            </div>
          ) : isLoadingSkeleton ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
                  <div className="h-72 bg-slate-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-5 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 sm:p-14 text-center max-w-2xl mx-auto my-8 shadow-sm">
              <BookMarked className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-slate-800">No study material found</h3>
              <p className="mt-2 text-sm text-slate-500">Try clearing filters or search with another topic.</p>
              <button
                onClick={handleResetFilters}
                className="mt-5 bg-blue-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredBooks.map((book) => {
                const isSaved = savedBooks.includes(book.id);
                const isPaid = !book.isFree;
                const alreadyPurchased = hasBookAlreadyBeenPurchased(userProfile, book);
                const isVisualNote = book.badge.toUpperCase().includes('NOTE') || book.samplePages.length > 0;

                return (
                  <div
                    key={book.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1 relative"
                  >
                    {/* ENLARGED COVER CONTAINER */}
                    <div
                      onClick={() => {
                        if (isVisualNote) {
                          openSampleFlipbook(book);
                        } else {
                          setSelectedBookForModal(book);
                        }
                      }}
                      className="h-72 sm:h-80 bg-slate-950 relative cursor-pointer select-none overflow-hidden flex items-center justify-center"
                    >
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-full h-full object-contain p-1 group-hover:scale-105 transition duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${book.coverGradient} p-4 flex flex-col justify-between`}>
                          <div className="z-10 pl-2">
                            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-300 mb-1">
                              {book.examCategory}
                            </div>
                            <h4 className="text-white font-black text-sm sm:text-base leading-tight line-clamp-3">
                              {book.title}
                            </h4>
                            <div className={`mt-2 text-xs font-bold ${book.coverAccent}`}>{book.subject}</div>
                          </div>
                        </div>
                      )}

                      <div className="absolute top-3 inset-x-3 flex items-start justify-between z-10">
                        <span className={`${book.badgeColor} text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-md`}>
                          {book.badge}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            title="Copy book link"
                            aria-label={`Copy link to ${book.title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              void copyBookLink(book);
                            }}
                            className="rounded-full bg-black/40 p-1.5 text-white/90 backdrop-blur-md transition hover:bg-black/70 hover:text-white"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`${isSaved ? 'Remove' : 'Save'} ${book.title} ${isSaved ? 'from' : 'to'} saved books`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookmark(book.id, book.title);
                            }}
                            className={`p-1.5 rounded-full backdrop-blur-md transition ${
                              isSaved ? 'bg-amber-500 text-slate-950' : 'bg-black/40 text-white/90 hover:text-white'
                            }`}
                          >
                            <BookMarked className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between z-10 text-[10px] text-slate-200 font-medium">
                        <span className="bg-black/70 px-2 py-0.5 rounded">
                          {book.language.includes('Hindi') ? 'हिन्दी माध्यम' : 'English Medium'}
                        </span>
                        <span className="flex items-center gap-1 text-amber-300 font-bold bg-black/70 px-1.5 py-0.5 rounded">
                          <Star className="w-3 h-3 fill-amber-300" /> {book.rating ? book.rating.toFixed(1) : '4.8'}
                        </span>
                      </div>
                    </div>

                    {/* Book Card Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                          <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded font-bold">
                            {book.exam}
                          </span>
                          <span className="text-slate-400 font-medium">{book.publishedYear} Edition</span>
                        </div>

                        <h3
                          onClick={() => {
                            if (isVisualNote) {
                              openSampleFlipbook(book);
                            } else {
                              setSelectedBookForModal(book);
                            }
                          }}
                          className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-blue-900 cursor-pointer transition"
                          title={book.title}
                        >
                          {book.title}
                        </h3>

                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          By <span className="font-medium text-slate-700">{book.author}</span>
                        </p>

                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-center text-[10px] text-slate-600 bg-slate-50 rounded-lg p-1.5 font-medium">
                          <div>
                            <span className="block text-slate-400 text-[9px] uppercase">Pages</span>
                            <span className="font-bold text-slate-800">{book.pages}</span>
                          </div>
                          <div className="border-x border-slate-200">
                            <span className="block text-slate-400 text-[9px] uppercase">Size</span>
                            <span className="font-bold text-slate-800">{book.fileSize || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400 text-[9px] uppercase">Downloads</span>
                            <span className="font-bold text-amber-700">{formatDownloadCount(book.downloadsCount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 flex items-center gap-2">
                        {isVisualNote ? (
                          <button
                            onClick={() => {
                              openSampleFlipbook(book);
                            }}
                            className="flex-1 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>Flipbook 3D</span>
                          </button>
                        ) : (
                          <Link
                            to={`/book/${encodeURIComponent(book.slug)}`}
                            className="flex-1 bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>View Book</span>
                          </Link>
                        )}
                        
                        {isPaid && alreadyPurchased ? (
                          <Link
                            to="/my-library"
                            onClick={(event) => event.stopPropagation()}
                            className="relative z-10 cursor-pointer bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2.5 rounded-xl transition font-bold text-xs shadow-sm flex items-center gap-1.5"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read in Library</span>
                          </Link>
                        ) : isPaid ? (
                          <a
                            href={book.pdfUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => handlePaidBookPurchase(event, book)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2.5 rounded-xl transition font-bold text-xs shadow-sm flex items-center gap-1.5"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>{book.price ? `Buy • ${book.price}` : 'Buy'}</span>
                          </a>
                        ) : (
                          <a
                            href={book.pdfUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={book.title}
                            onClick={(event) => {
                              if (!book.pdfUrl) {
                                event.preventDefault();
                                showToast('Download link will be updated soon!');
                              } else {
                                handleBookDownload(book);
                              }
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 rounded-xl transition font-bold shadow-sm flex items-center justify-center"
                          >
                            <Download className="w-4 h-4 stroke-[2.5]" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
          </>
        ) : selectedBlog ? (
          (() => {
            const blog = selectedBlogDetail || selectedBlog;
            const targetIds = (blog.relatedBookId || '')
              .split(',')
              .map((id) => id.trim())
              .filter(Boolean);
            const matchedBooks = booksList.filter((book) => targetIds.includes(book.id));
            const salaryRows = Array.isArray(blog.salaryStructure)
              ? blog.salaryStructure
              : blog.salaryStructure?.columns || [];
            const examStages = blog.examStages?.length
              ? blog.examStages
              : blog.examPattern?.length
                ? [{
                  stageName: 'Exam Pattern',
                  totalQuestions: blog.examPattern.reduce((total, row) => total + (Number(row.questions) || 0), 0),
                  totalMarks: blog.examPattern.reduce((total, row) => total + (Number(row.marks) || 0), 0),
                  sections: blog.examPattern.map((row) => ({
                    sectionName: row.subject,
                    questions: row.questions,
                    marks: row.marks
                  }))
                }]
                : [];
            const faqList = blog.faqsList?.length ? blog.faqsList : blog.faqs;
            const customSections = (blog.customSections || []).map((section, index) => ({
              ...section,
              sectionId: `custom-${section._key || index}`
            })).filter((section) => {
              switch (section._type) {
                case 'dynamicTable':
                  return hasRealContent(section.headers) || hasRealContent(section.rows) || hasRealContent(section.notes);
                case 'richNoteBlock':
                  return hasRealContent(section.content);
                case 'stepGuideBlock':
                  return hasRealContent(section.steps);
                case 'alertBox':
                  return hasRealContent(section.title) || hasRealContent(section.description);
                default:
                  return false;
              }
            });
            const sectionVisibility = {
              overview: hasRealContent(blog.overview),
              comparison: hasRealContent(blog.comparisonPreviousYear),
              dates: hasRealContent(blog.postDate) || hasRealContent(blog.applicationStartDate) ||
                hasRealContent(blog.applicationEndDate) || hasRealContent(blog.applicationWindow) ||
                hasRealContent(blog.examDate) || hasRealContent(blog.importantDates),
              posts: hasRealContent(blog.vacanciesList) || hasRealContent(blog.totalVacancies),
              salary: hasRealContent(salaryRows) || hasRealContent(blog.salaryStructure?.notes),
              vacancies: hasRealContent(blog.vacanciesList),
              eligibility: hasRealContent(blog.eligibilityCriteria),
              fee: hasRealContent(blog.applicationFees),
              selection: hasRealContent(blog.selectionProcess),
              pattern: hasRealContent(examStages),
              syllabus: hasRealContent(blog.syllabusDetails),
              'previous-papers': hasRealContent(blog.previousPapers),
              apply: hasRealContent(blog.howToApplySteps),
              documents: hasRealContent(blog.documentSpecs),
              'important-links': hasRealContent(blog.importantLinks) ||
                hasRealContent(blog.officialPdfUrl) || hasRealContent(blog.applyOnlineUrl),
              faqs: hasRealContent(faqList)
            };
            const sections = [
              ['overview', 'Overview'],
              ['comparison', '2025 vs 2026'],
              ['dates', 'Dates'],
              ['posts', 'Posts'],
              ['salary', 'Salary'],
              ['vacancies', 'Vacancies'],
              ['eligibility', 'Eligibility'],
              ['fee', 'Fee'],
              ['selection', 'Selection'],
              ['pattern', 'Exam Pattern'],
              ['syllabus', 'Syllabus'],
              ['previous-papers', 'Previous Papers'],
              ['apply', 'How to Apply'],
              ['documents', 'Documents'],
              ['important-links', 'Important Links'],
              ['faqs', 'FAQs']
            ].filter(([id]) => sectionVisibility[id]).concat(
              customSections
                .filter((section) => hasRealContent(section.sectionTitle))
                .map((section) => [section.sectionId, section.sectionTitle])
            );
            const renderTable = (rows, columns) => rows?.length ? (
              <div className="mb-2 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-max border-collapse text-left text-sm">
                  <thead className="bg-sky-50 text-sky-900">
                    <tr>{columns.map(([key, label]) => (
                      <th key={key} className="border-b border-sky-200 px-4 py-3 font-semibold">{label}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={row._key || rowIndex} className="group">
                        {columns.map(([key]) => (
                          <td key={key} className="border-b border-slate-100 px-4 py-2.5 text-slate-700 group-hover:bg-slate-50">
                            {row[key] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null;
            const renderActionLink = (url, label, className) => url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                {label}
              </a>
            ) : null;

            return (
              <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                <button
                  type="button"
                  onClick={() => setSelectedBlog(null)}
                  className="mb-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to notifications
                </button>

                <header className="rounded-3xl bg-gradient-to-br from-[#0c2356] via-[#153a8a] to-indigo-800 p-6 sm:p-9 text-white shadow-xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="rounded-full bg-amber-400 px-3 py-1 text-slate-950">
                      {blog.examCategory || 'Exam Notification'}
                    </span>
                    <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1">
                      {blog.state || 'All India / Central'}
                    </span>
                    <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-100">
                      {blog.totalVacancies || 'Vacancies'}{blog.totalVacancies ? ' Vacancies' : ''}
                    </span>
                  </div>
                  <h1 className="mt-4 text-2xl sm:text-4xl font-black leading-tight">{blog.title}</h1>
                  <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-blue-100">
                    {blog.postDate && <span>Posted {formatNotificationDate(blog.postDate)}</span>}
                  </p>
                  {(blog.applicationWindow || blog.applicationStartDate || blog.applicationEndDate || blog.examDate) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(blog.applicationWindow || blog.applicationStartDate || blog.applicationEndDate) && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                          <CalendarDays className="h-4 w-4" />
                          Applications: {blog.applicationWindow || [blog.applicationStartDate, blog.applicationEndDate].filter(Boolean).map(formatNotificationDate).join(' – ')}
                        </span>
                      )}
                      {blog.examDate && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                          <CalendarDays className="h-4 w-4" />
                          Exam: {formatNotificationDate(blog.examDate)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-6 inline-flex max-w-full flex-wrap items-center gap-3">
                    {renderActionLink(
                      blog.officialPdfUrl,
                      'Official Notification PDF',
                      'inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-3 text-sm font-extrabold text-blue-950 shadow-sm transition hover:bg-sky-50'
                    )}
                    {renderActionLink(
                      blog.applyOnlineUrl,
                      'Apply Online',
                      'inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full bg-emerald-300 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-emerald-200'
                    )}
                  </div>
                </header>

                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
                  <div className="min-w-0 space-y-6">
                    <nav
                      aria-label="Notification sections"
                      className="sticky top-40 z-30 w-full border-b border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur"
                    >
                      <div className="flex flex-wrap gap-2 sm:gap-2.5 items-center">
                        {sections.map(([id, label]) => (
                          <button
                            type="button"
                            key={id}
                            onClick={() => document.getElementById(`notification-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-sky-900 transition-colors hover:border-sky-300 hover:bg-sky-100"
                          >
                            {label}
                          </button>
                        ))}
                        {customSections.filter((section) => hasRealContent(section.sectionTitle)).map((section) => (
                          <button
                            type="button"
                            key={section.sectionId}
                            onClick={() => document.getElementById(`notification-${section.sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-sky-900 transition-colors hover:border-sky-300 hover:bg-sky-100"
                          >
                            {section.sectionTitle}
                          </button>
                        ))}
                      </div>
                    </nav>

                    {isLoadingBlogDetail ? (
                      <section aria-label="Loading notification details" className="animate-pulse space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                        <div className="h-6 w-1/2 rounded bg-slate-200" />
                        <div className="h-4 w-full rounded bg-slate-100" />
                        <div className="h-4 w-5/6 rounded bg-slate-100" />
                        <div className="h-32 rounded-xl bg-slate-100" />
                      </section>
                    ) : blogDetailError ? (
                      <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
                        {blogDetailError}
                      </section>
                    ) : (
                      <>
                        {sectionVisibility.overview && (
                        <section id="notification-overview" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <BookOpen className="h-5 w-5 text-amber-500" /> Overview
                          </h2>
                          <div className="prose prose-slate mt-4 max-w-none text-sm leading-7">
                            {Array.isArray(blog.overview)
                              ? <PortableText value={blog.overview} components={sharedPortableTextComponents} />
                              : <p className="whitespace-pre-line">{blog.overview}</p>}
                          </div>
                        </section>
                        )}

                        {sectionVisibility.comparison && (
                        <section id="notification-comparison" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <CalendarDays className="h-5 w-5 text-amber-500" /> 2025 vs 2026
                          </h2>
                          {renderTable(blog.comparisonPreviousYear, [
                            ['metric', 'Metric'], ['previousYear', '2025'], ['currentYear', '2026']
                          ])}
                        </section>
                        )}

                        {sectionVisibility.dates && (
                        <section id="notification-dates" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <CalendarDays className="h-5 w-5 text-amber-500" /> Important Dates
                          </h2>
                          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {[
                              ['Notification Published', formatNotificationDate(blog.postDate)],
                              ['Application Starts', formatNotificationDate(blog.applicationStartDate)],
                              ['Application Closes', formatNotificationDate(blog.applicationEndDate)],
                              ['Application Window', blog.applicationWindow],
                              ['Exam Date', formatNotificationDate(blog.examDate)]
                            ].filter(([, date]) => date).map(([label, date]) => (
                              <div key={label} className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
                                <p className="mt-1 text-sm font-bold text-blue-950">{date}</p>
                              </div>
                            ))}
                          </div>
                          {renderTable(blog.importantDates, [['eventName', 'Event'], ['dateText', 'Date']])}
                        </section>
                        )}

                        {sectionVisibility.posts && (
                        <section id="notification-posts" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <ClipboardList className="h-5 w-5 text-amber-500" /> Posts
                          </h2>
                          {blog.vacanciesList?.length ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {blog.vacanciesList.map((post, index) => (
                                <article key={post._key || index} className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                                  <h3 className="font-bold text-blue-950">{post.postName || blog.title}</h3>
                                  <p className="mt-1 text-sm text-slate-600">
                                    {[post.category, post.vacancies != null ? `${post.vacancies} vacancies` : null, post.notes].filter(Boolean).join(' · ')}
                                  </p>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-xl bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-950">
                              {blog.title}{blog.totalVacancies ? ` — ${blog.totalVacancies} vacancies` : ''}
                            </p>
                          )}
                        </section>
                        )}

                        {sectionVisibility.salary && (
                        <section id="notification-salary" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <Award className="h-5 w-5 text-amber-500" /> Salary Structure
                          </h2>
                          {salaryRows.length ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                                <thead className="bg-blue-950 text-white">
                                  <tr>
                                    {['Component', 'Column 1', 'Column 2', 'Column 3', 'Column 4'].map((heading) => (
                                      <th key={heading} className="border-b border-blue-800 px-4 py-3 font-bold">{heading}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {salaryRows.map((row, index) => (
                                    <tr key={row._key || index} className="odd:bg-white even:bg-slate-50">
                                      {[row.component || row.postName, row.col1 || row.payLevel, row.col2 || row.basicPay, row.col3 || row.inHandSalary, row.col4].map((value, columnIndex) => (
                                        <td key={columnIndex} className="border-b border-slate-100 px-4 py-3 text-slate-700">{value || '—'}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : null}
                          {blog.salaryStructure?.notes?.length > 0 && (
                            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                              {blog.salaryStructure.notes.map((note, index) => <li key={index}>{note}</li>)}
                            </ul>
                          )}
                        </section>
                        )}

                        {sectionVisibility.vacancies && (
                        <section id="notification-vacancies" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <ClipboardList className="h-5 w-5 text-amber-500" /> Vacancies
                          </h2>
                          {renderTable(blog.vacanciesList, [
                            ['postName', 'Post'], ['category', 'Category / Region'], ['vacancies', 'Vacancies'], ['notes', 'Notes']
                          ])}
                        </section>
                        )}

                        {sectionVisibility.eligibility && (
                        <section id="notification-eligibility" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <CheckCircle2 className="h-5 w-5 text-amber-500" /> Eligibility
                          </h2>
                          {blog.eligibilityCriteria?.length ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {blog.eligibilityCriteria.map((item, index) => (
                                <article key={item._key || index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <h3 className="font-bold text-slate-900">{item.criterion || 'Eligibility'}</h3>
                                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{item.details}</p>
                                </article>
                              ))}
                            </div>
                          ) : null}
                        </section>
                        )}

                        {sectionVisibility.fee && (
                        <section id="notification-fee" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <Award className="h-5 w-5 text-amber-500" /> Application Fee
                          </h2>
                          {renderTable(blog.applicationFees, [
                            ['category', 'Category'], ['amount', 'Fee'], ['notes', 'Notes']
                          ])}
                        </section>
                        )}

                        {sectionVisibility.selection && (
                        <section id="notification-selection" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <ClipboardList className="h-5 w-5 text-amber-500" /> Selection Process
                          </h2>
                          {blog.selectionProcess?.length ? (
                            <div className="space-y-3">
                              {blog.selectionProcess.map((stage, index) => (
                                <article key={stage._key || index} className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-black text-white">
                                    {stage.stageNumber || index + 1}
                                  </span>
                                  <div>
                                    <h3 className="font-bold text-slate-900">{stage.title || `Stage ${index + 1}`}</h3>
                                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">{stage.description}</p>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : null}
                        </section>
                        )}

                        {sectionVisibility.pattern && (
                        <section id="notification-pattern" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <FileText className="h-5 w-5 text-amber-500" /> Exam Pattern
                          </h2>
                          {examStages.length ? (
                            <div className="space-y-5">
                              {examStages.map((stage, stageIndex) => (
                                <article key={stage._key || stageIndex} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                                  <h3 className="mb-4 text-base font-extrabold text-blue-950">{stage.stageName || `Stage ${stageIndex + 1}`}</h3>
                                  <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                                    {[
                                      ['Questions', stage.totalQuestions],
                                      ['Marks', stage.totalMarks],
                                      ['Duration', stage.durationMinutes ? `${stage.durationMinutes} min` : '—'],
                                      ['Negative Marking', stage.negativeMarking || '—']
                                    ].map(([label, value]) => (
                                      <div key={label} className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
                                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
                                        <p className="mt-1 text-sm font-black text-blue-950">{value ?? '—'}</p>
                                      </div>
                                    ))}
                                  </div>
                                  {renderTable(stage.sections, [
                                    ['sectionName', 'Section'], ['questions', 'Questions'], ['marks', 'Marks']
                                  ])}
                                  {stage.qualifyingMarks?.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="mb-2 text-sm font-bold text-slate-800">Qualifying Marks</h4>
                                      {renderTable(stage.qualifyingMarks, [
                                        ['category', 'Category'], ['percentage', 'Percentage']
                                      ])}
                                    </div>
                                  )}
                                  {stage.additionalNotes && (
                                    <p className="mt-3 whitespace-pre-line rounded-lg bg-amber-50 p-3 text-sm leading-6 text-slate-700">
                                      {stage.additionalNotes}
                                    </p>
                                  )}
                                </article>
                              ))}
                            </div>
                          ) : null}
                        </section>
                        )}

                        {sectionVisibility.syllabus && (
                        <section id="notification-syllabus" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <BookOpen className="h-5 w-5 text-amber-500" /> Syllabus
                          </h2>
                          {blog.syllabusDetails?.length ? (
                            <div className="space-y-3">
                              {blog.syllabusDetails.map((item, index) => (
                                <details key={item._key || index} className="group rounded-xl border border-slate-200 p-4">
                                  <summary className="cursor-pointer font-bold text-slate-800">{item.sectionTitle || `Section ${index + 1}`}</summary>
                                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{item.topics}</p>
                                </details>
                              ))}
                            </div>
                          ) : null}
                        </section>
                        )}

                        {sectionVisibility.apply && (
                        <section id="notification-apply" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <FileCheck2 className="h-5 w-5 text-amber-500" /> How to Apply
                          </h2>
                          {blog.howToApplySteps?.length ? (
                            <ol className="list-inside list-decimal space-y-2 text-sm leading-relaxed text-slate-700">
                              {blog.howToApplySteps.filter(hasRealContent).map((step, index) => <li key={step._key || index}>{typeof step === 'string' ? step : step.text}</li>)}
                            </ol>
                          ) : null}
                        </section>
                        )}

                        {sectionVisibility['previous-papers'] && (
                        <section id="notification-previous-papers" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <FileText className="h-5 w-5 text-amber-500" /> Previous Papers
                          </h2>
                          {blog.previousPapers?.length ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {blog.previousPapers.map((paper, index) => (
                                <article key={paper._key || index} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <div>
                                    <h3 className="font-bold text-slate-900">{paper.title || 'Previous year paper'}</h3>
                                    {paper.year && <p className="mt-1 text-xs text-slate-500">{paper.year}</p>}
                                  </div>
                                  {renderActionLink(paper.url, 'View paper', 'inline-flex items-center gap-1.5 rounded-lg bg-blue-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-900')}
                                </article>
                              ))}
                            </div>
                          ) : null}
                        </section>
                        )}

                        {sectionVisibility.documents && (
                        <section id="notification-documents" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <FileCheck2 className="h-5 w-5 text-amber-500" /> Document Specifications
                          </h2>
                          {renderTable(blog.documentSpecs, [
                            ['item', 'Item'], ['specification', 'CEN Specification']
                          ])}
                        </section>
                        )}

                        {sectionVisibility['important-links'] && (
                        <section id="notification-important-links" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">
                            <ExternalLink className="h-5 w-5 text-amber-500" /> Important Links
                          </h2>
                          {blog.importantLinks?.length ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {blog.importantLinks.map((link, index) => (
                                link.url
                                  ? <div key={link._key || index}>{renderActionLink(link.url, link.label || 'Open link', 'flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-blue-900 transition hover:border-amber-300 hover:bg-amber-50')}</div>
                                  : link.label && <p key={link._key || index} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-blue-900">{link.label}</p>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-3">
                              {renderActionLink(blog.officialPdfUrl, 'Official Notification PDF', 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-blue-900 transition hover:border-amber-300 hover:bg-amber-50')}
                              {renderActionLink(blog.applyOnlineUrl, 'Apply Online', 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-blue-900 transition hover:border-amber-300 hover:bg-amber-50')}
                            </div>
                          )}
                        </section>
                        )}

                        {sectionVisibility.faqs && (
                        <section id="notification-faqs" className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-blue-950">Frequently Asked Questions</h2>
                          {faqList?.length ? (
                            <div className="space-y-3">
                              {faqList.map((faq, index) => (
                                <details key={faq._key || index} className="group rounded-xl border border-slate-200 p-4">
                                  <summary className="cursor-pointer font-bold text-slate-800">{faq.question}</summary>
                                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                                </details>
                              ))}
                            </div>
                          ) : null}
                        </section>
                        )}

                        {customSections.map((section) => {
                          const sectionTitle = section.sectionTitle || section.title || (
                            section._type === 'dynamicTable' ? 'Custom Table' :
                              section._type === 'richNoteBlock' ? 'Additional Information' :
                                section._type === 'stepGuideBlock' ? 'Step Guide' : 'Important Notice'
                          );

                          if (section._type === 'dynamicTable') {
                            const rows = (section.rows || []).map((row) => Array.isArray(row)
                              ? row
                              : row.cells || Object.entries(row)
                                .filter(([key]) => key !== '_key' && key !== '_type')
                                .map(([, value]) => value));
                            const columnCount = Math.max(
                              section.headers?.length || 0,
                              ...rows.map((row) => row.length),
                              0
                            );
                            const headers = Array.from({ length: columnCount }, (_, index) =>
                              section.headers?.[index] || `Column ${index + 1}`
                            );

                            return (
                              <section key={section.sectionId} id={`notification-${section.sectionId}`} className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <h2 className="mb-4 text-lg font-extrabold text-blue-950">{sectionTitle}</h2>
                                {headers.length > 0 && rows.length > 0 && (
                                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full min-w-max border-collapse text-left text-sm">
                                      <thead className="bg-blue-950 text-white">
                                        <tr>{headers.map((heading, index) => (
                                          <th key={`${heading}-${index}`} className="border-b border-blue-800 px-4 py-3 font-bold">{heading}</th>
                                        ))}</tr>
                                      </thead>
                                      <tbody>
                                        {rows.map((row, rowIndex) => (
                                          <tr key={section.rows[rowIndex]?._key || rowIndex} className="odd:bg-white even:bg-slate-50">
                                            {headers.map((_, columnIndex) => (
                                              <td key={columnIndex} className="border-b border-slate-100 px-4 py-3 text-slate-700">
                                                {row[columnIndex] ?? '—'}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                {hasRealContent(section.notes) && (
                                  <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                                    {section.notes.filter(hasRealContent).map((note, index) => <li key={index}>{note}</li>)}
                                  </ul>
                                )}
                              </section>
                            );
                          }

                          if (section._type === 'richNoteBlock') {
                            return (
                              <section key={section.sectionId} id={`notification-${section.sectionId}`} className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <h2 className="mb-4 text-lg font-extrabold text-blue-950">{sectionTitle}</h2>
                                <div className="prose prose-slate max-w-none text-sm leading-7">
                                  <PortableText value={section.content} components={sharedPortableTextComponents} />
                                </div>
                              </section>
                            );
                          }

                          if (section._type === 'stepGuideBlock') {
                            return (
                              <section key={section.sectionId} id={`notification-${section.sectionId}`} className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <h2 className="mb-4 text-lg font-extrabold text-blue-950">{sectionTitle}</h2>
                                <ol className="space-y-3">
                                  {section.steps.filter(hasRealContent).map((step, index) => (
                                    <li key={index} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-950 text-xs font-bold text-white">{index + 1}</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </section>
                            );
                          }

                          const alertStyles = {
                            info: 'border-sky-200 bg-sky-50 text-sky-950',
                            warning: 'border-amber-200 bg-amber-50 text-amber-950',
                            success: 'border-emerald-200 bg-emerald-50 text-emerald-950'
                          };
                          const alertStyle = alertStyles[section.alertType] || alertStyles.info;
                          return (
                            <section key={section.sectionId} id={`notification-${section.sectionId}`} className={`scroll-mt-44 rounded-2xl border p-5 shadow-sm sm:p-6 ${alertStyle}`}>
                              {section.title && <h2 className="text-lg font-extrabold">{section.title}</h2>}
                              {section.description && <p className={`${section.title ? 'mt-2' : ''} whitespace-pre-line text-sm leading-6`}>{section.description}</p>}
                            </section>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {matchedBooks.length > 0 && (
                    <aside className="h-fit rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm lg:sticky lg:top-48">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                        Recommended Study Notes & Solved Papers
                      </span>
                      <div className="mt-4 space-y-4">
                        {matchedBooks.map((book) => (
                          <article key={book.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex h-36 items-center justify-center overflow-hidden bg-slate-950">
                              {book.coverImage ? (
                                <>
                                  <img
                                    src={book.coverImage}
                                    alt={book.title}
                                    className="h-full w-full object-contain"
                                    loading="lazy"
                                    onError={(event) => {
                                      event.currentTarget.style.display = 'none';
                                      const fallback = event.currentTarget.nextElementSibling;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <div
                                    className={`hidden h-full w-full items-center justify-center bg-gradient-to-br ${book.coverGradient} p-4 text-center`}
                                    aria-label={`${book.title} cover unavailable`}
                                  >
                                    <BookOpen className="h-10 w-10 text-amber-300" />
                                  </div>
                                </>
                              ) : (
                                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${book.coverGradient} p-4 text-center`}>
                                  <BookOpen className="h-10 w-10 text-amber-300" />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <h3 className="line-clamp-2 text-sm font-extrabold text-slate-900">{book.title}</h3>
                              <p className="mt-2 text-xs font-bold text-emerald-700">
                                {book.isFree ? 'FREE' : book.price || 'Price on request'}
                              </p>
                              <div className="mt-3 flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    openSampleFlipbook(book);
                                  }}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
                                >
                                  <BookOpen className="h-3.5 w-3.5" />
                                  3D Flipbook Sample
                                </button>
                                {book.pdfUrl ? (
                                  <a
                                    href={book.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(event) => {
                                      if (book.isFree) {
                                        handleBookDownload(book);
                                      } else {
                                        handlePaidBookPurchase(event, book);
                                      }
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
                                  >
                                    {book.isFree ? <Download className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                                    {book.isFree ? 'Download Free' : `Buy${book.price ? ` • ${book.price}` : ''}`}
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      if (book.isFree) {
                                        showToast('Download link will be updated soon!');
                                      } else {
                                        handlePaidBookPurchase(event, book);
                                      }
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
                                  >
                                    {book.isFree ? <Download className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                                    {book.isFree ? 'Download Free' : `Buy${book.price ? ` • ${book.price}` : ''}`}
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </aside>
                  )}
                </div>
              </article>
            );
          })()
        ) : visibleTab === 'video' ? (
          <VideoCoursesPage
            onBuyCourse={handleBuyVideoCourse}
            onEnrollCourse={handleEnrollVideoCourse}
            onRequireAuth={() => setShowCheckoutAuthModal(true)}
            enrolledCourseIds={enrolledCourseIds}
            purchasedCourseIds={purchasedCourseIds}
            expiredCourseIds={expiredCourseIds}
            courseExpiryById={courseExpiryById}
          />
        ) : (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="rounded-3xl bg-gradient-to-br from-[#0c2356] via-indigo-900 to-fuchsia-900 p-6 sm:p-9 text-white shadow-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-200">
                <Bell className="h-4 w-4" />
                Exam Alerts & Career Updates
              </div>
              <h1 className="mt-4 text-2xl sm:text-4xl font-black">Exam Notifications & Blogs</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-indigo-100">
                Find the latest vacancies, application dates, eligibility details, and official links in one place.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
              <label className="relative block">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={blogSearchQuery}
                  onChange={(event) => setBlogSearchQuery(event.target.value)}
                  placeholder="Search exam title, category, or state..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </label>

              <div className="mt-5">
                <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Exam Category</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {blogCategories.map((category) => (
                    <button
                      type="button"
                      key={category}
                      onClick={() => setSelectedBlogCategory(category)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                        selectedBlogCategory === category
                          ? 'bg-blue-950 text-white shadow'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">State / Region</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {blogStates.map((state) => (
                    <button
                      type="button"
                      key={state}
                      onClick={() => setSelectedBlogState(state)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                        selectedBlogState === state
                          ? 'bg-fuchsia-700 text-white shadow'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-blue-950">Latest Notifications</h2>
              {!isLoadingBlogs && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">
                  {filteredBlogPosts.length} {filteredBlogPosts.length === 1 ? 'notification' : 'notifications'}
                </span>
              )}
            </div>

            {isLoadingBlogs ? (
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="h-5 w-1/3 rounded bg-slate-200" />
                    <div className="mt-5 h-7 w-5/6 rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-2/3 rounded bg-slate-200" />
                    <div className="mt-8 h-12 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : blogLoadError ? (
              <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-800">
                {blogLoadError}
              </div>
            ) : filteredBlogPosts.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <Bell className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-3 text-lg font-bold text-slate-800">No notifications found</h3>
                <p className="mt-1 text-sm text-slate-500">Try another search term or filter.</p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredBlogPosts.map((post) => (
                  <article key={post._id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg">
                    <div className={`relative flex h-48 items-end overflow-hidden bg-gradient-to-br ${getNotificationGradient(post.examCategory)}`}>
                      {post.cardImageUrl ? (
                        <img src={post.cardImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <>
                          <div className="absolute -right-8 -top-10 h-44 w-44 rounded-full border-[24px] border-white/10" />
                          <div className="absolute -right-2 top-9 h-24 w-24 rounded-full bg-amber-300/20 blur-2xl" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                        </>
                      )}
                      <div className="relative z-10 w-full p-5">
                        <span className="inline-flex rounded-full border border-white/30 bg-slate-950/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur">
                          {post.examCategory || 'Exam Notification'}
                        </span>
                        <h3 className="mt-3 line-clamp-2 text-xl font-black leading-tight text-white drop-shadow sm:text-2xl">{post.title}</h3>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-[10px] font-bold text-fuchsia-800">
                          {post.state || 'All India / Central'}
                        </span>
                        {post.postDate && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            Posted {formatNotificationDate(post.postDate)}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total Vacancies</p>
                          <p className="mt-1 text-sm font-extrabold text-blue-950">{post.totalVacancies || 'Not announced'}</p>
                        </div>
                        <div>
                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            <CalendarDays className="h-3 w-3" /> Application Dates
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {post.applicationWindow || [post.applicationStartDate, post.applicationEndDate].filter(Boolean).map(formatNotificationDate).join(' – ') || 'TBA'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBlog(post)}
                        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-900"
                      >
                        View Notification Details
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ============================================================== */}
      {/* 3D INTERACTIVE FLIPBOOK MODAL WITH REALISTIC SOUND */}
      {/* ============================================================== */}
      {showFlipbookModal && (() => {
        const book = showFlipbookModal;
        const pagesList = book.samplePages.length > 0 
          ? book.samplePages 
          : (book.coverImage ? [book.coverImage] : []);
        const totalSlides = pagesList.length + 2;
        const fullscreenPageWidth = Math.max(
          160,
          Math.min(viewportSize.width - 32, (viewportSize.height - 120) * (340 / 480), 600)
        );
        const fullscreenPageHeight = fullscreenPageWidth * (480 / 340);
        const enterFullscreenReader = async () => {
          setActiveSlideIndex(flipPageNumber);
          setIsMobileFullscreen(true);
          try {
            if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen();
            }
          } catch {
            console.error('Failed to enter browser fullscreen.');
            showToast('Browser fullscreen was blocked. Use the fullscreen control again to retry.');
          }
        };
        const exitFullscreenReader = async () => {
          flipBookRef.current?.pageFlip()?.turnToPage(activeSlideIndex);
          if (document.fullscreenElement) {
            try {
              await document.exitFullscreen();
            } catch {
              console.error('Failed to exit browser fullscreen.');
              showToast('Could not exit browser fullscreen. Press Escape to leave fullscreen.');
            }
          } else {
            setIsMobileFullscreen(false);
          }
        };
        const closeFlipbook = async () => {
          if (document.fullscreenElement) {
            try {
              await document.exitFullscreen();
            } catch {
              console.error('Failed to exit browser fullscreen while closing flipbook.');
              showToast('Could not close the fullscreen reader. Press Escape and try again.');
              return;
            }
          }
          setIsMobileFullscreen(false);
          setActiveSlideIndex(0);
          setShowFlipbookModal(null);
        };

        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMobileFullscreen ? 'p-0 bg-slate-950/95' : 'p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn'}`}>
            {isMobileFullscreen && (
              <button
                type="button"
                onClick={exitFullscreenReader}
                className="fixed right-3 top-3 z-[120] inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-rose-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-xl transition hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Exit fullscreen"
              >
                <X className="h-4 w-4" /> Exit Fullscreen
              </button>
            )}
            <div className={isMobileFullscreen
              ? 'fixed inset-0 z-[100] w-screen h-screen bg-slate-950/95 flex flex-col justify-between p-2 sm:p-4'
              : 'bg-slate-900 text-white rounded-3xl max-w-4xl w-full max-h-[96vh] overflow-hidden shadow-2xl border border-slate-700 flex flex-col'}>
              
              {/* Flipbook Header */}
              <div className={`shrink-0 px-4 sm:px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 ${isMobileFullscreen ? 'sticky top-0 z-10 pr-44' : ''}`}>
                {isMobileFullscreen ? (
                  <>
                    <h3 className="min-w-0 text-sm sm:text-base font-bold text-white truncate">{book.title}</h3>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="text-xs sm:text-sm text-slate-300 font-mono">
                        Page {flipPageNumber + 1} of {totalSlides}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">{book.title}</h3>
                        <p className="text-[11px] text-purple-300">Interactive 3D Page-Flip Experience</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={enterFullscreenReader}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                        aria-label="Open full screen slide reader"
                      >
                        <Maximize2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Full Screen</span>
                      </button>
                      {!book.isFree && book.pdfUrl && (
                        <a
                          href={book.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => handlePaidBookPurchase(event, book)}
                          className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Buy Full ({book.badge})</span>
                        </a>
                      )}
                      {book.isFree && book.pdfUrl && (
                        <a
                          href={book.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleBookDownload(book)}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md"
                        >
                          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Download PDF</span>
                        </a>
                      )}
                      <button
                        onClick={closeFlipbook}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        aria-label="Close flipbook"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Flipbook Viewer Container */}
              <div className={`flex-1 min-h-0 overflow-auto p-4 flex flex-col items-center justify-center bg-radial from-slate-800 to-slate-950 relative ${isMobileFullscreen ? 'w-full' : 'min-h-[460px]'}`}>
                
                {/* HTMLFlipBook Component */}

<HTMLFlipBook
  width={isMobileFullscreen ? fullscreenPageWidth : 340}
  height={isMobileFullscreen ? fullscreenPageHeight : 480}
  size="stretch"
  minWidth={isMobileFullscreen ? fullscreenPageWidth : 280}
  maxWidth={isMobileFullscreen ? fullscreenPageWidth : 480}
  minHeight={isMobileFullscreen ? fullscreenPageHeight : 400}
  maxHeight={isMobileFullscreen ? fullscreenPageHeight : 640}
  maxShadowOpacity={0.5}
  showCover={true}
  mobileScrollSupport={true}
  className="shadow-2xl mx-auto rounded-lg overflow-hidden"
  ref={flipBookRef}
  onFlip={(e) => {
    setFlipPageNumber(e.data);
    setActiveSlideIndex(e.data);
    playPageFlipSound();
  }}
>
  {/* Page 1: Description & Overview (Strict Box Height & Smooth Scroll) */}
  <div className="h-full w-full p-4 sm:p-5 text-white relative select-none bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 border-r border-slate-700/60 shadow-2xl overflow-hidden box-border">
    {/* Subtle Auto Background Animated Glow */}
    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-purple-600/15 to-teal-500/10 animate-pulse pointer-events-none"></div>
    <div className="absolute -top-16 -right-16 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
    <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>

    {/* Top Header Badge & Title (Fixed Header ~90px) */}
    <div className="relative z-10 h-[85px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-extrabold tracking-widest uppercase bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full shadow">
          {book.badge || 'Study Notes'}
        </span>
        <span className="text-[10px] font-bold text-slate-300 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-slate-700">
          {book.pages ? `${book.pages} Pages` : 'Exam Special'}
        </span>
      </div>

      <h2 className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2">
        {book.title}
      </h2>
      <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
        {book.subject || book.examCategory || 'Exam Preparation'}
      </p>
    </div>

    {/* Middle Description Area (Locked Inside Screen, Auto Scroll If Long) */}
    <div 
      className="relative z-10 my-2 overflow-y-auto pr-1.5 text-left bg-slate-900/80 p-3 rounded-xl border border-indigo-500/30 backdrop-blur-md shadow-inner"
      style={{ height: 'calc(100% - 135px)' }}
    >
      <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-2 flex items-center gap-1.5 sticky top-0 bg-slate-900/95 py-0.5 backdrop-blur-sm z-10">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>About These Notes</span>
      </div>
      <div className="text-[11px] sm:text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line">
  {renderFlipbookDescription(book.description || '')}
</div>
    </div>

    {/* Bottom Indicator (Fixed Height ~35px Anchored at Bottom) */}
    <div className="relative z-10 h-[35px] border-t border-slate-800/90 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
      <span className="text-amber-400 font-bold flex items-center gap-1">
        ★ {book.rating ? book.rating.toFixed(1) : '4.8'}
      </span>
      <span className="text-indigo-300 font-semibold animate-pulse">
        Turn next for handwritten samples →
      </span>
    </div>
  </div>

  {/* High-resolution Sanity sample pages */}
  {pagesList.map((pageImg, idx) => (
    <div key={idx} className="bg-white text-slate-900 h-full flex flex-col items-center justify-center p-2 shadow-inner border border-slate-300">
      <img
        src={getHighDefinitionSanityImageUrl(pageImg)}
        alt={`Page ${idx + 1}`}
        className="h-full w-full object-contain"
        loading="eager"
        decoding="async"
        draggable="false"
      />
      <div className="text-[10px] text-slate-400 mt-1">Page {idx + 1}</div>
    </div>
  ))}

  {/* Final Page */}
  <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white h-full flex flex-col items-center justify-center p-6 text-center border border-indigo-700/50">
    <Sparkles className="w-10 h-10 text-amber-400 mb-2 animate-pulse" />
    <h3 className="text-base sm:text-lg font-black text-white">Sample Preview Ended</h3>
    <p className="text-xs text-slate-300 mt-1.5 max-w-xs leading-relaxed">
      {book.isFree 
        ? 'Download the complete free PDF copy to keep revising offline.' 
        : 'Unlock complete comprehensive visual notes with full high-resolution diagrams.'}
    </p>

    <div className="mt-4 w-full max-w-xs">
      {book.isFree ? (
        <a
          href={book.pdfUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (book.pdfUrl) handleBookDownload(book);
          }}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2.5 rounded-xl shadow-xl flex items-center justify-center gap-2 transition"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Download Free PDF</span>
        </a>
      ) : (
        <a
          href={book.pdfUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => handlePaidBookPurchase(event, book)}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black text-xs py-2.5 rounded-xl shadow-xl flex items-center justify-center gap-2 transition"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Unlock Full Notes ({book.price || book.badge})</span>
        </a>
      )}
    </div>

    {/* Social Media Share Section */}
    <div className="mt-4 pt-3 border-t border-slate-700/70 w-full max-w-xs flex flex-col items-center">
      <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
        <Share2 className="w-3.5 h-3.5 text-amber-400" /> Share with Friends
      </span>

      <div className="flex items-center gap-2">
        {/* WhatsApp */}
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
            `*${book.title}*\n\nYeh handwritten study notes check karo:\n👉 https://xamtoppr-books.vercel.app`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition active:scale-95"
        >
          <span>WhatsApp</span>
        </a>

        {/* Telegram */}
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(
            'https://xamtoppr-books.vercel.app'
          )}&text=${encodeURIComponent(`*${book.title}* - Visual Study Notes!`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition active:scale-95"
        >
          <span>Telegram</span>
        </a>

        {/* Copy Link */}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText('https://xamtoppr-books.vercel.app');
            showToast('Link copied to clipboard!');
          }}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-600 flex items-center gap-1 transition active:scale-95"
        >
          <span>Copy</span>
        </button>
      </div>
    </div>
  </div>
</HTMLFlipBook>

                {/* Flip Navigation Controls */}
                <div className={`shrink-0 mt-4 flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700/80 backdrop-blur-md ${isMobileFullscreen ? 'mb-2' : ''}`}>
                  <button
                    onClick={() => {
                      flipBookRef.current?.pageFlip()?.flipPrev();
                    }}
                    className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="text-xs text-slate-300 font-mono">
                    {isMobileFullscreen ? `Page ${flipPageNumber + 1} of ${totalSlides}` : 'Use mouse / finger to flip pages'}
                  </span>

                  <button
                    onClick={() => flipBookRef.current?.pageFlip()?.flipNext()}
                    className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Book Detail Modal */}
      {selectedBookForModal && (() => {
        const isPaidBook = selectedBookForModal.isPaid
          ?? (selectedBookForModal.isFree !== undefined
            ? !selectedBookForModal.isFree
            : selectedBookForModal.badge?.toUpperCase().includes('PAID')
              || selectedBookForModal.badge?.toUpperCase().includes('PREMIUM')
              || selectedBookForModal.badge?.includes('₹'));
        const alreadyPurchased = hasBookAlreadyBeenPurchased(userProfile, selectedBookForModal);

        const sampleUrl = selectedBookForModal.samplePdfUrl || selectedBookForModal.pdfUrl;
        const ratingSelection = ratingSelections[selectedBookForModal.sanityId] || 0;
        const hasSubmittedRating = ratedBooks.has(selectedBookForModal.sanityId)
          || hasStoredBookRating(selectedBookForModal.sanityId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-300 flex flex-col">
              
              <div className="p-5 sm:p-6 bg-[#0c2356] text-white flex items-start justify-between relative">
                <div className="pr-8">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`${selectedBookForModal.badgeColor || 'bg-amber-400'} text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow-sm`}>
                      {selectedBookForModal.badge}
                    </span>
                    <span className="text-xs text-blue-200 font-medium">
                      {selectedBookForModal.examCategory}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                    {selectedBookForModal.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    By {selectedBookForModal.author} • {selectedBookForModal.publisher}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBookForModal(null)}
                  className="text-slate-300 hover:text-white p-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-6 text-slate-800">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center text-xs font-medium">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Language</span>
                    <span className="font-bold text-slate-900">{selectedBookForModal.language}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Total Pages</span>
                    <span className="font-bold text-slate-900">{selectedBookForModal.pages} Pages</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">File Size</span>
                    <span className="font-bold text-slate-900">{selectedBookForModal.fileSize || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Rating</span>
                    <span className="font-bold text-amber-600 flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500" /> {selectedBookForModal.rating ? selectedBookForModal.rating.toFixed(1) : '4.8'} ({selectedBookForModal.totalReviews})
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                  <h4 className="text-sm font-bold text-slate-900">Rate this book</h4>
                  <div className="mt-2 flex justify-center gap-1" role="group" aria-label="Choose a rating from 1 to 5 stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingSelections((currentSelections) => ({
                          ...currentSelections,
                          [selectedBookForModal.sanityId]: star
                        }))}
                        disabled={hasSubmittedRating}
                        aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                        aria-pressed={ratingSelection === star}
                        className="rounded-md p-1 text-amber-500 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Star className={`h-6 w-6 ${ratingSelection >= star ? 'fill-amber-400' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={hasSubmittedRating || ratingSelection === 0}
                    onClick={() => {
                      if (handleBookRating(selectedBookForModal, ratingSelection)) {
                        setRatingSelections((currentSelections) => ({
                          ...currentSelections,
                          [selectedBookForModal.sanityId]: 0
                        }));
                        showToast('Thanks for rating this book!');
                      }
                    }}
                    className="mt-2 rounded-lg bg-blue-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {hasSubmittedRating ? 'Rating submitted' : 'Submit rating'}
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                    About This Study Material
                  </h4>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 whitespace-pre-line font-sans">
  {renderPdfModalDescription(selectedBookForModal.description)}
</div>
                </div>

                {selectedBookForModal.tableOfContents.length > 0 && (
                  <details className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-4 py-3.5 text-sm font-extrabold text-slate-900 transition hover:bg-slate-100 sm:px-5">
                      <span className="flex min-w-0 items-center gap-2">
                        <Layers className="h-4 w-4 shrink-0 text-blue-900" />
                        <span className="truncate">Table of Contents / Complete Index</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-900">
                        {selectedBookForModal.tableOfContents.length} Chapters
                      </span>
                    </summary>
                    <ol className="grid grid-cols-1 gap-2 p-3 text-xs sm:grid-cols-2 sm:p-4">
                      {selectedBookForModal.tableOfContents.map((chapter, index) => (
                        <li
                          key={chapter._key || `${chapter.chapterNo || index}-${chapter.title}`}
                          className="flex min-w-0 items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-slate-700"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 text-[10px] font-bold text-blue-950">
                            {chapter.chapterNo || index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words font-semibold">{chapter.title}</span>
                            {chapter.pageRange && <span className="mt-1 block text-[10px] text-slate-500">Pages {chapter.pageRange}</span>}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>

              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => toggleBookmark(selectedBookForModal.id, selectedBookForModal.title)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
                >
                  <BookMarked className="w-4 h-4 text-amber-500" />
                  {savedBooks.includes(selectedBookForModal.id) ? 'Saved in Library' : 'Save for Later'}
                </button>

               <div className="flex flex-wrap items-center gap-2.5">
                  {isPaidBook ? (
                    <>
                      {/* Paid Book: Sample dekhne ka option */}
                      <a
                        href={sampleUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (sampleUrl) {
                            void logUserActivity('read_sample_pdf', {
                              bookId: selectedBookForModal.sanityId,
                              bookTitle: selectedBookForModal.title
                            });
                            handleBookDownload(selectedBookForModal);
                          }
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-900" />
                        <span>Read Sample PDF</span>
                      </a>

                      {alreadyPurchased ? (
                        <Link
                          to="/my-library"
                          onClick={() => setSelectedBookForModal(null)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-600 sm:text-sm"
                        >
                          <BookOpen className="h-4 w-4" />
                          Read Full Book in My Library
                        </Link>
                      ) : (
                        <>
                          <CouponField
                            key={`${selectedBookForModal.sanityId}:${selectedBookAmount}`}
                            orderAmount={selectedBookAmount}
                            onChange={(value) => setBookCoupon(value ? {
                              bookId: selectedBookForModal.sanityId,
                              orderAmount: selectedBookAmount,
                              value
                            } : null)}
                            className="basis-full"
                          />
                          <button
                            type="button"
                            onClick={(event) => handlePaidBookPurchase(event, selectedBookForModal, selectedBookCoupon)}
                            className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 transform active:scale-95"
                          >
                            <ShoppingCart className="w-4 h-4 text-white" />
                            <span>
                              {selectedBookCoupon ? `Pay • ₹${selectedBookCoupon.finalAmount.toLocaleString('en-IN')}` : `Buy Now (${selectedBookForModal.price || selectedBookForModal.badge})`}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const alreadyInCart = cartItems.some((item) => item.id === selectedBookForModal.sanityId);
                              if (alreadyInCart) {
                                setShowCartDrawer(true);
                              } else {
                                handleAddToCart(selectedBookForModal);
                              }
                            }}
                            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-950 transition hover:bg-blue-100"
                          >
                            {cartItems.some((item) => item.id === selectedBookForModal.sanityId) ? 'Go to Cart' : 'Add to Cart'}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    /* Free Material: Sample hatakar seedhe Poori PDF ka Single Button */
                    <a
                      href={selectedBookForModal.pdfUrl || selectedBookForModal.samplePdfUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (selectedBookForModal.pdfUrl || selectedBookForModal.samplePdfUrl) {
                          handleBookDownload(selectedBookForModal);
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-extrabold px-6 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 transform active:scale-95"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>Download Full Free PDF</span>
                    </a>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {showRequestBookModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmittingBookRequest) {
              setShowRequestBookModal(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-request-title"
            className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <h2 id="book-request-title" className="text-lg font-extrabold text-slate-900 sm:text-xl">Request a Book</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                  Tell us what you need and our team will review your request.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestBookModal(false)}
                disabled={isSubmittingBookRequest}
                aria-label="Close book request form"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBookRequestSubmit} className="space-y-4 p-4 sm:space-y-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Student Name
                  <input
                    name="studentName"
                    type="text"
                    autoComplete="name"
                    className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal leading-5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                    placeholder="Your name"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Contact Number
                  <input
                    name="contactNumber"
                    type="tel"
                    autoComplete="tel"
                    className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal leading-5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                    placeholder="Your phone number"
                  />
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Email <span className="font-normal text-slate-400">(optional)</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal leading-5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Requested Book Title <span className="text-rose-600">*</span>
                <input
                  name="requestedBookTitle"
                  type="text"
                  required
                  maxLength={200}
                  className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal leading-5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter the book title or topic"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Exam Category
                <input
                  name="examCategory"
                  type="text"
                  className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal leading-5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. SSC, Banking, Railway"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Additional Details
                <textarea
                  name="additionalDetails"
                  rows={3}
                  maxLength={2000}
                  className="mt-2 block min-h-24 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal leading-5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  placeholder="Share anything else that will help us find the right book."
                />
              </label>
              {bookRequestError && (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {bookRequestError}
                </p>
              )}
              <div className="mt-2 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowRequestBookModal(false)}
                  disabled={isSubmittingBookRequest}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBookRequest}
                  className="min-h-11 w-full rounded-xl bg-blue-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                >
                  {isSubmittingBookRequest ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <Footer {...siteSettings} />
      <CartDrawer
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        onProceedCheckout={handleCartCheckout}
      />
      <AuthModal
        isOpen={showCheckoutAuthModal || showMobileAuthModal}
        onClose={() => {
          setShowCheckoutAuthModal(false);
          setShowMobileAuthModal(false);
        }}
      />
    </div>
  );
}

function SiteContentPage({ page }) {
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isCurrentRequest = true;
    sanityClient.fetch(siteSettingsQuery)
      .then((document) => {
        if (isCurrentRequest) setSettings(document);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        console.error('Failed to load page content from Sanity.');
        if (isCurrentRequest) {
          setLoadError(`The ${page.title.toLowerCase()} page could not be loaded. Please try again later.`);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [page]);

  const content = settings?.[page.field];
  const portableTextComponents = {
    ...sharedPortableTextComponents,
    block: {
      normal: ({ children }) => <p className="mb-5 leading-8 text-slate-700 last:mb-0">{children}</p>,
      h2: ({ children }) => <h2 className="mb-4 mt-10 text-2xl font-extrabold tracking-tight text-blue-950 first:mt-0 sm:text-3xl">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-3 mt-8 text-xl font-bold text-blue-950 sm:text-2xl">{children}</h3>,
      h4: ({ children }) => <h4 className="mb-2 mt-6 text-lg font-bold text-slate-900 sm:text-xl">{children}</h4>
    },
    list: {
      bullet: ({ children }) => <ul className="mb-5 ml-6 list-disc space-y-2 text-slate-700 marker:text-amber-500">{children}</ul>,
      number: ({ children }) => <ol className="mb-5 ml-6 list-decimal space-y-2 text-slate-700 marker:font-bold marker:text-blue-900">{children}</ol>
    },
    listItem: {
      bullet: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
      number: ({ children }) => <li className="pl-1 leading-7">{children}</li>
    },
    marks: {
      strong: ({ children }) => <strong className="font-bold text-slate-950">{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
      underline: ({ children }) => <span className="underline decoration-amber-500 decoration-2 underline-offset-2">{children}</span>,
      link: ({ children, value }) => {
        const href = value?.href || '#';
        const isExternal = /^https?:\/\//i.test(href);
        return (
          <a
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="font-semibold text-blue-800 underline decoration-blue-300 underline-offset-2 transition hover:text-amber-700"
          >
            {children}
          </a>
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-blue-950/10 bg-[#0c2356] px-4 py-3 text-white sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <a href="/" className="inline-flex shrink-0 rounded-lg bg-white px-1.5 py-1">
            <img
              src="/xamtoppr-logo.png"
              alt="XamToppr - learning for earning"
              className="h-10 w-auto sm:h-12"
              width="139"
              height="75"
            />
          </a>
          <a href="/" className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 sm:px-4 sm:text-sm">
            Back to Books
          </a>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6 sm:py-12">
        <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
          <div className="border-b border-slate-200 bg-gradient-to-r from-blue-950 to-blue-900 px-5 py-7 text-white sm:px-10 sm:py-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-300">XamToppr</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">{page.title}</h1>
          </div>
          <div className="min-h-64 px-5 py-7 sm:px-10 sm:py-10">
            {loadError ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {loadError}
              </p>
            ) : content?.length ? (
              <div className="break-words text-sm sm:text-base">
                <PortableText value={content} components={portableTextComponents} />
              </div>
            ) : (
              <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-slate-600">
                This content is being prepared. Please check back soon.
              </p>
            )}
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}

function LegacyAppRoutes() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <div style={{ height: '100vh', width: '100vw', position: 'fixed', inset: 0, zIndex: 99999 }}>
        <Studio config={sanityConfig} />
      </div>
    );
  }

  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const contentPage = SITE_CONTENT_PAGES[normalizedPathname];
  if (contentPage) return <SiteContentPage page={contentPage} />;
  if (normalizedPathname === '/my-library') return <MyLibrary />;

  return <BookStoreApp />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/book/:slug" element={<BookDetailPage />} />
      <Route path="/my-library" element={<MyLibrary />} />
      <Route path="/video-courses/*" element={<BookStoreApp />} />
      <Route path="*" element={<LegacyAppRoutes />} />
    </Routes>
  );
}