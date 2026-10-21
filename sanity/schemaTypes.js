import { createElement } from 'react';
import { defineArrayMember, defineField, defineType, PatchEvent, set } from 'sanity';
import coupon from './schemas/coupon.js';
import videoCoursePack, {
  videoCourseDemoVideo,
  videoCourseLesson,
  videoCoursePlannerItem,
  videoCourseScheduleItem
} from './schemas/videoCoursePack.js';
import onlineClass from './schemas/onlineClass.js';
import { masterTypes } from './masterSchemas.js';

const examCategorySuggestions = ['SSC', 'Railway', 'Banking', 'Teaching', 'Defence', 'State Exams', 'UPSC'];

const ExamCategoryInput = ({ value, onChange, elementProps }) => createElement(
  'div',
  null,
  createElement('input', {
    ...elementProps,
    list: 'exam-category-suggestions',
    value: value || '',
    onChange: (event) => onChange(PatchEvent.from(set(event.currentTarget.value)))
  }),
  createElement(
    'datalist',
    { id: 'exam-category-suggestions' },
    examCategorySuggestions.map((category) => createElement('option', { key: category, value: category }))
  )
);

const importantDate = defineType({
  name: 'importantDate',
  title: 'Important Date',
  type: 'object',
  fields: [
    defineField({ name: 'eventName', title: 'Event', type: 'string' }),
    defineField({ name: 'dateText', title: 'Date', type: 'string' })
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
    defineField({ name: 'title', title: 'Stage Title', type: 'string' }),
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
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string' }),
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
    defineField({ name: 'docName', title: 'Document', type: 'string' }),
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
    defineField({ name: 'question', title: 'Question', type: 'string' }),
    defineField({ name: 'answer', title: 'Answer', type: 'text', rows: 3 })
  ],
  preview: {
    select: { title: 'question', subtitle: 'answer' }
  }
});

const notificationSalaryRow = defineType({
  name: 'notificationSalaryRow',
  title: 'Salary Table Row',
  type: 'object',
  fields: [
    defineField({ name: 'component', title: 'Salary Component', type: 'string' }),
    defineField({ name: 'col1', title: 'Column 1', type: 'string' }),
    defineField({ name: 'col2', title: 'Column 2', type: 'string' }),
    defineField({ name: 'col3', title: 'Column 3', type: 'string' }),
    defineField({ name: 'col4', title: 'Column 4', type: 'string' })
  ]
});

const examStageSection = defineType({
  name: 'examStageSection',
  title: 'Exam Section',
  type: 'object',
  fields: [
    defineField({ name: 'sectionName', title: 'Section Name', type: 'string' }),
    defineField({ name: 'questions', title: 'Questions', type: 'number' }),
    defineField({ name: 'marks', title: 'Marks', type: 'number' })
  ]
});

const qualifyingMark = defineType({
  name: 'qualifyingMark',
  title: 'Qualifying Mark',
  type: 'object',
  fields: [
    defineField({ name: 'category', title: 'Category', type: 'string' }),
    defineField({ name: 'percentage', title: 'Percentage', type: 'number' })
  ]
});

const examStage = defineType({
  name: 'examStage',
  title: 'Exam Stage',
  type: 'object',
  fields: [
    defineField({ name: 'stageName', title: 'Stage Name', type: 'string' }),
    defineField({ name: 'totalQuestions', title: 'Total Questions', type: 'number' }),
    defineField({ name: 'totalMarks', title: 'Total Marks', type: 'number' }),
    defineField({ name: 'durationMinutes', title: 'Duration (Minutes)', type: 'number' }),
    defineField({ name: 'negativeMarking', title: 'Negative Marking', type: 'string' }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      of: [defineArrayMember({ type: 'examStageSection' })]
    }),
    defineField({
      name: 'qualifyingMarks',
      title: 'Qualifying Marks',
      type: 'array',
      of: [defineArrayMember({ type: 'qualifyingMark' })]
    }),
    defineField({ name: 'additionalNotes', title: 'Additional Notes', type: 'text', rows: 3 })
  ],
  preview: { select: { title: 'stageName', subtitle: 'totalQuestions' } }
});

