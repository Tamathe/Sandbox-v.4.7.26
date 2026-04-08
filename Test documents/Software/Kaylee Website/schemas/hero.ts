import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'hero',
  title: 'Hero Section',
  type: 'document',
  icon: () => '🎬',
  fields: [
    defineField({
      name: 'firstName',
      title: 'First Name',
      type: 'string',
      description: 'Displayed as the large first line of the hero (e.g., "KAYLEE"). All caps is applied automatically.',
      initialValue: 'Kaylee',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
      description: 'Displayed as the second large line of the hero (e.g., "DANIEL").',
      initialValue: 'Daniel',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline / Sport & School',
      type: 'string',
      description:
        'The small text below your name. Keep it short and punchy, e.g. "Pole Vault · University of Kentucky"',
      initialValue: 'Pole Vault · University of Kentucky',
    }),
    defineField({
      name: 'subTagline',
      title: 'Sub-tagline (optional)',
      type: 'string',
      description:
        'An extra line for season, year, or motto — shown below the tagline in smaller text. E.g., "2024–25 Season · Junior"',
      initialValue: '2024–25 Season · Junior',
    }),
    defineField({
      name: 'backgroundImage',
      title: 'Background / Hero Image',
      type: 'image',
      description:
        'Full-screen background image. Use a high-quality action shot. Portrait orientation works best on mobile. The image will have a dark overlay applied automatically.',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'backgroundVideoUrl',
      title: 'Background Video URL (optional)',
      type: 'url',
      description:
        'If you want a looping video background instead of an image, paste the direct .mp4 URL here. Note: this can slow page load — a great image is usually better.',
    }),
    defineField({
      name: 'ctaText',
      title: 'Button Text',
      type: 'string',
      description: 'Text for the hero call-to-action button, e.g. "See My Stats" or "Work With Me"',
      initialValue: 'See My Stats',
    }),
    defineField({
      name: 'ctaLink',
      title: 'Button Link',
      type: 'string',
      description: 'Where the button should scroll to. Use a section ID like "#stats" or "#contact"',
      initialValue: '#stats',
    }),
    defineField({
      name: 'accentStat',
      title: 'Hero Accent Stat',
      type: 'string',
      description:
        'A single standout stat shown as a badge on the hero — e.g., "4.00m PR" or "NCAA Qualifier". Keep it short.',
      initialValue: '4.00m PR',
    }),
  ],
  preview: {
    select: { firstName: 'firstName', lastName: 'lastName', media: 'backgroundImage' },
    prepare({ firstName, lastName, media }) {
      return { title: `Hero: ${firstName} ${lastName}`, media }
    },
  },
})
