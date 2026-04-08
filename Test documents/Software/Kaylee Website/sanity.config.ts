import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'kaylee-daniel-athlete',
  title: 'Kaylee Daniel — Athlete Site',

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Singleton documents (only one of each)
            S.listItem()
              .title('🏠 Site Settings')
              .id('siteSettings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.listItem()
              .title('🎬 Hero Section')
              .id('hero')
              .child(S.document().schemaType('hero').documentId('hero')),
            S.listItem()
              .title('👩‍🏫 Bio / About')
              .id('bio')
              .child(S.document().schemaType('bio').documentId('bio')),
            S.divider(),
            // Multi-document lists
            S.listItem()
              .title('🏆 Personal Records (PRs)')
              .schemaType('stat')
              .child(S.documentTypeList('stat').title('Personal Records')),
            S.listItem()
              .title('📋 Meet Results')
              .schemaType('meetResult')
              .child(S.documentTypeList('meetResult').title('Meet Results')),
            S.listItem()
              .title('📸 Gallery (Photos & Videos)')
              .schemaType('galleryItem')
              .child(S.documentTypeList('galleryItem').title('Gallery Items')),
            S.listItem()
              .title('📰 Press & NIL / Sponsorships')
              .schemaType('pressEntry')
              .child(S.documentTypeList('pressEntry').title('Press & NIL Entries')),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
