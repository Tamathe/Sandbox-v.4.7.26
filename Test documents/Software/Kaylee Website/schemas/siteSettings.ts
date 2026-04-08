import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  // This icon appears next to the document in the studio
  icon: () => '⚙️',
  fields: [
    defineField({
      name: 'siteTitle',
      title: 'Site Title',
      type: 'string',
      description: 'The name shown in browser tabs and search results. Default: "Kaylee Daniel | UK Pole Vault"',
      initialValue: 'Kaylee Daniel | UK Pole Vault',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'siteDescription',
      title: 'Site Description',
      type: 'text',
      rows: 3,
      description:
        'A short blurb (150–160 characters) describing the site — shown in Google search results and when sharing links on social media.',
      initialValue:
        'University of Kentucky pole vaulter. Track & Field athlete, content creator, and NIL partner. Follow the journey.',
    }),
    defineField({
      name: 'ogImage',
      title: 'Social Share Image (OG Image)',
      type: 'image',
      description:
        'The image that appears when someone shares your site link on Instagram, Twitter, iMessage, etc. Recommended size: 1200 × 630 px.',
      options: { hotspot: true },
    }),

    // ── Social Media ──────────────────────────────────────────────────────────
    defineField({
      name: 'socialLinks',
      title: 'Social Media Links',
      type: 'object',
      description: 'Update your social handles here — they will automatically update everywhere on the site.',
      fields: [
        defineField({
          name: 'instagram',
          title: 'Instagram URL',
          type: 'url',
          description: 'Full URL to your Instagram profile, e.g. https://instagram.com/yourhandle',
        }),
        defineField({
          name: 'tiktok',
          title: 'TikTok URL',
          type: 'url',
          description: 'Full URL to your TikTok profile, e.g. https://tiktok.com/@yourhandle',
        }),
        defineField({
          name: 'twitter',
          title: 'Twitter / X URL',
          type: 'url',
          description: 'Full URL to your Twitter/X profile, e.g. https://x.com/yourhandle',
        }),
        defineField({
          name: 'youtube',
          title: 'YouTube URL',
          type: 'url',
          description: 'Full URL to your YouTube channel (if you have one)',
        }),
      ],
    }),

    defineField({
      name: 'contactEmail',
      title: 'Public Contact / NIL Inquiry Email',
      type: 'string',
      description:
        'Optional: an email address shown publicly for brand partnerships. Leave blank to use only the contact form.',
    }),
  ],
  preview: {
    select: { title: 'siteTitle' },
  },
})
