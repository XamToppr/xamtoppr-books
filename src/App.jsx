import React, { useState, useMemo } from 'react';
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
  ExternalLink
} from 'lucide-react';

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
    isFree: true,
    publishedYear: '2026',
    description:
      'Complete chapter-wise theoretical concepts, shortcut tricks, formula sheets, and 4500+ TCS previous year solved questions categorized from basic to advance tier-2 level.',
    tableOfContents: [
      'Number System & Divisibility Rules',
      'Algebra & Polynomial Identities',
      'Trigonometry & Heights & Distances',
      'Geometry (Triangles, Circles, Quadrilaterals)',
      'Mensuration 2D & 3D Solids',
      'Percentage, Profit, Loss & Discount',
      'Time, Speed, Distance & Trains',
      'Data Interpretation (DI) Master Sets'
    ]
  },
  {
    id: 'xt-bk-002',
    slug: 'general-studies-tcs-mcq-bank',
    title: 'General Studies 7500+ TCS Pattern MCQs with In-Depth Explanations',
    author: 'Dr. Anand Verma & XamToppr GS Wing',
    publisher: 'XamToppr Publications',
    exam: 'SSC',
    examCategory: 'SSC & Railway Exams',
    subject: 'General Studies',
    language: 'English Medium',
    pages: 620,
    fileSize: '24.2 MB',
    rating: 4.8,
    reviewsCount: 2180,
    downloadsCount: '62.1K',
    badge: 'BESTSELLER',
    badgeColor: 'bg-rose-500',
    coverGradient: 'from-emerald-900 via-teal-950 to-slate-900',
    coverAccent: 'text-emerald-300',
    isFree: true,
    publishedYear: '2026',
    description:
      'Strictly curated on latest exam trends. Includes Ancient, Medieval, Modern History, Indian Polity & Constitution, Geography, Economy, and General Science with pictorial memory maps.',
    tableOfContents: [
      'Ancient & Medieval History Chronicle',
      'Modern Freedom Struggle (1857-1947)',
      'Indian Constitution & Fundamental Rights',
      'Physical & Human Geography of India',
      'Indian Economy & Budget Fundamentals',
      'Physics, Chemistry, Biology Essentials'
    ]
  },
  {
    id: 'xt-bk-003',
    slug: 'banking-reasoning-puzzles-master',
    title: 'Banking Reasoning Master: High-Level Puzzles & Seating Arrangements',
    author: 'Er. Rakesh Ranjan',
    publisher: 'XamToppr Banking Academy',
    exam: 'Banking',
    examCategory: 'SBI PO / IBPS PO / RRB Scale-I',
    subject: 'Reasoning Ability',
    language: 'English Medium',
    pages: 390,
    fileSize: '14.6 MB',
    rating: 4.9,
    reviewsCount: 980,
    downloadsCount: '34.2K',
    badge: 'NEW 2026',
    badgeColor: 'bg-indigo-600',
    coverGradient: 'from-violet-900 via-purple-950 to-slate-900',
    coverAccent: 'text-violet-300',
    isFree: true,
    publishedYear: '2026',
    description:
      'Master Mains-level circular, linear, matrix, floor-flat, blood-relation merged, and parallel row seating puzzles with step-by-step decoding strategies and time-saving eliminating techniques.',
    tableOfContents: [
      'Circular & Rectangular Seating',
      'Floor & Flat Based Complex Puzzles',
      'Box & Stack Placement with Variables',
      'Blood Relations & Direction Sense Merged',
      'Machine Input-Output Step Logic',
      'Critical & Analytical Reasoning'
    ]
  },
  {
    id: 'xt-bk-004',
    slug: 'samanya-gyan-one-liner-capsule-hindi',
    title: 'सामान्य ज्ञान (GK/GS) ब्रह्मास्त्र वन-लाइनर कैप्सूल 2026',
    author: 'XamToppr Editorial Board (Hindi Wing)',
    publisher: 'XamToppr Publications',
    exam: 'State Exams',
    examCategory: 'UPSSSC / BSSC / MPPSC / Police',
    subject: 'General Awareness',
    language: 'Hindi Medium',
    pages: 310,
    fileSize: '12.1 MB',
    rating: 4.7,
    reviewsCount: 3120,
    downloadsCount: '89.4K',
    badge: 'FREE PDF',
    badgeColor: 'bg-emerald-600',
    coverGradient: 'from-amber-900 via-orange-950 to-slate-900',
    coverAccent: 'text-amber-300',
    isFree: true,
    publishedYear: '2026',
    description:
      'सभी राज्य स्तरीय परीक्षाओं, पुलिस कांस्टेबल/SI, रेलवे एवं SSC के लिए 10,000+ अति-महत्वपूर्ण तथ्यों का सारगर्भित संकलन। त्वरित रिवीजन के लिए सर्वश्रेष्ठ पुस्तक।',
    tableOfContents: [
      'भारतीय इतिहास एवं प्रमुख युद्ध',
      'भारत एवं विश्व का भूगोल',
      'भारतीय संविधान एवं अनुच्छेद',
      'सामान्य विज्ञान (भौतिक, रसायन, जीव)',
      'पर्यावरण एवं पारिस्थितिकी',
      'महत्वपूर्ण दिवस, पुरस्कार एवं खेल'
    ]
  },
  {
    id: 'xt-bk-005',
    slug: 'english-grammar-root-words-vocab-booster',
    title: 'English Grammar Rules & 3500+ Root Words Vocab Booster',
    author: 'Prof. Neha Sengupta',
    publisher: 'XamToppr Academic Press',
    exam: 'SSC',
    examCategory: 'SSC CGL / Bank PO / CDS / NDA',
    subject: 'English Language',
    language: 'Bilingual (Hindi + English)',
    pages: 420,
    fileSize: '16.5 MB',
    rating: 4.8,
    reviewsCount: 1650,
    downloadsCount: '52.0K',
    badge: 'POPULAR',
    badgeColor: 'bg-amber-500',
    coverGradient: 'from-cyan-900 via-blue-950 to-slate-900',
    coverAccent: 'text-cyan-300',
    isFree: true,
    publishedYear: '2026',
    description:
      '100 Golden Grammar Rules with 1000+ error spotting exercises, Mnemonics and Root-word method for 3500+ Synonyms, Antonyms, One-Word Substitutions, and Idioms & Phrases.',
    tableOfContents: [
      '100 Golden Rules of English Grammar',
      'Etymology & Root Word Methodologies',
      'Frequently Repeated One-Word Substitutions',
      'Idioms & Phrases with Contextual Usages',
      'Cloze Test & Sentence Improvement Tricks',
      'Reading Comprehension Speed Techniques'
    ]
  },
  {
    id: 'xt-bk-006',
    slug: 'modern-history-upsc-topper-notes',
    title: 'Modern Indian History & Freedom Struggle: Toppers Handwritten Notes',
    author: 'AIR-18 (UPSC CSE) & XamToppr Mentors',
    publisher: 'XamToppr Civil Services Cell',
    exam: 'UPSC',
    examCategory: 'UPSC CSE / State PSC Prelims & Mains',
    subject: 'History',
    language: 'English Medium',
    pages: 285,
    fileSize: '29.8 MB',
    rating: 4.9,
    reviewsCount: 840,
    downloadsCount: '41.3K',
    badge: 'TOPPER NOTES',
    badgeColor: 'bg-purple-600',
    coverGradient: 'from-stone-900 via-zinc-950 to-slate-900',
    coverAccent: 'text-amber-400',
    isFree: true,
    publishedYear: '2026',
    description:
      'High-yield synthesis of Spectrum, Bipin Chandra, and NCERTs with timeline flowcharts, thematic mind-maps, governor-general policies, tribal & peasant uprisings, and Mains model answers.',
    tableOfContents: [
      'Advent of Europeans & British Expansion',
      'Socio-Religious Reform Movements',
      '1857 Revolt & Early Nationalist Era',
      'Gandhian Era (1915-1947) Chronology',
      'Constitutional Developments under British Rule',
      'Prominent Personalities & Literature'
    ]
  },
  {
    id: 'xt-bk-007',
    slug: 'rrb-ntpc-group-d-general-science-5000',
    title: 'Railway RRB NTPC & Group D: General Science 5000+ PYQ Compendium',
    author: 'Science Research Group, XamToppr',
    publisher: 'XamToppr Publications',
    exam: 'Railway',
    examCategory: 'RRB NTPC / Group D / ALP & Tech',
    subject: 'General Science',
    language: 'Bilingual (Hindi + English)',
    pages: 440,
    fileSize: '19.0 MB',
    rating: 4.7,
    reviewsCount: 1890,
    downloadsCount: '71.2K',
    badge: 'FREE PDF',
    badgeColor: 'bg-emerald-600',
    coverGradient: 'from-blue-950 via-slate-900 to-indigo-950',
    coverAccent: 'text-sky-400',
    isFree: true,
    publishedYear: '2026',
    description:
      'Targeted for upcoming Railway recruitment. Physics numerical formulas, Chemistry periodic table & equations, Biology human anatomy & botany with 100% verified bilingual explanations.',
    tableOfContents: [
      'Physics: Units, Motion, Work, Energy & Optics',
      'Physics: Electricity, Magnetism & Sound',
      'Chemistry: Metals, Non-metals, Acids & Bases',
      'Chemistry: Chemical Reactions & Periodic Table',
      'Biology: Cell Biology, Human Body Systems',
      'Biology: Plant Physiology & Ecology'
    ]
  },
  {
    id: 'xt-bk-008',
    slug: 'banking-financial-awareness-annual-digest',
    title: 'Banking & Financial Awareness Annual Master Digest 2026',
    author: 'Ex-RBI Officer Panel & XamToppr Finance Team',
    publisher: 'XamToppr Banking Academy',
    exam: 'Banking',
    examCategory: 'RBI Grade B / IBPS / SBI PO & Clerk',
    subject: 'Banking Awareness',
    language: 'English Medium',
    pages: 260,
    fileSize: '11.4 MB',
    rating: 4.9,
    reviewsCount: 760,
    downloadsCount: '29.7K',
    badge: 'NEW 2026',
    badgeColor: 'bg-indigo-600',
    coverGradient: 'from-teal-900 via-slate-950 to-cyan-950',
    coverAccent: 'text-teal-300',
    isFree: true,
    publishedYear: '2026',
    description:
      'Complete guide covering RBI Monetary Policy, Basel III norms, Priority Sector Lending (PSL), Union Budget highlights, economic terms, digital banking innovations, and NPCI payment gateways.',
    tableOfContents: [
      'Structure of Indian Banking System',
      'RBI Functions & Monetary Policy Tools',
      'NPA Management, IBC & SARFAESI Act',
      'Digital Banking, UPI, CBDC & Fintech',
      'Government Schemes (PMJDY, PMSBY, PMJJBY)',
      'Union Budget & Economic Survey Gist'
    ]
  },
  {
    id: 'xt-bk-009',
    slug: 'quant-formula-sheet-vedic-maths-shortcuts',
    title: 'Quantitative Aptitude Formula Sheet & Vedic Maths Speed Tricks',
    author: 'XamToppr Math Labs',
    publisher: 'XamToppr Academic Press',
    exam: 'All Exams',
    examCategory: 'All Competitive Exams',
    subject: 'Quantitative Aptitude',
    language: 'Bilingual (Hindi + English)',
    pages: 140,
    fileSize: '6.2 MB',
    rating: 5.0,
    reviewsCount: 4200,
    downloadsCount: '115K',
    badge: 'MOST DOWNLOADED',
    badgeColor: 'bg-amber-600',
    coverGradient: 'from-amber-950 via-yellow-950 to-slate-900',
    coverAccent: 'text-amber-400',
    isFree: true,
    publishedYear: '2026',
    description:
      'Pocket formula handbook containing 500+ formulas, tables up to 30, square/cube shortcuts, percentage-to-fraction charts, and 5-second Vedic maths multiplication tricks.',
    tableOfContents: [
      'Square, Cube & Calculation Boosters',
      'Percentage-Fraction Quick Convertor',
      'Arithmetic Core Formula Handbook',
      'Geometry & Mensuration 2D/3D Cheat-Sheet',
      'Trigonometry Angles & Height Matrix',
      'Coordinate Geometry & Algebra Identities'
    ]
  },
  {
    id: 'xt-bk-010',
    slug: 'ctet-child-development-pedagogy-master-hindi',
    title: 'CTET बाल विकास एवं शिक्षण शास्त्र (CDP) सम्पूर्ण हस्तलिखित नोट्स',
    author: 'डॉ. मीनाक्षी शर्मा (CTET Topper)',
    publisher: 'XamToppr Teaching Academy',
    exam: 'Teaching',
    examCategory: 'CTET Paper 1 & 2 / State TET',
    subject: 'Child Development & Pedagogy',
    language: 'Hindi Medium',
    pages: 245,
    fileSize: '15.2 MB',
    rating: 4.8,
    reviewsCount: 1120,
    downloadsCount: '38.4K',
    badge: 'FREE PDF',
    badgeColor: 'bg-emerald-600',
    coverGradient: 'from-rose-950 via-pink-950 to-slate-900',
    coverAccent: 'text-rose-300',
    isFree: true,
    publishedYear: '2026',
    description:
      'जीन पियाजे, कोहलबर्ग, वाइगोत्स्की, स्किनर एवं थार्नडाइक के सिद्धांतों की सरल सचित्र व्याख्या, NEP 2020 एवं NCF 2005 के महत्वपूर्ण बिंदु तथा पिछले 10 वर्षों के प्रश्न।',
    tableOfContents: [
      'विकास की अवधारणा एवं अधिगम से संबंध',
      'पियाजे, कोहलबर्ग और वाइगोत्स्की के सिद्धांत',
      'समावेशी शिक्षा एवं विशेष आवश्यकता वाले बालक',
      'अधिगम एवं शिक्षण की बुनियादी प्रक्रियाएं',
      'राष्ट्रीय शिक्षा नीति (NEP 2020) के प्रमुख बिंदु',
      'NCF 2005 एवं RTE Act 2009'
    ]
  },
  {
    id: 'xt-bk-011',
    slug: 'defence-pathfinder-nda-cds-mathematics',
    title: 'Defence Pathfinder: NDA & CDS Mathematics with 10 Mock Tests',
    author: 'Col. (Retd.) S. K. Roy & Maths Faculty',
    publisher: 'XamToppr Defence Cell',
    exam: 'Defence',
    examCategory: 'NDA / NA / CDS / AFCAT',
    subject: 'Mathematics',
    language: 'English Medium',
    pages: 510,
    fileSize: '22.7 MB',
    rating: 4.8,
    reviewsCount: 650,
    downloadsCount: '23.1K',
    badge: 'NEW 2026',
    badgeColor: 'bg-indigo-600',
    coverGradient: 'from-slate-900 via-neutral-950 to-emerald-950',
    coverAccent: 'text-emerald-400',
    isFree: true,
    publishedYear: '2026',
    description:
      'Complete UPSC standard coverage of 10+2 NDA mathematics syllabus: Matrices, Determinants, Vector Algebra, Probability, Calculus, and 10 full-length practice question papers with solutions.',
    tableOfContents: [
      'Sets, Relations, Functions & Complex Numbers',
      'Matrices & Determinants Matrix Methods',
      'Vector Algebra & 3D Geometry',
      'Differential & Integral Calculus',
      'Probability & Statistics for Defence',
      '10 Full-Length UPSC Standard Mock Tests'
    ]
  },
  {
    id: 'xt-bk-012',
    slug: 'static-gk-statewise-infographic-atlas',
    title: 'Static GK Encyclopedia & State-Wise Infographic Atlas 2026',
    author: 'XamToppr Research Group',
    publisher: 'XamToppr Publications',
    exam: 'All Exams',
    examCategory: 'SSC / State Exams / Railways / Police',
    subject: 'Static GK',
    language: 'Bilingual (Hindi + English)',
    pages: 360,
    fileSize: '31.5 MB',
    rating: 4.9,
    reviewsCount: 2840,
    downloadsCount: '81.6K',
    badge: 'POPULAR',
    badgeColor: 'bg-amber-500',
    coverGradient: 'from-blue-950 via-teal-950 to-slate-900',
    coverAccent: 'text-amber-300',
    isFree: true,
    publishedYear: '2026',
    description:
      'Visual learning through full-color maps of Indian National Parks, Wildlife Sanctuaries, Classical Dances, Folk Arts, UNESCO Heritage Sites, River Tributaries, Dams, and Stadiums.',
    tableOfContents: [
      'National Parks, Tiger Reserves & Biospheres',
      'Classical & Folk Dances of all Indian States',
      'UNESCO World Heritage Sites in India',
      'Rivers, Tributaries, Dams & Waterfalls Map',
      'Fairs, Festivals & State Tribal Cultures',
      'Major Ports, Airports & Thermal Power Plants'
    ]
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
  const [activeTab, setActiveTab] = useState('books');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('All Exams');
  const [selectedMedium, setSelectedMedium] = useState('All Mediums');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [sortBy, setSortBy] = useState('popular');
  const [savedBooks, setSavedBooks] = useState(['xt-bk-001', 'xt-bk-009']);
  const [selectedBookForModal, setSelectedBookForModal] = useState(null);
  const [showRequestBookModal, setShowRequestBookModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(false);
  const [quickFilterBadge, setQuickFilterBadge] = useState('ALL');

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
    return INITIAL_BOOKS.filter((book) => {
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
        const parseDL = (str) => parseFloat(str.replace('K', '')) * 1000 || 0;
        return parseDL(b.downloadsCount) - parseDL(a.downloadsCount);
      }
      return 0;
    });
  }, [searchQuery, selectedExam, selectedMedium, selectedSubject, quickFilterBadge, sortBy]);

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
            <a href="mailto:support@xamtoppr.com" className="hidden lg:flex items-center gap-1.5 hover:text-white transition">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> support@xamtoppr.com
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
              2026 Updated Syllabus
            </span>
            <button
              onClick={() => showToast('Opening XamToppr Android App on Google Play Store')}
              className="text-slate-300 hover:text-white flex items-center gap-1 font-medium transition"
            >
              Get Android App <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-[#0c2356] text-white shadow-lg border-b border-blue-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div
                onClick={() => setActiveTab('books')}
                className="cursor-pointer flex items-center gap-2.5 group"
              >
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
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium">
              <button
                onClick={() => { setActiveTab('home'); showToast('Navigated to XamToppr Home'); }}
                className={`px-3.5 py-2 rounded-lg transition ${
                  activeTab === 'home'
                    ? 'text-amber-400 font-semibold bg-white/10'
                    : 'text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => { setActiveTab('courses'); showToast('Navigated to Video Courses'); }}
                className={`px-3.5 py-2 rounded-lg transition ${
                  activeTab === 'courses'
                    ? 'text-amber-400 font-semibold bg-white/10'
                    : 'text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                Courses
              </button>
              <button
                onClick={() => { setActiveTab('test-series'); showToast('Navigated to Online Mock Tests'); }}
                className={`px-3.5 py-2 rounded-lg transition ${
                  activeTab === 'test-series'
                    ? 'text-amber-400 font-semibold bg-white/10'
                    : 'text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                Test Series
              </button>
              <button
                onClick={() => setActiveTab('books')}
                className={`px-3.5 py-2 rounded-lg relative flex items-center gap-1.5 transition ${
                  activeTab === 'books'
                    ? 'text-amber-400 font-bold bg-white/15 shadow-inner'
                    : 'text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Books & Notes</span>
                <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full uppercase">
                  Free
                </span>
              </button>
              <button
                onClick={() => { setActiveTab('current-affairs'); showToast('Navigated to Daily Current Affairs'); }}
                className={`px-3.5 py-2 rounded-lg transition ${
                  activeTab === 'current-affairs'
                    ? 'text-amber-400 font-semibold bg-white/10'
                    : 'text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                Current Affairs
              </button>
              <button
                onClick={() => { setActiveTab('pyq'); showToast('Navigated to Previous Year Papers'); }}
                className="px-3.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition"
              >
                PYQ Papers
              </button>
            </nav>

            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={() => setShowRequestBookModal(true)}
                className="text-xs font-semibold text-amber-300 hover:text-white bg-blue-900/60 hover:bg-blue-900 border border-blue-700/60 px-3 py-2 rounded-lg transition flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Request Book
              </button>
              <button
                onClick={() => showToast('Opening Login Modal')}
                className="text-sm font-medium text-white hover:text-amber-400 px-3 py-2 transition"
              >
                Log In
              </button>
              <button
                onClick={() => showToast('Opening Registration Form')}
                className="text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 px-4 py-2 rounded-lg shadow-md transition transform active:scale-95"
              >
                Sign Up Free
              </button>
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

        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0a1b3d] border-b border-blue-900 px-4 pt-3 pb-5 space-y-2">
            <button
              onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50"
            >
              Home
            </button>
            <button
              onClick={() => { setActiveTab('courses'); setMobileMenuOpen(false); }}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50"
            >
              Courses
            </button>
            <button
              onClick={() => { setActiveTab('test-series'); setMobileMenuOpen(false); }}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50"
            >
              Test Series
            </button>
            <button
              onClick={() => { setActiveTab('books'); setMobileMenuOpen(false); }}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-amber-400 font-bold bg-blue-900/60 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Free Books & PDF Library
              </span>
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded">FREE</span>
            </button>
            <button
              onClick={() => { setActiveTab('current-affairs'); setMobileMenuOpen(false); }}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-200 hover:bg-blue-900/50"
            >
              Current Affairs
            </button>
            <div className="pt-3 border-t border-blue-900/60 flex flex-col gap-2">
              <button
                onClick={() => { showToast('Redirecting to Student Login'); setMobileMenuOpen(false); }}
                className="w-full py-2.5 text-center text-sm font-semibold text-white border border-blue-700 rounded-lg hover:bg-blue-900"
              >
                Log In
              </button>
              <button
                onClick={() => { showToast('Redirecting to Student Sign Up'); setMobileMenuOpen(false); }}
                className="w-full py-2.5 text-center text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg"
              >
                Sign Up Free
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pb-16">
        <div className="bg-slate-100 border-b border-slate-200 py-2.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center text-xs text-slate-600 gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('home')}
              className="hover:text-blue-900 font-medium transition"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Study Resources</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-blue-950 font-bold">Books & Study Material</span>
          </div>
        </div>

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
                <div className="relative">
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
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Subject / Topic
                </label>
                <div className="relative">
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
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Resource Type
                </label>
                <div className="relative">
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
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Sort Results By
                </label>
                <div className="relative">
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
          </div>
        </section>

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
                  <div className="h-52 bg-slate-200"></div>
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
                return (
                  <div
                    key={book.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1 relative"
                  >
                    <div
                      onClick={() => setSelectedBookForModal(book)}
                      className={`h-52 sm:h-56 bg-gradient-to-br ${book.coverGradient} p-4 flex flex-col justify-between relative cursor-pointer select-none overflow-hidden`}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-3 bg-white/10 border-r border-white/20"></div>
                      <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none"></div>

                      <div className="flex items-start justify-between z-10 pl-2">
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
                              : 'bg-black/30 text-white/80 hover:text-white hover:bg-black/50'
                          }`}
                          title={isSaved ? 'Remove Bookmark' : 'Save Book'}
                        >
                          <BookMarked className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="z-10 pl-2 pr-1 my-auto">
                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-300 mb-1">
                          {book.examCategory}
                        </div>
                        <h4 className="text-white font-black text-sm sm:text-base leading-tight line-clamp-3 drop-shadow-sm">
                          {book.title}
                        </h4>
                        <div className={`mt-2 text-xs font-bold ${book.coverAccent}`}>
                          {book.subject}
                        </div>
                      </div>

                      <div className="flex items-center justify-between z-10 pl-2 text-[10px] text-slate-300 font-medium">
                        <span className="bg-black/40 px-2 py-0.5 rounded">
                          {book.language.includes('Hindi') && !book.language.includes('Bilingual')
                            ? 'हिन्दी माध्यम'
                            : book.language.includes('Bilingual')
                            ? 'द्विभाषी (Bilingual)'
                            : 'English Medium'}
                        </span>
                        <span className="flex items-center gap-1 text-amber-300 font-bold bg-black/40 px-1.5 py-0.5 rounded">
                          <Star className="w-3 h-3 fill-amber-300" /> {book.rating}
                        </span>
                      </div>
                    </div>

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

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => setSelectedBookForModal(book)}
                          className="flex-1 bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Book</span>
                        </button>
                        <button
                          onClick={() => {
                            showToast(`Starting high-speed download for ${book.title.substring(0, 20)}...`);
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 rounded-xl transition font-bold shadow-sm"
                          title="Instant Download PDF"
                        >
                          <Download className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

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
              <button
                onClick={() => showToast('Redirecting to official XamToppr Telegram Channel')}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <span>Join Telegram Channel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowRequestBookModal(true)}
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-3.5 rounded-xl border border-white/20 transition"
              >
                Request Custom PDF
              </button>
            </div>
          </div>
        </section>

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

      {selectedBookForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-300 flex flex-col">
            <div className="p-5 sm:p-6 bg-[#0c2356] text-white flex items-start justify-between relative">
              <div className="pr-8">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">
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
                  <span className="font-bold text-slate-900">{selectedBookForModal.fileSize}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Rating</span>
                  <span className="font-bold text-amber-600 flex items-center justify-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500" /> {selectedBookForModal.rating} (
                    {selectedBookForModal.reviewsCount})
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                  About This Study Material
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                  {selectedBookForModal.description}
                </p>
              </div>

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

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-900 text-white flex flex-col items-center justify-center text-center space-y-2 py-8">
                <FileText className="w-10 h-10 text-amber-400" />
                <div className="font-bold text-sm">Interactive PDF Reader Ready</div>
                <p className="text-xs text-slate-400 max-w-sm">
                  You can read this book online without downloading or save a copy to your local device.
                </p>
              </div>
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
                <button
                  onClick={() => {
                    showToast('Opening Fullscreen Reader with Zoom & Dark Mode');
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition"
                >
                  Read Online
                </button>
                <button
                  onClick={() => {
                    showToast(`Downloading "${selectedBookForModal.title}" (${selectedBookForModal.fileSize})...`);
                    setSelectedBookForModal(null);
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download Free PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <button
                onClick={() => showToast('Opening Free Registration')}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition"
              >
                Create Free Account
              </button>
              <button
                onClick={() => showToast('Connecting with Student Counselor')}
                className="border border-slate-600 hover:border-slate-400 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl transition"
              >
                Contact Counselor
              </button>
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
                <li><button onClick={() => setActiveTab('books')} className="text-amber-400 font-semibold hover:underline">Free PDF Books Library</button></li>
                <li><button onClick={() => showToast('Opening Daily Current Affairs')} className="hover:text-amber-400 transition">Daily Current Affairs Capsules</button></li>
                <li><button onClick={() => showToast('Opening Previous Year Question Papers')} className="hover:text-amber-400 transition">Previous Year Papers (PYQ)</button></li>
                <li><button onClick={() => showToast('Opening Subject-wise Formula Sheets')} className="hover:text-amber-400 transition">Formula Sheets & Mind-Maps</button></li>
                <li><button onClick={() => showToast('Opening Daily Free Mini Quizzes')} className="hover:text-amber-400 transition">Daily Live Free Quizzes</button></li>
                <li><button onClick={() => showToast('Opening Exam Syllabus & Notifications')} className="hover:text-amber-400 transition">Exam Notifications 2026</button></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-white uppercase tracking-wider text-xs border-b border-blue-900/60 pb-2">
                Support & Legal
              </h5>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => showToast('Opening About XamToppr')} className="hover:text-amber-400 transition">About XamToppr</button></li>
                <li><button onClick={() => showToast('Opening Privacy Policy')} className="hover:text-amber-400 transition">Privacy Policy</button></li>
                <li><button onClick={() => showToast('Opening Terms & Conditions')} className="hover:text-amber-400 transition">Terms & Conditions</button></li>
                <li><button onClick={() => showToast('Opening Refund & Cancellation Policy')} className="hover:text-amber-400 transition">Refund & Cancellation Policy</button></li>
                <li><button onClick={() => showToast('Opening DMCA & Copyright Policy')} className="hover:text-amber-400 transition">DMCA & Copyright Disclaimer</button></li>
                <li><button onClick={() => showToast('Opening Helpdesk & FAQs')} className="hover:text-amber-400 transition">Student FAQs & Help Center</button></li>
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