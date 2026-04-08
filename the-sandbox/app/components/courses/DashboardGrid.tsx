'use client'

export function DashboardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  )
}

export function WidgetFull({ children }: { children: React.ReactNode }) {
  return <div className="md:col-span-2">{children}</div>
}

export function WidgetHalf({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
