import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import sanityClient from '../sanityClient';
import { calculateCourseExpiryDate, getCourseValidity } from '../utils/courseValidity';

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
  const coursePurchaseEntries = Array.isArray(profile.purchasedCourses)
    ? profile.purchasedCourses
    : [];
  const courseEnrollmentEntries = Array.isArray(profile.enrolledCourses)
    ? profile.enrolledCourses
    : [];
  const getCourseId = (entry) => (
    typeof entry === 'string'
      ? entry
      : entry?.courseId
        || entry?.sanityId
        || entry?.id
        || entry?.course?._ref
        || entry?._ref
  );
  const purchasedCourseIds = [
    ...(Array.isArray(profile.purchasedCourseIds) ? profile.purchasedCourseIds : []),
    ...coursePurchaseEntries.map(getCourseId)
  ].filter(Boolean);
  const enrolledCourseIds = [
    ...(Array.isArray(profile.enrolledCourseIds) ? profile.enrolledCourseIds : []),
    ...courseEnrollmentEntries.map(getCourseId)
  ].filter(Boolean);
  const courseIds = [...new Set([...purchasedCourseIds, ...enrolledCourseIds])];

  const [catalogBooks, catalogCourses] = await Promise.all([
    bookIds.length
      ? sanityClient.fetch(
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
      )
      : Promise.resolve([]),
    courseIds.length
      ? sanityClient.fetch(
        `*[_type == "videoCoursePack" && _id in $ids] {
          _id,
          title,
          "slug": slug.current,
          duration,
          packType,
          "thumbnailUrl": thumbnail.asset->url
        }`,
        { ids: courseIds }
      )
      : Promise.resolve([])
  ]);
  const catalogById = new Map(catalogBooks.map((book) => [book._id, book]));
  const entriesById = new Map(
    purchaseEntries
      .filter((entry) => entry?.bookId || entry?.sanityId || entry?.id)
      .map((entry) => [entry.bookId || entry.sanityId || entry.id, entry])
  );

  const books = bookIds.map((bookId) => {
    const entry = entriesById.get(bookId) || {};
    const catalogBook = catalogById.get(bookId) || {};
    return {
      itemType: 'book',
      id: bookId,
      title: catalogBook.title || entry.title || entry.bookTitle || 'Purchased book',
      coverImage: catalogBook.coverImageUrl || entry.coverImage || '',
      fullPdfFile: catalogBook.fullPdfFile || null,
      samplePdfUrl: catalogBook.samplePdfUrl || '',
      purchasedAt: entry.purchasedAt || entry.purchaseDate || entry.createdAt || null,
      amountPaid: entry.finalAmount ?? entry.price ?? entry.amount ?? null
    };
  });
  const purchasesByCourseId = new Map(
    coursePurchaseEntries
      .filter((entry) => getCourseId(entry))
      .map((entry) => [getCourseId(entry), entry])
  );
  const enrollmentsByCourseId = new Map(
    courseEnrollmentEntries
      .filter((entry) => getCourseId(entry))
      .map((entry) => [getCourseId(entry), entry])
  );
  const coursesById = new Map(catalogCourses.map((course) => [course._id, course]));
  const courses = courseIds.map((courseId) => {
    const purchase = purchasesByCourseId.get(courseId) || {};
    const enrollment = enrollmentsByCourseId.get(courseId) || {};
    const course = coursesById.get(courseId) || {};
    const purchasedAt = purchase.purchasedAt || purchase.purchaseDate || purchase.createdAt || null;
    const enrolledAt = enrollment.enrolledAt || enrollment.createdAt || null;
    const duration = purchase.duration || enrollment.duration || course.duration || '';
    const expiryStart = getDateValue(purchasedAt || enrolledAt);
    const expiresAt = purchase.expiresAt || enrollment.expiresAt
      || calculateCourseExpiryDate(expiryStart, duration);
    const validity = getCourseValidity(expiresAt);
    return {
      itemType: 'course',
      id: courseId,
      title: course.title || purchase.courseTitle || purchase.title || enrollment.courseTitle || 'Video course',
      coverImage: course.thumbnailUrl || '',
      slug: course.slug || '',
      duration,
      courseType: course.packType || '',
      purchasedAt,
      enrolledAt,
      expiresAt,
      isExpired: validity.isExpired,
      remainingValidity: validity.remaining,
      amountPaid: purchase.finalAmount ?? purchase.price ?? purchase.amount ?? null,
      courseUrl: `/video-courses/${encodeURIComponent(course.slug || courseId)}?play=1`
    };
  });

  return [...books, ...courses].sort((left, right) => (
    (getDateValue(right.purchasedAt || right.enrolledAt)?.getTime() || 0)
      - (getDateValue(left.purchasedAt || left.enrolledAt)?.getTime() || 0)
  ));
}

export function formatPurchaseDate(value) {
  const date = getDateValue(value);
  return date
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date unavailable';
}
