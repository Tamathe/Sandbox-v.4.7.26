'use client'

import { Loader2, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import type { Course } from './course-types'

interface CourseSidebarProps {
  courses: Course[]
  selectedCourseId: string | null
  onSelect: (courseId: string) => void
  isEducator: boolean
  showNewCourseForm: boolean
  onOpenNewCourse: () => void
  onCancelNewCourse: () => void
  onCreateCourse: (event: React.FormEvent<HTMLFormElement>) => void
  newCourseForm: { courseCode: string; title: string; description: string; isPublic: boolean }
  onCourseFieldChange: (
    field: 'courseCode' | 'title' | 'description' | 'isPublic',
    value: string | boolean
  ) => void
  creatingCourse: boolean
}

export default function CourseSidebar({
  courses,
  selectedCourseId,
  onSelect,
  isEducator,
  showNewCourseForm,
  onOpenNewCourse,
  onCancelNewCourse,
  onCreateCourse,
  newCourseForm,
  onCourseFieldChange,
  creatingCourse,
}: CourseSidebarProps) {
  const [search, setSearch] = useState('')

  const filteredCourses = search.trim()
    ? courses.filter(
        (c) =>
          c.courseCode.toLowerCase().includes(search.toLowerCase()) ||
          c.title.toLowerCase().includes(search.toLowerCase())
      )
    : courses

  return (
    <aside className="hidden lg:flex lg:flex-col">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">
            {isEducator ? 'My courses' : 'Courses'}
          </div>
          {courses.length > 3 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#0033A0] focus:bg-white transition-colors"
              />
            </div>
          )}
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {filteredCourses.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {search ? 'No courses match your search.' : isEducator ? 'Create your first course to get started.' : 'No public courses available yet.'}
            </div>
          ) : (
            filteredCourses.map((course) => {
              const isSelected = course.id === selectedCourseId
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onSelect(course.id)}
                  className={`w-full border-l-2 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                      : 'border-transparent text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-xs font-bold">{course.courseCode}</div>
                  <div className="truncate text-sm">{course.title}</div>
                  <div className="text-[10px] text-gray-400">{course._count.materials} materials</div>
                </button>
              )
            })
          )}
        </div>

        {isEducator && (
          <div className="border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={onOpenNewCourse}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
            >
              <Plus className="h-4 w-4" />
              New Course
            </button>

            {showNewCourseForm && (
              <form
                onSubmit={onCreateCourse}
                className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Course Code
                  </label>
                  <input
                    value={newCourseForm.courseCode}
                    onChange={(e) => onCourseFieldChange('courseCode', e.target.value)}
                    placeholder="TEK-100"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Title
                  </label>
                  <input
                    value={newCourseForm.title}
                    onChange={(e) => onCourseFieldChange('title', e.target.value)}
                    placeholder="Technology & Society"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Description
                  </label>
                  <textarea
                    value={newCourseForm.description}
                    onChange={(e) => onCourseFieldChange('description', e.target.value)}
                    rows={3}
                    placeholder="What is this course about?"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0033A0]"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={newCourseForm.isPublic}
                    onChange={(e) => onCourseFieldChange('isPublic', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#0033A0] focus:ring-[#0033A0]"
                  />
                  Public course
                </label>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onCancelNewCourse}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingCourse}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:opacity-50"
                  >
                    {creatingCourse && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Course
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