const notificationVacancy = defineType({
  name: 'notificationVacancy',
  title: 'Vacancy',
  type: 'object',
  fields: [
    defineField({ name: 'postName', title: 'Post Name', type: 'string' }),
    defineField({ name: 'category', title: 'Category / Region', type: 'string' }),
    defineField({ name: 'vacancies', title: 'Vacancies', type: 'number' }),
    defineField({ name: 'notes', title: 'Notes', type: 'string' })
  ]
});

const notificationEligibility = defineType({
  name: 'notificationEligibility',
  title: 'Eligibility Criterion',
  type: 'object',
  fields: [
    defineField({ name: 'criterion', title: 'Criterion', type: 'string' }),
    defineField({ name: 'details', title: 'Details', type: 'text', rows: 3 })
  ]
});

const notificationFee = defineType({
  name: 'notificationFee',
  title: 'Application Fee',
  type: 'object',
  fields: [
    defineField({ name: 'category', title: 'Category', type: 'string' }),
    defineField({ name: 'amount', title: 'Fee Amount', type: 'string' }),
    defineField({ name: 'notes', title: 'Notes', type: 'string' })
  ]
});

const notificationPaper = defineType({
  name: 'notificationPaper',
  title: 'Previous Paper',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'Paper Title', type: 'string' }),
    defineField({ name: 'year', title: 'Year', type: 'string' }),
    defineField({ name: 'url', title: 'Paper URL', type: 'url' })
  ]
});

const notificationLink = defineType({
  name: 'notificationLink',
  title: 'Important Link',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Link Label', type: 'string' }),
    defineField({ name: 'url', title: 'URL', type: 'url' })
  ]
});

const dynamicTableRow = defineType({
  name: 'dynamicTableRow',
  title: 'Table Row',
  type: 'object',
  fields: [
    defineField({
      name: 'cells',
      title: 'Cells',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })]
    })
  ],
  preview: {
    select: { title: 'cells' },
    prepare: ({ title }) => ({ title: title?.filter(Boolean).join(' · ') || 'Table row' })
  }
});

const dynamicTable = defineType({
  name: 'dynamicTable',
  title: 'Dynamic Table',
  type: 'object',
  fields: [
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string' }),
    defineField({
      name: 'headers',
      title: 'Column Headers',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })]
    }),
    defineField({
      name: 'rows',
      title: 'Rows',
      type: 'array',
      of: [defineArrayMember({ type: 'dynamicTableRow' })]
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })]
    })
  ],
  preview: { select: { title: 'sectionTitle' }, prepare: ({ title }) => ({ title: title || 'Dynamic Table' }) }
});

const richNoteBlock = defineType({
  name: 'richNoteBlock',
  title: 'Rich Text Section',
  type: 'object',
  fields: [
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string' }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [defineArrayMember({
        type: 'block',
        styles: [
          { title: 'Normal', value: 'normal' },
          { title: 'Heading 2', value: 'h2' },
          { title: 'Heading 3', value: 'h3' },
          { title: 'Heading 4', value: 'h4' }
        ],
        lists: [
          { title: 'Bullet', value: 'bullet' },
          { title: 'Numbered', value: 'number' }
        ],
        marks: {
          decorators: [
            { title: 'Strong', value: 'strong' },
            { title: 'Emphasis', value: 'em' },
            { title: 'Underline', value: 'underline' }
          ]
        }
      })]
    })
  ],
  preview: { select: { title: 'sectionTitle' }, prepare: ({ title }) => ({ title: title || 'Rich Text Section' }) }
});

const stepGuideBlock = defineType({
  name: 'stepGuideBlock',
  title: 'Step Guide',
  type: 'object',
  fields: [
    defineField({ name: 'sectionTitle', title: 'Section Title', type: 'string' }),
    defineField({
      name: 'steps',
      title: 'Steps',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })]
    })
  ],
  preview: { select: { title: 'sectionTitle' }, prepare: ({ title }) => ({ title: title || 'Step Guide' }) }
});

const alertBox = defineType({
  name: 'alertBox',
  title: 'Alert Box',
  type: 'object',
  fields: [
    defineField({
      name: 'alertType',
      title: 'Alert Type',
      type: 'string',
      options: { list: ['info', 'warning', 'success'] }
    }),
    defineField({ name: 'title', title: 'Title', type: 'string' }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 })
  ],
  preview: { select: { title: 'title' }, prepare: ({ title }) => ({ title: title || 'Alert Box' }) }
});

