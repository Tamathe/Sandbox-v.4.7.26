import type { Metadata } from 'next'
import './globals.css'
import { getSiteSettings } from '@/lib/queries'
import { urlFor } from '@/lib/sanity'
import { placeholderSettings } from '@/lib/placeholderData'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings().catch(() => null)
  const data = settings ?? placeholderSettings

  const ogImageUrl = data.ogImage
    ? urlFor(data.ogImage).width(1200).height(630).url()
    : undefined

  return {
    title: {
      default: data.siteTitle ?? 'Kaylee Daniel | UK Pole Vault',
      template: `%s | Kaylee Daniel`,
    },
    description: data.siteDescription,
    openGraph: {
      title: data.siteTitle,
      description: data.siteDescription ?? undefined,
      url: 'https://kayleedelta.com',
      siteName: data.siteTitle,
      images: ogImageUrl
        ? [{ url: ogImageUrl, width: 1200, height: 630, alt: data.siteTitle }]
        : [],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: data.siteTitle,
      description: data.siteDescription ?? undefined,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg-primary text-white font-body antialiased">
        {children}
      </body>
    </html>
  )
}
