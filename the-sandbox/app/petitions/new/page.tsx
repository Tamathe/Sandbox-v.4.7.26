'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { PETITION_TYPE_LABELS } from '../../lib/registrar/types'
import { HumanEscalationFooter } from '../../components/registrar/HumanEscalationFooter'
import { CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import PageHeader from '../../components/PageHeader'

type PetitionType = keyof typeof PETITION_TYPE_LABELS

interface EligibilityResult {
  eligible: boolean
  reasons: string[]
  blockers: string[]
}

// Form field definitions per petition type
const PETITION_FIELDS: Record<PetitionType, { key: string; label: string; type: string; required?: boolean }[]> = {
  LATE_WITHDRAWAL: [
    { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
    { key: 'courseName', label: 'Course Name', type: 'text', required: true },
    { key: 'reason', label: 'Reason for Late Withdrawal', type: 'textarea', required: true },
    { key: 'supportingDocumentation', label: 'Supporting Documentation (describe)', type: 'textarea' },
  ],
  GRADE_CHANGE: [
    { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
    { key: 'instructor', label: 'Instructor Name', type: 'text', required: true },
    { key: 'currentGrade', label: 'Current Grade', type: 'text', required: true },
    { key: 'requestedGrade', label: 'Requested Grade', type: 'text', required: true },
    { key: 'reason', label: 'Reason for Grade Change Request', type: 'textarea', required: true },
  ],
  NAME_UPDATE: [
    { key: 'currentName', label: 'Current Legal Name', type: 'text', required: true },
    { key: 'requestedName', label: 'Requested Name', type: 'text', required: true },
    { key: 'legalDocumentation', label: 'Legal Documentation (describe)', type: 'textarea', required: true },
  ],
  ENROLLMENT_CERTIFICATION: [
    { key: 'purpose', label: 'Purpose of Certification', type: 'text', required: true },
    { key: 'recipientName', label: 'Recipient Name / Organization', type: 'text', required: true },
    { key: 'enrollmentTerm', label: 'Term to Certify', type: 'text', required: true },
  ],
  ACADEMIC_RENEWAL: [
    { key: 'termsToRenew', label: 'Terms Requesting Renewal (e.g., Fall 2019, Spring 2020)', type: 'text', required: true },
    { key: 'reason', label: 'Explanation', type: 'textarea', required: true },
  ],
  COURSE_OVERLOAD: [
    { key: 'proposedCredits', label: 'Proposed Total Credits', type: 'number', required: true },
    { key: 'justification', label: 'Justification', type: 'textarea', required: true },
  ],
  GRADUATION_APPLICATION: [
    { key: 'expectedTerm', label: 'Expected Graduation Term', type: 'text', required: true },
    { key: 'program', label: 'Degree Program', type: 'text', required: true },
    { key: 'confirmationNote', label: 'Any special circumstances to note', type: 'textarea' },
  ],
  MAJOR_CHANGE: [
    { key: 'currentMajor', label: 'Current Major / Program', type: 'text', required: true },
    { key: 'requestedMajor', label: 'Requested Major / Program', type: 'text', required: true },
    { key: 'reason', label: 'Reason for Change', type: 'textarea', required: true },
  ],
  LEAVE_OF_ABSENCE: [
    { key: 'startTerm', label: 'Leave Start Term', type: 'text', required: true },
    { key: 'expectedReturnTerm', label: 'Expected Return Term', type: 'text', required: true },
    { key: 'reason', label: 'Reason for Leave', type: 'textarea', required: true },
  ],
}

export default function NewPetitionPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [selectedType, setSelectedType] = useState<PetitionType | ''>('')
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [step, setStep] = useState<'type' | 'form' | 'eligibility' | 'confirm'>('type')
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTypeSelect = (type: PetitionType) => {
    setSelectedType(type)
    setFormData({})
    setStep('form')
  }

  const handleFormSubmit = async () => {
    if (!selectedType) return
    setSubmitting(true)
    setError(null)
    try {
      // Preview eligibility check before confirming
      const res = await fetch('/api/petitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ type: selectedType, formData, preview: true }),
      })
      // We actually just call POST which returns eligibility + creates the petition
      if (res.ok) {
        const data = await res.json()
        setEligibility(data.eligibility)
        setStep('eligibility')
      } else {
        setError('Failed to submit petition. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setSubmitting(false)
  }

  const handleConfirm = async () => {
    router.push('/petitions')
  }

  const fields = selectedType ? PETITION_FIELDS[selectedType] ?? [] : []
  const requiredFilled = fields.filter((f) => f.required).every((f) => formData[f.key]?.trim())

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Submit a Petition"
        subtitle="Select a petition type and complete the required fields"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/petitions" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="size-4" /> Back to My Petitions
        </Link>

        {/* Step: Select Type */}
        {step === 'type' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">Select the type of petition you&apos;d like to submit:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.entries(PETITION_TYPE_LABELS) as [PetitionType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className="text-left p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-[#0033A0] hover:shadow-sm transition-all"
                >
                  <p className="font-bold text-gray-900 text-sm">{label}</p>
                </button>
              ))}
            </div>
            <div className="mt-6">
              <HumanEscalationFooter message="Not sure which petition type to choose? Contact the Registrar's Office for guidance." />
            </div>
          </div>
        )}

        {/* Step: Form */}
        {step === 'form' && selectedType && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <h2 className="font-extrabold text-gray-900 mb-4">{PETITION_TYPE_LABELS[selectedType]}</h2>
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={formData[field.key] ?? ''}
                      onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] ?? ''}
                      onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                    />
                  )}
                </div>
              ))}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep('type')}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleFormSubmit}
                disabled={!requiredFilled || submitting}
                className="flex-1 py-2.5 bg-[#0033A0] text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
              >
                {submitting ? 'Checking Eligibility…' : 'Check Eligibility & Submit'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Eligibility result */}
        {step === 'eligibility' && eligibility && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${eligibility.eligible ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                {eligibility.eligible
                  ? <CheckCircle className="size-5 text-green-600" />
                  : <AlertTriangle className="size-5 text-amber-600" />}
                <h3 className="font-bold text-sm text-gray-900">
                  {eligibility.eligible ? 'Eligibility Check Passed' : 'Eligibility Concerns Found'}
                </h3>
              </div>
              {eligibility.blockers.map((b) => (
                <p key={b} className="text-sm text-red-700 mb-1">⛔ {b}</p>
              ))}
              {eligibility.reasons.map((r) => (
                <p key={r} className="text-sm text-green-700 mb-1">✓ {r}</p>
              ))}
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 text-sm text-gray-600">
              <p>
                Your petition has been submitted and routed to the Registrar&apos;s Office for review.
                You can track its progress on the{' '}
                <Link href="/petitions" className="text-[#0033A0] underline font-medium">My Petitions</Link>{' '}
                page.
              </p>
            </div>

            <HumanEscalationFooter message="Eligibility checks are AI-assisted. Staff will review your petition regardless of the automated result." />

            <button
              onClick={handleConfirm}
              className="w-full py-2.5 bg-[#0033A0] text-white rounded-lg text-sm font-semibold hover:bg-blue-800"
            >
              View My Petitions
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
