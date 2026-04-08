import { prisma } from './prisma'
import { sendEmail } from './email'

const DAY_MS = 86_400_000

// ── Get educators needing FERPA training ────────────────────────────────────

export async function getEducatorsNeedingFerpaTraining() {
  const oneYearAgo = new Date(Date.now() - 365 * DAY_MS)

  const users = await prisma.user.findMany({
    where: {
      role: { in: ['EDUCATOR', 'ADMIN'] },
      suspended: false,
      OR: [
        { ferpaAckAt: null },
        { ferpaAckAt: { lte: oneYearAgo } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      ferpaAckAt: true,
      ferpaTrainingReminders: {
        orderBy: { sentAt: 'desc' as const },
        take: 1,
        select: { sentAt: true },
      },
    },
  })

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    ferpaAckAt: u.ferpaAckAt,
    lastRemindedAt: u.ferpaTrainingReminders[0]?.sentAt ?? null,
  }))
}

// ── Send a single FERPA reminder ────────────────────────────────────────────

export async function sendFerpaReminder(userId: string, method: 'email' | 'manual-blast') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  if (!user) return null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://thesandbox.uky.edu'
  await sendEmail({
    to: user.email,
    subject: 'FERPA Training Required — University of Kentucky',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
        <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">FERPA Training Required</h1>
          <p style="color:#93c5fd;margin:4px 0 0">University of Kentucky</p>
        </div>
        <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p>Hi ${user.name},</p>
          <p>Your FERPA training acknowledgement on the University of Kentucky platform is either missing or expired. As an educator or administrator, you are required to complete FERPA training to maintain access to student data.</p>
          <p>Please visit <a href="${appUrl}/ferpa-training" style="color:#0033A0;font-weight:600">University of Kentucky FERPA Training</a> to complete the quiz.</p>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px">
            This is an automated reminder from the University of Kentucky compliance system.
          </p>
        </div>
      </div>`,
  })

  const reminder = await prisma.ferpaTrainingReminder.create({
    data: { userId, method },
  })

  return reminder
}

// ── Send bulk FERPA reminders (skip recently reminded) ──────────────────────

export async function sendBulkFerpaReminders() {
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS)
  const educators = await getEducatorsNeedingFerpaTraining()

  let sent = 0
  let skipped = 0

  for (const edu of educators) {
    // Skip if reminded within last 7 days
    if (edu.lastRemindedAt && edu.lastRemindedAt.getTime() > sevenDaysAgo.getTime()) {
      skipped++
      continue
    }

    await sendFerpaReminder(edu.id, 'manual-blast')
    sent++
  }

  return { sent, skipped, total: educators.length }
}
