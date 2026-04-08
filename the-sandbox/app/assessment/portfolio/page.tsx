'use client';

import { useEffect, useState } from 'react';
import { Loader2, School, Target } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import CompetencyDashboard from '../../components/assessment/CompetencyDashboard';
import CompetencyFacultyView from '../../components/assessment/CompetencyFacultyView';
import { useAuth } from '../../lib/auth-context';

interface FacultyCourseOption {
  id: string;
  courseCode: string;
  title: string;
}

export default function AssessmentPortfolioPage() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<FacultyCourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  const showFacultyView = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN';

  useEffect(() => {
    if (!showFacultyView) return;

    let cancelled = false;

    async function loadCourses() {
      setLoadingCourses(true);
      setCourseError(null);

      try {
        const res = await fetch('/api/courses', {
          headers: { 'x-demo-user-email': currentUser.email },
        });
        const payload = (await res.json()) as Array<FacultyCourseOption> & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(payload.error ?? 'Failed to load courses');
        }

        if (!cancelled) {
          setCourses(payload);
          setSelectedCourseId((current) =>
            current && payload.some((course) => course.id === current)
              ? current
              : (payload[0]?.id ?? '')
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCourses([]);
          setSelectedCourseId('');
          setCourseError(err instanceof Error ? err.message : 'Failed to load courses');
        }
      } finally {
        if (!cancelled) {
          setLoadingCourses(false);
        }
      }
    }

    void loadCourses();
    return () => {
      cancelled = true;
    };
  }, [currentUser.email, showFacultyView]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Assessment Portfolio"
        subtitle="Track demonstrated competencies across courses, assessments, and live learning evidence."
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <CompetencyDashboard userEmail={currentUser.email} />

        {showFacultyView && (
          <section className="space-y-4">
            <div className="rounded-3xl border-2 border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0033A0]">
                    Faculty Distribution
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    Class-level competency view
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    FERPA-safe distribution across Developing, Proficient, Advanced, and Expert.
                  </p>
                </div>

                <div className="min-w-[260px]">
                  <label
                    htmlFor="faculty-portfolio-course"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Course
                  </label>
                  <select
                    id="faculty-portfolio-course"
                    value={selectedCourseId}
                    onChange={(event) => setSelectedCourseId(event.target.value)}
                    disabled={loadingCourses || courses.length === 0}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0033A0]"
                  >
                    {courses.length === 0 && <option value="">No courses available</option>}
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.courseCode} · {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loadingCourses && (
              <div className="flex items-center justify-center rounded-3xl border-2 border-gray-200 bg-white p-12">
                <Loader2 className="size-5 animate-spin text-[#0033A0]" />
              </div>
            )}

            {!loadingCourses && courseError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {courseError}
              </div>
            )}

            {!loadingCourses && !courseError && !selectedCourseId && (
              <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100">
                  <School className="size-6 text-slate-500" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  No faculty courses available yet
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Once a course has enrollments and assessment evidence, the class distribution will
                  appear here.
                </p>
              </div>
            )}

            {!loadingCourses && !courseError && selectedCourseId && (
              <CompetencyFacultyView userEmail={currentUser.email} courseId={selectedCourseId} />
            )}
          </section>
        )}

        {!showFacultyView && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Target className="mr-2 inline size-4" />
            Faculty-only class distribution appears here for instructors and admins. Your personal
            portfolio above is live now.
          </div>
        )}
      </div>
    </div>
  );
}
