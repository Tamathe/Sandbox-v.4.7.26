/**
 * Seed script for Kaylee Daniel personal site demo.
 * Run: npx tsx scripts/seed-personal-site.ts
 */
import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Find or create demo user (Tiana = student)
  const user = await prisma.user.findUnique({ where: { email: 'tiana.the.student@uky.edu' } })
  if (!user) {
    console.error('Demo user tiana.the.student@uky.edu not found. Run main seed first.')
    process.exit(1)
  }

  const slug = 'kaylee-daniel'

  // Delete existing site if re-running
  const existing = await prisma.personalSite.findUnique({ where: { slug } })
  if (existing) {
    await prisma.personalSite.delete({ where: { slug } })
    console.log('Deleted existing personal site:', slug)
  }

  const site = await prisma.personalSite.create({
    data: {
      userId: user.id,
      slug,
      published: true,
      siteTitle: 'Kaylee Daniel | UK Pole Vault',
      siteDescription: 'University of Kentucky pole vaulter. Transferred from Houston. Track & Field athlete, content creator, and NIL partner. Follow the journey.',
      firstName: 'Kaylee',
      lastName: 'Daniel',
      contactEmail: 'kaylee.daniel@uky.edu',
      socialLinks: {
        instagram: 'https://instagram.com',
        tiktok: 'https://tiktok.com',
        twitter: 'https://x.com',
      },
      heroTagline: 'Pole Vault · University of Kentucky',
      heroSubTagline: '2025–26 Season · Sophomore',
      heroCtaText: 'See My Stats',
      heroCtaLink: '#stats',
      heroAccentStat: '4.15m Indoor PR',
      bioHeadline: 'Built for Height',
      bioText: "A Division I track & field athlete competing for the University of Kentucky Wildcats, Kaylee Daniel is a two-time Nevada state pole vault champion out of Liberty High School in Las Vegas. After a standout freshman season at the University of Houston — where she posted a 4.01m outdoor PR — she transferred to Kentucky for the 2025–26 season and immediately hit a collegiate indoor PR of 4.15m.\n\nNow in her sophomore year, Kaylee balances a full academic schedule in Clinical Leadership Management with the demands of elite SEC athletics, driven by one goal: reaching her ceiling and going beyond it.",
      bioQuote: '"The bar is just the beginning."',
      bioQuickFacts: {
        hometown: 'Las Vegas, NV',
        year: 'Sophomore',
        major: 'Clinical Leadership Management',
        height: "5'8\"",
        yearsAtUK: '1st Year at UK',
      },
      accentColor: '#00D4FF',
      secondaryColor: '#0033A0',
    },
  })

  console.log('Created personal site:', site.slug)

  // ── Stats ──────────────────────────────────────────────────────────
  await prisma.personalSiteStat.createMany({
    data: [
      {
        siteId: site.id,
        event: 'Pole Vault (Indoor)',
        mark: '4.15m',
        markImperial: "13'7.25\"",
        venue: 'Razorback Invitational, Fayetteville AR',
        date: new Date('2026-01-31'),
        isIndoor: true,
        isPrimary: true,
        displayOrder: 1,
        note: 'Indoor PR · Collegiate Personal Best',
      },
      {
        siteId: site.id,
        event: 'Pole Vault (Outdoor)',
        mark: '4.01m',
        markImperial: "13'1.75\"",
        venue: 'Texas A&M 44 Farms Team Invitational, College Station TX',
        date: new Date('2025-04-12'),
        isIndoor: false,
        isPrimary: false,
        displayOrder: 2,
        note: 'Outdoor PR',
      },
      {
        siteId: site.id,
        event: 'Pole Vault (Indoor)',
        mark: '3.95m',
        markImperial: "12'11.5\"",
        venue: 'Commodore Winter Challenge, Nashville TN',
        date: new Date('2025-12-06'),
        isIndoor: true,
        isPrimary: false,
        displayOrder: 3,
        note: 'UK season debut',
      },
    ],
  })
  console.log('Seeded 3 stats')

  // ── Meet Results ───────────────────────────────────────────────────
  const meetResults = [
    { meetName: 'Razorback Invitational', date: '2026-01-31', location: 'Fayetteville, AR', event: 'Pole Vault', mark: '4.15m', place: 5, isIndoor: true, season: '2025-26-indoor', isHighlight: true, notes: "Collegiate Indoor PR — 13'7.25\"" },
    { meetName: 'Crossroads of America Invitational', date: '2026-01-24', location: 'Indianapolis, IN', event: 'Pole Vault', mark: '3.87m', place: 9, isIndoor: true, season: '2025-26-indoor', isHighlight: false },
    { meetName: 'Rod McCravy Memorial', date: '2026-01-10', location: 'Lexington, KY', event: 'Pole Vault', mark: 'NH', isIndoor: true, season: '2025-26-indoor', isHighlight: false },
    { meetName: 'Commodore Winter Challenge', date: '2025-12-06', location: 'Nashville, TN', event: 'Pole Vault', mark: '3.95m', place: 4, isIndoor: true, season: '2025-26-indoor', isHighlight: false, notes: 'UK season debut' },
    { meetName: 'Big 12 Outdoor Championships', date: '2025-05-17', location: 'Lubbock, TX', event: 'Pole Vault', mark: '3.76m', place: 18, isIndoor: false, season: '2024-25-outdoor', isHighlight: false },
    { meetName: 'Cameron Burrell Invitational', date: '2025-05-02', location: 'Houston, TX', event: 'Pole Vault', mark: '4.00m', place: 3, isIndoor: false, season: '2024-25-outdoor', isHighlight: false },
    { meetName: '2025 Texas Invitational', date: '2025-04-25', location: 'Austin, TX', event: 'Pole Vault', mark: '4.00m', place: 2, isIndoor: false, season: '2024-25-outdoor', isHighlight: false },
    { meetName: 'Texas A&M 44 Farms Team Invitational', date: '2025-04-12', location: 'College Station, TX', event: 'Pole Vault', mark: '4.01m', place: 5, isIndoor: false, season: '2024-25-outdoor', isHighlight: true, notes: "Outdoor PR — 13'1.75\"" },
    { meetName: 'Tom Tellez Alumni Invitational', date: '2025-04-05', location: 'Houston, TX', event: 'Pole Vault', mark: '3.88m', place: 3, isIndoor: false, season: '2024-25-outdoor', isHighlight: false },
    { meetName: '42nd Victor Lopez Classic', date: '2025-03-29', location: 'El Paso, TX', event: 'Pole Vault', mark: '3.74m', place: 2, isIndoor: false, season: '2024-25-outdoor', isHighlight: false },
    { meetName: 'Kirk Baptiste Invitational', date: '2025-03-20', location: 'Dallas, TX', event: 'Pole Vault', mark: '3.72m', place: 5, isIndoor: false, season: '2024-25-outdoor', isHighlight: false },
    { meetName: 'Big 12 Indoor Championships', date: '2025-03-01', location: 'Lubbock, TX', event: 'Pole Vault', mark: '3.86m', place: 15, isIndoor: true, season: '2024-25-indoor', isHighlight: false },
    { meetName: 'Howie Ryan Invitational', date: '2025-02-14', location: 'Houston, TX', event: 'Pole Vault', mark: '3.82m', place: 3, isIndoor: true, season: '2024-25-indoor', isHighlight: false },
    { meetName: 'Texas A&M Charlie Thomas Invitational', date: '2025-02-08', location: 'College Station, TX', event: 'Pole Vault', mark: '3.85m', place: 5, isIndoor: true, season: '2024-25-indoor', isHighlight: false },
    { meetName: 'Robert Platt Invitational', date: '2025-02-01', location: 'Houston, TX', event: 'Pole Vault', mark: '3.87m', place: 2, isIndoor: true, season: '2024-25-indoor', isHighlight: false },
    { meetName: 'Texas A&M Ted Nelson Invitational', date: '2025-01-25', location: 'College Station, TX', event: 'Pole Vault', mark: '3.93m', place: 3, isIndoor: true, season: '2024-25-indoor', isHighlight: false, notes: 'Houston indoor PR' },
    { meetName: 'Leonard Hilton Memorial Invitational', date: '2025-01-10', location: 'Houston, TX', event: 'Pole Vault', mark: '3.85m', place: 2, isIndoor: true, season: '2024-25-indoor', isHighlight: false, notes: 'Collegiate debut' },
  ]

  await prisma.personalSiteMeetResult.createMany({
    data: meetResults.map((m) => ({
      siteId: site.id,
      meetName: m.meetName,
      date: new Date(m.date),
      location: m.location,
      event: m.event,
      mark: m.mark,
      place: m.place ?? null,
      isIndoor: m.isIndoor,
      season: m.season,
      isHighlight: m.isHighlight,
      notes: m.notes ?? null,
    })),
  })
  console.log(`Seeded ${meetResults.length} meet results`)

  // ── Gallery Items ──────────────────────────────────────────────────
  await prisma.personalSiteGalleryItem.createMany({
    data: [
      { siteId: site.id, title: 'Razorback Invitational 2026 — Fayetteville, AR', type: 'photo', imageUrl: 'https://picsum.photos/seed/kaylee-comp1/600/800', category: 'competition', date: new Date('2026-01-31'), isFeatured: true, displayOrder: 1 },
      { siteId: site.id, title: 'Morning training at the UK Track Facility', type: 'photo', imageUrl: 'https://picsum.photos/seed/kaylee-train1/800/600', category: 'training', date: new Date('2025-12-01'), isFeatured: false, displayOrder: 2 },
      { siteId: site.id, title: 'Crossroads of America — Indianapolis', type: 'photo', imageUrl: 'https://picsum.photos/seed/kaylee-comp2/600/900', category: 'competition', date: new Date('2026-01-24'), isFeatured: false, displayOrder: 3 },
      { siteId: site.id, title: 'Vault technique breakdown', type: 'tiktok', tiktokUrl: 'https://www.tiktok.com/@kayleekd/video/7349123456789', category: 'training', date: new Date('2025-11-20'), isFeatured: false, displayOrder: 4 },
      { siteId: site.id, title: 'Day in my life — UK athlete edition', type: 'photo', imageUrl: 'https://picsum.photos/seed/kaylee-life1/500/700', category: 'lifestyle', date: new Date('2026-01-15'), isFeatured: false, displayOrder: 5 },
      { siteId: site.id, title: 'Liberty High School throwback — Las Vegas, NV', type: 'photo', imageUrl: 'https://picsum.photos/seed/kaylee-life2/800/800', category: 'lifestyle', date: new Date('2024-06-01'), isFeatured: false, displayOrder: 6 },
    ],
  })
  console.log('Seeded 6 gallery items')

  // ── Press Entries ──────────────────────────────────────────────────
  await prisma.personalSitePressEntry.createMany({
    data: [
      { siteId: site.id, title: 'Kaylee Daniel Sets Collegiate Indoor PR of 4.15m at Razorback Invitational', type: 'press', publication: 'UK Athletics', date: new Date('2026-02-01'), description: "Transfer pole vaulter Kaylee Daniel cleared 4.15m (13'7.25\") at the Razorback Invitational in Fayetteville, setting a new collegiate indoor personal best in her first SEC season at Kentucky.", url: 'https://ukathletics.com', isFeatured: true, displayOrder: 1 },
      { siteId: site.id, title: 'Transfer Profile: Kaylee Daniel Brings Big 12 Experience to UK Vaulting', type: 'interview', publication: 'Kentucky Kernel', date: new Date('2025-10-01'), description: 'Las Vegas native Kaylee Daniel talks about her transfer from Houston to Kentucky, the leap from the Big 12 to the SEC, and her goals for the 2025–26 season.', url: 'https://kykernel.com', isFeatured: true, displayOrder: 2 },
      { siteId: site.id, title: 'NIL Partnership Announcement', type: 'partnership', publication: 'Brand Partner', date: new Date('2025-09-01'), description: 'Excited to announce a new NIL partnership. Building my brand on and off the track — more details coming soon.', isFeatured: false, displayOrder: 3 },
      { siteId: site.id, title: 'Daniel Posts Outdoor PR of 4.01m at Texas A&M Invitational', type: 'press', publication: 'UH Athletics', date: new Date('2025-04-13'), description: "Freshman pole vaulter Kaylee Daniel cleared 4.01m (13'1.75\") at the Texas A&M 44 Farms Team Invitational, setting a new outdoor personal record in her debut collegiate season with the Houston Cougars.", url: 'https://uhcougars.com', isFeatured: false, displayOrder: 4 },
      { siteId: site.id, title: 'Two-Time Nevada State Champion Heads to Houston', type: 'press', publication: 'Las Vegas Review-Journal', date: new Date('2024-07-01'), description: "Liberty High School's Kaylee Daniel, a two-time Nevada NIAA pole vault state champion and First Team All-Southern Nevada honoree, signs with the University of Houston to continue her track career.", url: 'https://reviewjournal.com', isFeatured: false, displayOrder: 5 },
    ],
  })
  console.log('Seeded 5 press entries')

  console.log('\n✅ Personal site seeded successfully!')
  console.log(`   View at: /site/${slug}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
