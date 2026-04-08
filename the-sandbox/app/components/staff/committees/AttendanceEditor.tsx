'use client'

import { UserCheck, UserX } from 'lucide-react'

export interface AttendanceMember {
  name: string
  role?: string
  present: boolean
}

interface AttendanceEditorProps {
  members: AttendanceMember[]
  onChange: (members: AttendanceMember[]) => void
  disabled?: boolean
}

export default function AttendanceEditor({ members, onChange, disabled }: AttendanceEditorProps) {
  const toggle = (index: number) => {
    if (disabled) return
    const next = [...members]
    next[index] = { ...next[index], present: !next[index].present }
    onChange(next)
  }

  const presentCount = members.filter((m) => m.present).length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-900">Attendance</h4>
        <span className="text-xs text-gray-500">
          {presentCount} of {members.length} present
        </span>
      </div>
      <div className="space-y-1">
        {members.map((member, i) => (
          <button
            key={member.name}
            type="button"
            disabled={disabled}
            onClick={() => toggle(i)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
              member.present
                ? 'bg-green-50 hover:bg-green-100'
                : 'bg-red-50 hover:bg-red-100'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {member.present ? (
              <UserCheck className="size-4 text-green-600 shrink-0" />
            ) : (
              <UserX className="size-4 text-red-500 shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-900">{member.name}</span>
            {member.role && (
              <span className="text-xs text-gray-500 ml-auto">{member.role}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
