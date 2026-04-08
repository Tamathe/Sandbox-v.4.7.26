'use client'

import { format } from 'date-fns'
import { BarChart2, Flag, Loader2, Megaphone, Newspaper } from 'lucide-react'
import { AdminStats } from '../../lib/types'
import type { FeatureFlag, UknowStats, QueryStatsData, DeptHeatMapEntry, CitationStatsData } from './types'
import ErrorBanner from '../../components/ErrorBanner'
import Button from '../../components/Button'

interface PlatformTabProps {
  stats: AdminStats
  // Announcements
  announcementTitle: string
  setAnnouncementTitle: (v: string) => void
  announcementMessage: string
  setAnnouncementMessage: (v: string) => void
  actionLoading: string | null
  handleAnnouncementCreate: () => void
  // Feature flags
  featureFlags: FeatureFlag[]
  flagsLoading: boolean
  flagsLoaded: boolean
  handleToggleFlag: (flag: FeatureFlag) => void
  // UKNow
  uknowStats: UknowStats | null
  uknowStatsLoading: boolean
  uknowStatsError: boolean
  ingestLoading: boolean
  ingestResult: string | null
  handleTriggerIngest: () => void
  backfillLoading: boolean
  backfillResult: string | null
  handleBackfill: () => void
  sentimentBackfillLoading: boolean
  sentimentBackfillResult: string | null
  handleSentimentBackfill: () => void
  handleStopSentimentBackfill: () => void
  // Query stats
  queryStats: QueryStatsData | null
  queryStatsLoading: boolean
  // Dept heat map
  deptHeatMap: DeptHeatMapEntry[] | null
  deptHeatMapLoading: boolean
  // Citation stats
  citationStats: CitationStatsData | null
  citationStatsLoading: boolean
}

