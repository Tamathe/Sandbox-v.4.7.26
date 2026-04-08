import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'pressEntry',
  title: 'Press & NIL Entry',
  type: 'document',
  icon: () => '📰',
  fields: [
    defineField({
      name: 'title',
      title: 'Title / Headline',
      type: 'string',
      description:
        'The title of the article, partnership name, or feature — e.g., "Kaylee Daniel breaks UK indoor pole vault record" or "Partnership with Nike".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      description: 'What kind of entry is this?',
      options: {
        list: [
          { title: '📰 Press Article / Media Feature', value: 'press' },
          { title: '🤝 Brand Partnership / Sponsorship', value: 'partnership' },
          { title: '📺 Podcast / Interview', value: 'interview' },
          { title: '🏅 Award / Recognition', value: 'award' },
        ],
        layout: 'radio',
      },
      initialValue: 'press',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publication',
      title: 'Publication / Brand Name',
      type: 'string',
      description:
        'Name of the outlet or brand — e.g., "Kentucky Kernel", "SEC Network", "Gatorade", "Athleta".',
    }),
    defineField({
      name: 'logo',
      title: 'Publication / Brand Logo',
      type: 'image',
      description: 'Optional logo for the publication or brand partner. Shown as a thumbnail on the card.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      description: 'Publication date for articles, or start date for partnerships.',
      options: {
        dateFormat: 'MMMM YYYY',
      },
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'text',
      rows: 3,
      description:
        'A brief summary — 1–2 sentences. For a press article, summarize the story. For a partnership, describe the collaboration.',
    }),
    defineField({
      name: 'url',
      title: 'Link (optional)',
      type: 'url',
      description: 'Link to the article or brand website. Leave blank for partnerships where you prefer not to link out.',
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured?',
      type: 'boolean',
      description: 'Toggle ON to highlight this entry at the top of the section.',
      initialValue: false,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first. Use this to control the order manually.',
      initialValue: 10,
    }),
  ],
  orderings: [
    {
      title: 'Featured First, then Date',
      name: 'featuredAndDate',
      by: [
        { field: 'isFeatured', direction: 'desc' },
        { field: 'displayOrder', direction: 'asc' },
        { field: 'date', direction: 'desc' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      type: 'type',
      publication: 'publication',
      media: 'logo',
    },
    prepare({ title, type, publication, media }) {
      const typeEmoji =
        type === 'press' ? '📰' : type === 'partnership' ? '🤝' : type === 'interview' ? '📺' : '🏅'
      return {
        title: `${typeEmoji} ${title}`,
        subtitle: publication,
        media,
      }
    },
  },
})
