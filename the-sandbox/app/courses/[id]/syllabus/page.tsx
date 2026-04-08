'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Eye, ClipboardList, CheckCircle } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import SyllabusUploadStep from '../../../components/courses/SyllabusUploadStep'
import SyllabusReviewStep from '../../../components/courses/SyllabusReviewStep'
import type { ParseResult } from '../../../components/courses/SyllabusReviewStep'
import SyllabusApplyStep from '../../../components/courses/SyllabusApplyStep'
import PolicyReviewStep from '../../../components/syllabus-architect/PolicyReviewStep'
import type { ExtractedPolicy, ExtractedGradingWeight } from '../../../components/syllabus-architect/PolicyReviewStep'

type Step = 'upload' | 'review' | 'policies' | 'apply'

const STEPS: { key: Step; label: string; icon: typeof Upload }[] = [
  { key: 'upload',   label: 'Upload',   icon: Upload },
  { key: 'review',   label: 'Review',   icon: Eye },
  { key: 'policies', label: 'Policies', icon: ClipboardList },
  { key: 'apply',    label: 'Apply',    icon: CheckCircle },
]

export default function SyllabusPage() {
  const { id: courseId } = useParams<{ id: string }>()
  const { currentUser } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<Step>('upload')
  const [jobId, setJobId] = useState<string | null>(null)
  const [fileHash, setFileHash] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [hasExistingMap, setHasExistingMap] = useState(false)
  const [policies, setPolicies] = useState<ExtractedPolicy[]>([])
  const [gradingWeights, setGradingWeights] = useState<ExtractedGradingWeight[]>([])

  // Whether the policies step should be shown (non-empty extraction)
  const hasPolicyData = policies.length > 0 || gradingWeights.length > 0

  // Check if course already has a CourseMap
  useEffect(() => {
    if (!courseId || !currentUser?.email) return
    fetch(`/api/courses/${courseId}/course-map`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then((res) => {
        if (res.ok) setHasExistingMap(true)
      })
      .catch(() => { /* route may not exist yet — that's fine */ })
  }, [courseId, currentUser?.email])

  // Filter steps: skip 'policies' when no policy data was extracted
  const visibleSteps = STEPS.filter((s) => s.key !== 'policies' || hasPolicyData)
  const stepIndex = visibleSteps.findIndex((s) => s.key === step)

  const headers = currentUser?.email
    ? { 'x-demo-user-email': currentUser.email }
    : {}

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Magic Course Builder"
        subtitle="Upload your syllabus PDF and we'll extract your course structure automatically."
        action={
          <Link
            href={`/courses?course=${courseId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to course
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {visibleSteps.map((s, i) => {
            const Icon = s.icon
            const isActive = i === stepIndex
            const isDone = i < stepIndex

            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`h-px w-8 ${isDone ? 'bg-[#0033A0]' : 'bg-gray-200'}`} />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center justify-center size-7 rounded-full text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-[#0033A0] text-white'
                        : isDone
                          ? 'bg-[#0033A0] text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="size-4" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isActive ? 'text-[#0033A0]' : isDone ? 'text-gray-700' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Step content */}
        {step === 'upload' && (
          <SyllabusUploadStep
            courseId={courseId}
            userEmail={currentUser?.email ?? ''}
            onParsed={(data) => {
              const result = data.result as ParseResult
              setJobId(data.jobId)
              setFileHash(data.fileHash)
              setParseResult(result)
              setPolicies(result.policies ?? [])
              setGradingWeights(result.gradingWeights ?? [])
              setStep('review')
            }}
          />
        )}

        {step === 'review' && parseResult && (
          <SyllabusReviewStep
            result={parseResult}
            onResultChange={setParseResult}
            onApply={() => setStep(hasPolicyData ? 'policies' : 'apply')}
            onReupload={() => {
              setParseResult(null)
              setJobId(null)
              setFileHash(null)
              setPolicies([])
              setGradingWeights([])
              setStep('upload')
            }}
            onCancel={() => router.push(`/courses?course=${courseId}`)}
          />
        )}

        {step === 'policies' && (
          <PolicyReviewStep
            policies={policies}
            gradingWeights={gradingWeights}
            courseId={courseId}
            userEmail={currentUser?.email ?? ''}
            onPoliciesChange={setPolicies}
            onGradingWeightsChange={setGradingWeights}
            onApplyComplete={() => setStep('apply')}
            loading={parsing}
          />
        )}

        {step === 'apply' && parseResult && jobId && fileHash && (
          <SyllabusApplyStep
            courseId={courseId}
            userEmail={currentUser?.email ?? ''}
            jobId={jobId}
            fileHash={fileHash}
            result={parseResult}
            hasExistingMap={hasExistingMap}
            onBack={() => setStep(hasPolicyData ? 'policies' : 'review')}
          />
        )}
      </div>
    </div>
  )
}
