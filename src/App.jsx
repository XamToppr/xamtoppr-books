import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Search,
  BookOpen,
  Download,
  Eye,
  Filter,
  X,
  Star,
  ChevronRight,
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
// 1. APNA GOOGLE SHEET CSV LINK YAHAN DALEIN
// ==========================================
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWDpgH3DG7CxaaXFi1qado9DzZ_dykCwxZeaZ58_ddMo6RmtMOsfZfmm0FRPpsYMntSv5h9DgZ7Pq2/pub?output=csv";

// Fallback Books (Agar internet slow ho ya sheet load na ho)
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
    pdfUrl: '',
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
  const [activeTab, setActiveTab] = useState('books');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('All Exams');
  const [selectedMedium, setSelectedMedium] = useState('All Mediums');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [sortBy, setSortBy] = useState('popular');
  const [savedBooks, setSavedBooks] = useState(['xt-bk-001']);
  const [selectedBookForModal, setSelectedBookForModal] = useState(null);
  const [showRequestBookModal, setShowRequestBookModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(false);
  const [quickFilterBadge, setQuickFilterBadge] = useState('ALL');

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
          const parsed = results.data.map((b, index) => {
            const badgeStr = (b.badge || '').trim();
            const isPaid = 
              badgeStr.toUpperCase().includes('PAID') || 
              badgeStr.toUpperCase().includes('PREMIUM') || 
              badgeStr.includes('₹');

            return {
              id: b.id || `xt-bk-${index + 1}`,
              slug: b.slug || `book-${index + 1}`,
              title: b.title || 'Untitled Book',
              author: b.author || 'XamToppr Faculty',
              publisher: b.publisher || 'XamToppr Publications',
              exam: b.exam || 'All Exams',
              examCategory: b.examCategory || 'All Competitive Exams',
              subject: b.subject || 'General Studies',
              language: b.language || 'Bilingual (Hindi + English)',
              pages: Number(b.pages) || 120,
              fileSize: b.fileSize || '10 MB',
              rating: Number(b.rating) || 4.8,
              reviewsCount: Number(b.reviewsCount) || 250,
              downloadsCount: b.downloadsCount || '25K',
              badge: badgeStr || 'FREE PDF',
              badgeColor: b.badgeColor || (isPaid ? 'bg-rose-600' : 'bg-amber-500'),
              coverGradient: 'from-blue-900 via-indigo-950 to-slate-900',
              coverAccent: 'text-amber-400',
              coverImage: b.coverImage ? b.coverImage.trim() : '',
              pdfUrl: b.pdfUrl ? b.pdfUrl.trim() : '',
              isFree: !isPaid,
              publishedYear: b.publishedYear || '2026',
              description: b.description || 'Verified exam preparation study material with solved papers.',
              tableOfContents: b.tableOfContents ? b.tableOfContents.split(',').map(s => s.trim()) : ['Core Concepts', 'Practice MCQs']
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
        if (selectedExam === 'State Exams' && book.exam !== 'State Exams') return false;
        if (selectedExam !== 'State Exams' && book.exam !== selectedExam && book.exam !== 'All Exams') return false;
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
      if (quickFilterBadge === 'TOPPER' && book.badge !== 'TOPPER NOTES') return false;
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

      {/* Navigation Header */}
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

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium">
              <a
                href="https://www.xamtoppr.com/"
                className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition"
              >
                Home
              </a>
              <a
                href="https://xamtoppr.com/video"
                className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition"
              >
                Courses
              </a>
              <a
                href="https://xamtoppr.com/package/combo"
                className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition"
              >
                Test Series
              </a>
              <a
                href="/"
                className="px-3.5 py-2 rounded-lg relative flex items-center gap-1.5 text-amber-400 font-bold bg-white/15 shadow-inner"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Books & Notes</span>
                <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full uppercase">
                  Free
                </span>
              </a>
              <a
                href="https://xamtoppr.com/weekly-quiz"
                className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition"
              >
                Current Affairs
              </a>
              <a
                href="https://xamtoppr.com/blog"
                className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition"
              >
                PYQ Papers
              </a>
            </nav>

            {/* Header Right Actions */}
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={() => setShowRequestBookModal(true)}
                className="text-xs font-semibold text-amber-300 hover:text-white bg-blue-900/60 hover:bg-blue-900 border border-blue-700/60 px-3 py-2 rounded-lg transition flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Request Book
              </button>
              <a
                href="https://xamtoppr.com/signin"
                className="text-sm font-medium text-white hover:text-amber-400 px-3 py-2 transition"
              >
                Log In
              </a>
              <a
                href="https://xamtoppr.com/signup"
                className="text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 px-4 py-2 rounded-lg shadow-md transition transform active:scale-95"
              >
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
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0a1b3d] border-b border-blue-900 px-4 pt-3 pb-5 space-y-2">
            <a
              href="https://www.xamtoppr.com/"
              className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50"
            >
              Home
            </a>
            <a
              href="https://xamtoppr.com/video"
              className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50"
            >
              Courses
            </a>
            <a
              href="https://xamtoppr.com/package/combo"
              className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50"
            >
              Test Series
            </a>
            <a
              href="/"
              className="block w-full text-left px-3 py-2.5 rounded-lg text-amber-400 font-bold bg-blue-900/60 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Free Books & PDF Library
              </span>
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded">FREE</span>
            </a>
            <a
              href="https://xamtoppr.com/weekly-quiz"
              className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50"
            >
              Current Affairs
            </a>
            <a
              href="https://xamtoppr.com/blog"
              className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50"
            >
              PYQ Papers
            </a>
            <div className="pt-3 border-t border-blue-900/60 flex flex-col gap-2">
              <a
                href="https://xamtoppr.com/signin"
                className="w-full py-2.5 text-center text-sm font-semibold text-white border border-blue-700 rounded-lg hover:bg-blue-900"
              >
                Log In
              </a>
              <a
                href="https://xamtoppr.com/signup"
                className="w-full py-2.5 text-center text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg"
              >
                Sign Up Free
              </a>
            </div>
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
                Competitive Exam Books & Free Study Material
              </h1>
              <p className="mt-3 sm:mt-4 text-slate-200 text-sm sm:text-base leading-relaxed">
                Access curated competitive exam books, topper handwritten notes, subject-wise formula sheets, and chapter-wise practice sets for SSC, Banking, Railways, UPSC, State PSC, and Teaching exams.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 text-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>100% Free Verified PDFs</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 text-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Hindi & English Mediums</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 text-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Latest 2026 TCS / NTA Pattern</span>
                </div>
              </div>
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
                placeholder="Search by book title, subject, exam (e.g., SSC CGL, Quant, Lucent GK, History)..."
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

            <div className="mt-3.5 flex items-center gap-2 flex-wrap text-xs text-slate-600">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Popular:
              </span>
              {[
                'Maths Formula Sheet',
                'General Studies 7500+',
                'Banking Puzzles',
                'CTET CDP Notes',
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
              </div>
            </div>

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
                    <option key={m} value={m}>
                      {m}
                    </option>
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
                    <option key={s} value={s}>
                      {s}
                    </option>
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
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Books Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-blue-950">
                Available Books & Study Material
              </h2>
              <span className="bg-blue-100 text-blue-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {filteredBooks.length} {filteredBooks.length === 1 ? 'Book' : 'Books'}
              </span>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-4">
              <span className="hidden sm:inline-block">
                Showing results for <span className="font-semibold text-slate-800">{selectedExam}</span>
              </span>
              <button
                onClick={() => {
                  setIsLoadingSkeleton(true);
                  setTimeout(() => setIsLoadingSkeleton(false), 400);
                }}
                className="text-slate-500 hover:text-blue-900 underline font-medium"
              >
                Refresh
              </button>
            </div>
          </div>

          {isLoadingSkeleton ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
                  <div className="h-56 bg-slate-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-5 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="h-3 bg-slate-100 rounded"></div>
                      <div className="h-3 bg-slate-100 rounded"></div>
                    </div>
                    <div className="h-9 bg-slate-200 rounded-xl pt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 sm:p-14 text-center max-w-2xl mx-auto my-8 shadow-sm">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <BookMarked className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">No books found matching your criteria</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                We couldn't find any study material for "{searchQuery || selectedExam}". Try adjusting your keywords or clearing the active filters.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleResetFilters}
                  className="bg-blue-900 hover:bg-blue-950 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow transition"
                >
                  Clear All Filters
                </button>
                <button
                  onClick={() => setShowRequestBookModal(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  Request This Book
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredBooks.map((book) => {
                const isSaved = savedBooks.includes(book.id);
                const isPaid = !book.isFree;

                return (
                  <div
                    key={book.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1 relative"
                  >
                    {/* BOOK COVER ART SECTION */}
                    <div
                      onClick={() => setSelectedBookForModal(book)}
                      className="h-56 bg-slate-900 relative cursor-pointer select-none overflow-hidden"
                    >
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${book.coverGradient} p-4 flex flex-col justify-between`}>
                          <div className="absolute left-0 top-0 bottom-0 w-3 bg-white/10 border-r border-white/20"></div>
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

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 pointer-events-none"></div>

                      <div className="absolute top-3 inset-x-3 flex items-start justify-between z-10">
                        <span
                          className={`${book.badgeColor} text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-md tracking-wider`}
                        >
                          {book.badge}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(book.id, book.title);
                          }}
                          className={`p-1.5 rounded-full backdrop-blur-md transition ${
                            isSaved
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-black/40 text-white/90 hover:text-white hover:bg-black/60'
                          }`}
                          title={isSaved ? 'Remove Bookmark' : 'Save Book'}
                        >
                          <BookMarked className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between z-10 text-[10px] text-slate-200 font-medium">
                        <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                          {book.language.includes('Hindi') && !book.language.includes('Bilingual')
                            ? 'हिन्दी माध्यम'
                            : book.language.includes('Bilingual')
                            ? 'द्विभाषी (Bilingual)'
                            : 'English Medium'}
                        </span>
                        <span className="flex items-center gap-1 text-amber-300 font-bold bg-black/60 px-1.5 py-0.5 rounded">
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
                          onClick={() => setSelectedBookForModal(book)}
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
                            <span className="font-bold text-slate-800">{book.fileSize}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400 text-[9px] uppercase">Downloads</span>
                            <span className="font-bold text-amber-700">{book.downloadsCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons (Direct Buy/Download) */}
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => setSelectedBookForModal(book)}
                          className="flex-1 bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Book</span>
                        </button>
                        
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
                            title="Buy Now"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Buy</span>
                          </a>
                        ) : book.pdfUrl ? (
                          <a
                            href={book.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={book.title}
                            onClick={() => showToast(`Starting download: ${book.title.substring(0, 20)}...`)}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 rounded-xl transition font-bold shadow-sm flex items-center justify-center"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4 stroke-[2.5]" />
                          </a>
                        ) : (
                          <button
                            onClick={() => showToast('PDF link will be updated soon for this book!')}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 rounded-xl transition font-bold shadow-sm flex items-center justify-center"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Telegram Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-blue-800/60">
            <div className="space-y-2 max-w-xl text-center md:text-left">
              <span className="inline-block bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Daily Study Material Alert
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                Join 1,50,000+ Aspirants on XamToppr Telegram
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                Get daily Hindu vocabulary PDFs, Current Affairs capsules, NCERT summaries, and live exam notifications directly on your phone.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
              <a
                href="https://t.me/xamtopprnew"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <span>Join Telegram Channel</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={() => setShowRequestBookModal(true)}
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-3.5 rounded-xl border border-white/20 transition"
              >
                Request Custom PDF
              </button>
            </div>
          </div>
        </section>

        {/* Prep Strategy Guide */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-blue-950 mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              How to Prepare with XamToppr Free Books & Study Material
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">
              Maximize your score with these verified self-study strategies recommended by top rankers:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 font-black flex items-center justify-center mb-3">
                  1
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Concept Mastery First</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Start with subject formula sheets and theory notes before jumping to mock tests to build a strong fundamental foundation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-black flex items-center justify-center mb-3">
                  2
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Active Revision Loops</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Utilize the 1-liner capsules and state-wise infomaps for weekly 15-minute quick revisions on mobile or tablet.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 font-black flex items-center justify-center mb-3">
                  3
                </div>
                <h4 className="font-bold text-slate-900 mb-1">TCS PYQ Question Practice</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Solve 50-100 MCQs daily from our TCS previous-year compendiums to calibrate your timing with real exam difficulty.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Book Detail Modal */}
      {selectedBookForModal && (() => {
        const isPaidBook = 
          selectedBookForModal.badge?.toUpperCase().includes('PAID') ||
          selectedBookForModal.badge?.toUpperCase().includes('PREMIUM') ||
          selectedBookForModal.badge?.includes('₹');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-300 flex flex-col">
              
              {/* Modal Header */}
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

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-6 text-slate-800">
                
                {/* Stats Grid */}
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
                    <span className="font-bold text-slate-900">{selectedBookForModal.fileSize}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Rating</span>
                    <span className="font-bold text-amber-600 flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500" /> {selectedBookForModal.rating} ({selectedBookForModal.reviewsCount})
                    </span>
                  </div>
                </div>

                {/* About This Study Material (whitespace-pre-line se Alt+Enter line breaks properly dikhenge) */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                    About This Study Material
                  </h4>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 whitespace-pre-line font-sans">
                    {selectedBookForModal.description}
                  </div>
                </div>

                {/* Table of Contents */}
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

              {/* Modal Footer Buttons */}
              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => toggleBookmark(selectedBookForModal.id, selectedBookForModal.title)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
                >
                  <BookMarked className="w-4 h-4 text-amber-500" />
                  {savedBooks.includes(selectedBookForModal.id) ? 'Saved in Library' : 'Save for Later'}
                </button>

                <div className="flex items-center gap-2.5">
                  {/* Read Online Button */}
                  <a
                    href={selectedBookForModal.pdfUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!selectedBookForModal.pdfUrl) {
                        e.preventDefault();
                        showToast('Link will be updated soon!');
                      }
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition inline-block"
                  >
                    Read Online
                  </a>

                  {/* Dynamic Action Button: Buy Now vs Free Download */}
                  {isPaidBook ? (
                    <a
                      href={selectedBookForModal.pdfUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!selectedBookForModal.pdfUrl) {
                          e.preventDefault();
                          showToast('Razorpay payment link update hone wala hai!');
                        }
                      }}
                      className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 transform active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Buy Now ({selectedBookForModal.badge})</span>
                    </a>
                  ) : (
                    <a
                      href={selectedBookForModal.pdfUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={selectedBookForModal.title}
                      onClick={(e) => {
                        if (!selectedBookForModal.pdfUrl) {
                          e.preventDefault();
                          showToast('Free PDF link update hone wala hai!');
                        } else {
                          setSelectedBookForModal(null);
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>Download Free PDF</span>
                    </a>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Request Modal */}
      {showRequestBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-blue-950">Request a Book / Study Material</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tell us what book or notes you need. Our team will verify and upload it within 24 hours.
                </p>
              </div>
              <button
                onClick={() => setShowRequestBookModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowRequestBookModal(false);
                showToast('Your book request has been submitted to XamToppr Academic Team!');
              }}
              className="space-y-3.5 text-xs sm:text-sm pt-2"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Book Title / Topic *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Lucent General Science 2026 Hindi Medium"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Exam *</label>
                  <select className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    <option>SSC CGL / CHSL</option>
                    <option>Banking / IBPS / SBI</option>
                    <option>Railway RRB NTPC</option>
                    <option>UPSC CSE / State PSC</option>
                    <option>Defence NDA / CDS</option>
                    <option>Teaching CTET / TET</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preferred Language *</label>
                  <select className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    <option>Hindi Medium</option>
                    <option>English Medium</option>
                    <option>Bilingual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Email Address (for notification)</label>
                <input
                  type="email"
                  placeholder="student@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestBookModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold transition"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#08152e] text-slate-300 border-t border-blue-950">
        <div className="border-b border-blue-950/80 py-8 px-4 sm:px-6 lg:px-8 bg-[#0a1a38]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-slate-950 shrink-0 shadow-md">
                <GraduationCap className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  Prepare for your dream government exam with XamToppr
                </h4>
                <p className="text-xs text-slate-400">
                  Join millions of students learning with our test series, live classes, and free library.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://xamtoppr.com/signup"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition inline-block"
              >
                Create Free Account
              </a>
              <a
                href="tel:+917717707121"
                className="border border-slate-600 hover:border-slate-400 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl transition inline-block"
              >
                Contact Counselor
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 text-xs">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-slate-950 font-black">
                  XT
                </div>
                <span className="text-xl font-black text-white tracking-tight">
                  Xam<span className="text-amber-400">Toppr</span>
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                XamToppr is India's premier online preparation portal delivering high-yield test series, video lectures, bilingual e-books, and daily exam analysis for SSC, Banking, Railways, UPSC, and State examinations.
              </p>

              <div className="space-y-2 pt-2 text-slate-300">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>XamToppr Edutech Campus, Plot 42, Education Hub, Mukherjee Nagar, New Delhi - 110009</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Toll-Free Helpline: +91 7717707121</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Official Support: xamtoppr@gmail.com </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-white uppercase tracking-wider text-xs border-b border-blue-900/60 pb-2">
                Exam Categories
              </h5>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => handleCategoryChange('SSC')} className="hover:text-amber-400 transition">SSC CGL / CHSL / MTS / CPO</button></li>
                <li><button onClick={() => handleCategoryChange('Banking')} className="hover:text-amber-400 transition">SBI PO / Clerk & IBPS RRB</button></li>
                <li><button onClick={() => handleCategoryChange('Railway')} className="hover:text-amber-400 transition">Railway RRB NTPC & Group D</button></li>
                <li><button onClick={() => handleCategoryChange('UPSC')} className="hover:text-amber-400 transition">UPSC CSE & State PSC Exams</button></li>
                <li><button onClick={() => handleCategoryChange('Defence')} className="hover:text-amber-400 transition">Defence: NDA, CDS & AFCAT</button></li>
                <li><button onClick={() => handleCategoryChange('Teaching')} className="hover:text-amber-400 transition">Teaching: CTET & State TET</button></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-white uppercase tracking-wider text-xs border-b border-blue-900/60 pb-2">
                Study Resources
              </h5>
              <ul className="space-y-2 text-slate-400">
                <li><a href="/" className="text-amber-400 font-semibold hover:underline">Free PDF Books Library</a></li>
                <li><a href="https://xamtoppr.com/weekly-quiz" className="hover:text-amber-400 transition">Daily Current Affairs Capsules</a></li>
                <li><a href="https://xamtoppr.com/blog" className="hover:text-amber-400 transition">Previous Year Papers (PYQ)</a></li>
                <li><a href="/" className="hover:text-amber-400 transition">Formula Sheets & Mind-Maps</a></li>
                <li><a href="https://xamtoppr.com/weekly-quiz" className="hover:text-amber-400 transition">Daily Live Free Quizzes</a></li>
                <li><a href="https://xamtoppr.com/blog" className="hover:text-amber-400 transition">Exam Notifications 2026</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-white uppercase tracking-wider text-xs border-b border-blue-900/60 pb-2">
                Support & Legal
              </h5>
              <ul className="space-y-2 text-slate-400">
                <li><a href="https://xamtoppr.com/about-us" className="hover:text-amber-400 transition">About XamToppr</a></li>
                <li><a href="https://xamtoppr.com/privacy-policy" className="hover:text-amber-400 transition">Privacy Policy</a></li>
                <li><a href="https://xamtoppr.com/terms" className="hover:text-amber-400 transition">Terms & Conditions</a></li>
                <li><a href="https://xamtoppr.com/refund-policy" className="hover:text-amber-400 transition">Refund & Cancellation Policy</a></li>
                <li><a href="https://xamtoppr.com/disclaimer" className="hover:text-amber-400 transition">DMCA & Copyright Disclaimer</a></li>
                <li><a href="https://xamtoppr.com/contact" className="hover:text-amber-400 transition">Student FAQs & Help Center</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-blue-950/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 font-semibold">Connect with us:</span>
              <a 
                href="https://www.youtube.com/@xamtopprofficial" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-400 hover:text-white transition font-medium"
              >
                YouTube
              </a>
              <a 
                href="https://t.me/xamtopprnew" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-400 hover:text-white transition font-medium"
              >
                Telegram
              </a>
              <a 
                href="https://www.facebook.com/profile.php?id=100086508596485" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-400 hover:text-white transition font-medium"
              >
                Facebook
              </a>
              <a 
                href="https://www.instagram.com/xamtoppr" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-400 hover:text-white transition font-medium"
              >
                Instagram
              </a>
            </div>
            <div>
              <p>© 2026 XamToppr Edutech Private Limited. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}