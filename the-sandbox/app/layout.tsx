import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from './components/ClientProviders'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'The Sandbox | CATS-AI',
  description:
    'Discover AI-powered learning tools developed by CATS-AI for University of Kentucky educators and students. Explore, launch, and share innovative AI experiences.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