const examNotification = defineType({
  name: 'examNotification',
  title: 'Exam Notification',
  type: 'document',
  groups: [
    { name: 'overview', title: 'Overview', default: true },
    { name: 'dates', title: 'Dates & Links' },
    { name: 'posts', title: 'Posts & Vacancies' },
    { name: 'eligibility', title: 'Eligibility & Fee' },
    { name: 'salary', title: 'Salary' },
    { name: 'selection', title: 'Selection & Pattern' },
    { name: 'syllabus', title: 'Syllabus' },
    { name: 'application', title: 'Application & Documents' },
    { name: 'custom', title: 'Custom Sections & Tables' },
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
      description: 'Choose a suggested category or enter a custom category.',
      components: { input: ExamCategoryInput }
    }),
    defineField({
      name: 'stateRegion',
      title: 'State / Region',
      type: 'string',
      group: 'overview',
      options: {
        list: [
          'All India / Central', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
          'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
          'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
          'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
          'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
          'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
          'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
        ]
      }
    }),
    defineField({ name: 'totalVacancies', title: 'Total Vacancies', type: 'string', group: 'overview' }),
    defineField({
      name: 'cardImage',
      title: 'Notification Card Image (Recommended: 1200 x 630 px, 16:9)',
      type: 'image',
      group: 'overview',
      description: 'Recommended size: 1200 x 630 px (Aspect ratio 16:9). Used for card banner preview and WhatsApp/Telegram share thumbnail.',
      options: { hotspot: true }
    }),
    defineField({ name: 'postDate', title: 'Post Date', type: 'date', group: 'overview' }),
    defineField({
      name: 'comparisonPreviousYear',
      title: 'Previous Year Comparison',
      type: 'array',
      group: 'overview',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'metric', title: 'Metric', type: 'string' }),
          defineField({ name: 'previousYear', title: '2025', type: 'string' }),
          defineField({ name: 'currentYear', title: '2026', type: 'string' })
        ]
      })]
    }),
    defineField({ name: 'overview', title: 'Overview', type: 'text', rows: 6, group: 'overview' }),
    defineField({ name: 'officialPdfUrl', title: 'Official Notification PDF URL', type: 'url', group: 'dates' }),
    defineField({ name: 'applyOnlineUrl', title: 'Apply Online URL', type: 'url', group: 'dates' }),
    defineField({ name: 'applicationWindow', title: 'Application Window', type: 'string', group: 'dates' }),
    defineField({ name: 'applicationStartDate', title: 'Application Start Date', type: 'date', group: 'dates' }),
    defineField({ name: 'applicationEndDate', title: 'Application End Date', type: 'date', group: 'dates' }),
    defineField({ name: 'examDate', title: 'Exam Date (use text if tentative)', type: 'string', group: 'dates' }),
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
      type: 'object',
      group: 'salary',
      fields: [
        defineField({
          name: 'columns',
          title: 'Salary Table Rows',
          type: 'array',
          of: [defineArrayMember({ type: 'notificationSalaryRow' })]
        }),
        defineField({
          name: 'notes',
          title: 'Salary Notes',
          type: 'array',
          of: [defineArrayMember({ type: 'string' })]
        })
      ]
    }),
    defineField({
      name: 'vacanciesList',
      title: 'Vacancy Breakdown',
      type: 'array',
      group: 'posts',
      of: [defineArrayMember({ type: 'notificationVacancy' })]
    }),
    defineField({
      name: 'eligibilityCriteria',
      title: 'Eligibility Criteria',
      type: 'array',
      group: 'eligibility',
      of: [defineArrayMember({ type: 'notificationEligibility' })]
    }),
    defineField({
      name: 'applicationFees',
      title: 'Application Fees',
      type: 'array',
      group: 'eligibility',
      of: [defineArrayMember({ type: 'notificationFee' })]
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
      name: 'examStages',
      title: 'Exam Stages & CBT Pattern',
      type: 'array',
      group: 'selection',
      of: [defineArrayMember({ type: 'examStage' })]
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
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'item', title: 'Item', type: 'string' }),
          defineField({ name: 'specification', title: 'CEN Specification', type: 'text', rows: 3 })
        ]
      })]
    }),
    defineField({
      name: 'previousPapers',
      title: 'Previous Papers',
      type: 'array',
      group: 'application',
      of: [defineArrayMember({ type: 'notificationPaper' })]
    }),
    defineField({
      name: 'importantLinks',
      title: 'Important Links',
      type: 'array',
      group: 'dates',
      of: [defineArrayMember({ type: 'notificationLink' })]
    }),
    defineField({
      name: 'faqsList',
      title: 'FAQs',
      type: 'array',
      group: 'faqs',
      of: [defineArrayMember({ type: 'frequentlyAskedQuestion' })]
    }),
    defineField({
      name: 'customSections',
      title: 'Custom Sections & Dynamic Tables (Add Section)',
      type: 'array',
      group: 'custom',
      of: [
        defineArrayMember({ type: 'dynamicTable' }),
        defineArrayMember({ type: 'richNoteBlock' }),
        defineArrayMember({ type: 'stepGuideBlock' }),
        defineArrayMember({ type: 'alertBox' })
      ]
    }),
    defineField({ name: 'state', title: 'Legacy State / Region', type: 'string', group: 'overview', hidden: true })
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
    { name: 'taxonomy', title: 'Exam & Taxonomy' },
    { name: 'media', title: 'Media & Specifications' },
    { name: 'pricing', title: 'Pricing & Links' },
    { name: 'metrics', title: 'Ratings & Activity' }
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
      title: 'URL Slug',
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
      name: 'tracks',
      title: 'Tracks',
      type: 'array',
      group: 'taxonomy',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'track' }],
          options: {
            filter: () => ({ filter: 'isActive == true' })
          }
        })
      ]
    }),
    defineField({
      name: 'platforms',
      title: 'Platforms',
      type: 'array',
      group: 'taxonomy',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'platform' }],
          options: {
            filter: ({ document }) => {
              const trackIds = document?.tracks
                ?.map((track) => track?._ref)
                .filter(Boolean);
              return trackIds?.length
                ? { filter: 'isActive == true && track._ref in $trackIds', params: { trackIds } }
                : { filter: 'isActive == true' };
            }
          }
        })
      ]
    }),
    defineField({
      name: 'trackRef',
      title: 'Legacy Track',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'track' }],
      hidden: true
    }),
    defineField({
      name: 'platformRef',
      title: 'Legacy Platform',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'platform' }],
      hidden: true
    }),
    defineField({
      name: 'subjectRef',
      title: 'Subject',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'subject' }],
      options: {
        filter: ({ document }) => {
          const platformIds = document?.platforms
            ?.map((platform) => platform?._ref)
            .filter(Boolean);
          return platformIds?.length
            ? { filter: 'isActive == true && platform._ref in $platformIds', params: { platformIds } }
            : { filter: 'isActive == true' };
        }
      }
    }),
    defineField({
      name: 'moduleRef',
      title: 'Module',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'module' }],
      options: {
        filter: ({ document }) => {
          const subjectId = document?.subjectRef?._ref;
          return subjectId
            ? { filter: 'isActive == true && subject._ref == $subjectId', params: { subjectId } }
            : { filter: 'isActive == true' };
        }
      }
    }),
    defineField({
      name: 'topicRef',
      title: 'Topic',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'topic' }],
      options: {
        filter: ({ document }) => {
          const moduleId = document?.moduleRef?._ref;
          return moduleId
            ? { filter: 'isActive == true && module._ref == $moduleId', params: { moduleId } }
            : { filter: 'isActive == true' };
        }
      }
    }),
    defineField({
      name: 'exam',
      title: 'Legacy Exam / Conducting Body',
      type: 'array',
      group: 'taxonomy',
      hidden: true,
      of: [defineArrayMember({ type: 'string' })]
    }),
    defineField({
      name: 'examCategory',
      title: 'Legacy Exam Categories',
      type: 'array',
      group: 'taxonomy',
      hidden: true,
      of: [defineArrayMember({ type: 'string' })]
    }),
    defineField({
      name: 'subject',
      title: 'Legacy Subject',
      type: 'string',
      group: 'taxonomy',
      hidden: true
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
    defineField({
      name: 'fullPdfFile',
      title: 'Original Full Book PDF (Paid Only)',
      description: 'Upload the complete original book PDF here. Only unlocked for students who purchase.',
      type: 'file',
      group: 'media',
      options: { accept: '.pdf' }
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
    defineField({ name: 'flipkartUrl', title: 'Flipkart URL', type: 'url', group: 'pricing' }),
    defineField({
      name: 'isFeatured',
      title: 'Featured Book',
      type: 'boolean',
      group: 'pricing',
      initialValue: false
    }),
    defineField({
      name: 'downloadsCount',
      title: 'Downloads / Purchases',
      type: 'number',
      group: 'metrics',
      initialValue: 0,
      description: 'Base or cumulative download/purchase count',
      validation: (Rule) => Rule.min(0)
    }),
    defineField({
      name: 'rating',
      title: 'Average Rating',
      type: 'number',
      group: 'metrics',
      initialValue: 4.8,
      description: 'Calculated average rating, e.g. 4.8',
      validation: (Rule) => Rule.min(0).max(5)
    }),
    defineField({
      name: 'totalReviews',
      title: 'Total User Ratings',
      type: 'number',
      group: 'metrics',
      initialValue: 1,
      description: 'Total number of user ratings submitted',
      validation: (Rule) => Rule.min(0)
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

const bookRequest = defineType({
  name: 'bookRequest',
  title: 'Book Request',
  type: 'document',
  fields: [
    defineField({ name: 'studentName', title: 'Student Name', type: 'string' }),
    defineField({ name: 'contactNumber', title: 'Contact Number', type: 'string' }),
    defineField({ name: 'email', title: 'Email', type: 'string' }),
    defineField({
      name: 'requestedBookTitle',
      title: 'Requested Book Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({ name: 'examCategory', title: 'Exam Category', type: 'string' }),
    defineField({ name: 'additionalDetails', title: 'Additional Details', type: 'text', rows: 4 }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['Pending', 'Reviewed', 'Added to Library'] },
      initialValue: 'Pending'
    }),
    defineField({
      name: 'requestedAt',
      title: 'Requested At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    })
  ],
  preview: {
    select: {
      title: 'requestedBookTitle',
      subtitle: 'studentName',
      status: 'status'
    },
    prepare: ({ title, subtitle, status }) => ({
      title: title || 'Untitled Request',
      subtitle: `${subtitle || 'Student'} • [${status || 'Pending'}]`
    })
  },
  orderings: [
    { title: 'Newest first', name: 'requestedAtDesc', by: [{ field: 'requestedAt', direction: 'desc' }] }
  ]
});

const studentUser = defineType({
  name: 'studentUser',
  title: 'Student User',
  type: 'document',
  fields: [
    defineField({ name: 'fullName', title: 'Full Name', type: 'string' }),
    defineField({ name: 'email', title: 'Email', type: 'string' }),
    defineField({ name: 'phone', title: 'Phone', type: 'string' }),
    defineField({ name: 'firebaseUid', title: 'Firebase UID', type: 'string' }),
    defineField({ name: 'createdAt', title: 'Created At', type: 'datetime' }),
    defineField({ name: 'latestActivityTimestamp', title: 'Latest Activity', type: 'datetime' }),
    defineField({ name: 'latestDroppedBook', title: 'Latest Dropped Book', type: 'string' }),
    defineField({
      name: 'activities',
      title: 'Activities',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'userActivity' }] })]
    }),
    defineField({ name: 'totalCoins', title: 'Total Coins', type: 'number', initialValue: 0 }),
    defineField({
      name: 'leadStatus',
      title: 'Lead Status',
      type: 'string',
      options: {
        list: [
          { title: 'Ultra Hot (Payment Dropped)', value: 'ULTRA_HOT' },
          { title: 'Converted', value: 'CONVERTED' },
          { title: 'Hot', value: 'HOT' },
          { title: 'Warm', value: 'WARM' },
          { title: 'Cold', value: 'COLD' }
        ]
      }
    }),
    defineField({
      name: 'purchasedBooks',
      title: 'Purchased Books / Orders',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'book',
              title: 'Book',
              type: 'reference',
              to: [{ type: 'book' }]
            }),
            defineField({
              name: 'purchasedCourses',
              title: 'Purchased Video Courses',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  fields: [
                    defineField({
                      name: 'course',
                      title: 'Video Course Pack',
                      type: 'reference',
                      to: [{ type: 'videoCoursePack' }]
                    }),
                    defineField({ name: 'courseTitle', title: 'Course Title', type: 'string' }),
                    defineField({ name: 'amount', title: 'Amount', type: 'number' }),
                    defineField({ name: 'finalAmount', title: 'Amount Paid', type: 'number' }),
                    defineField({ name: 'duration', title: 'Access Duration', type: 'string' }),
                    defineField({ name: 'expiresAt', title: 'Access Expiry', type: 'datetime' }),
                    defineField({ name: 'appliedCoupon', title: 'Applied Coupon', type: 'string' }),
                    defineField({ name: 'orderId', title: 'Payment ID', type: 'string' }),
                    defineField({ name: 'purchasedAt', title: 'Purchase Date', type: 'datetime' })
                  ]
                })
              ]
            }),
            defineField({
              name: 'enrolledCourses',
              title: 'Free Course Enrollments',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  fields: [
                    defineField({
                      name: 'course',
                      title: 'Video Course Pack',
                      type: 'reference',
                      to: [{ type: 'videoCoursePack' }]
                    }),
                    defineField({ name: 'courseTitle', title: 'Course Title', type: 'string' }),
                    defineField({ name: 'duration', title: 'Access Duration', type: 'string' }),
                    defineField({ name: 'enrolledAt', title: 'Enrollment Date', type: 'datetime' }),
                    defineField({ name: 'expiresAt', title: 'Access Expiry', type: 'datetime' })
                  ]
                })
              ]
            }),
            defineField({ name: 'bookTitle', title: 'Book Title', type: 'string' }),
            defineField({ name: 'amount', title: 'Amount Paid', type: 'number' }),
            defineField({ name: 'finalAmount', title: 'Final Amount Paid', type: 'number' }),
            defineField({ name: 'appliedCoupon', title: 'Applied Coupon', type: 'string' }),
            defineField({ name: 'orderId', title: 'Order / Payment ID', type: 'string' }),
            defineField({ name: 'purchasedAt', title: 'Purchase Date', type: 'datetime' })
          ],
          preview: {
            select: {
              title: 'bookTitle',
              subtitle: 'orderId'
            }
          }
        })
      ]
    })
  ],
  preview: {
    select: { title: 'fullName', subtitle: 'email' },
    prepare: ({ title, subtitle }) => ({
      title: title || 'Student',
      subtitle: subtitle || 'No email'
    })
  },
  orderings: [
    { title: 'Newest first', name: 'createdAtDesc', by: [{ field: 'createdAt', direction: 'desc' }] }
  ]
});

