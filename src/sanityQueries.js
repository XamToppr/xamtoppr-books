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
  "tracks": coalesce(
    tracks[]->{_id, name, "slug": slug.current, isActive},
    select(defined(trackRef) => [trackRef->{_id, name, "slug": slug.current, isActive}], [])
  ),
  "platforms": coalesce(
    platforms[]->{_id, name, "slug": slug.current, isActive},
    select(defined(platformRef) => [platformRef->{_id, name, "slug": slug.current, isActive}], [])
  ),
  "masterSubject": subjectRef->{_id, name, "slug": slug.current, isActive},
  "module": moduleRef->{_id, name, "slug": slug.current, isActive},
  "topic": topicRef->{_id, name, "slug": slug.current, isActive},
  "coverImageUrl": coverImage.asset->url,
  "samplePages": samplePages[].asset->url,
  sampleFlipbookUrl,
  "samplePdfUrl": samplePdfFile.asset->url,
  pdfUrl,
  isPreviousYear,
  isMockTest,
  fileSize,
  totalPages,
  format,
  mrp,
  offerPrice,
  buyUrl,
  amazonUrl,
  flipkartUrl,
  isFeatured,
  description,
  tableOfContents[] { _key, chapterNo, title, pageRange }
}`;

export const BOOK_BY_SLUG_QUERY = `*[_type == "book" && slug.current == $slug][0] {
  _id,
  title,
  "price": mrp,
  "discountPrice": offerPrice,
  "coverImage": coverImage.asset->url,
  description,
  tableOfContents[] { _key, chapterNo, title, pageRange },
  "indexTable": tableOfContents[] { _key, chapterNo, title, pageRange },
  "samplePdf": samplePdfFile.asset->url,
  fullPdfFile { asset-> { url } },
  pdfUrl,
  isPreviousYear,
  isMockTest,
  slug,
  exam,
  examCategory,
  subject,
  "tracks": coalesce(
    tracks[]->{name, "slug": slug.current},
    select(defined(trackRef) => [trackRef->{name, "slug": slug.current}], [])
  ),
  "platforms": coalesce(
    platforms[]->{name, "slug": slug.current},
    select(defined(platformRef) => [platformRef->{name, "slug": slug.current}], [])
  ),
  "masterSubject": subjectRef->{name, "slug": slug.current},
  "module": moduleRef->{name, "slug": slug.current},
  "topic": topicRef->{name, "slug": slug.current},
  author,
  publisher,
  language,
  badge,
  amazonUrl,
  flipkartUrl,
  totalPages,
  fileSize,
  format
}`;

const VIDEO_COURSE_PACK_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  packPurpose,
  packType,
  hideFromStore,
  isFeatured,
  deliveryMode,
  price,
  mrp,
  pricingPlans[] { _key, planTitle, price, mrp, isRecommended, isAvailable },
  courseFeatures,
  mentors[] { _key, name, designation, details, youtubeLink },
  courseTypeTag,
  language,
  videoHours,
  mockTestsCount,
  ebooksCount,
  duration,
  shortDescription,
  description,
  "thumbnailUrl": thumbnail.asset->url,
  "tracks": tracks[]->{_id, name, "slug": slug.current},
  "platforms": platforms[]->{_id, name, "slug": slug.current},
  "subjectRefs": subjects[]->{_id, name, "slug": slug.current},
  "classes": classes[]->{
    _id,
    title,
    "slug": slug.current,
    status,
    videoType,
    duration,
    teacherName,
    description,
    "videoLink": select(^.packType == "Free" && videoType == "shortReel" => videoLink, null),
    "imageUrl": image.asset->url,
    "classPdfUrl": null,
    "classPdfAvailable": defined(classPdf.asset),
    "mappedBook": mappedBook->{
      _id,
      title,
      "slug": slug.current,
      author,
      "coverImageUrl": coverImage.asset->url,
      offerPrice,
      mrp,
      buyUrl
    },
    "track": track->{_id, name, "slug": slug.current},
    "platform": platform->{_id, name, "slug": slug.current},
    "subject": subject->{_id, name, "slug": slug.current},
    "module": module->{_id, name, "slug": slug.current},
    "topic": topic->{_id, name, "slug": slug.current}
  },
  publishingStatus,
  publishingDate,
  timeTable[] { _key, sessionTitle, day, date, startTime, endTime, notes },
  "syllabusPlanner": syllabusPlanner[]{
    _key,
    week,
    title,
    details,
    "module": module->{_id, name, "slug": slug.current},
    "topic": topic->{_id, name, "slug": slug.current}
  },
  "demoVideos": demoVideos[]{
    _key,
    videoTitle,
    videoType,
    videoUrl,
    duration
  },
  "videos": videos[]{
    _key,
    videoTitle,
    videoType,
    "videoUrl": select(^.packType == "Free" && videoType == "shortReel" => videoUrl, null),
    duration,
    "subject": subject->{_id, name, "slug": slug.current},
    "topic": topic->{
      _id,
      name,
      "slug": slug.current,
      "module": module->{
        _id,
        name,
        "slug": slug.current,
        "subject": subject->{_id, name, "slug": slug.current}
      }
    }
  }
}`;

