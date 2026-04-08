'use client'

import PageHeader from '../components/PageHeader'
import { Shield, Eye, Ban, Clock, UserCheck, GraduationCap, Mail } from 'lucide-react'

const sections = [
  {
    icon: Shield,
    title: 'What We Collect',
    content: `The University of Kentucky platform collects the following data when you use the platform:

• **Account information** — your name, university email address, role (student, educator, or administrator), department, and college affiliation as provided during onboarding or imported from university directory services.

• **Interaction data** — messages you send to AI-powered tools, session timestamps, session duration, and tool usage patterns. This data is used to provide personalized learning recommendations and to measure tool effectiveness.

• **Academic context** — course enrollments, learning objective progress, assignment submissions, and grades (when integrated with your institution's LMS via LTI 1.3).

• **AI-generated metadata** — session quality scores, concept mastery estimates, and learning velocity signals computed by the platform's AI models to support your learning journey.

All data is stored in a PostgreSQL database hosted by Neon (neon.tech) within the United States. Data in transit is encrypted via TLS 1.3. Data at rest is encrypted using AES-256.`,
  },
  {
    icon: Eye,
    title: 'Who Sees Your Data',
    content: `Access to your data is role-gated and follows the principle of least privilege:

• **You** — can view all of your own interaction data, session history, grades, and portfolio items.

• **Your instructors** — can view your progress on learning objectives, assignment submissions, and aggregated session data for courses they teach. Instructors cannot see your interactions with tools outside their courses.

• **Platform administrators** — can view aggregated, de-identified platform analytics. Individually identifiable data is accessible only when required for account support or academic integrity investigations.

• **AI models (Anthropic Claude)** — process your messages in real time to generate responses. Anthropic does not retain your data after processing and does not use it to train models. See "What We Don't Do" below.

• **No third parties** — your data is never sold, licensed, or shared with advertisers, data brokers, or any entity outside the University of Kentucky's educational mission.`,
  },
  {
    icon: Ban,
    title: "What We Don't Do",
    content: `The University of Kentucky platform is committed to the following prohibitions:

• **No external model training** — your interactions are never used to train, fine-tune, or improve AI models operated by Anthropic or any other provider. The Anthropic API terms explicitly prohibit using input/output data for model training.

• **No behavioral advertising** — we do not build advertising profiles, serve targeted ads, or share data with advertising networks.

• **No cross-institutional data sharing** — your data stays within the University of Kentucky's platform. It is never aggregated with data from other institutions.

• **No automated decision-making with legal effect** — AI-generated scores and recommendations are advisory only. All consequential academic decisions (grades, degree audits, petitions) require human review and approval by authorized university personnel.

• **No biometric data collection** — the University of Kentucky platform does not collect facial recognition data, fingerprints, voice prints, or any biometric identifiers.`,
  },
  {
    icon: Clock,
    title: 'Data Retention',
    content: `We retain your data according to the following schedule:

• **Chat session transcripts** — retained for 90 days after the session ends, then permanently deleted. Aggregated session metadata (duration, score, concepts touched) is retained for the duration of your enrollment.

• **Account information** — retained for the duration of your affiliation with the University of Kentucky, plus 1 year after your last login.

• **Learning objective progress** — retained for the duration of your enrollment in the associated course, plus 5 years for institutional assessment and accreditation purposes.

• **Portfolio items** — retained until you delete them, or until 1 year after your account is deactivated.

• **AI-generated insights** — concept mastery, learning velocity, and recommendation data are retained for the duration of your enrollment and deleted upon graduation or withdrawal.

You may request early deletion of your data at any time by contacting the platform administrator (see Contact section below).`,
  },
  {
    icon: UserCheck,
    title: 'Your Rights',
    content: `As a University of Kentucky community member, you have the following rights regarding your data on the platform:

• **Access** — you may request a complete export of all data associated with your account at any time.

• **Correction** — you may request correction of inaccurate personal information through your profile settings or by contacting the administrator.

• **Deletion** — you may request deletion of your account and all associated data. Deletion requests are processed within 30 days, subject to legal retention requirements.

• **Portability** — you may export your portfolio, session history, and learning progress in standard formats (JSON, HTML).

• **Opt-out of AI personalization** — you may opt out of personalized AI recommendations while continuing to use the platform's core features. Contact the platform administrator to adjust your preferences.

• **Complaint** — if you believe your data rights have been violated, you may file a complaint with the University of Kentucky's Chief Information Officer or the U.S. Department of Education.`,
  },
  {
    icon: GraduationCap,
    title: 'FERPA Statement',
    content: `The University of Kentucky platform operates in compliance with the Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g.

**Education records** created within the platform — including grades, assignment submissions, learning objective progress, and AI-generated academic assessments — are protected under FERPA as part of the student's educational record maintained by the University of Kentucky.

**Legitimate educational interest:** Educators and administrators access student data under the "legitimate educational interest" exception to FERPA's consent requirement. Access is limited to data directly relevant to the educator's instructional responsibilities.

**Directory information:** Your name, email, role, and department may be visible to other authenticated platform users as directory information. You may opt out of directory information disclosure through the University Registrar's office.

**Sensitive sessions:** Interactions with student support services (counseling, disability resources, financial aid, Title IX) are marked as sensitive sessions and are excluded from educator and administrator analytics views.

**Third-party service provider:** Anthropic (AI model provider) and Neon (database hosting) operate as school officials with legitimate educational interest under FERPA, bound by contractual obligations to use student data solely for the purposes specified by the University.`,
  },
  {
    icon: Mail,
    title: 'Contact',
    content: `For questions, concerns, or requests related to your data on the University of Kentucky platform:

**Platform Administrator**
CATS-AI · Center for AI Teaching & Learning
University of Kentucky
Email: cats-ai@uky.edu

**University Privacy Officer**
Office of the Chief Information Officer
University of Kentucky
Email: privacy@uky.edu

**FERPA Compliance**
Office of the Registrar
University of Kentucky
Email: registrar@uky.edu
Phone: (859) 257-7157

**U.S. Department of Education**
Family Policy Compliance Office
400 Maryland Avenue, SW
Washington, D.C. 20202-5920`,
  },
]

const iconColors: Record<string, string> = {
  Shield: 'text-[#0033A0]',
  Eye: 'text-blue-600',
  Ban: 'text-red-600',
  Clock: 'text-amber-600',
  UserCheck: 'text-emerald-600',
  GraduationCap: 'text-purple-600',
  Mail: 'text-gray-600',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Privacy Policy"
        subtitle="How the University of Kentucky platform collects, uses, and protects your data"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <p className="text-sm text-gray-500">
          Last updated: March 21, 2026 · University of Kentucky · CATS-AI
        </p>
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <div
              key={section.title}
              className="border-2 border-gray-200 rounded-2xl bg-white p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Icon className={`size-5 ${iconColors[section.icon.displayName ?? ''] ?? 'text-gray-600'}`} />
                </div>
                <h2 className="text-lg font-extrabold text-gray-900">{section.title}</h2>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line prose prose-sm max-w-none">
                {section.content.split('\n').map((line, i) => {
                  const trimmed = line.trim()
                  if (!trimmed) return <br key={i} />
                  // Handle bold markers
                  const parts = trimmed.split(/(\*\*[^*]+\*\*)/)
                  return (
                    <p key={i} className={trimmed.startsWith('•') ? 'ml-4' : ''}>
                      {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j}>{part.slice(2, -2)}</strong>
                        }
                        return <span key={j}>{part}</span>
                      })}
                    </p>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
