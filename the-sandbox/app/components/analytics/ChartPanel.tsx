import { type ReactNode, type ElementType } from 'react'

interface ChartPanelProps {
  title: string
  subtitle?: string
  icon: ElementType
  iconClassName?: string
  loading: boolean
  error: boolean
  errorMessage?: string
  emptyMessage?: string
  isEmpty?: boolean
  headerRight?: ReactNode
  children: ReactNode
}

export function ChartPanel({
  title,
  subtitle,
  icon: Icon,
  iconClassName = 'text-[#0033A0]',
  loading,
  error,
  errorMessage = 'Failed to load data',
  isEmpty,
  emptyMessage = 'No data available',
  headerRight,
  children,
}: ChartPanelProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`size-4 ${iconClassName}`} />
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <span className="text-xs text-gray-400 ml-1">{subtitle}</span>}
        {headerRight}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="size-5 animate-spin rounded-full border-2 border-[#0033A0] border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 text-center py-6">{errorMessage}</p>
      ) : isEmpty ? (
        <p className="text-sm text-gray-400 text-center py-6">{emptyMessage}</p>
      ) : (
        children
      )}
    </div>
  )
}
