'use client'

import { useState } from 'react'
import { Search, FileText, Loader2, ChevronDown } from 'lucide-react'

interface CourseWithAssignments {
  id: string
  courseCode: string
  title: string
  assignments: { id: string; title: string; description: string | null; category: string | null }[]
}

interface AssignmentScannerProps {
  courses: CourseWithAssignments[]
  onScan: (text: string, type?: string, discipline?: string) => void
  scanning: boolean
}

export default function AssignmentScanner({ courses, onScan, scanning }: AssignmentScannerProps) {
  const [mode, setMode] = useState<'paste' | 'select'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [assignmentType, setAssignmentType] = useState('')
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null)
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)

  function handleScanPaste() {
    if (pasteText.trim().length < 10) return
    onScan(pasteText, assignmentType || undefined)
  }

  function handleSelectAssignment(courseCode: string, assignment: { title: string; description: string | null; category: string | null }) {
    const text = `${assignment.title}\n\n${assignment.description || '(No description provided)'}`
    setSelectedAssignment(assignment.title)
    onScan(text, assignment.category || undefined)
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('paste')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'paste' ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FileText className="size-4" />
          Paste Assignment
        </button>
        <button
          onClick={() => setMode('select')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'select' ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Search className="size-4" />
          Select Existing
        </button>
      </div>

      {/* Paste mode */}
      {mode === 'paste' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignment prompt or description</label>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste your assignment prompt here. Include the instructions you give students, any rubric details, and submission requirements."
              rows={8}
              className="w-full p-4 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-transparent resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignment type (optional)</label>
            <select
              value={assignmentType}
              onChange={e => setAssignmentType(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
            >
              <option value="">Auto-detect</option>
              <option value="essay">Essay</option>
              <option value="research paper">Research Paper</option>
              <option value="problem set">Problem Set</option>
              <option value="lab report">Lab Report</option>
              <option value="presentation">Presentation</option>
              <option value="group project">Group Project</option>
              <option value="reading response">Reading Response</option>
              <option value="discussion post">Discussion Post</option>
              <option value="exam">Exam / Quiz</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <button
              onClick={handleScanPaste}
              disabled={pasteText.trim().length < 10 || scanning}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white rounded-lg hover:bg-[#002880] font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {scanning ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              {scanning ? 'Scanning...' : 'Scan for AI Vulnerability'}
            </button>
            {pasteText.length > 0 && pasteText.trim().length < 10 && (
              <p className="text-xs text-gray-400">Paste at least 10 characters to scan</p>
            )}
          </div>
        </div>
      )}

      {/* Select mode */}
      {mode === 'select' && (
        <div className="space-y-3">
          {courses.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No courses with assignments found. Try pasting an assignment instead.</p>
          ) : (
            courses.map(course => (
              <div key={course.id} className="border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {course.courseCode} — {course.title}
                    <span className="text-gray-400 ml-2">({course.assignments.length})</span>
                  </span>
                  <ChevronDown className={`size-4 text-gray-400 transition-transform ${expandedCourse === course.id ? 'rotate-180' : ''}`} />
                </button>

                {expandedCourse === course.id && (
                  <div className="p-2 space-y-1">
                    {course.assignments.length === 0 ? (
                      <p className="text-xs text-gray-400 p-2">No assignments in this course.</p>
                    ) : (
                      course.assignments.map(a => (
                        <button
                          key={a.id}
                          onClick={() => handleSelectAssignment(course.courseCode, a)}
                          disabled={scanning}
                          className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                            selectedAssignment === a.title && scanning
                              ? 'bg-blue-50 border border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{a.title}</span>
                            {a.category && (
                              <span className="text-xs text-gray-400">({a.category})</span>
                            )}
                            {selectedAssignment === a.title && scanning && (
                              <Loader2 className="size-3 animate-spin text-[#0033A0]" />
                            )}
                          </div>
                          {a.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
