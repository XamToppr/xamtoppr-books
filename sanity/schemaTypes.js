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

const book = defineType({
  name: 'book',
  title: 'Book',
  type: 'document',
  groups: [
    { name: 'details', title: 'Book Details', default: true },
    { name: 'taxonomy', title: 'Exam & Subject' },
    { name: 'media', title: 'Media & Specifications' },
    { name: 'pricing', title: 'Pricing & Links' }
  ],
  initialValue: () => {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return {
      bookId: `XB-${new Date().getFullYear()}-${suffix}`,
      author: 'XamToppr Editorial Team',
      publisher: 'XamToppr Publications',
      language: 'Hindi',
      format: 'eBook (PDF)',
      isFeatured: false
    };
  },
  fields: [
    defineField({
      name: 'bookId',
      title: 'Book ID',
      type: 'string',
      group: 'details',
      readOnly: true,
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'title',
      title: 'Book Title',
      type: 'string',
      group: 'details',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'details',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'badge',
      title: 'Badge',
      type: 'string',
      group: 'details',
      options: { list: ['Bestseller', 'New Launch', 'Trending', 'Free Sample', 'Special Offer'] }
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      group: 'details',
      initialValue: 'XamToppr Editorial Team'
    }),
    defineField({
      name: 'publisher',
      title: 'Publisher',
      type: 'string',
      group: 'details',
      initialValue: 'XamToppr Publications'
    }),
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      group: 'details',
      options: { list: ['Hindi', 'English', 'Bilingual'] },
      initialValue: 'Hindi'
    }),
    defineField({
      name: 'exam',
      title: 'Exam / Conducting Body',
      type: 'array',
      group: 'taxonomy',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      description: 'Enter one or more conducting bodies. Common values: SSC, Railway (RRB), Banking (IBPS/SBI), Defense, Teaching, Bihar State, UP State, MP State, Rajasthan State, Haryana State, and Other State Exams. Custom values are supported.'
    }),
    defineField({
      name: 'examCategory',
      title: 'Exam Categories',
      type: 'array',
      group: 'taxonomy',
      of: [defineArrayMember({ type: 'string' })],
      description: 'Add exams covered, such as CGL, CHSL, MTS, NTPC, Group D, Daroga/SI, or Constable.'
    }),
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'string',
      group: 'taxonomy',
      description: 'Enter any subject, such as Maths, Reasoning, Static GK, History, Geography, or Computer.'
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      group: 'media',
      options: { hotspot: true },
      description: 'Recommended Dimensions: 600x850 px (Portrait) or 1200x630 px (Landscape Banner). WebP / PNG / JPG under 2MB.'
    }),
    defineField({
      name: 'samplePages',
      title: '3D Flipbook Sample Pages',
      type: 'array',
      group: 'media',
      of: [defineArrayMember({ type: 'image', options: { hotspot: true } })],
      description: 'Upload images in the order they should appear in the sample flipbook.'
    }),
    defineField({
      name: 'sampleFlipbookUrl',
      title: 'External Sample Flipbook URL',
      type: 'url',
      group: 'media'
    }),
    defineField({
      name: 'samplePdfFile',
      title: 'Sample PDF',
      type: 'file',
      group: 'media',
      options: { accept: '.pdf,application/pdf' }
    }),
    defineField({ name: 'fileSize', title: 'File Size', type: 'string', group: 'media' }),
    defineField({ name: 'totalPages', title: 'Total Pages', type: 'number', group: 'media', validation: (Rule) => Rule.min(0) }),
    defineField({
      name: 'format',
      title: 'Format',
      type: 'string',
      group: 'media',
      options: { list: ['eBook (PDF)', 'Printed Book', 'eBook + Test Series'] },
      initialValue: 'eBook (PDF)'
    }),
    defineField({ name: 'mrp', title: 'MRP', type: 'number', group: 'pricing', validation: (Rule) => Rule.min(0) }),
    defineField({
      name: 'offerPrice',
      title: 'Offer Price',
      type: 'number',
      group: 'pricing',
      validation: (Rule) => Rule.required().min(0)
    }),
    defineField({ name: 'buyUrl', title: 'Checkout / Payment URL', type: 'url', group: 'pricing' }),
    defineField({ name: 'amazonUrl', title: 'Amazon URL', type: 'url', group: 'pricing' }),
    defineField({
      name: 'isFeatured',
      title: 'Featured Book',
      type: 'boolean',
      group: 'pricing',
      initialValue: false
    }),
    defineField({
      name: 'description',
      title: 'Key Features & Syllabus Coverage',
      type: 'array',
      group: 'details',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' }
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' }
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' }
            ],
            annotations: []
          }
        })
      ]
    }),
    defineField({
      name: 'tableOfContents',
      title: 'Table of Contents (Book Index / Chapters)',
      type: 'array',
      group: 'details',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'chapterNo', title: 'Chapter / Unit No.', type: 'string' }),
            defineField({
              name: 'title',
              title: 'Chapter Title / Topic',
              type: 'string',
              validation: (Rule) => Rule.required()
            }),
            defineField({ name: 'pageRange', title: 'Page Range (Optional)', type: 'string' })
          ],
          preview: {
            select: {
              title: 'title',
              subtitle: 'chapterNo'
            }
          }
        })
      ],
      description: 'Add chapters, units, or topic breakdown included in this book/notes.'
    })
  ],
  preview: {
    select: { title: 'title', subtitle: 'exam', media: 'coverImage', price: 'offerPrice' },
    prepare: ({ title, subtitle, media, price }) => ({
      title,
      subtitle: [subtitle, price == null ? '' : `₹${price}`].filter(Boolean).join(' · '),
      media
    })
  },
  orderings: [
    { title: 'Newest first', name: 'createdAtDesc', by: [{ field: '_createdAt', direction: 'desc' }] },
    { title: 'Title A–Z', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
    { title: 'Featured first', name: 'featuredFirst', by: [{ field: 'isFeatured', direction: 'desc' }] }
  ]
});

export const schemaTypes = [
  book,
  examNotification,
  importantDate,
  salaryEntry,
  selectionStage,
  examPatternRow,
  syllabusSection,
  documentSpec,
  frequentlyAskedQuestion
];
