import { defineArrayMember, defineField, defineType } from 'sanity';

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
      { title: 'Italic', value: 'em' }
    ],
    annotations: []
  }
});

const onlineClass = defineType({
  name: 'onlineClass',
  title: 'Online Course Class',
  type: 'document',
  groups: [
    { name: 'details', title: 'Class Details', default: true },
    { name: 'taxonomy', title: 'Master Taxonomy' },
    { name: 'video', title: 'Video & Description' },
    { name: 'resources', title: 'Class Resources' },
    { name: 'publishing', title: 'Publishing' }
  ],
  initialValue: {
    videoType: 'longFormat',
    status: 'Active'
  },
  fields: [
    defineField({
      name: 'title',
      title: 'Class Title',
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
      name: 'teacherName',
      title: 'Educator / Teacher Name',
      type: 'string',
      group: 'details'
    }),
    defineField({
      name: 'image',
      title: 'Class Thumbnail / Banner',
      type: 'image',
      group: 'details',
      options: { hotspot: true }
    }),
    defineField({
      name: 'track',
      title: 'Track',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'track' }],
      options: { filter: () => ({ filter: 'isActive == true' }) },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'platform' }],
      options: {
        filter: ({ document }) => {
          const trackId = document?.track?._ref;
          return trackId
            ? { filter: 'isActive == true && track._ref == $trackId', params: { trackId } }
            : { filter: 'isActive == true' };
        }
      },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'subject' }],
      options: {
        filter: ({ document }) => {
          const platformId = document?.platform?._ref;
          return platformId
            ? { filter: 'isActive == true && platform._ref == $platformId', params: { platformId } }
            : { filter: 'isActive == true' };
        }
      },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'module',
      title: 'Module',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'module' }],
      options: {
        filter: ({ document }) => {
          const subjectId = document?.subject?._ref;
          return subjectId
            ? { filter: 'isActive == true && subject._ref == $subjectId', params: { subjectId } }
            : { filter: 'isActive == true' };
        }
      },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'topic',
      title: 'Topic',
      type: 'reference',
      group: 'taxonomy',
      to: [{ type: 'topic' }],
      options: {
        filter: ({ document }) => {
          const moduleId = document?.module?._ref;
          return moduleId
            ? { filter: 'isActive == true && module._ref == $moduleId', params: { moduleId } }
            : { filter: 'isActive == true' };
        }
      },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'videoLink',
      title: 'Video Link',
      type: 'url',
      group: 'video',
      description: 'Paste a YouTube watch, share, Shorts, or embed link. Supported links are converted to an embed player on the storefront.',
      validation: (Rule) => Rule.required().uri({ scheme: ['http', 'https'] })
    }),
    defineField({
      name: 'videoType',
      title: 'Video Format',
      type: 'string',
      group: 'video',
      options: {
        layout: 'dropdown',
        list: [
          { title: 'Long-Format Chapter (16:9)', value: 'longFormat' },
          { title: 'Short Reel / Bite (9:16)', value: 'shortReel' }
        ]
      },
      initialValue: 'longFormat',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'duration',
      title: 'Duration',
      type: 'string',
      group: 'video',
      description: 'Optional. For example, 15:40.',
      validation: (Rule) => Rule.max(20)
    }),
    defineField({
      name: 'classPdf',
      title: 'Class PDF Notes',
      type: 'file',
      group: 'resources'
    }),
    defineField({
      name: 'mappedBook',
      title: 'Related Book',
      type: 'reference',
      group: 'resources',
      description: 'Optional ebook to preview alongside this class.',
      to: [{ type: 'book' }]
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      group: 'video',
      of: [richTextMember]
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'publishing',
      options: {
        layout: 'dropdown',
        list: [
          { title: 'Active', value: 'Active' },
          { title: 'Inactive', value: 'Inactive' }
        ]
      },
      initialValue: 'Active',
      validation: (Rule) => Rule.required()
    })
  ],
  preview: {
    select: {
      title: 'title',
      videoType: 'videoType',
      teacherName: 'teacherName',
      track: 'track.name',
      platform: 'platform.name',
      subject: 'subject.name',
      module: 'module.name',
      topic: 'topic.name',
      status: 'status',
      media: 'image'
    },
    prepare: ({ title, videoType, teacherName, track, platform, subject, module, topic, status, media }) => ({
      title: title || 'Untitled online class',
      subtitle: [
        videoType === 'shortReel' ? 'Short Reel / Bite' : 'Long-Format Chapter',
        teacherName,
        [track, platform, subject, module, topic].filter(Boolean).join(' → '),
        status
      ].filter(Boolean).join(' · '),
      media
    })
  },
  orderings: [
    { title: 'Title A–Z', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
    { title: 'Newest', name: 'createdDesc', by: [{ field: '_createdAt', direction: 'desc' }] }
  ]
});

export default onlineClass;
