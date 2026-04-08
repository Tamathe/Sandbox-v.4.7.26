import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import {
  Award,
  BadgeCheck,
  Briefcase,
  FileText,
  FolderOpen,
  GraduationCap,
  Lock,
} from 'lucide-react'
import { prisma } from '../../lib/prisma'
import type { PortfolioType } from '../../generated/prisma'

export const dynamic = 'force-dynamic'

function formatDateRange(startDate: Date | null, endDate: Date | null) {
  if (!startDate && !endDate) return null
  const fmt = (d: Date | null) => (d ? format(d, 'MMM yyyy') : 'Present')
  if (!startDate) return fmt(endDate)
  return `${fmt(startDate)} – ${fmt(endDate)}`
}

function typeLabel(type: PortfolioType) {
  const map: Record<PortfolioType, string> = {
    EDUCATION: 'Education',
    EXPERIENCE: 'Experience',
    PROJECT: 'Project',
    AWARD: 'Award',
    CERTIFICATION: 'Certification',
    PUBLICATION: 'Publication',
    SKILL: 'Skill',
  }
  return map[type] ?? type
}

function typeIcon(type: PortfolioType) {
  switch (type) {
    case 'EDUCATION': return GraduationCap
    case 'EXPERIENCE': return Briefcase
    case 'PROJECT': return FolderOpen
    case 'AWARD': return Award
    case 'CERTIFICATION': return BadgeCheck
    default: return FileText
  }
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      department: true,
      college: true,
      portfolioPublic: true,
      portfolioItems: {
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          type: true,
          title: true,
          organization: true,
          startDate: true,
          endDate: true,
          description: true,
          skills: true,
          isVerified: true,
          metadata: true,
        },
      },
    },
  })

  if (!user) return notFound()

  if (!user.portfolioPublic) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100">
            <Lock className="size-6 text-slate-400" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">This portfolio is private</h1>
          <p className="mt-2 text-sm text-slate-500">
            The owner has not made this portfolio public yet.
          </p>
        </div>
      </div>
    )
  }

  // Session counts per tool — safe to expose (no content, just counts)
  const sessionStats = await prisma.toolSession.groupBy({
    by: ['toolId'],
    where: { userId: user.id, endedAt: { not: null } },
    _count: { id: true },
  })
  const sessionCountByTool = new Map(sessionStats.map((s) => [s.toolId, s._count.id]))

  const totalSessions = sessionStats.reduce((sum, s) => sum + s._count.id, 0)
  const uniqueToolCount = sessionStats.length

  const allSkills = Array.from(
    new Set(user.portfolioItems.flatMap((item) => item.skills))
  ).sort((a, b) => a.localeCompare(b))

  const verifiedItems = user.portfolioItems.filter((item) => item.isVerified)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0033A0]">
                University of Kentucky
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{user.name}</h1>
              {(user.department || user.college) && (
                <p className="mt-1 text-sm text-slate-500">
                  {[user.department, user.college].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#0033A0]">{user.portfolioItems.length}</p>
                <p className="text-xs font-medium text-slate-500">portfolio items</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0033A0]">{totalSessions}</p>
                <p className="text-xs font-medium text-slate-500">sessions completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0033A0]">{uniqueToolCount}</p>
                <p className="text-xs font-medium text-slate-500">tools used</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          {/* Portfolio items */}
          <div className="space-y-4">
            {user.portfolioItems.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <FolderOpen className="mx-auto mb-3 size-10 text-slate-300" />
                <p className="text-sm text-slate-500">No portfolio items to display.</p>
              </div>
            ) : (
              user.portfolioItems.map((item) => {
                const Icon = typeIcon(item.type)
                const dateRange = formatDateRange(item.startDate, item.endDate)
                const itemMeta = item.metadata
                const toolIdFromMeta =
                  itemMeta !== null &&
                  typeof itemMeta === 'object' &&
                  !Array.isArray(itemMeta) &&
                  typeof (itemMeta as Record<string, unknown>).toolId === 'string'
                    ? (itemMeta as Record<string, string>).toolId
                    : null
                const toolSessionCount = toolIdFromMeta ? sessionCountByTool.get(toolIdFromMeta) : undefined

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0033A0]">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {typeLabel(item.type)}
                          </span>
                          {item.isVerified && (
                            <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-700">
                              AI Verified
                            </span>
                          )}
                          {toolSessionCount != null && toolSessionCount > 0 && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#0033A0]">
                              {toolSessionCount} session{toolSessionCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-2 text-lg font-extrabold text-slate-900">{item.title}</h2>
                        {item.organization && (
                          <p className="text-sm font-medium text-slate-600">{item.organization}</p>
                        )}
                        {dateRange && (
                          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                            {dateRange}
                          </p>
                        )}
                        {item.description && (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {item.description}
                          </p>
                        )}
                        {item.skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.skills.map((skill) => (
                              <span
                                key={`${item.id}-${skill}`}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {verifiedItems.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  AI-Verified Completions
                </h3>
                <div className="space-y-2">
                  {verifiedItems.map((item) => (
                    <div key={`verified-${item.id}`} className="flex items-center gap-2 text-sm text-slate-700">
                      <BadgeCheck className="size-4 shrink-0 text-green-600" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allSkills.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-center">
              <p className="text-xs font-semibold text-[#0033A0]">Powered by</p>
              <p className="mt-1 text-base font-bold text-[#0033A0]">University of Kentucky</p>
              <p className="mt-1 text-xs text-blue-600">AI-powered learning at the University of Kentucky</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