export const VIDEO_COURSE_PACKS_QUERY = `*[_type == "videoCoursePack" && coalesce(hideFromStore, false) == false]
  | order(_createdAt desc) ${VIDEO_COURSE_PACK_PROJECTION}`;

export const VIDEO_COURSE_PACK_BY_SLUG_QUERY = `*[
  _type == "videoCoursePack" && slug.current == $slug
][0] ${VIDEO_COURSE_PACK_PROJECTION}`;

export const siteSettingsQuery = `*[_type == "siteSettings" && _id == "siteSettings"][0] {
  supportHelpline,
  supportEmail,
  aboutContent,
  termsContent,
  privacyContent,
  refundContent
}`;

export const examNotificationsQuery = `*[_type == "examNotification"] | order(_createdAt desc) {
  _id,
  title,
  "slug": slug.current,
  examCategory,
  "state": coalesce(stateRegion, state),
  totalVacancies,
  postDate,
  applicationStartDate,
  applicationEndDate,
  "cardImageUrl": cardImage.asset->url,
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
  "state": coalesce(stateRegion, state),
  totalVacancies,
  postDate,
  applicationStartDate,
  applicationEndDate,
  "cardImageUrl": cardImage.asset->url,
  officialPdfUrl,
  applyOnlineUrl,
  applicationWindow,
  examDate,
  relatedBookId,
  overview,
  comparisonPreviousYear[] { _key, metric, previousYear, currentYear },
  importantDates[] { _key, eventName, dateText },
  salaryStructure { columns[] { _key, component, col1, col2, col3, col4 }, notes },
  vacanciesList[] { _key, postName, category, vacancies, notes },
  eligibilityCriteria[] { _key, criterion, details },
  applicationFees[] { _key, category, amount, notes },
  selectionProcess[] { _key, stageNumber, title, description },
  examPattern[] { _key, subject, questions, marks, duration },
  examStages[] {
    _key, stageName, totalQuestions, totalMarks, durationMinutes, negativeMarking,
    sections[] { _key, sectionName, questions, marks },
    qualifyingMarks[] { _key, category, percentage },
    additionalNotes
  },
  syllabusDetails[] { _key, sectionTitle, topics },
  howToApplySteps[],
  documentSpecs[] { _key, item, specification, docName, dimension, fileSize, format },
  previousPapers[] { _key, title, year, url },
  importantLinks[] { _key, label, url },
  faqsList[] { _key, question, answer },
  faqs[] { _key, question, answer },
  customSections[] {
    _key,
    _type,
    sectionTitle,
    headers,
    rows[] { _key, cells[] },
    notes,
    content,
    steps,
    alertType,
    title,
    description
  }
}`;