export default function PlatformTab(props: PlatformTabProps) {
  const {
    stats,
    announcementTitle, setAnnouncementTitle,
    announcementMessage, setAnnouncementMessage,
    actionLoading, handleAnnouncementCreate,
    featureFlags, flagsLoading, flagsLoaded, handleToggleFlag,
    uknowStats, uknowStatsLoading, uknowStatsError,
    ingestLoading, ingestResult, handleTriggerIngest,
    backfillLoading, backfillResult, handleBackfill,
    sentimentBackfillLoading, sentimentBackfillResult, handleSentimentBackfill, handleStopSentimentBackfill,
    queryStats, queryStatsLoading,
    deptHeatMap, deptHeatMapLoading,
    citationStats, citationStatsLoading,
  } = props

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="size-5 text-uk-blue" />
          <h2 className="text-base font-extrabold text-gray-900">System-Wide Announcements</h2>
        </div>
        <div className="space-y-3">
          <input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="Announcement title" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-uk-blue focus:ring-2 focus:ring-uk-blue/15" />
          <textarea value={announcementMessage} onChange={(event) => setAnnouncementMessage(event.target.value)} placeholder="Message shown to every user" rows={4} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-uk-blue focus:ring-2 focus:ring-uk-blue/15" />
          <Button onClick={() => void handleAnnouncementCreate()} disabled={actionLoading === 'announcement'}>
            Publish Banner
          </Button>
        </div>
        <div className="mt-6 space-y-3">
          {stats.recentAnnouncements.map((announcement) => (
            <div key={announcement.id} className="rounded-2xl border border-gray-200 px-4 py-3">
              <div className="font-semibold text-slate-900">{announcement.title}</div>
              <p className="mt-1 text-sm text-slate-600">{announcement.message}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sandcastle Feature Flags */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Flag className="size-5 text-uk-blue" />
          <h2 className="text-base font-extrabold text-gray-900">Sandcastle Flags</h2>
        </div>
        {flagsLoading && <Loader2 className="size-5 animate-spin text-gray-400" />}
        {flagsLoaded && featureFlags.length === 0 && (
          <p className="text-sm text-gray-500">No flags found.</p>
        )}
        <div className="space-y-3">
          {featureFlags.map((flag) => (
            <div key={flag.id} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{flag.feature}</p>
                <p className="text-xs text-gray-500">Rollout: {flag.rolloutPercent}%</p>
              </div>
              <button
                type="button"
                onClick={() => void handleToggleFlag(flag)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${flag.enabled ? 'bg-uk-blue' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={flag.enabled}
              >
                <span
                  className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${flag.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* UKNow Archive */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Newspaper className="size-5 text-uk-blue" />
          <h2 className="text-base font-extrabold text-gray-900">UKNow Archive</h2>
        </div>
        {uknowStatsLoading && !uknowStats && (
          <div className="space-y-2">
            <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
            <div className="size-40 animate-pulse rounded bg-gray-100" />
          </div>
        )}
        {uknowStatsError && !uknowStats && (
          <ErrorBanner message="Could not load stats" />
        )}
        {uknowStats && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{uknowStats.totalArticles.toLocaleString()} articles</span>
              {' · '}
              <span className="font-semibold text-gray-900">{uknowStats.totalChunks.toLocaleString()} chunks</span>
              {uknowStats.lastIngestedAt && (
                <> · Last ingested: {format(new Date(uknowStats.lastIngestedAt), 'MMM d, yyyy')}</>
              )}
            </p>
            <div className="space-y-1.5">
              {uknowStats.sectionBreakdown.map((s) => (
                <div key={s.section} className="flex items-center gap-3">
                  <span className="w-36 truncate text-xs text-gray-500">{s.sectionLabel}</span>
                  <div className="flex-1 rounded-full bg-gray-100 h-1.5">
                    <div
                      className="bg-uk-blue h-1.5 rounded-full"
                      style={{ width: `${Math.round((s.count / uknowStats.totalArticles) * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-semibold text-gray-700">{s.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void handleTriggerIngest()}
            disabled={ingestLoading}
            loading={ingestLoading}
          >
            Trigger Ingest
          </Button>
          <button
            type="button"
            onClick={() => void handleBackfill()}
            disabled={backfillLoading}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-uk-blue px-4 py-2.5 text-sm font-semibold text-uk-blue hover:bg-blue-50 disabled:opacity-60"
          >
            {backfillLoading && <Loader2 className="size-4 animate-spin" />}
            Backfill Summaries &amp; Entities
          </button>
          {sentimentBackfillLoading ? (
            <button
              type="button"
              onClick={handleStopSentimentBackfill}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-red-400 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <Loader2 className="size-4 animate-spin" />
              Stop Backfill
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSentimentBackfill()}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Backfill Sentiment (run all)
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-col gap-1">
          {ingestResult && (
            <span className="text-sm text-gray-600">{ingestResult}</span>
          )}
          {backfillResult && (
            <span className="text-sm text-gray-600">{backfillResult}</span>
          )}
          {sentimentBackfillResult && (
            <span className="text-sm text-gray-600">{sentimentBackfillResult}</span>
          )}
        </div>
      </section>

      {/* UKNow Search Analytics */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart2 className="size-5 text-uk-blue" />
          <h2 className="text-base font-extrabold text-gray-900">UKNow Search Analytics</h2>
        </div>
        {queryStatsLoading && !queryStats && (
          <div className="space-y-2">
            <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
            <div className="size-40 animate-pulse rounded bg-gray-100" />
          </div>
        )}
        {!queryStatsLoading && !queryStats && (
          <p className="text-sm text-gray-400 italic">No search data available yet.</p>
        )}
        {queryStats && (
          <div className="space-y-6">
            {queryStats.topQueries.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Top Queries</h3>
                <div className="space-y-1.5">
                  {queryStats.topQueries.map((q, i) => {
                    const maxCount = queryStats.topQueries[0]?.count ?? 1
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-48 truncate text-xs text-gray-600">{q.query}</span>
                        <div className="flex-1 rounded-full bg-gray-100 h-1.5">
                          <div className="bg-uk-blue h-1.5 rounded-full" style={{ width: `${Math.round((q.count / maxCount) * 100)}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs font-semibold text-gray-700">{q.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {queryStats.topSections.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Top Sections</h3>
                <div className="flex flex-wrap gap-2">
                  {queryStats.topSections.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-700">
                      {s.section} <span className="text-gray-400">({s.count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {queryStats.trendingTopics.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Trending Topics</h3>
                <div className="flex flex-wrap gap-1.5">
                  {queryStats.trendingTopics.map((t, i) => (
                    <span key={i} className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {t.topic} ({t.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
            {queryStats.volumeByDay.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Query Volume (Last 30 Days)</h3>
                <div className="flex items-end gap-px h-16">
                  {queryStats.volumeByDay.map((d, i) => {
                    const maxVol = Math.max(...queryStats.volumeByDay.map((v) => v.count), 1)
                    const height = Math.max(2, (d.count / maxVol) * 64)
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-uk-blue rounded-t-sm hover:bg-[#002580] transition-colors"
                        style={{ height: `${height}px` }}
                        title={`${d.date}: ${d.count} queries`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400">{queryStats.volumeByDay[0]?.date}</span>
                  <span className="text-[10px] text-gray-400">{queryStats.volumeByDay[queryStats.volumeByDay.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* UKNow Department Alert Heat Map */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart2 className="size-5 text-uk-blue" />
          <h2 className="text-base font-extrabold text-gray-900">Department Alert Digest</h2>
        </div>
        {deptHeatMapLoading && !deptHeatMap && (
          <div className="space-y-2">
            <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
            <div className="size-40 animate-pulse rounded bg-gray-100" />
          </div>
        )}
        {!deptHeatMapLoading && (!deptHeatMap || deptHeatMap.length === 0) && (
          <p className="text-sm text-gray-400 italic">No department alert data available yet.</p>
        )}
        {deptHeatMap && deptHeatMap.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-3">Alert matches across departments (last 7 days)</p>
            {deptHeatMap.map((d) => {
              const maxMatches = Math.max(...deptHeatMap.map((x) => x.matchCount), 1)
              return (
                <div key={d.department} className="flex items-center gap-3">
                  <span className="w-40 truncate text-xs text-gray-600 font-medium">{d.department}</span>
                  <div className="flex-1 rounded-full bg-gray-100 h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.max(4, Math.round((d.matchCount / maxMatches) * 100))}%`,
                        backgroundColor: d.matchCount > 10 ? '#dc2626' : d.matchCount > 3 ? '#f59e0b' : '#0033A0',
                      }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs text-gray-600">
                    {d.matchCount} match{d.matchCount !== 1 ? 'es' : ''} · {d.userCount} user{d.userCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* UKNow Sandy Citation Analytics */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Newspaper className="size-5 text-uk-blue" />
          <h2 className="text-base font-extrabold text-gray-900">Sandy Citation Tracking</h2>
        </div>
        {citationStatsLoading && !citationStats && (
          <div className="space-y-2">
            <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
            <div className="size-40 animate-pulse rounded bg-gray-100" />
          </div>
        )}
        {!citationStatsLoading && !citationStats && (
          <p className="text-sm text-gray-400 italic">No citation data available yet.</p>
        )}
        {citationStats && (
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 flex-1">
                <p className="text-2xl font-extrabold text-uk-blue">{citationStats.totalCitations}</p>
                <p className="text-xs text-gray-500">Total citations (30d)</p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex-1">
                <p className="text-2xl font-extrabold text-emerald-700">{citationStats.uniqueArticlesCited}</p>
                <p className="text-xs text-gray-500">Unique articles cited</p>
              </div>
            </div>

            {citationStats.topArticles.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Most-Cited Articles</h3>
                <div className="space-y-1.5">
                  {citationStats.topArticles.slice(0, 5).map((a) => {
                    const maxCit = citationStats.topArticles[0]?.citationCount ?? 1
                    return (
                      <div key={a.articleId} className="flex items-center gap-3">
                        <span className="w-56 truncate text-xs text-gray-600">{a.title}</span>
                        <div className="flex-1 rounded-full bg-gray-100 h-1.5">
                          <div className="bg-uk-blue h-1.5 rounded-full" style={{ width: `${Math.round((a.citationCount / maxCit) * 100)}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs font-semibold text-gray-700">{a.citationCount}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {citationStats.recentCitations.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Recent Citations</h3>
                <div className="space-y-1">
                  {citationStats.recentCitations.slice(0, 8).map((c, i) => (
                    <p key={i} className="text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{c.userName}</span>
                      {' cited '}
                      <span className="font-medium text-gray-700">{c.articleTitle}</span>
                      {' · '}
                      {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  )
}