const userActivity = defineType({
  name: 'userActivity',
  title: 'Student Activity',
  type: 'document',
  fields: [
    defineField({ name: 'uid', title: 'Firebase UID', type: 'string' }),
    defineField({
      name: 'student',
      title: 'Student',
      type: 'reference',
      to: [{ type: 'studentUser' }]
    }),
    defineField({ name: 'studentName', title: 'Student Name', type: 'string' }),
    defineField({ name: 'phone', title: 'Phone', type: 'string' }),
    defineField({ name: 'email', title: 'Email', type: 'string' }),
    defineField({
      name: 'book',
      title: 'Interested Book',
      type: 'reference',
      to: [{ type: 'book' }]
    }),
    defineField({
      name: 'videoCoursePack',
      title: 'Video Course Pack',
      type: 'reference',
      to: [{ type: 'videoCoursePack' }]
    }),
    defineField({ name: 'bookId', title: 'Book ID', type: 'string' }),
    defineField({ name: 'courseId', title: 'Course ID', type: 'string' }),
    defineField({ name: 'courseTitle', title: 'Video Course Title', type: 'string' }),
    defineField({ name: 'bookTitle', title: 'Interested Book Title', type: 'string' }),
    defineField({ name: 'productType', title: 'Product Type', type: 'string' }),
    defineField({
      name: 'action',
      title: 'Activity',
      type: 'string',
      options: {
        list: [
          { title: 'Daily Website Visit', value: 'daily_login_visit' },
          { title: 'Book Detail Modal Open', value: 'view_book_detail' },
          { title: 'Sample PDF / Flipbook Open', value: 'read_sample_pdf' },
          { title: 'Add to Cart', value: 'add_to_cart' },
          { title: 'Purchase Successful', value: 'purchase_complete' },
          { title: 'Checkout Initiated', value: 'checkout_initiated' },
          { title: 'Payment Failed', value: 'payment_failed' },
          { title: 'Payment Modal Closed / Abandoned', value: 'payment_abandoned' },
          { title: 'Payment Attempt Failed / Modal Closed (High Intent)', value: 'payment_dropped' },
          { title: 'Video Watched', value: 'video_watch' }
        ]
      }
    }),
    defineField({ name: 'videoId', title: 'Video / Class ID', type: 'string' }),
    defineField({ name: 'videoTitle', title: 'Video / Class Title', type: 'string' }),
    defineField({ name: 'watchDurationSeconds', title: 'Watched Duration (seconds)', type: 'number' }),
    defineField({ name: 'videoDurationSeconds', title: 'Video Duration (seconds)', type: 'number' }),
    defineField({ name: 'videoProgressPercent', title: 'Video Progress (%)', type: 'number' }),
    defineField({ name: 'amount', title: 'Amount Paid', type: 'number' }),
    defineField({ name: 'context', title: 'Activity Context / Drop-off Reason', type: 'string' }),
    defineField({ name: 'coinsEarned', title: 'Coins Earned', type: 'number' }),
    defineField({ name: 'totalCoins', title: 'Total Coins After Activity', type: 'number' }),
    defineField({
      name: 'leadStatus',
      title: 'Lead Status',
      type: 'string',
      options: {
        list: [
          { title: 'Hot', value: 'HOT' },
          { title: 'Warm', value: 'WARM' },
          { title: 'Converted', value: 'CONVERTED' },
          { title: 'Ultra Hot (Payment Dropped)', value: 'ULTRA_HOT' },
          { title: 'Cold', value: 'COLD' }
        ]
      }
    }),
    defineField({ name: 'timestamp', title: 'Date & Time', type: 'datetime' })
  ],
  preview: {
    select: { title: 'studentName', subtitle: 'action' },
    prepare: ({ title, subtitle }) => ({
      title: title || 'Student activity',
      subtitle: subtitle || 'Unknown activity'
    })
  },
  orderings: [
    { title: 'Newest first', name: 'timestampDesc', by: [{ field: 'timestamp', direction: 'desc' }] }
  ]
});

