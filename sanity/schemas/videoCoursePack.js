import { defineArrayMember, defineField, defineType } from 'sanity';
import { portableTextImageMember, portableTextTableMember } from '../portableTextMembers.js';

const richTextMember = defineArrayMember({
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
      { title: 'Italic', value: 'em' },
      { title: 'Underline', value: 'underline' }
    ],
    annotations: [
      defineType({
        name: 'link',
        title: 'Link',
        type: 'object',
        fields: [defineField({ name: 'href', title: 'URL', type: 'url' })]
      })
    ]
  }
});

export const videoCourseLesson = defineType({
  name: 'videoCourseLesson',
  title: 'Video Lesson',
  type: 'object',
  fields: [
    defineField({
      name: 'videoTitle',
      title: 'Video Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'videoType',
      title: 'Video Type',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          { title: 'Long-Format Chapter', value: 'longFormat' },
          { title: 'Short Reel / Bite', value: 'shortReel' }
        ]
      },
      initialValue: 'longFormat',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      description: 'Paste a YouTube, Vimeo, or hosted video URL.',
      validation: (Rule) => Rule.required().uri({
        scheme: ['http', 'https']
      })
    }),
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'reference',
      to: [{ type: 'subject' }],
      validation: (Rule) => Rule.required(),
      options: {
        filter: ({ document }) => {
          const platformIds = document?.platforms
            ?.map((platform) => platform?._ref)
            .filter(Boolean);
          return platformIds?.length
            ? {
              filter: 'isActive == true && platform._ref in $platformIds',
              params: { platformIds }
            }
            : { filter: 'isActive == true' };
        }
      }
    }),
    defineField({
      name: 'topic',
      title: 'Topic',
      type: 'reference',
      to: [{ type: 'topic' }],
      validation: (Rule) => Rule.required(),
      options: {
        filter: ({ parent }) => {
          const subjectId = parent?.subject?._ref;
          return subjectId
            ? {
              filter: 'isActive == true && module->subject._ref == $subjectId',
              params: { subjectId }
            }
            : { filter: 'isActive == true' };
        }
      }
    }),
    defineField({
      name: 'duration',
      title: 'Duration',
      type: 'string',
      description: 'For example, 15:40',
      validation: (Rule) => Rule.max(20)
    })
  ],
  preview: {
    select: {
      title: 'videoTitle',
      videoType: 'videoType',
      subject: 'subject.name',
      topic: 'topic.name'
    },
    prepare: ({ title, videoType, subject, topic }) => ({
      title: title || 'Untitled video',
      subtitle: [
        videoType === 'shortReel' ? 'Short Reel / Bite' : 'Long-Format Chapter',
        subject,
        topic
      ].filter(Boolean).join(' · ')
    })
  }
});

export const videoCourseScheduleItem = defineType({
  name: 'videoCourseScheduleItem',
  title: 'Time Table Session',
  type: 'object',
  fields: [
    defineField({
      name: 'sessionTitle',
      title: 'Session Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({ name: 'day', title: 'Day', type: 'string' }),
    defineField({ name: 'date', title: 'Date', type: 'date' }),
    defineField({ name: 'startTime', title: 'Start Time', type: 'string' }),
    defineField({ name: 'endTime', title: 'End Time', type: 'string' }),
    defineField({ name: 'notes', title: 'Notes', type: 'text', rows: 2 })
  ],
  preview: {
    select: { title: 'sessionTitle', day: 'day', date: 'date' },
    prepare: ({ title, day, date }) => ({
      title: title || 'Untitled session',
      subtitle: [day, date].filter(Boolean).join(' · ')
    })
  }
});

export const videoCoursePlannerItem = defineType({
  name: 'videoCoursePlannerItem',
  title: 'Syllabus / Planner Item',
  type: 'object',
  fields: [
    defineField({ name: 'week', title: 'Week / Sequence', type: 'string' }),
    defineField({
      name: 'title',
      title: 'Planner Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'module',
      title: 'Module',
      type: 'reference',
      to: [{ type: 'module' }],
      options: { filter: () => ({ filter: 'isActive == true' }) }
    }),
    defineField({
      name: 'topic',
      title: 'Topic',
      type: 'reference',
      to: [{ type: 'topic' }],
      options: {
        filter: ({ parent }) => {
          const moduleId = parent?.module?._ref;
          return moduleId
            ? {
              filter: 'isActive == true && module._ref == $moduleId',
              params: { moduleId }
            }
            : { filter: 'isActive == true' };
        }
      }
    }),
    defineField({ name: 'details', title: 'Details', type: 'text', rows: 3 })
  ],
  preview: {
    select: { title: 'title', week: 'week', module: 'module.name', topic: 'topic.name' },
    prepare: ({ title, week, module, topic }) => ({
      title: title || 'Untitled planner item',
      subtitle: [week, module, topic].filter(Boolean).join(' · ')
    })
  }
});

export const videoCourseDemoVideo = defineType({
  name: 'videoCourseDemoVideo',
  title: 'Demo Video',
  type: 'object',
  fields: [
    defineField({
      name: 'videoTitle',
      title: 'Video Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'videoType',
      title: 'Video Format',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          { title: 'Long-Format (16:9)', value: 'longFormat' },
          { title: 'Short Reel / Bite (9:16)', value: 'shortReel' }
        ]
      },
      initialValue: 'longFormat',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      description: 'Paste a YouTube, Vimeo, or hosted video URL.',
      validation: (Rule) => Rule.required().uri({ scheme: ['http', 'https'] })
    }),
    defineField({
      name: 'duration',
      title: 'Duration',
      type: 'string',
      description: 'For example, 15:40',
      validation: (Rule) => Rule.max(20)
    })
  ],
  preview: {
    select: { title: 'videoTitle', videoType: 'videoType' },
    prepare: ({ title, videoType }) => ({
      title: title || 'Untitled demo video',
      subtitle: videoType === 'shortReel' ? 'Short Reel / Bite' : 'Long-Format Demo'
    })
  }
});

