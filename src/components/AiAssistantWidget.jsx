import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Headset, X, Send, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import sanityClient from '../sanityClient';

const ASSISTANT_BOOKS_QUERY = `*[_type == "book"] | order(_createdAt desc) {
  _id,
  bookId,
  title,
  "slug": slug.current,
  subject,
  tags,
  exam,
  examCategory,
  author,
  publisher,
  "tracks": coalesce(
    tracks[]->{_id, name, "slug": slug.current},
    select(defined(trackRef) => [trackRef->{_id, name, "slug": slug.current}], [])
  ),
  "platforms": coalesce(
    platforms[]->{_id, name, "slug": slug.current},
    select(defined(platformRef) => [platformRef->{_id, name, "slug": slug.current}], [])
  ),
  "masterSubject": subjectRef->{name, "slug": slug.current},
  "module": moduleRef->{name, "slug": slug.current},
  "topic": topicRef->{name, "slug": slug.current},
  "coverImageUrl": coverImage.asset->url,
  mrp,
  offerPrice
}`;

const GENERAL_QUERY_PATTERNS = [
  /\b(contact|email|phone|helpline|support)\b/,
  /\b(notification|notifications|admit card|vacanc(?:y|ies)|exam updates?|latest exams?)\b/,
  /\b(hello|hi|namaste|how are you|who are you|your name|what can you do|help)\b/
];

const BOOK_QUERY_PATTERNS = [
  /\b(book|books|pdf|notes|free|recommend|suggest|search|find|show|looking for|buy)\b/
];

const SEARCH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'for', 'in', 'is', 'me', 'of', 'on', 'the', 'to', 'with'
]);

const SEARCH_SYNONYMS = {
  math: ['maths', 'mathematics'],
  maths: ['math', 'mathematics'],
  mathematics: ['math', 'maths']
};

const getSearchableText = (value) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(getSearchableText).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(getSearchableText).join(' ');
  return '';
};

const searchBooks = (query, books) => {
  const isFreeQuery = /\bfree\b/i.test(query);
  const terms = query.toLowerCase().match(/[a-z0-9]+/g) || [];
  const searchableTerms = terms.filter((term) => (
    !SEARCH_STOP_WORDS.has(term) && term !== 'free' && term !== 'book' && term !== 'books' && term !== 'pdf' && term !== 'notes'
  ));

  return books
    .map((book) => {
      const searchableFields = [
        book.title,
        book.subject,
        book.exam,
        book.examCategory,
        book.tags,
        book.tracks,
        book.platforms,
        book.masterSubject,
        book.module,
        book.topic,
        book.author,
        book.publisher
      ];
      const searchableText = getSearchableText(searchableFields).toLowerCase();
      const isFree = Number(book.offerPrice ?? book.mrp) === 0;
      if (isFreeQuery && !isFree) return null;

      const matchedTerms = searchableTerms.filter((term) => (
        [term, ...(SEARCH_SYNONYMS[term] || [])].some((variant) => searchableText.includes(variant))
      ));
      if (searchableTerms.length && !matchedTerms.length) return null;

      const title = String(book.title || '').toLowerCase();
      const score = matchedTerms.length * 10
        + (searchableTerms.some((term) => title.includes(term)) ? 5 : 0)
        + (isFreeQuery && isFree ? 2 : 0);

      return { book, score, isFree };
    })
    .filter(Boolean)
    .sort((first, second) => second.score - first.score)
    .slice(0, 4)
    .map(({ book, isFree }) => ({ ...book, isFree }));
};

const getAssistantReply = (query, books, catalogStatus) => {
  const normalizedQuery = query.toLowerCase();
  const isBookQuery = BOOK_QUERY_PATTERNS.some((pattern) => pattern.test(normalizedQuery));
  const isGeneralQuery = GENERAL_QUERY_PATTERNS.some((pattern) => pattern.test(normalizedQuery));

  if (/\brequest(?:ing)? (?:a )?book\b/.test(normalizedQuery)) {
    return {
      text: 'Aap navigation bar mein diye gaye "Request Book" button par click karke apni zaroorat ki book ka naam hume bhej sakte hain!'
    };
  }

  if (isGeneralQuery && !isBookQuery) {
    if (/\b(contact|email|phone|helpline|support)\b/.test(normalizedQuery)) {
      return {
        text: 'Aap hume info@xamtoppr.com par mail kar sakte hain ya Student Helpline: +91 77177 07121 par call kar sakte hain.'
      };
    }
    if (/\b(notification|notifications|admit card|vacanc(?:y|ies)|exam updates?|latest exams?)\b/.test(normalizedQuery)) {
      return {
        text: 'Latest SSC, Railway, Banking aur State exam vacancies aur admit cards ke liye aap hamara Exam Notifications section visit kar sakte hain.'
      };
    }
    return {
      text: 'Namaste! Main XamToppr ka AI Assistant hoon. Aap books, subjects, exams, contact details, ya exam updates ke baare mein pooch sakte hain.'
    };
  }

  if (catalogStatus === 'loading') {
    return { text: 'Main live book catalog load kar raha hoon. Kripya thodi der baad apni search dobara bhejein.' };
  }
  if (catalogStatus === 'error') {
    return { text: 'Abhi live book catalog load nahi ho paya. Kripya thodi der baad dobara try karein.' };
  }

  const results = searchBooks(query, books);
  if (results.length) {
    return {
      text: `Aapki search "${query}" ke liye ye books mili:`,
      books: results
    };
  }

  return {
    text: `Mujhe "${query}" ke liye koi matching book nahi mili. Aap kisi subject, exam, ya book title se search karke dekhein.`
  };
};

