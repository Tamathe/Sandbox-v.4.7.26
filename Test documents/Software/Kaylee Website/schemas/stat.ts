import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'stat',
  title: 'Personal Record (PR)',
  type: 'document',
  icon: () => '🏆',
  fields: [
    defineField({
      name: 'event',
      title: 'Event Name',
      type: 'string',
      description: 'The name of the event, e.g. "Pole Vault", "Long Jump", "100m Sprint"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'mark',
      title: 'Mark / Performance',
      type: 'string',
      description:
        'Your best result for this event — include the value and unit, e.g. "4.00m", "12\'11.5\\"", "10.85". This is the big number displayed on the site.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'markImperial',
      title: 'Mark (Imperial / Alternate)',
      type: 'string',
      description:
        'Optional: the same mark in the other measurement system. E.g. if mark is "4.00m" you might add "13\'1.5\\"" here.',
    }),
    defineField({
      name: 'venue',
      title: 'Venue / Meet',
      type: 'string',
      description: 'Where this PR was achieved, e.g. "SEC Championships, College Station TX"',
    }),
    defineField({
      name: 'date',
      title: 'Date Achieved',
      type: 'date',
      description: 'The date you set this PR.',
      options: {
        dateFormat: 'MMMM D, YYYY',
      },
    }),
    defineField({
      name: 'isIndoor',
      title: 'Indoor PR?',
      type: 'boolean',
      description: 'Toggle ON if this is an indoor PR. Toggle OFF for outdoor.',
      initialValue: false,
    }),
    defineField({
      name: 'isPrimary',
      title: 'Primary / Featured PR?',
      type: 'boolean',
      description:
        'Toggle ON to feature this stat in the "spotlight" card on the stats page. Use for your best or most important result.',
      initialValue: false,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description:
        'Controls the order PRs appear on the site. Lower numbers appear first. E.g., 1 = shown first, 2 = second.',
      initialValue: 10,
    }),
    defineField({
      name: 'note',
      title: 'Note (optional)',
      type: 'string',
      description:
        'A short note about this PR — e.g., "NCAA qualifier standard", "Wind-aided", "All-time UK record". Shown as a badge.',
    }),
  ],
  orderings: [
    {
      title: 'Display Order',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
    {
      title: 'Date (Newest First)',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      event: 'event',
      mark: 'mark',
      isIndoor: 'isIndoor',
      isPrimary: 'isPrimary',
    },
    prepare({ event, mark, isIndoor, isPrimary }) {
      const badges = [isIndoor ? '🏟 Indoor' : '☀️ Outdoor', isPrimary ? '⭐ Featured' : ''].filter(Boolean)
      return {
        title: `${event} — ${mark}`,
        subtitle: badges.join(' · '),
      }
    },
  },
})
