import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'meetResult',
  title: 'Meet Result',
  type: 'document',
  icon: () => '📋',
  fields: [
    defineField({
      name: 'meetName',
      title: 'Meet Name',
      type: 'string',
      description: 'Official name of the track meet, e.g. "SEC Indoor Championships" or "UK Opener".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      description: 'The date the competition took place.',
      validation: (Rule) => Rule.required(),
      options: {
        dateFormat: 'MMMM D, YYYY',
      },
    }),
    defineField({
      name: 'location',
      title: 'Location (City, State or Venue)',
      type: 'string',
      description: 'E.g., "Lexington, KY" or "Rupp Arena, Lexington KY"',
    }),
    defineField({
      name: 'event',
      title: 'Event',
      type: 'string',
      description: 'The specific event, e.g. "Pole Vault", "100m Hurdles"',
      initialValue: 'Pole Vault',
    }),
    defineField({
      name: 'mark',
      title: 'Mark / Result',
      type: 'string',
      description:
        'Your result in this meet, e.g. "3.95m", "NH" (No Height), "DNS" (Did Not Start), "DNF" (Did Not Finish).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'place',
      title: 'Place / Finish',
      type: 'number',
      description:
        'Where you finished — enter a number, e.g. 1 for 1st, 3 for 3rd. Leave blank if not applicable (e.g., prelims only).',
    }),
    defineField({
      name: 'isIndoor',
      title: 'Indoor Meet?',
      type: 'boolean',
      description: 'Toggle ON for indoor meets, OFF for outdoor meets.',
      initialValue: false,
    }),
    defineField({
      name: 'season',
      title: 'Season',
      type: 'string',
      description:
        'The season this meet belongs to, e.g. "2024–25 Indoor", "2024 Outdoor". Used to filter results on the site.',
      options: {
        list: [
          { title: '2024–25 Indoor', value: '2024-25-indoor' },
          { title: '2024 Outdoor', value: '2024-outdoor' },
          { title: '2023–24 Indoor', value: '2023-24-indoor' },
          { title: '2023 Outdoor', value: '2023-outdoor' },
          { title: '2022–23 Indoor', value: '2022-23-indoor' },
          { title: '2022 Outdoor', value: '2022-outdoor' },
        ],
      },
    }),
    defineField({
      name: 'isHighlight',
      title: 'Highlight Result?',
      type: 'boolean',
      description: 'Toggle ON to mark this as a notable result (it will be visually highlighted on the site).',
      initialValue: false,
    }),
    defineField({
      name: 'notes',
      title: 'Notes (optional)',
      type: 'string',
      description:
        'Any extra context — e.g., "NCAA qualifier", "Personal Record", "First collegiate win", "Competed through injury".',
    }),
  ],
  orderings: [
    {
      title: 'Date (Newest First)',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
    {
      title: 'Season',
      name: 'seasonAsc',
      by: [{ field: 'season', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      meetName: 'meetName',
      mark: 'mark',
      date: 'date',
      place: 'place',
    },
    prepare({ meetName, mark, date, place }) {
      const placeStr = place ? `${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}` : ''
      return {
        title: meetName,
        subtitle: [mark, placeStr, date].filter(Boolean).join(' · '),
      }
    },
  },
})
