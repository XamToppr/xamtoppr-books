import { defineArrayMember, defineField, defineType } from 'sanity';

const importantDate = defineType({
  name: 'importantDate',
  title: 'Important Date',
  type: 'object',
  fields: [
    defineField({ name: 'eventName', title: 'Event', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'dateText', title: 'Date', type: 'string', validation: (Rule) => Rule.required() })
  ],
  preview: {
    select: { title: 'eventName', subtitle: 'dateText' }
  }
});

const salaryEntry = defineType({
  name: 'salaryEntry',
  title: 'Salary Entry',
  type: 'object',
  fields: [
    defineField({ name: 'postName', title: 'Post Name', type: 'string' }),
    defineField({ name: 'payLevel', title: 'Pay Level', type: 'string' }),
    defineField({ name: 'basicPay', title: 'Basic Pay', type: 'string' }),
    defineField({ name: 'inHandSalary', title: 'In-hand Salary', type: 'string' })
  ],
  preview: {
    select: { title: 'postName', subtitle: 'payLevel' }
  }
});

const selectionStage = defineType({
  name: 'selectionStage',
  title: 'Selection Stage',
  type: 'object',
  fields: [
    defineField({ name: 'stageNumber', title: 'Stage Number', type: 'number' }),
    defineField({ name: 'title', title: 'Stage Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 })
  ],
  preview: {
    select: { title: 'title', subtitle: 'stageNumber' },
    prepare: ({ title, subtitle }) => ({
      title,
      subtitle: subtitle ? `Stage ${subtitle}` : undefined
    })
  }
});

const examPatternRow = defineType({
  name: 'examPatternRow',
  title: 'Exam Pattern Row',
  type: 'object',
  fields: [
    defineField({ name: 'subject', title: 'Subject', type: 'string' }),
    defineField({ name: 'questions', title: 'Questions', type: 'number' }),
    defineField({ name: 'marks', title: 'Marks', type: 'number' }),
    defineField({ name: 'duration', title: 'Duration', type: 'string' })
  ],
  preview: {
    select: { title: 'subject', subtitle: 'questions' },
    prepare: ({ title, subtitle }) => ({
      title,
      subtitle: subtitle == null ? undefined : `${subtitle} questions`
    })
  }
});

const syllabusSection = defineType({
  name: 'syllabusSection',
  title: 'Syllabus Section',
  type: 'object',
  fields: [
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'topics', title: 'Topics', type: 'text', rows: 4 })
  ],
  preview: {
    select: { title: 'sectionTitle', subtitle: 'topics' }
  }
});

const documentSpec = defineType({
  name: 'documentSpec',
  title: 'Document Specification',
  type: 'object',
  fields: [
    defineField({ name: 'docName', title: 'Document', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'dimension', title: 'Dimensions', type: 'string' }),
    defineField({ name: 'fileSize', title: 'File Size', type: 'string' }),
    defineField({ name: 'format', title: 'Format', type: 'string' })
  ],
  preview: {
    select: { title: 'docName', subtitle: 'format' }
  }
});

const frequentlyAskedQuestion = defineType({
  name: 'frequentlyAskedQuestion',
  title: 'Frequently Asked Question',
  type: 'object',
  fields: [
    defineField({ name: 'question', title: 'Question', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'answer', title: 'Answer', type: 'text', rows: 3, validation: (Rule) => Rule.required() })
  ],
  preview: {
    select: { title: 'question', subtitle: 'answer' }
  }
});

