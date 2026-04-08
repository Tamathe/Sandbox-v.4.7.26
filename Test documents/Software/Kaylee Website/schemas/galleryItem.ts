import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'galleryItem',
  title: 'Gallery Item',
  type: 'document',
  icon: () => '📸',
  fields: [
    defineField({
      name: 'title',
      title: 'Title / Caption',
      type: 'string',
      description: 'A short label for this photo or video — shown on hover. E.g., "SEC Championships 2024" or "Training with Coach Ratliff".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      description: 'Is this a photo, a TikTok video, or a YouTube video?',
      options: {
        list: [
          { title: '📷 Photo (upload)', value: 'photo' },
          { title: '🎵 TikTok Video (link)', value: 'tiktok' },
          { title: '▶️ YouTube Video (link)', value: 'youtube' },
        ],
        layout: 'radio',
      },
      initialValue: 'photo',
      validation: (Rule) => Rule.required(),
    }),

    // Photo upload (shown when type = 'photo')
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      description:
        'Upload your photo here. High-resolution is fine — the site will automatically optimize it for fast loading.',
      options: { hotspot: true },
      hidden: ({ document }) => document?.type !== 'photo',
    }),

    // TikTok URL (shown when type = 'tiktok')
    defineField({
      name: 'tiktokUrl',
      title: 'TikTok Video URL',
      type: 'url',
      description:
        'Paste the full URL of your TikTok video, e.g. https://www.tiktok.com/@yourhandle/video/1234567890. The video will be embedded directly on the site.',
      hidden: ({ document }) => document?.type !== 'tiktok',
    }),

    // YouTube URL (shown when type = 'youtube')
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube Video URL',
      type: 'url',
      description:
        'Paste the full YouTube URL, e.g. https://www.youtube.com/watch?v=abcdefg. Works with regular and Shorts URLs.',
      hidden: ({ document }) => document?.type !== 'youtube',
    }),

    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'Used for the filter buttons on the gallery page.',
      options: {
        list: [
          { title: '🏟 Competition', value: 'competition' },
          { title: '💪 Training', value: 'training' },
          { title: '✨ Lifestyle / Off-Track', value: 'lifestyle' },
          { title: '🤝 Brand / NIL', value: 'nil' },
        ],
      },
      initialValue: 'competition',
    }),
    defineField({
      name: 'date',
      title: 'Date (optional)',
      type: 'date',
      description: 'The date this photo/video was taken. Used for sorting.',
      options: {
        dateFormat: 'MMMM YYYY',
      },
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured?',
      type: 'boolean',
      description: 'Toggle ON to pin this to the top of the gallery.',
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
      media: 'image',
      category: 'category',
    },
    prepare({ title, type, media, category }) {
      const typeEmoji = type === 'photo' ? '📷' : type === 'tiktok' ? '🎵' : '▶️'
      return {
        title: `${typeEmoji} ${title}`,
        subtitle: category,
        media,
      }
    },
  },
})
