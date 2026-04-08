import Link from 'next/link'
import DynamicMarkdown from './DynamicMarkdown'
import { Database, GraduationCap, Building2, GitFork, Loader2 } from 'lucide-react'

import type { ParsedReference } from '../lib/datasets'
import type { ToolStorefrontSummary } from '../lib/tool-storefronts'

interface ToolOverviewProps {
  fullDescription: string
  learningObjectives: string[]
  intendedAudience: string | null
  connectedReferences: ParsedReference[]
  storefront?: ToolStorefrontSummary | null
  canCloneIntoSandbox?: boolean
  cloneIntoSandboxBusy?: boolean
  onCloneIntoSandbox?: () => void
}

export default function ToolOverview({
  fullDescription,
  learningObjectives,
  intendedAudience,
  connectedReferences,
  storefront,
  canCloneIntoSandbox = false,
  cloneIntoSandboxBusy = false,
  onCloneIntoSandbox,
}: ToolOverviewProps) {
  return (
    <>
      <div className="prose max-w-none">
        <DynamicMarkdown>{fullDescription}</DynamicMarkdown>
      </div>

      {learningObjectives.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3">Learning Objectives</h3>
          <ul className="space-y-2">
            {learningObjectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-[#0033A0] text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-gray-700">{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {intendedAudience && (
        <div>
          <h3 className="font-bold text-gray-800 mb-2">Intended Audience</h3>
          <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600">
            {intendedAudience}
          </p>
        </div>
      )}

      {connectedReferences.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3">Connected Sources</h3>
          <div className="space-y-2">
            {connectedReferences.map((reference, index) => (
              <div key={`${reference.label}-${index}`} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {reference.type === 'dataset'
                  ? <Database className="size-4 flex-shrink-0 text-[#0033A0]" />
                  : reference.type === 'course'
                    ? <GraduationCap className="size-4 flex-shrink-0 text-[#0033A0]" />
                    : <Building2 className="size-4 flex-shrink-0 text-[#0033A0]" />}
                <span>{reference.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {storefront && storefront.placements.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3">Department Storefronts</h3>
          <p className="mb-3 text-sm leading-relaxed text-gray-600">
            Shared in {storefront.placementCount} collection{storefront.placementCount === 1 ? '' : 's'} across {storefront.departmentCount} department storefront{storefront.departmentCount === 1 ? '' : 's'}.
          </p>
          <div className="space-y-2">
            {storefront.placements.slice(0, 4).map((placement) => (
              <Link
                key={`${placement.departmentId}-${placement.collectionId}`}
                href={`/hub/s/${placement.departmentSlug}/${placement.collectionSlug}`}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-[#0033A0]"
              >
                <Building2 className="size-4 flex-shrink-0 text-[#0033A0]" />
                <span>
                  {placement.departmentShortName} / {placement.collectionName}
                </span>
              </Link>
            ))}
          </div>
          {storefront.placements.length > 4 && (
            <p className="mt-2 text-xs text-gray-400">
              And {storefront.placements.length - 4} more storefront placement{storefront.placements.length - 4 === 1 ? '' : 's'}.
            </p>
          )}
        </div>
      )}

      {canCloneIntoSandbox && onCloneIntoSandbox && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <h3 className="flex items-center gap-2 font-bold text-[#0033A0]">
                <GitFork className="size-4" />
                Clone Into Sandbox
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-blue-900">
                Start from this tool&apos;s current setup in your own sandbox, then adapt the prompts, learning goals, and deployment plan before publishing your version.
              </p>
            </div>

            <button
              type="button"
              onClick={onCloneIntoSandbox}
              disabled={cloneIntoSandboxBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-60"
            >
              {cloneIntoSandboxBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GitFork className="size-4" />
              )}
              {cloneIntoSandboxBusy ? 'Cloning...' : 'Clone into sandbox'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
