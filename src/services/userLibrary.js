import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import sanityClient from '../sanityClient';

const getDateValue = (value) => {
  if (typeof value?.toDate === 'function') return value.toDate();
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function fetchUserLibrary(user) {
  if (!user?.uid) return [];

  const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
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

  if (!bookIds.length) return [];

  const catalogBooks = await sanityClient.fetch(
    `*[_type == "book" && _id in $ids] {
      _id,
      title,
      "coverImageUrl": coverImage.asset->url,
      "samplePdfUrl": samplePdfFile.asset->url,
      fullPdfFile {
        asset-> {
          url
        }
      }
    }`,
    { ids: bookIds }
  );
  const catalogById = new Map(catalogBooks.map((book) => [book._id, book]));
  const entriesById = new Map(
    purchaseEntries
      .filter((entry) => entry?.bookId || entry?.sanityId || entry?.id)
      .map((entry) => [entry.bookId || entry.sanityId || entry.id, entry])
  );

  return bookIds.map((bookId) => {
    const entry = entriesById.get(bookId) || {};
    const catalogBook = catalogById.get(bookId) || {};
    return {
      id: bookId,
      title: catalogBook.title || entry.title || entry.bookTitle || 'Purchased book',
      coverImage: catalogBook.coverImageUrl || entry.coverImage || '',
      fullPdfFile: catalogBook.fullPdfFile || null,
      samplePdfUrl: catalogBook.samplePdfUrl || '',
      purchasedAt: entry.purchasedAt || entry.purchaseDate || entry.createdAt || null,
      amountPaid: entry.finalAmount ?? entry.price ?? entry.amount ?? null
    };
  }).sort((left, right) => (
    (getDateValue(right.purchasedAt)?.getTime() || 0)
      - (getDateValue(left.purchasedAt)?.getTime() || 0)
  ));
}

export function formatPurchaseDate(value) {
  const date = getDateValue(value);
  return date
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date unavailable';
}