const videoCoursePack = defineType({
  name: 'videoCoursePack',
  title: 'Video Course Pack',
  type: 'document',
  groups: [
    { name: 'details', title: 'Pack Details', default: true },
    { name: 'taxonomy', title: 'Tracks & Platforms' },
    { name: 'schedule', title: 'Time Table' },
    { name: 'planner', title: 'Syllabus / Planner' },
    { name: 'demos', title: 'Demo Videos' },
    { name: 'classes', title: 'Centralized Classes' },
    { name: 'publishing', title: 'Publishing' }
  ],
  initialValue: {
    packPurpose: 'Individual',
    packType: 'Free',
    deliveryMode: 'Recorded Video',
    price: 0,
    publishingStatus: 'Draft',
    videos: []
  },
  fields: [
    defineField({
      name: 'title',
      title: 'Pack Title',
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
      name: 'packPurpose',
      title: 'Pack Purpose',
      type: 'string',
      group: 'details',
      options: {
        layout: 'radio',
        list: [
          { title: 'Individual', value: 'Individual' },
          { title: 'Mahapack', value: 'Mahapack' }
        ]
      },
      initialValue: 'Individual',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'packType',
      title: 'Pack Type',
      type: 'string',
      group: 'details',
      options: {
        layout: 'radio',
        list: [
          { title: 'Paid', value: 'Paid' },
          { title: 'Free', value: 'Free' }
        ]
      },
      initialValue: 'Free',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'price',
      title: 'Pack Price',
      type: 'number',
      group: 'details',
      description: 'Use 0 for a free pack.',
      initialValue: 0,
      validation: (Rule) => Rule.required().min(0).precision(2).custom((price, context) => {
        if (context.document?.packType === 'Paid' && !(price > 0)) {
          return 'Paid packs must have a price greater than 0.';
        }
        if (context.document?.packType === 'Free' && price !== 0) {
          return 'Free packs must have a price of 0.';
        }
        return true;
      })
    }),
    defineField({
      name: 'duration',
      title: 'Access Duration',
      type: 'string',
      group: 'details',
      description: 'For example, 6 Months or 12 Months.'
    }),
    defineField({
      name: 'deliveryMode',
      title: 'Course Delivery',
      type: 'string',
      group: 'details',
      description: 'Controls the title of the course content tab on the storefront.',
      options: {
        layout: 'dropdown',
        list: [
          { title: 'Live Class', value: 'Live Class' },
          { title: 'Recorded Video', value: 'Recorded Video' }
        ]
      },
      initialValue: 'Recorded Video',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'thumbnail',
      title: 'Thumbnail',
      type: 'image',
      group: 'details',
      options: { hotspot: true }
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short Description',
      type: 'text',
      rows: 3,
      group: 'details',
      validation: (Rule) => Rule.max(300)
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      group: 'details',
      of: [
        richTextMember,
        portableTextImageMember,
        portableTextTableMember
      ]
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
      ],
      validation: (Rule) => Rule.min(1)
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
                ? {
                  filter: 'isActive == true && track._ref in $trackIds',
                  params: { trackIds }
                }
                : { filter: 'isActive == true' };
            }
          }
        })
      ],
      validation: (Rule) => Rule.min(1)
    }),
    defineField({
      name: 'subjects',
      title: 'Subjects',
      type: 'array',
      group: 'taxonomy',
      description: 'Map the subjects this course pack covers. Standalone Online Course Classes are matched to these subjects.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'subject' }],
          options: {
            filter: ({ document }) => {
              const platformIds = document?.platforms
                ?.map((platform) => platform?._ref)
                .filter(Boolean);
              return platformIds?.length
                ? {
                  filter: 'isActive == true && platform._ref in $platformIds',
                  params: { platformIds }
                }
                : { filter: 'isActive == true' };
            }
          }
        })
      ]
    }),
    defineField({
      name: 'classes',
      title: 'Online Course Classes',
      type: 'array',
      group: 'classes',
      description: 'Select active standalone classes to include in this course pack.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'onlineClass' }],
          options: {
            filter: ({ document }) => {
              const filters = ['status == "Active"'];
              const params = {};
              const trackIds = document?.tracks?.map((item) => item?._ref).filter(Boolean);
              const platformIds = document?.platforms?.map((item) => item?._ref).filter(Boolean);
              const subjectIds = document?.subjects?.map((item) => item?._ref).filter(Boolean);
              if (trackIds?.length) {
                filters.push('track._ref in $trackIds');
                params.trackIds = trackIds;
              }
              if (platformIds?.length) {
                filters.push('platform._ref in $platformIds');
                params.platformIds = platformIds;
              }
              if (subjectIds?.length) {
                filters.push('subject._ref in $subjectIds');
                params.subjectIds = subjectIds;
              }
              return { filter: filters.join(' && '), params };
            }
          }
        })
      ]
    }),
    defineField({
      name: 'videos',
      title: 'Legacy Video Lessons',
      type: 'array',
      description: 'Existing embedded lessons are retained for storefront compatibility. Create new lessons as Online Course Classes.',
      hidden: true,
      of: [defineArrayMember({ type: 'videoCourseLesson' })]
    }),
    defineField({
      name: 'timeTable',
      title: 'Time Table',
      type: 'array',
      group: 'schedule',
      of: [defineArrayMember({ type: 'videoCourseScheduleItem' })]
    }),
    defineField({
      name: 'syllabusPlanner',
      title: 'Syllabus / Planner',
      type: 'array',
      group: 'planner',
      of: [defineArrayMember({ type: 'videoCoursePlannerItem' })]
    }),
    defineField({
      name: 'demoVideos',
      title: 'Demo Videos',
      type: 'array',
      group: 'demos',
      of: [defineArrayMember({ type: 'videoCourseDemoVideo' })]
    }),
    defineField({
      name: 'publishingStatus',
      title: 'Publishing Status',
      type: 'string',
      group: 'publishing',
      options: {
        layout: 'radio',
        list: [
          { title: 'Draft', value: 'Draft' },
          { title: 'Scheduled', value: 'Scheduled' },
          { title: 'Instant', value: 'Instant' }
        ]
      },
      initialValue: 'Draft',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'publishingDate',
      title: 'Publishing Date & Time',
      type: 'datetime',
      group: 'publishing',
      description: 'Required for Scheduled packs.',
      hidden: ({ document }) => document?.publishingStatus !== 'Scheduled',
      validation: (Rule) => Rule.custom((value, context) => (
        context.document?.publishingStatus === 'Scheduled' && !value
          ? 'Set a publishing date and time for scheduled packs.'
          : true
      ))
    })
  ],
  preview: {
    select: {
      title: 'title',
      packType: 'packType',
      packPurpose: 'packPurpose',
      publishingStatus: 'publishingStatus'
    },
    prepare: ({ title, packType, packPurpose, publishingStatus }) => ({
      title: title || 'Untitled video course pack',
      subtitle: [packPurpose, packType, publishingStatus].filter(Boolean).join(' · ')
    })
  },
  orderings: [
    { title: 'Title A–Z', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
    { title: 'Newest', name: 'createdDesc', by: [{ field: '_createdAt', direction: 'desc' }] }
  ]
});

export default videoCoursePack;
