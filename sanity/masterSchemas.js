import { defineField, defineType } from 'sanity';

const createMasterType = ({ name, title, parent }) => defineType({
  name,
  title,
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required()
    }),
    ...(parent ? [
      defineField({
        name: parent.field,
        title: parent.title,
        type: 'reference',
        to: [{ type: parent.type }],
        validation: (Rule) => Rule.required()
      })
    ] : []),
    defineField({
      name: 'isActive',
      title: 'Status',
      type: 'boolean',
      options: {
        layout: 'radio',
        list: [
          { title: 'Active', value: true },
          { title: 'Inactive', value: false }
        ]
      },
      initialValue: true
    })
  ],
  preview: {
    select: { title: 'name', isActive: 'isActive' },
    prepare: ({ title: name, isActive }) => ({
      title: name || `Untitled ${title}`,
      subtitle: isActive ? 'Active' : 'Inactive'
    })
  },
  orderings: [
    { title: 'Name A–Z', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] }
  ]
});

export const masterTypes = [
  createMasterType({ name: 'track', title: 'Track' }),
  createMasterType({
    name: 'platform',
    title: 'Platform',
    parent: { field: 'track', title: 'Track', type: 'track' }
  }),
  createMasterType({
    name: 'subject',
    title: 'Subject',
    parent: { field: 'platform', title: 'Platform', type: 'platform' }
  }),
  createMasterType({
    name: 'module',
    title: 'Module',
    parent: { field: 'subject', title: 'Subject', type: 'subject' }
  }),
  createMasterType({
    name: 'topic',
    title: 'Topics',
    parent: { field: 'module', title: 'Module', type: 'module' }
  })
];
