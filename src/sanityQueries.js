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
