import { defineField, defineType } from 'sanity';

const uploadedFile = defineType({
  name: 'uploadedFile',
  title: 'Uploaded File',
  type: 'document',
  fields: [
    defineField({
      name: 'filename',
      title: 'Filename',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'url',
      title: 'File URL',
      type: 'url',
      validation: (Rule) => Rule.required().uri({ scheme: ['http', 'https'] })
    }),
    defineField({
      name: 'uploadType',
      title: 'Upload Type',
      type: 'string',
      options: {
        list: ['Book PDF', 'Cover Image', 'Study Notes', 'Other']
      },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'remark',
      title: 'Remark',
      type: 'string',
      validation: (Rule) => Rule.max(500)
    }),
    defineField({
      name: 'uploadedAt',
      title: 'Uploaded At',
      type: 'datetime',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'assetId',
      title: 'Sanity Asset ID',
      type: 'string',
      readOnly: true
    })
  ],
  preview: {
    select: { title: 'remark', filename: 'filename', subtitle: 'uploadType' },
    prepare: ({ title, filename, subtitle }) => ({
      title: title || filename || 'Uploaded file',
      subtitle
    })
  },
  orderings: [
    { title: 'Newest first', name: 'uploadedAtDesc', by: [{ field: 'uploadedAt', direction: 'desc' }] }
  ]
});

export default uploadedFile;