export default function AiAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState('loading');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! Main XamToppr ka AI Assistant hoon. Kya aapko Free Books, Exam Notifications, ya Study Notes ke baare mein kuch janna hai?'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let isCurrentRequest = true;

    sanityClient.fetch(ASSISTANT_BOOKS_QUERY)
      .then((documents) => {
        if (!Array.isArray(documents)) {
          throw new Error('Sanity books query did not return a list.');
        }
        if (!isCurrentRequest) return;
        setBooks(documents.filter((book) => book?.title && (book.slug || book.bookId || book._id)));
        setCatalogStatus('loaded');
      })
      .catch((error) => {
        if (!isCurrentRequest) return;
        console.error('Failed to load book catalog for AI Assistant.', error);
        setCatalogStatus('error');
      });

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const sendMessage = (userQuery) => {
    setMessages((currentMessages) => [...currentMessages, { sender: 'user', text: userQuery }]);
    setIsTyping(true);

    setTimeout(() => {
      setMessages((currentMessages) => [
        ...currentMessages,
        { sender: 'bot', ...getAssistantReply(userQuery, books, catalogStatus) }
      ]);
      setIsTyping(false);
    }, 500);
  };

  const handleQuickAction = (actionType) => {
    const quickQueries = {
      free_books: 'Free books',
      exam_alerts: 'Latest exam notifications',
      request_book: 'I want to request a book'
    };
    if (quickQueries[actionType]) sendMessage(quickQueries[actionType]);
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    const userQuery = inputText.trim();
    if (!userQuery || isTyping) return;
    setInputText('');
    sendMessage(userQuery);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Window Box */}
      {isOpen && (
        <div className="mb-4 flex h-[480px] w-[350px] sm:w-[380px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#0c2356] px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black shadow">
                <Sparkles className="h-4 w-4 fill-slate-950" />
              </div>
              <div>
                <h4 className="text-sm font-bold leading-tight">XamToppr Assistant</h4>
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {catalogStatus === 'loaded' ? 'Online • Books ready to search' : 'Online • Assistant is ready'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition"
              aria-label="Close assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3.5 text-xs sm:text-sm">
            {messages.map((msg, index) => (
              <div
                key={`${msg.sender}-${index}`}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] ${
                    msg.sender === 'user'
                      ? 'rounded-2xl rounded-br-none bg-blue-950 px-4 py-3 text-white'
                      : 'space-y-2 text-slate-800'
                  }`}
                >
                  {msg.text && (
                    <div className={`rounded-2xl px-4 py-3 leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'rounded-br-none bg-blue-950 text-white'
                        : 'rounded-bl-none border border-slate-200/80 bg-white font-medium'
                    }`}>
                      {msg.text}
                    </div>
                  )}
                  {msg.books?.map((book) => {
                    const slug = book.slug || book.bookId || book._id;
                    const price = Number(book.offerPrice ?? book.mrp) || 0;
                    return (
                      <article key={book._id || slug} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex gap-3 p-3">
                          {book.coverImageUrl ? (
                            <img
                              src={book.coverImageUrl}
                              alt={`${book.title} cover`}
                              loading="lazy"
                              className="h-20 w-14 shrink-0 rounded-md bg-slate-100 object-cover"
                            />
                          ) : (
                            <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-900">
                              <BookOpen className="h-5 w-5" />
                            </div>
                          )}
                          <div className="flex min-w-0 flex-1 flex-col items-start">
                            <h5 className="line-clamp-2 text-xs font-bold leading-snug text-slate-900">{book.title}</h5>
                            <span className="mt-1 text-xs font-extrabold text-emerald-700">
                              {price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`}
                            </span>
                            <Link
                              to={`/book/${encodeURIComponent(slug)}`}
                              className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-bold text-blue-900 hover:text-amber-700"
                            >
                              View Book <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-none border border-slate-200 bg-white px-4 py-3 text-slate-400 text-xs shadow-sm flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="border-t border-slate-100 bg-white px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => handleQuickAction('free_books')}
              disabled={isTyping}
              className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-900 transition hover:bg-blue-100"
            >
              📚 Free Books
            </button>
            <button
              onClick={() => handleQuickAction('exam_alerts')}
              disabled={isTyping}
              className="shrink-0 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] font-bold text-purple-900 transition hover:bg-purple-100"
            >
              🔥 Exam Alerts
            </button>
            <button
              onClick={() => handleQuickAction('request_book')}
              disabled={isTyping}
              className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100"
            >
              🎯 Request Book
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="border-t border-slate-200 bg-white p-3 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isTyping}
              placeholder="Ask anything or search books..."
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm outline-none transition focus:border-blue-700 focus:bg-white focus:ring-1 focus:ring-blue-700"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={isTyping || !inputText.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-950 text-white transition hover:bg-blue-900 active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Trigger Button */}
      <div className="flex items-center justify-end gap-3">
        <span className="hidden rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-950 shadow-lg sm:inline-flex">
          Need Help? Chat with us!
        </span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle AI Chat Assistant"
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-amber-400/50"
        >
          <div className="absolute -inset-1 rounded-full bg-amber-400 opacity-30 blur-sm transition group-hover:opacity-60 animate-pulse"></div>
          {isOpen ? (
            <X className="relative h-6 w-6" />
          ) : (
            <Headset className="relative h-6 w-6 text-amber-300" />
          )}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white ring-2 ring-white">
              1
            </span>
          )}
        </button>
      </div>
    </div>
  );
}