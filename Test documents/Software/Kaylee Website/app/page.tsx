import { getAllPageData } from '@/lib/queries'
import {
  placeholderHero,
  placeholderBio,
  placeholderStats,
  placeholderMeetResults,
  placeholderGallery,
  placeholderPress,
  placeholderSettings,
} from '@/lib/placeholderData'
import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import Bio from '@/components/Bio'
import Stats from '@/components/Stats'
import Gallery from '@/components/Gallery'
import Press from '@/components/Press'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'

export default async function Home() {
  // Fetch all data from Sanity — fall back to placeholder data if Sanity isn't configured yet
  const { settings, hero, bio, stats, meetResults, gallery, press } =
    await getAllPageData().catch(() => ({
      settings: null,
      hero: null,
      bio: null,
      stats: [],
      meetResults: [],
      gallery: [],
      press: [],
    }))

  const heroData = hero ?? placeholderHero
  const bioData = bio ?? placeholderBio
  const statsData = stats.length > 0 ? stats : placeholderStats
  const meetData = meetResults.length > 0 ? meetResults : placeholderMeetResults
  const galleryData = gallery.length > 0 ? gallery : placeholderGallery
  const pressData = press.length > 0 ? press : placeholderPress
  const settingsData = settings ?? placeholderSettings

  return (
    <>
      <Nav socialLinks={settingsData.socialLinks} />
      <main>
        <Hero data={heroData} />
        <Bio data={bioData} />
        <Stats stats={statsData} meetResults={meetData} />
        <Gallery items={galleryData} />
        <Press entries={pressData} />
        <Contact contactEmail={settingsData.contactEmail} />
      </main>
      <Footer socialLinks={settingsData.socialLinks} siteTitle={settingsData.siteTitle} />
    </>
  )
}
