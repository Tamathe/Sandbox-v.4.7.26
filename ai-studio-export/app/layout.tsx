import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from './components/ClientProviders'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'The Core | CATS-AI',
  description:
    'The Core is the AI-powered learning operating system for the University of Kentucky — built by CATS-AI for students, educators, and staff.',
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
