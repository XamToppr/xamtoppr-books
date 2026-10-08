import React, { useState, useMemo, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import HTMLFlipBook from 'react-pageflip';
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
  GraduationCap,
  Award,
  Clock,
  HelpCircle,
  ExternalLink,
  ShoppingCart
} from 'lucide-react';

// ==========================================
// APNA GOOGLE SHEET CSV LINK YAHAN DALEIN
// ==========================================
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWDpgH3DG7CxaaXFi1qado9DzZ_dykCwxZeaZ58_ddMo6RmtMOsfZfmm0FRPpsYMntSv5h9DgZ7Pq2/pub?output=csv";

const INITIAL_BOOKS = [
  {
    id: 'xt-bk-001',
    slug: 'ssc-advance-arithmetic-maths-2026',
    title: 'SSC Comprehensive Advance & Arithmetic Mathematics (2026 Edition)',
    author: 'XamToppr Quant Faculty Board',
    publisher: 'XamToppr Academic Press',
    exam: 'SSC',
    examCategory: 'SSC CGL / CHSL / CPO',
    subject: 'Quantitative Aptitude',
    language: 'Bilingual (Hindi + English)',
    pages: 486,
    fileSize: '18.4 MB',
    rating: 4.9,
    reviewsCount: 1420,
    downloadsCount: '48.5K',
    badge: 'POPULAR',
    badgeColor: 'bg-amber-500',
    coverGradient: 'from-blue-900 via-indigo-950 to-slate-900',
    coverAccent: 'text-amber-400',
    coverImage: '',
    samplePdfUrl: '',
    pdfUrl: '',
    samplePages: [],
    isFree: true,
    publishedYear: '2026',
    description: 'Complete chapter-wise theoretical concepts and TCS PYQ solved questions.',
    tableOfContents: ['Number System', 'Algebra', 'Trigonometry', 'Geometry', 'Arithmetic']
  }
];

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

const MEDIUM_OPTIONS = ['All Mediums', 'Bilingual (Hindi + English)', 'Hindi Medium', 'English Medium'];

const SUBJECT_OPTIONS = [
  'All Subjects',
  'Quantitative Aptitude',
  'General Studies',
  'Reasoning Ability',
  'General Awareness',
  'English Language',
  'General Science',
  'Science',
  'Banking Awareness',
  'Static GK',
  'Child Development & Pedagogy',
  'History',
  'Mathematics'
];

const SORT_OPTIONS = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Highest Rated', value: 'rating' },
  { label: 'Downloads: High to Low', value: 'downloads' },
  { label: 'Book Title (A-Z)', value: 'title-asc' },
  { label: 'Pages: High to Low', value: 'pages-desc' }
];