const examNotification = defineType({
  name: 'examNotification',
  title: 'Exam Notification',
  type: 'document',
  groups: [
    { name: 'overview', title: 'Overview', default: true },
    { name: 'dates', title: 'Dates & Links' },
    { name: 'salary', title: 'Salary' },
    { name: 'selection', title: 'Selection & Pattern' },
    { name: 'syllabus', title: 'Syllabus' },
    { name: 'application', title: 'Application & Documents' },
    { name: 'faqs', title: 'FAQs' }
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Notification Title',
      type: 'string',
      group: 'overview',
      validation: (Rule) => Rule.required().max(160)
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'overview',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'examCategory',
      title: 'Exam Category',
      type: 'string',
      group: 'overview',
      options: {
        list: ['SSC', 'Railway', 'Banking', 'Police', 'Teaching', 'Defense', 'State Exams', 'Other']
      }
    }),
    defineField({ name: 'state', title: 'State / Region', type: 'string', group: 'overview' }),
    defineField({ name: 'totalVacancies', title: 'Total Vacancies', type: 'string', group: 'overview' }),
    defineField({ name: 'postDate', title: 'Post Date', type: 'string', group: 'overview' }),
    defineField({ name: 'overview', title: 'Overview', type: 'text', rows: 6, group: 'overview' }),
    defineField({ name: 'officialPdfUrl', title: 'Official Notification PDF URL', type: 'url', group: 'dates' }),
    defineField({ name: 'applyOnlineUrl', title: 'Apply Online URL', type: 'url', group: 'dates' }),
    defineField({ name: 'applicationWindow', title: 'Application Window', type: 'string', group: 'dates' }),
    defineField({ name: 'examDate', title: 'Exam Date', type: 'string', group: 'dates' }),
    defineField({
      name: 'importantDates',
      title: 'Important Dates',
      type: 'array',
      group: 'dates',
      of: [defineArrayMember({ type: 'importantDate' })]
    }),
    defineField({
      name: 'relatedBookId',
      title: 'Related Book IDs',
      type: 'string',
      group: 'overview',
      description: 'Comma-separated book IDs, for example: xt-bk-101, xt-bk-102.'
    }),
    defineField({
      name: 'salaryStructure',
      title: 'Salary Structure',
      type: 'array',
      group: 'salary',
      of: [defineArrayMember({ type: 'salaryEntry' })]
    }),
    defineField({
      name: 'selectionProcess',
      title: 'Selection Process',
      type: 'array',
      group: 'selection',
      of: [defineArrayMember({ type: 'selectionStage' })]
    }),
    defineField({
      name: 'examPattern',
      title: 'Exam Pattern',
      type: 'array',
      group: 'selection',
      of: [defineArrayMember({ type: 'examPatternRow' })]
    }),
    defineField({
      name: 'syllabusDetails',
      title: 'Syllabus Details',
      type: 'array',
      group: 'syllabus',
      of: [defineArrayMember({ type: 'syllabusSection' })]
    }),
    defineField({
      name: 'howToApplySteps',
      title: 'How to Apply Steps',
      type: 'array',
      group: 'application',
      of: [defineArrayMember({ type: 'string' })]
    }),
    defineField({
      name: 'documentSpecs',
      title: 'Document Specifications',
      type: 'array',
      group: 'application',
      of: [defineArrayMember({ type: 'documentSpec' })]
    }),
    defineField({
      name: 'faqs',
      title: 'FAQs',
      type: 'array',
      group: 'faqs',
      of: [defineArrayMember({ type: 'frequentlyAskedQuestion' })]
    })
  ],
  preview: {
    select: { title: 'title', subtitle: 'examCategory', vacancies: 'totalVacancies' },
    prepare: ({ title, subtitle, vacancies }) => ({
      title,
      subtitle: [subtitle, vacancies ? `${vacancies} vacancies` : ''].filter(Boolean).join(' · ')
    })
  },
  orderings: [
    {
      title: 'Newest first',
      name: 'createdAtDesc',
      by: [{ field: '_createdAt', direction: 'desc' }]
    },
    {
      title: 'Title A–Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }]
    }
  ]
});

export const schemaTypes = [
  examNotification,
  importantDate,
  salaryEntry,
  selectionStage,
  examPatternRow,
  syllabusSection,
  documentSpec,
  frequentlyAskedQuestion
];
