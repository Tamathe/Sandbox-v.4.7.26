import { prisma } from './prisma'
import { sendEmail, escapeHtml } from './email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://thesandbox.uky.edu'
const MAX_RECIPIENTS = 100

/**
 * Send email notifications to enrolled students when course policies change.
 * Fire-and-forget — failures are logged but never thrown.
 */
export async function sendPolicyChangeEmails(
  courseId: string,
  courseCode: string,
  summary: string,
): Promise<void> {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId },
      select: {
        student: { select: { email: true, name: true } },
      },
      take: MAX_RECIPIENTS,
    })

    if (enrollments.length >= MAX_RECIPIENTS) {
      console.warn(
        `[policy-change-email] Course ${courseCode} has ${enrollments.length}+ enrolled students — capped at ${MAX_RECIPIENTS}`,
      )
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    })
    const courseTitle = course?.title ?? courseCode

    const reviewUrl = `${APP_URL}/courses?course=${courseId}&tab=policies`

    for (const { student } of enrollments) {
      if (!student.email) continue

      const html = policyChangeEmailHtml({
        studentName: student.name ?? 'Student',
        courseCode,
        courseTitle,
        summary,
        reviewUrl,
      })

      void sendEmail({
        to: student.email,
        subject: `[${courseCode}] Course Policies Updated`,
        html,
      })
    }
  } catch (err) {
    console.error('[policy-change-email] Failed to send notifications:', err)
  }
}

function policyChangeEmailHtml({
  studentName,
  courseCode,
  courseTitle,
  summary,
  reviewUrl,
}: {
  studentName: string
  courseCode: string
  courseTitle: string
  summary: string
  reviewUrl: string
}): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">${escapeHtml(courseCode)} — Policies Updated</h1>
        <p style="color:#93c5fd;margin:4px 0 0">${escapeHtml(courseTitle)}</p>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="font-size:14px;color:#374151;margin-top:0">Hi ${escapeHtml(studentName)},</p>
        <p style="font-size:14px;color:#374151">
          The course policies for <strong>${escapeHtml(courseCode)}</strong> have been updated.
          You'll need to review and acknowledge the changes.
        </p>
        <div style="margin:20px 0;padding:16px;background:#f9fafb;border-radius:6px;font-size:14px;color:#374151">
          <strong>What changed:</strong><br/>${escapeHtml(summary)}
        </div>
        <a href="${reviewUrl}" style="display:inline-block;background:#0033A0;color:white;font-weight:600;font-size:14px;text-decoration:none;padding:10px 24px;border-radius:8px">
          Review Policies
        </a>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">
          You're receiving this because you're enrolled in ${courseCode} on
          <a href="${APP_URL}" style="color:#0033A0">University of Kentucky</a>.
        </p>
      </div>
    </div>`
}
