'use client'

const ROLES = [
  'University Spokesperson',
  'Dean or Department Chair',
  'Public Safety Director',
  'President / Provost',
  'Student Affairs VP',
  'General Counsel (limited scope)',
]

interface RoleSelectorProps {
  selected: string
  onSelect: (role: string) => void
}

export default function RoleSelector({ selected, onSelect }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Your Role</h3>
      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => {
          const isActive = selected === role
          return (
            <button
              key={role}
              type="button"
              onClick={() => onSelect(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {role}
            </button>
          )
        })}
      </div>
    </div>
  )
}
