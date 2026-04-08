import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbProps {
  items: { label: string; href?: string }[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const visible = items.slice(0, 3)
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-gray-400">
      {visible.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 flex-shrink-0" />}
          {item.href && i < visible.length - 1 ? (
            <Link href={item.href} className="hover:text-[#0033A0] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="truncate max-w-[200px]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
