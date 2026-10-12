export const ALL_BOOKS_QUERY = '*[_type == "book"] | order(_createdAt desc)';

export const BOOKS_FOR_STORE_QUERY = `*[_type == "book"] | order(_createdAt desc) {
  _id,
  bookId,
  downloadsCount,
  rating,
  totalReviews,
  title,
  "slug": slug.current,
  badge,
  author,
  publisher,
  language,
  exam,
  examCategory,
  subject,
  "coverImageUrl": coverImage.asset->url,
  "samplePages": samplePages[].asset->url,
  sampleFlipbookUrl,
  "samplePdfUrl": samplePdfFile.asset->url,
  fileSize,
  totalPages,
  format,
  mrp,
  offerPrice,
  buyUrl,
  amazonUrl,
  isFeatured,
  description,
  tableOfContents[] { _key, chapterNo, title, pageRange }
}`;

export const BOOK_BY_SLUG_QUERY = '*[_type == "book" && slug.current == $slug][0]';

export const siteSettingsQuery = '*[_type == "siteSettings" && _id == "siteSettings"][0] { supportHelpline, supportEmail, aboutUrl, termsUrl, privacyUrl, refundUrl }';

export const examNotificationsQuery = `*[_type == "examNotification"] | order(_createdAt desc) {
  _id,
  title,
  "slug": slug.current,
  examCategory,
  state,
  totalVacancies,
  postDate,
  officialPdfUrl,
  applyOnlineUrl,
  applicationWindow,
  examDate,
  relatedBookId
}`;

export const examNotificationDetailQuery = `*[_type == "examNotification" && _id == $id][0] {
  _id,
  title,
  "slug": slug.current,
  examCategory,
  state,
  totalVacancies,
  postDate,
  officialPdfUrl,
  applyOnlineUrl,
  applicationWindow,
  examDate,
  relatedBookId,
  overview,
  importantDates[] { _key, eventName, dateText },
  salaryStructure[] { _key, postName, payLevel, basicPay, inHandSalary },
  selectionProcess[] { _key, stageNumber, title, description },
  examPattern[] { _key, subject, questions, marks, duration },
  syllabusDetails[] { _key, sectionTitle, topics },
  howToApplySteps[],
  documentSpecs[] { _key, docName, dimension, fileSize, format },
  faqs[] { _key, question, answer }
}`;