export default function App() {
  const [booksList, setBooksList] = useState(INITIAL_BOOKS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('All Exams');
  const [selectedMedium, setSelectedMedium] = useState('All Mediums');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [sortBy, setSortBy] = useState('popular');
  const [savedBooks, setSavedBooks] = useState(['xt-bk-001']);
  const [selectedBookForModal, setSelectedBookForModal] = useState(null);
  const [showFlipbookModal, setShowFlipbookModal] = useState(null);
  const [showRequestBookModal, setShowRequestBookModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(false);
  const [quickFilterBadge, setQuickFilterBadge] = useState('ALL');
  const [flipPageNumber, setFlipPageNumber] = useState(0);

  const flipBookRef = useRef(null);
  const flipAudioRef = useRef(null);

  // Realistic Page Flip Sound (Direct user-interaction play)
  const playPageFlipSound = () => {
    try {
      const audio = new Audio('/page-flip.mp3');
      audio.volume = 1.0;
      audio.play().catch((e) => console.log('Audio wait/block:', e));
    } catch (err) {
      console.error(err);
    }
  };

  // Markdown bold (**text**) ko HTML Bold me badalne ka helper
    // Markdown bold (**text**) ko HTML Bold me badalne ka helper
  const renderFormattedText = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-black text-amber-300 drop-shadow">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Google Sheet Data Auto-Fetch
  useEffect(() => {
    if (!GOOGLE_SHEET_CSV_URL || GOOGLE_SHEET_CSV_URL.includes("YAHAN_APNA_GOOGLE_SHEET")) {
      return;
    }

    setIsLoadingSkeleton(true);
    Papa.parse(GOOGLE_SHEET_CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          // STRICT FILTER: Sirf valid ID aur Title wali rows hi render hongi
          const validRows = results.data.filter(
            (b) => b.id && b.id.trim() !== '' && b.title && b.title.trim() !== ''
          );

          const parsed = validRows.map((b, index) => {
            const badgeStr = (b.badge || '').trim();
            const isPaid = 
              badgeStr.toUpperCase().includes('PAID') || 
              badgeStr.toUpperCase().includes('PREMIUM') || 
              badgeStr.includes('₹');

            const samplePagesArr = b.samplePages 
              ? b.samplePages.split(',').map(s => s.trim()).filter(Boolean)
              : [];

            return {
              id: b.id.trim(),
              slug: b.slug ? b.slug.trim() : b.id.trim(),
              title: b.title.trim(),
              author: b.author || 'XamToppr Faculty',
              publisher: b.publisher || 'XamToppr Publications',
              exam: b.exam || 'All Exams',
              examCategory: b.examCategory || 'All Competitive Exams',
              subject: b.subject || 'General Studies',
              language: b.language || 'Bilingual (Hindi + English)',
              pages: Number(b.pages) || 0,
              fileSize: b.fileSize || '',
              rating: Number(b.rating) || 4.8,
              reviewsCount: Number(b.reviewsCount) || 100,
              downloadsCount: b.downloadsCount || '10K',
              badge: badgeStr || 'FREE PDF',
              badgeColor: b.badgeColor || (isPaid ? 'bg-emerald-600' : 'bg-amber-500'),
              coverGradient: 'from-blue-900 via-indigo-950 to-slate-900',
              coverAccent: 'text-amber-400',
              coverImage: b.coverImage ? b.coverImage.trim() : '',
              samplePdfUrl: b.samplePdfUrl ? b.samplePdfUrl.trim() : '',
              pdfUrl: b.pdfUrl ? b.pdfUrl.trim() : '',
              samplePages: samplePagesArr,
              isFree: !isPaid,
              publishedYear: b.publishedYear || '2026',
              description: b.description || '',
              tableOfContents: b.tableOfContents ? b.tableOfContents.split(/[,|\n]/).map(s => s.trim()).filter(Boolean) : []
            };
          });
          setBooksList(parsed);
        }
        setIsLoadingSkeleton(false);
      },
      error: () => setIsLoadingSkeleton(false)
    });
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
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
    setSelectedMedium('All Mediums');
    setSelectedSubject('All Subjects');
    setQuickFilterBadge('ALL');
    setSortBy('popular');
    showToast('Filters cleared successfully');
  };

  const filteredBooks = useMemo(() => {
    return booksList.filter((book) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = book.title.toLowerCase().includes(query);
        const matchSubject = book.subject.toLowerCase().includes(query);
        const matchExam = book.exam.toLowerCase().includes(query) || book.examCategory.toLowerCase().includes(query);
        const matchAuthor = book.author.toLowerCase().includes(query);
        const matchDesc = book.description.toLowerCase().includes(query);
        if (!matchTitle && !matchSubject && !matchExam && !matchAuthor && !matchDesc) {
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

      if (selectedMedium !== 'All Mediums') {
        if (!book.language.toLowerCase().includes(selectedMedium.toLowerCase().split(' ')[0])) {
          return false;
        }
      }

      if (selectedSubject !== 'All Subjects') {
        if (book.subject !== selectedSubject) return false;
      }

      if (quickFilterBadge === 'FREE' && !book.isFree) return false;
      if (quickFilterBadge === 'POPULAR' && !['POPULAR', 'BESTSELLER', 'MOST DOWNLOADED'].includes(book.badge)) return false;
      if (quickFilterBadge === 'TOPPER' && !book.badge.toUpperCase().includes('TOPPER')) return false;
      if (quickFilterBadge === 'NOTES' && !(book.badge.toUpperCase().includes('NOTES') || book.samplePages.length > 0)) return false;
      if (quickFilterBadge === 'NEW' && book.badge !== 'NEW 2026') return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'popular') return b.reviewsCount - a.reviewsCount;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      if (sortBy === 'pages-desc') return b.pages - a.pages;
      if (sortBy === 'downloads') {
        const parseDL = (str) => parseFloat(String(str).replace('K', '')) * 1000 || 0;
        return parseDL(b.downloadsCount) - parseDL(a.downloadsCount);
      }
      return 0;
    });
  }, [booksList, searchQuery, selectedExam, selectedMedium, selectedSubject, quickFilterBadge, sortBy]);

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
            <a href="mailto:xamtoppr@gmail.com" className="hidden lg:flex items-center gap-1.5 hover:text-white transition">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> xamtoppr@gmail.com
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
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <a href="https://www.xamtoppr.com/" className="cursor-pointer flex items-center gap-2.5 group">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <GraduationCap className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-white">Xam</span>
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-amber-400">Toppr</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200">
                    Learn • Practice • Excel
                  </span>
                </div>
              </a>
            </div>

            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium">
              <a href="https://www.xamtoppr.com/" className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition">
                Home
              </a>
              <a href="https://xamtoppr.com/video" className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition">
                Courses
              </a>
              <a href="https://xamtoppr.com/package/combo" className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition">
                Test Series
              </a>
              <a href="/" className="px-3.5 py-2 rounded-lg relative flex items-center gap-1.5 text-amber-400 font-bold bg-white/15 shadow-inner">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Books & Notes</span>
                <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full uppercase">
                  Free
                </span>
              </a>
              <a href="https://xamtoppr.com/weekly-quiz" className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition">
                Current Affairs
              </a>
              <a href="https://xamtoppr.com/blog" className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition">
                PYQ Papers
              </a>
            </nav>

            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={() => setShowRequestBookModal(true)}
                className="text-xs font-semibold text-amber-300 hover:text-white bg-blue-900/60 hover:bg-blue-900 border border-blue-700/60 px-3 py-2 rounded-lg transition flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Request Book
              </button>
              <a href="https://xamtoppr.com/signin" className="text-sm font-medium text-white hover:text-amber-400 px-3 py-2 transition">
                Log In
              </a>
              <a href="https://xamtoppr.com/signup" className="text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 px-4 py-2 rounded-lg shadow-md transition transform active:scale-95">
                Sign Up Free
              </a>
            </div>

            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => setShowRequestBookModal(true)}
                className="text-xs text-amber-300 bg-blue-900/60 border border-blue-700 px-2.5 py-1.5 rounded-md"
              >
                Request
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-200 hover:text-white hover:bg-blue-900/80 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0a1b3d] border-b border-blue-900 px-4 pt-3 pb-5 space-y-2">
            <a href="https://www.xamtoppr.com/" className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50">
              Home
            </a>
            <a href="https://xamtoppr.com/video" className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50">
              Courses
            </a>
            <a href="https://xamtoppr.com/package/combo" className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50">
              Test Series
            </a>
            <a href="/" className="block w-full text-left px-3 py-2.5 rounded-lg text-amber-400 font-bold bg-blue-900/60 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Free Books & PDF Library
              </span>
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded">FREE</span>
            </a>
            <a href="https://xamtoppr.com/weekly-quiz" className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50">
              Current Affairs
            </a>
            <a href="https://xamtoppr.com/blog" className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50">
              PYQ Papers
            </a>
          </div>
        )}
      </header>

      <main className="flex-1 pb-16">
        {/* Breadcrumb */}
        <div className="bg-slate-100 border-b border-slate-200 py-2.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center text-xs text-slate-600 gap-1.5 flex-wrap">
            <a href="https://www.xamtoppr.com/" className="hover:text-blue-900 font-medium transition">
              Home
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Study Resources</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-blue-950 font-bold">Books & Study Material</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-[#0c2356] via-[#102d6b] to-[#153a8a] text-white py-10 sm:py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-inner">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                XamToppr Digital e-Library
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Competitive Exam Books & Visual Study Notes
              </h1>
              <p className="mt-3 sm:mt-4 text-slate-200 text-sm sm:text-base leading-relaxed">
                Access curated competitive exam books, topper handwritten notes, subject-wise infographics, and 3D interactive flipbooks for SSC, Banking, Railways, UPSC, and State exams.
              </p>
            </div>
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
                  selectedMedium !== 'All Mediums' ||
                  selectedSubject !== 'All Subjects' ||
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
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Medium / Language
                </label>
                <select
                  value={selectedMedium}
                  onChange={(e) => setSelectedMedium(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  {MEDIUM_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Subject / Topic
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
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

          {isLoadingSkeleton ? (
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
                          setShowFlipbookModal(book);
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

                        <button
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

                      <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between z-10 text-[10px] text-slate-200 font-medium">
                        <span className="bg-black/70 px-2 py-0.5 rounded">
                          {book.language.includes('Hindi') ? 'हिन्दी माध्यम' : 'English Medium'}
                        </span>
                        <span className="flex items-center gap-1 text-amber-300 font-bold bg-black/70 px-1.5 py-0.5 rounded">
                          <Star className="w-3 h-3 fill-amber-300" /> {book.rating}
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
                              setShowFlipbookModal(book);
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
                            <span className="font-bold text-amber-700">{book.downloadsCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 flex items-center gap-2">
                        {isVisualNote ? (
                          <button
                            onClick={() => {
                              setShowFlipbookModal(book);
                              setFlipPageNumber(0);
                            }}
                            className="flex-1 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            <span>Flipbook 3D</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedBookForModal(book)}
                            className="flex-1 bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>View Book</span>
                          </button>
                        )}
                        
                        {isPaid ? (
                          <a
                            href={book.pdfUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (!book.pdfUrl) {
                                e.preventDefault();
                                showToast('Payment link will be updated soon!');
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2.5 rounded-xl transition font-bold text-xs shadow-sm flex items-center gap-1.5"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Buy</span>
                          </a>
                        ) : (
                          <a
                            href={book.pdfUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={book.title}
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
      </main>

      {/* ============================================================== */}
      {/* 3D INTERACTIVE FLIPBOOK MODAL WITH REALISTIC SOUND */}
      {/* ============================================================== */}
      {showFlipbookModal && (() => {
        const book = showFlipbookModal;
        const pagesList = book.samplePages.length > 0 
          ? book.samplePages 
          : (book.coverImage ? [book.coverImage] : []);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 text-white rounded-3xl max-w-4xl w-full max-h-[96vh] overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
              
              {/* Flipbook Header */}
              <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">{book.title}</h3>
                    <p className="text-[11px] text-purple-300">Interactive 3D Page-Flip Experience</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!book.isFree && book.pdfUrl && (
                    <a
                      href={book.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
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
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md"
                    >
                      <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Download PDF</span>
                    </a>
                  )}
                  <button
                    onClick={() => setShowFlipbookModal(null)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Flipbook Viewer Container */}
              <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-radial from-slate-800 to-slate-950 relative min-h-[460px]">
                
                {/* HTMLFlipBook Component */}

<HTMLFlipBook
  width={340}
  height={480}
  size="stretch"
  minWidth={280}
  maxWidth={480}
  minHeight={400}
  maxHeight={640}
  maxShadowOpacity={0.5}
  showCover={true}
  mobileScrollSupport={true}
  className="shadow-2xl mx-auto rounded-lg overflow-hidden"
  ref={flipBookRef}
  onFlip={(e) => {
    setFlipPageNumber(e.data);
    playPageFlipSound();
  }}
>
  {/* Page 1: Description & Overview (Full Height Fitted) */}
  <div className="h-full w-full flex flex-col justify-between p-4 sm:p-5 text-white relative overflow-hidden select-none bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 border-r border-slate-700/60 shadow-2xl">
    {/* Subtle Auto Background Animated Glow */}
    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-purple-600/15 to-teal-500/10 animate-pulse pointer-events-none"></div>
    <div className="absolute -top-16 -right-16 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
    <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>

    {/* Top Header Badge & Title */}
    <div className="relative z-10 flex-shrink-0">
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

    {/* Middle Full-Height Scrollable Description Area */}
    <div className="relative z-10 my-3 flex-1 min-h-0 overflow-y-auto pr-1 text-left bg-slate-900/80 p-3.5 rounded-xl border border-indigo-500/30 backdrop-blur-md shadow-inner flex flex-col">
      <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-2 flex items-center gap-1.5 sticky top-0 bg-slate-900/90 py-1 backdrop-blur-sm z-10 flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>About These Notes</span>
      </div>
      <div className="text-[11px] sm:text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line flex-1">
        {renderFormattedText(book.description || '')}
      </div>
    </div>

    {/* Bottom Indicator (Anchored at the very bottom) */}
    <div className="relative z-10 pt-2 border-t border-slate-800/90 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 flex-shrink-0">
      <span className="text-amber-400 font-bold flex items-center gap-1">
        ★ {book.rating || '4.9'}
      </span>
      <span className="text-indigo-300 font-semibold animate-pulse">
        Turn next for handwritten samples →
      </span>
    </div>
  </div>

  {/* Sample Pages (From Google Sheet) */}
  {pagesList.map((pageImg, idx) => (
    <div key={idx} className="bg-white text-slate-900 h-full flex flex-col items-center justify-center p-2 shadow-inner border border-slate-300">
      <img src={pageImg} alt={`Page ${idx + 1}`} className="w-full h-full object-contain" />
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
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black text-xs py-2.5 rounded-xl shadow-xl flex items-center justify-center gap-2 transition"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Unlock Full Notes ({book.badge})</span>
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
                <div className="mt-4 flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700/80 backdrop-blur-md">
                  <button
                    onClick={() => {
                      flipBookRef.current?.pageFlip()?.flipPrev();
                      playPageFlipSound();
                    }}
                    className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <span className="text-xs text-slate-300 font-mono">
                    Use mouse / finger to flip pages
                  </span>

                  <button
  onClick={() => {
    flipBookRef.current?.pageFlip()?.flipPrev();
    playPageFlipSound();
  }}
  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
  title="Previous Page"
>
  <ChevronLeft className="w-5 h-5" />
</button>

<button
  onClick={() => {
    flipBookRef.current?.pageFlip()?.flipNext();
    playPageFlipSound();
  }}
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
        const isPaidBook = 
          selectedBookForModal.badge?.toUpperCase().includes('PAID') ||
          selectedBookForModal.badge?.toUpperCase().includes('PREMIUM') ||
          selectedBookForModal.badge?.includes('₹');

        const sampleUrl = selectedBookForModal.samplePdfUrl || selectedBookForModal.pdfUrl;

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
                      <Star className="w-3.5 h-3.5 fill-amber-500" /> {selectedBookForModal.rating} ({selectedBookForModal.reviewsCount})
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                    About This Study Material
                  </h4>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 whitespace-pre-line font-sans">
                    {renderFormattedText(selectedBookForModal.description)}
                  </div>
                </div>

                {selectedBookForModal.tableOfContents && selectedBookForModal.tableOfContents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-900" />
                      Table of Contents & Key Chapters ({selectedBookForModal.tableOfContents.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {selectedBookForModal.tableOfContents.map((chap, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-slate-700"
                        >
                          <span className="w-5 h-5 bg-blue-100 text-blue-950 font-bold text-[10px] rounded flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-medium line-clamp-1">{chap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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

               <div className="flex items-center gap-2.5">
                  {isPaidBook ? (
                    <>
                      {/* Paid Book: Sample dekhne ka option */}
                      <a
                        href={sampleUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-900" />
                        <span>Read Sample PDF</span>
                      </a>

                      {/* Paid Book: Buy Now */}
                      <a
                        href={selectedBookForModal.pdfUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 transform active:scale-95"
                      >
                        <ShoppingCart className="w-4 h-4 text-white" />
                        <span>Buy Now ({selectedBookForModal.badge})</span>
                      </a>
                    </>
                  ) : (
                    /* Free Material: Sample hatakar seedhe Poori PDF ka Single Button */
                    <a
                      href={selectedBookForModal.pdfUrl || selectedBookForModal.samplePdfUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
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

      {/* Footer */}
      <footer className="bg-[#08152e] text-slate-300 border-t border-blue-950 py-10 px-4 text-center text-xs">
        <p>© 2026 XamToppr Edutech Private Limited. All Rights Reserved.</p>
      </footer>
    </div>
  );
}