const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({ name: 'supportHelpline', title: 'Support Helpline', type: 'string' }),
    defineField({ name: 'supportEmail', title: 'Support Email', type: 'string' }),
    ...[
      { name: 'aboutContent', title: 'About Us Content' },
      { name: 'termsContent', title: 'Terms & Conditions Content' },
      { name: 'privacyContent', title: 'Privacy Policy Content' },
      { name: 'refundContent', title: 'Refund Policy Content' }
    ].map(({ name, title }) => defineField({
      name,
      title,
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Heading 4', value: 'h4' }
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' }
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Underline', value: 'underline' }
            ],
            annotations: [
              defineType({
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url'
                  })
                ]
              })
            ]
          }
        })
      ]
    }))
  ]
});

export const schemaTypes = [
  ...masterTypes,
  book,
  videoCoursePack,
  onlineClass,
  videoCourseLesson,
  videoCourseScheduleItem,
  videoCoursePlannerItem,
  videoCourseDemoVideo,
  dynamicTableRow,
  dynamicTable,
  richNoteBlock,
  stepGuideBlock,
  alertBox,
  notificationSalaryRow,
  examStageSection,
  qualifyingMark,
  examStage,
  notificationVacancy,
  notificationEligibility,
  notificationFee,
  notificationPaper,
  notificationLink,
  bookRequest,
  studentUser,
  userActivity,
  coupon,
  siteSettings,
  examNotification,
  importantDate,
  salaryEntry,
  selectionStage,
  examPatternRow,
  syllabusSection,
  documentSpec,
  frequentlyAskedQuestion
];
