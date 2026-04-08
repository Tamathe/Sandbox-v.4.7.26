import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { runDegreeAudit } from '../../../../lib/registrar/degree-audit'
import { sendEmail } from '../../../../lib/email'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const authError = verifyCronSecret(request)
  if (authError) return authError

  const graduationPetitions = await prisma.petition.findMany({
    where: { type: 'GRADUATION_APPLICATION', status: 'IN_REVIEW' },
    include: { student: true },
  })

  const results = { processed: 0, flaggedForReview: 0, errors: 0 }

  for (const petition of graduationPetitions) {
    try {
      const { student } = petition
      const sisId = student.sisStudentId ?? student.id
      const programCode = student.program ?? 'UNDECLARED'
      const catalogYear = student.catalogYear ?? '2024-2025'

      const auditPayload = await runDegreeAudit(sisId, programCode, catalogYear)

      if (auditPayload.programId === 'unknown' || auditPayload.humanReviewRequired || auditPayload.complexCaseFlag) {
        // Route to staff queue — never make autonomous graduation decisions
        await prisma.$transaction([
          prisma.petition.update({
            where: { id: petition.id },
            data: { status: 'IN_REVIEW' },
          }),
          prisma.petitionAuditEntry.create({
            data: {
              petitionId: petition.id,
              actorId: student.id,
              action: 'CRON_FLAGGED_FOR_REVIEW',
              note: `Graduation clearance cron flagged this petition for staff review. Confidence: ${auditPayload.confidenceScore ?? 'N/A'}.`,
            },
          }),
        ])
        results.flaggedForReview++
      } else {
        // Still route to staff — cron never approves, only pre-checks
        await prisma.petitionAuditEntry.create({
          data: {
            petitionId: petition.id,
            actorId: student.id,
            action: 'CRON_PRE_CHECK_PASSED',
            note: `Automated pre-check: ${auditPayload.percentComplete}% requirements satisfied. Awaiting staff final review.`,
          },
        })
        results.processed++
      }
    } catch {
      results.errors++
    }
  }

  // Send digest email to registrar
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://thesandbox.uky.edu'
  const recipient = process.env.REGISTRAR_NOTIFY_EMAIL ?? 'registrar@uky.edu'
  await sendEmail({
    to: recipient,
    subject: `Graduation Clearance Cron — ${graduationPetitions.length} petition${graduationPetitions.length === 1 ? '' : 's'} processed`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
        <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">Graduation Clearance Digest</h1>
          <p style="color:#93c5fd;margin:4px 0 0">Automated sweep completed</p>
        </div>
        <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p style="margin-top:0">The graduation clearance cron job has finished processing. Here is a summary:</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
            <tr style="background:#f9fafb">
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Total petitions reviewed</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${graduationPetitions.length}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Pre-check passed (awaiting staff review)</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${results.processed}</td>
            </tr>
            <tr style="background:#fef3c7">
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#92400e">Flagged for staff review</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#92400e">${results.flaggedForReview}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;color:#dc2626">Errors</td>
              <td style="padding:8px 12px;text-align:right;color:#dc2626">${results.errors}</td>
            </tr>
          </table>
          ${results.flaggedForReview > 0
            ? `<p style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:12px;font-size:14px;color:#92400e;margin-bottom:16px">
                ⚠️ <strong>${results.flaggedForReview} petition${results.flaggedForReview === 1 ? '' : 's'} need${results.flaggedForReview === 1 ? 's' : ''} your attention.</strong> Please review these in the petition queue before making final graduation decisions.
              </p>`
            : ''}
          <a href="${appUrl}/registrar/petitions"
             style="display:inline-block;background:#0033A0;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
            Open Petition Queue →
          </a>
          <p style="margin-top:24px;font-size:12px;color:#9ca3af">
            Sent automatically by the University of Kentucky graduation clearance cron · University of Kentucky Registrar
          </p>
        </div>
      </div>
    `,
  })

  return NextResponse.json({ ...results, total: graduationPetitions.length }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
