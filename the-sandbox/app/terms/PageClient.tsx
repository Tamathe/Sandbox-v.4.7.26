'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { CheckCircle2, Loader2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useComplianceStatus } from '../hooks/useComplianceStatus'

const TOS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using the University of Kentucky platform ("the Platform"), you agree to be bound by these Terms of Service. The Platform is operated by CATS-AI (Center for AI Teaching & Learning) at the University of Kentucky. If you do not agree to these terms, you may not use the Platform.

These terms apply to all users, including students, educators, administrators, and registrar staff. Your continued use of the Platform constitutes acceptance of any updated terms.`,
  },
  {
    title: '2. Eligibility and Accounts',
    content: `The Platform is available to members of the University of Kentucky community with a valid @uky.edu email address. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.

You agree to provide accurate information during onboarding and to update your profile if your role, department, or affiliation changes. Impersonating another user or misrepresenting your role is a violation of these terms and may result in account suspension.`,
  },
  {
    title: '3. Acceptable Use',
    content: `You may use the Platform for educational purposes consistent with the University of Kentucky's academic mission. Specifically, you agree NOT to:

• Submit content that violates university policy, including the Student Code of Conduct and the Administrative Regulations governing employee conduct.
• Attempt to extract, reverse-engineer, or circumvent AI safety guardrails built into platform tools.
• Use AI-generated content from the Platform to fulfill academic requirements without proper attribution and disclosure, as required by your instructor's syllabus.
• Upload sensitive personal information (Social Security numbers, financial account numbers, health records) into any tool chat interface.
• Use platform tools to generate content that is harassing, threatening, discriminatory, or otherwise harmful.
• Attempt to access another user's data, sessions, or account without authorization.`,
  },
  {
    title: '4. AI-Powered Tools',
    content: `The Platform uses AI models (Anthropic Claude) to power interactive learning tools. You acknowledge that:

• AI-generated responses may contain errors, omissions, or inaccuracies. You should not rely on AI output as authoritative without independent verification.
• AI-generated grades and feedback are advisory drafts that require human faculty review before they become part of your academic record.
• The Platform's AI does not provide professional advice (legal, medical, financial, or psychological). Tools that touch on these domains include explicit disclaimers and direct you to appropriate university resources.
• Interaction data is processed by Anthropic's API under a zero-retention agreement — your messages are not stored by Anthropic after processing and are not used to train AI models.`,
  },
  {
    title: '5. Intellectual Property',
    content: `• Content you create on the Platform (tool configurations, system prompts, playground apps, portfolio items) remains your intellectual property.
• By publishing a tool to the marketplace, you grant the University of Kentucky a non-exclusive, royalty-free license to make that tool available to other platform users for educational purposes.
• You may remove your published tools at any time, which revokes the license going forward. Existing session data from prior use is retained per the Data Retention policy.
• The Platform's source code, design, and branding are the property of CATS-AI and the University of Kentucky.`,
  },
  {
    title: '6. Academic Integrity',
    content: `The Platform is designed to support learning, not to replace it. You are expected to use AI tools in accordance with your instructor's academic integrity policies.

• The Platform includes AI-powered safeguards ("Scaffold, Don't Solve") that guide you through problems rather than providing direct answers.
• Session transcripts may be reviewed by your instructor for academic integrity purposes when linked to graded assignments.
• The Platform logs session quality signals that distinguish productive learning interactions from attempts to extract answers.

Violations of academic integrity policies are handled through the University's established processes, not by the Platform.`,
  },
  {
    title: '7. Data and Privacy',
    content: `Your use of the Platform is governed by our Privacy Policy, available at /privacy. Key points:

• Your interaction data is stored securely and never sold or shared with third parties.
• The Platform complies with FERPA (Family Educational Rights and Privacy Act) for all student educational records.
• You may request access to, correction of, or deletion of your data at any time.
• Session transcripts are retained for 90 days; aggregated metadata is retained for the duration of your enrollment.

For full details, please review the Privacy Policy.`,
  },
  {
    title: '8. Service Availability',
    content: `The Platform is provided on an "as-is" basis. CATS-AI makes reasonable efforts to maintain uptime but does not guarantee uninterrupted service. The Platform may be temporarily unavailable for maintenance, updates, or due to circumstances beyond our control.

CATS-AI reserves the right to modify, suspend, or discontinue any feature of the Platform with reasonable notice. Critical changes affecting graded work or academic records will be communicated with at least 14 days notice.`,
  },
  {
    title: '9. Account Suspension and Termination',
    content: `CATS-AI may suspend or terminate your account if you violate these Terms of Service, the University's policies, or applicable law. Suspension decisions are logged in the Platform's audit trail and may be appealed through the platform administrator.

Upon termination, your account data will be retained for 30 days to allow data export, then permanently deleted unless a legal hold applies.`,
  },
  {
    title: '10. Limitation of Liability',
    content: `To the fullest extent permitted by law, CATS-AI and the University of Kentucky shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform, including but not limited to: inaccurate AI-generated content, lost data, academic consequences of relying on AI output, or service interruptions.

The Platform is an educational tool, not a substitute for professional judgment. You assume responsibility for how you use AI-generated content in your academic work.`,
  },
  {
    title: '11. Changes to Terms',
    content: `CATS-AI reserves the right to update these Terms of Service. Material changes will be communicated via platform announcement banner and email notification. Continued use of the Platform after the effective date of changes constitutes acceptance.

If you disagree with updated terms, you may discontinue use and request account deletion.`,
  },
  {
    title: '12. Governing Law',
    content: `These Terms of Service are governed by the laws of the Commonwealth of Kentucky and applicable federal law, including FERPA. Any disputes shall be resolved through the University of Kentucky's established dispute resolution processes.`,
  },
]

export default function TermsPage() {
  const router = useRouter()
  const { tosAccepted, tosAcceptedAt, loading, recordAcceptance } = useComplianceStatus()
  const [checked, setChecked] = useState(false)
  const [accepting, setAccepting] = useState(false)

  async function handleAccept() {
    setAccepting(true)
    await recordAcceptance('accept-tos')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PageHeader
        title="Terms of Service"
        subtitle="Governing your use of the University of Kentucky platform"
        action={
          !loading && tosAccepted && tosAcceptedAt ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                Accepted on {format(new Date(tosAcceptedAt), 'MMMM d, yyyy')}
              </span>
            </div>
          ) : undefined
        }
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <p className="text-sm text-gray-500">
          Last updated: March 21, 2026 · University of Kentucky · CATS-AI
        </p>
        {TOS_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="border-2 border-gray-200 rounded-2xl bg-white p-6"
          >
            <h2 className="text-lg font-extrabold text-gray-900 mb-3">{section.title}</h2>
            <div className="text-sm text-gray-700 leading-relaxed">
              {section.content.split('\n').map((line, i) => {
                const trimmed = line.trim()
                if (!trimmed) return <br key={i} />
                return (
                  <p key={i} className={trimmed.startsWith('•') ? 'ml-4' : ''}>
                    {trimmed}
                  </p>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {!loading && !tosAccepted && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-gray-200 shadow-lg z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="size-5 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
              />
              <span className="text-sm font-medium text-gray-700">
                I have read and agree to the Terms of Service
              </span>
            </label>
            <button
              disabled={!checked || accepting}
              onClick={handleAccept}
              className="px-6 py-2.5 bg-[#0033A0] text-white text-sm font-semibold rounded-lg hover:bg-[#002880] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {accepting && <Loader2 className="size-4 animate-spin" />}
              Accept &amp; Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
