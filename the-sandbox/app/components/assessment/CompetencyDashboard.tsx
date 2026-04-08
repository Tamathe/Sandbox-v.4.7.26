'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  Loader2,
  Minus,
  RefreshCw,
  Share2,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-react';
import type {
  CompetencyGap,
  CompetencyPortfolioPayload,
  CompetencyRecordDetail,
} from '../../lib/assessment/types';

interface CompetencyDashboardProps {
  userEmail: string;
}

function percentLabel(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function levelClasses(level: CompetencyRecordDetail['level']) {
  switch (level) {
    case 'Expert':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Advanced':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'Proficient':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function trendIcon(trend: CompetencyRecordDetail['trend']) {
  if (trend === 'improving') return <ArrowUpRight className="size-4 text-emerald-600" />;
  if (trend === 'declining') return <ArrowDownRight className="size-4 text-rose-600" />;
  return <Minus className="size-4 text-slate-500" />;
}

function GapCard({ gap }: { gap: CompetencyGap }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">{gap.competency}</p>
          <p className="mt-1 text-xs text-amber-800">
            {gap.reason === 'low_score'
              ? `Current score ${percentLabel(gap.score)}`
              : `${gap.evidenceCount} evidence item${gap.evidenceCount === 1 ? '' : 's'} so far`}
          </p>
        </div>
        <TriangleAlert className="size-4 text-amber-700" />
      </div>
      <div className="mt-3 space-y-2">
        {gap.suggestions.map((suggestion) => (
          <Link
            key={`${gap.competency}-${suggestion.label}`}
            href={suggestion.href}
            className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-[#0033A0] hover:text-[#0033A0]"
          >
            <span>{suggestion.label}</span>
            <ExternalLink className="size-3.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function CompetencyDashboard({ userEmail }: CompetencyDashboardProps) {
  const [data, setData] = useState<CompetencyPortfolioPayload | null>(null);
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/assessment/portfolio', {
        headers: { 'x-demo-user-email': userEmail },
      });
      const payload = (await res.json()) as CompetencyPortfolioPayload & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to load competency portfolio');
      }

      setData(payload);
      setSelectedCompetency((current) => {
        if (current && payload.competencies.some((item) => item.competency === current)) {
          return current;
        }
        return payload.competencies[0]?.competency ?? null;
      });
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Failed to load competency portfolio');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);

    try {
      const res = await fetch('/api/assessment/portfolio', {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      });
      const payload = (await res.json()) as CompetencyPortfolioPayload & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to refresh competency portfolio');
      }

      setData(payload);
      setSelectedCompetency((current) => current ?? payload.competencies[0]?.competency ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh competency portfolio');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const selected =
    data?.competencies.find((item) => item.competency === selectedCompetency) ??
    data?.competencies[0] ??
    null;

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border-2 border-gray-200 bg-white p-12">
        <Loader2 className="size-5 animate-spin text-[#0033A0]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data || data.competencies.length === 0) {
    return (
      <section className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100">
          <Target className="size-6 text-slate-500" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">No competency evidence yet</h3>
        <p className="mt-2 text-sm text-slate-500">
          Start with Study Buddy, Teach Back, or a Commons session to build your first signals.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/study"
            className="rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#002580]"
          >
            Open Study Buddy
          </Link>
          <Link
            href="/campus"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#0033A0] hover:text-[#0033A0]"
          >
            Explore The Commons
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-3xl border-2 border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0033A0]">
            Competency Portfolio
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            Your degree is a living document
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Last refreshed {formatDate(data.generatedAt)}. Click a competency to inspect the
            evidence behind it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#0033A0] hover:text-[#0033A0] disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400"
          >
            <Share2 className="size-4" />
            Share soon
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          {data.competencies.map((competency) => (
            <button
              key={competency.competency}
              type="button"
              onClick={() => setSelectedCompetency(competency.competency)}
              className={`rounded-2xl border p-4 text-left transition ${
                selected?.competency === competency.competency
                  ? 'border-[#0033A0] bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-slate-50 hover:border-[#0033A0]/40 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{competency.competency}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {competency.evidenceCount} evidence points
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${levelClasses(competency.level)}`}
                >
                  {competency.level}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{trendIcon(competency.trend)}</span>
                  <span>{percentLabel(competency.score)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-[#0033A0]"
                    style={{ width: `${Math.max(4, competency.score * 100)}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{selected.competency}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selected.courseNames.length > 0
                    ? selected.courseNames.join(' • ')
                    : 'Cross-course evidence'}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${levelClasses(selected.level)}`}
              >
                {selected.level}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Score
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {percentLabel(selected.score)}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bloom High
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  L{selected.bloomHighWater}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last Evidence
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {formatDate(selected.lastDemonstrated)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="size-4 text-[#0033A0]" />
                Retention curve
              </div>
              <div className="mt-4 flex items-end gap-3">
                {selected.decayProjection.map((point) => (
                  <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-24 w-full items-end rounded-xl bg-slate-100 px-2 py-2">
                      <div
                        className="w-full rounded-md bg-[#0033A0]"
                        style={{ height: `${Math.max(10, point.score * 100)}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-700">
                        {percentLabel(point.score)}
                      </p>
                      <p className="text-[11px] text-slate-500">{point.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BookOpen className="size-4 text-[#0033A0]" />
                Evidence trail
              </div>
              <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
                {selected.evidence.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.courseName ?? item.sourceLabel} • {formatDate(item.occurredAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {item.score != null ? percentLabel(item.score) : 'Signal'}
                      </span>
                    </div>
                    {item.note && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.note}</p>
                    )}
                    {item.link && (
                      <Link
                        href={item.link.href}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] hover:underline"
                      >
                        {item.link.label}
                        <ExternalLink className="size-3.5" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {data.gaps.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Build evidence next</p>
            <p className="text-sm text-slate-500">
              These areas need either stronger performance or more demonstrated evidence.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.gaps.slice(0, 4).map((gap) => (
              <GapCard key={gap.competency} gap={gap} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
