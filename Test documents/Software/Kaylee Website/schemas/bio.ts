import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'bio',
  title: 'Bio / About Section',
  type: 'document',
  icon: () => '👩‍🏫',
  fields: [
    defineField({
      name: 'photo',
      title: 'Profile / Bio Photo',
      type: 'image',
      description: 'Your main athlete photo for the About section. A vertical (portrait) photo works best here.',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'headline',
      title: 'Section Headline',
      type: 'string',
      description: 'A bold, punchy headline for the bio section — e.g., "Built for Height" or "Beyond the Bar"',
      initialValue: 'Built for Height',
    }),
    defineField({
      name: 'bioText',
      title: 'Bio Paragraph',
      type: 'array',
      description:
        'Your main bio. Write 2–4 sentences about yourself, your journey, and what drives you. This is your voice — make it personal!',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'quote',
      title: 'Personal Quote',
      type: 'string',
      description:
        "A motivational quote or personal motto displayed in large text — can be something you live by, a coach's saying, or your own words.",
      initialValue: '"The bar is just the beginning."',
    }),
    defineField({
      name: 'quoteAuthor',
      title: 'Quote Author (optional)',
      type: 'string',
      description: "Who said the quote? Leave blank if it's your own.",
    }),

    // ── Quick Facts ───────────────────────────────────────────────────────────
    defineField({
      name: 'quickFacts',
      title: 'Quick Facts',
      type: 'object',
      description: 'These appear as a strip of stats below your bio.',
      fields: [
        defineField({
          name: 'hometown',
          title: 'Hometown',
          type: 'string',
          description: 'E.g., "Georgetown, KY"',
          initialValue: 'Las Vegas, NV',
        }),
        defineField({
          name: 'year',
          title: 'Class Year',
          type: 'string',
          description: 'E.g., "Junior", "Sophomore", "Senior"',
          initialValue: 'Sophomore',
        }),
        defineField({
          name: 'major',
          title: 'Academic Major',
          type: 'string',
          description: 'E.g., "Sports Administration" or "Kinesiology"',
          initialValue: 'Clinical Leadership Management',
        }),
        defineField({
          name: 'height',
          title: 'Height',
          type: 'string',
          description: 'E.g., "5\'8\\"" — optional but adds a nice detail.',
          initialValue: "5'8\"",
        }),
        defineField({
          name: 'yearsAtUK',
          title: 'Years at UK',
          type: 'string',
          description: 'E.g., "3 Years" or "2021–Present"',
          initialValue: '1st Year at UK',
        }),
      ],
    }),

    defineField({
      name: 'resumeFile',
      title: 'NIL / Media Kit PDF (optional)',
      type: 'file',
      description:
        'Upload a PDF of your athlete media kit or NIL one-sheet. A download button will appear in the contact section.',
      options: {
        accept: '.pdf',
      },
    }),
  ],
  preview: {
    select: { headline: 'headline', media: 'photo' },
    prepare({ headline, media }) {
      return { title: `Bio: ${headline}`, media }
    },
  },
})
