import { createElement } from 'react';
import { defineField, defineType } from 'sanity';
import CopyCouponIcon from '../components/CopyCouponIcon.jsx';

const coupon = defineType({
  name: 'coupon',
  title: 'Coupon',
  type: 'document',
  fields: [
    defineField({
      name: 'code',
      title: 'Coupon Code',
      type: 'string',
      validation: (Rule) => Rule.required().regex(/^[A-Z0-9_-]+$/),
      description: 'Enter the code in uppercase, for example XAM50.'
    }),
    defineField({
      name: 'discountType',
      title: 'Discount Type',
      type: 'string',
      options: {
        list: [
          { title: 'Percentage', value: 'percentage' },
          { title: 'Flat amount', value: 'flat' }
        ]
      },
      initialValue: 'percentage',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'discountValue',
      title: 'Discount Value',
      type: 'number',
      validation: (Rule) => Rule.required().positive()
    }),
    defineField({
      name: 'minOrderAmount',
      title: 'Minimum Order Amount',
      type: 'number',
      validation: (Rule) => Rule.min(0)
    }),
    defineField({
      name: 'validTill',
      title: 'Valid Until',
      type: 'datetime'
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true
    })
  ],
  preview: {
    select: {
      title: 'code',
      discountType: 'discountType',
      discountValue: 'discountValue',
      isActive: 'isActive'
    },
    prepare: ({ title, discountType, discountValue, isActive }) => ({
      title: title || 'Untitled coupon',
      subtitle: `${discountType === 'percentage' ? `${discountValue}% OFF` : `₹${discountValue} OFF`} • ${isActive ? 'Active' : 'Inactive'} • Click to edit/copy`,
      media: (mediaProps) => createElement(CopyCouponIcon, { ...mediaProps, code: title })
    })
  },
  orderings: [{ title: 'Coupon code', name: 'codeAsc', by: [{ field: 'code', direction: 'asc' }] }]
});

export default coupon;
