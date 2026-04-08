import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/app/lib/api-utils'
import { parseRequestBody } from '@/app/lib/server-auth'
import { prisma } from '@/app/lib/prisma'

interface ContactPayload {
  slug: string
  inquiryType: string
  name: string
  email: string
  company?: string
  message: string
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const parsed = await parseRequestBody<ContactPayload>(req)
  if ('error' in parsed) return parsed.error

  const { slug, inquiryType, name, email, company, message } = parsed.data

  if (!slug || !name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const site = await prisma.personalSite.findUnique({ where: { slug }, select: { id: true } })
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  await prisma.personalSiteInquiry.create({
    data: {
      siteId: site.id,
      inquiryType: inquiryType || 'general',
      name,
      email,
      company: company || null,
      message,
    },
  })

  return NextResponse.json({ success: true })
})
