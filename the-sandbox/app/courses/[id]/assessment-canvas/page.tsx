'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  ClipboardList,
  Loader2,
  PanelRightOpen,
} from 'lucide-react';
import AssessmentCanvasDesigner from '../../../components/assessment/AssessmentCanvasDesigner';
import PageHeader from '../../../components/PageHeader';
import { useAuth } from '../../../lib/auth-context';
import { apiFetch } from '../../../lib/api-client';
import {
  formatAssessmentModeLabel,
  getEnabledCanvasModes,
  pickPrimaryCanvasMode,
  resolveCanvasConfigFromAssignment,
} from '../../../lib/assessment/assessment-canvas';

interface AssignmentCanvasListItem {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  pointsPossible: number;
  isPublished: boolean;
  assessmentMode: string;
  assessmentConfig: unknown;
  processWeight: number | null;
}

export default function CourseAssessmentCanvasPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;
  const { currentUser } = useAuth();
  const canDesign = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN';
  const [assignments, setAssignments] = useState<AssignmentCanvasListItem[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(
    async (preserveSelection = true) => {
      if (!courseId || !canDesign) return;

      setLoading(true);
      setError(null);

      try {
        const rows = await apiFetch<AssignmentCanvasListItem[]>(
          currentUser.email,
          `/api/courses/${courseId}/assignments`
        );

        setAssignments(rows);
        setSelectedAssignmentId((current) => {
          if (!preserveSelection) return rows[0]?.id ?? null;
          if (current && rows.some((assignment) => assignment.id === current)) return current;
          return rows[0]?.id ?? null;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assignments');
        setAssignments([]);
        setSelectedAssignmentId(null);
      } finally {
        setLoading(false);
      }
    },
    [canDesign, courseId, currentUser.email]
  );

  useEffect(() => {
    if (!canDesign) {
      setLoading(false);
      setAssignments([]);
      setSelectedAssignmentId(null);
      return;
    }
    void loadAssignments(false);
  }, [canDesign, loadAssignments]);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Assessment Canvas"
        subtitle="Design multi-modal assessment mixes without breaking the existing assignment flow."
      >
        <div className="mt-4">
          <Link
            href={`/courses?course=${courseId}&tab=assignments`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#0033A0]"
          >
            <ChevronLeft className="size-4" />
            Back to course assignments
          </Link>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {!canDesign && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            Assessment Canvas is available to educators and admins for course-owned assignments.
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center rounded-3xl border-2 border-gray-200 bg-white p-14">
            <Loader2 className="size-5 animate-spin text-[#0033A0]" />
          </div>
        )}

        {!loading && canDesign && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && canDesign && !error && assignments.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100">
              <ClipboardList className="size-6 text-slate-500" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No assignments yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Create at least one assignment in this course before designing an assessment canvas.
            </p>
          </div>
        )}

        {!loading && canDesign && !error && assignments.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4 rounded-3xl border-2 border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0033A0]">
                    Course Assignments
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Choose an assignment
                  </h2>
                </div>
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                  {assignments.length} total
                </div>
              </div>

              <div className="space-y-3">
                {assignments.map((assignment) => {
                  const resolved = resolveCanvasConfigFromAssignment({
                    assessmentMode: assignment.assessmentMode,
                    assessmentConfig: assignment.assessmentConfig,
                    processWeight: assignment.processWeight,
                  });
                  const enabledModes = getEnabledCanvasModes(resolved);
                  const primaryMode = pickPrimaryCanvasMode(resolved);
                  const selected = assignment.id === selectedAssignmentId;

                  return (
                    <button
                      key={assignment.id}
                      type="button"
                      onClick={() => setSelectedAssignmentId(assignment.id)}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        selected
                          ? 'border-[#0033A0] bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{assignment.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {assignment.pointsPossible} pts
                            {assignment.dueAt
                              ? ` · Due ${new Date(assignment.dueAt).toLocaleDateString()}`
                              : ' · No due date'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            assignment.isPublished
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {assignment.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#0033A0] px-2.5 py-1 text-[11px] font-semibold text-white">
                          Primary: {formatAssessmentModeLabel(primaryMode)}
                        </span>
                        {enabledModes.map((mode) => (
                          <span
                            key={mode.mode}
                            className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                          >
                            {formatAssessmentModeLabel(mode.mode)}
                          </span>
                        ))}
                      </div>

                      {selected && (
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0033A0]">
                          <PanelRightOpen className="size-3.5" />
                          Editing now
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="min-w-0">
              {selectedAssignment ? (
                <AssessmentCanvasDesigner
                  userEmail={currentUser.email}
                  assignmentId={selectedAssignment.id}
                  assignmentTitle={selectedAssignment.title}
                  onSaved={() => loadAssignments()}
                />
              ) : (
                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100">
                    <PanelRightOpen className="size-6 text-slate-500" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-slate-900">
                    Pick an assignment to begin
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    The designer will load the current canvas, keep the primary mode compatible,
                    and sync evidence types back to the assignment.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
