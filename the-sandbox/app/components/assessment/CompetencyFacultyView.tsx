'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Loader2, Minus, Sparkles, Users } from 'lucide-react';
import type { ClassCompetencyDistributionPayload } from '../../lib/assessment/types';

interface CompetencyFacultyViewProps {
  userEmail: string;
  courseId: string;
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function percentLabel(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function CompetencyFacultyView({ userEmail, courseId }: CompetencyFacultyViewProps) {
  const [data, setData] = useState<ClassCompetencyDistributionPayload | null>(null);
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/assessment/portfolio/class/${courseId}`, {
          headers: { 'x-demo-user-email': userEmail },
        });
        const payload = (await res.json()) as ClassCompetencyDistributionPayload & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(payload.error ?? 'Failed to load class competency view');
        }

        if (!cancelled) {
          setData(payload);
          setSelectedCompetency((current) => {
            if (current && payload.distribution.some((item) => item.competency === current)) {
              return current;
            }
            return payload.distribution[0]?.competency ?? null;
          });
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : 'Failed to load class competency view');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [courseId, userEmail]);

  const selected =
    data?.distribution.find((item) => item.competency === selectedCompetency) ??
    data?.distribution[0] ??
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

  if (!data) return null;

  return (
    <section className="space-y-5 rounded-3xl border-2 border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0033A0]">
            Faculty View
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {data.course.courseCode} competency distribution
          </h2>
          <p className="mt-2 text-sm text-slate-500">{data.course.title}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Users className="size-4 text-[#0033A0]" />
            {data.totalStudents} student{data.totalStudents === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BarChart3 className="size-4 text-[#0033A0]" />
            Class distribution by competency
          </div>
          {data.distribution.map((item) => (
            <button
              key={item.competency}
              type="button"
              onClick={() => setSelectedCompetency(item.competency)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selected?.competency === item.competency
                  ? 'border-[#0033A0] bg-white shadow-sm'
                  : 'border-slate-200 bg-white hover:border-[#0033A0]/40'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.competency}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Average {percentLabel(item.averageScore)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {item.category}
                </span>
              </div>

              <div className="mt-4 overflow-hidden rounded-full bg-slate-200">
                <div className="flex h-3 w-full">
                  <div
                    className="bg-slate-400"
                    style={{ width: `${percent(item.developing, item.totalStudents)}%` }}
                  />
                  <div
                    className="bg-blue-400"
                    style={{ width: `${percent(item.proficient, item.totalStudents)}%` }}
                  />
                  <div
                    className="bg-violet-400"
                    style={{ width: `${percent(item.advanced, item.totalStudents)}%` }}
                  />
                  <div
                    className="bg-amber-400"
                    style={{ width: `${percent(item.expert, item.totalStudents)}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] font-semibold">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-center text-slate-700">
                  D {item.developing}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-center text-blue-700">
                  P {item.proficient}
                </span>
                <span className="rounded-full bg-violet-100 px-2 py-1 text-center text-violet-700">
                  A {item.advanced}
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-center text-amber-700">
                  E {item.expert}
                </span>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-lg font-semibold text-slate-900">{selected.competency}</p>
              <p className="mt-1 text-sm text-slate-500">
                {selected.totalStudents} students in distribution
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Average Score
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {percentLabel(selected.averageScore)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Top Level
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {selected.expert >= selected.advanced
                      ? 'Expert cluster strongest'
                      : selected.advanced >= selected.proficient
                        ? 'Advanced cluster strongest'
                        : 'Developing / Proficient cluster strongest'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="size-4 text-[#0033A0]" />
                Strongest contributing activities
              </div>
              <div className="mt-3 space-y-3">
                {selected.topSources.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
                    <Minus className="mx-auto mb-2 size-4" />
                    No direct assessment evidence has been linked for this competency yet.
                  </div>
                ) : (
                  selected.topSources.map((source) => (
                    <div
                      key={`${selected.competency}-${source.label}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
                    >
                      <span className="text-sm text-slate-700">{source.label}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {source.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
