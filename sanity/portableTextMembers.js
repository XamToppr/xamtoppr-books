import { defineArrayMember, defineField } from 'sanity';

export const portableTextImageMember = defineArrayMember({
  type: 'image',
  options: { hotspot: true },
  fields: [
    defineField({ name: 'alt', title: 'Alternative text', type: 'string' }),
    defineField({ name: 'caption', title: 'Caption', type: 'string' })
  ]
});

export const portableTextTableMember = defineArrayMember({ type: 'table' });
