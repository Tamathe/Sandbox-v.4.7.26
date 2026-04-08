import { type ReactNode, type ElementType } from 'react'

interface StaffCardProps {
  title: string
  icon?: ElementType
  loading: boolean
  emptyMessage?: string
  isEmpty?: boolean
  headerRight?: ReactNode
  loadingSkeleton?: ReactNode
  children: ReactNode
}

export function StaffCard({
  title,
  icon: Icon,
  loading,
  isEmpty,
  emptyMessage = 'No data available.',
  headerRight,
  loadingSkeleton,
  children,
}: StaffCardProps) {
  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="size-5 text-[#0033A0]" />}
        <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
        {headerRight}
      </div>
      {loading ? (
        loadingSkeleton ?? (
          <div className="space-y-3">
            <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        )
      ) : isEmpty ? (
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      ) : (
        children
      )}
    </div>
  )
}
