'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Building2, Users, FolderOpen, ArrowRight } from 'lucide-react'

interface DepartmentCardProps {
  department: {
    id: string
    name: string
    shortName: string
    slug: string
    description?: string | null
    logoUrl?: string | null
    themeColor?: string | null
    _count: { collections: number; followers: number; members: number }
  }
}

export default function DepartmentCard({ department }: DepartmentCardProps) {
  const color = department.themeColor ?? '#0033A0'

  return (
    <Link
      href={`/hub/s/${department.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border-2 border-gray-200 bg-white p-5 transition-all hover:border-[#0033A0]/40 hover:shadow-md hover:-translate-y-0.5 min-w-[240px]"
    >
      {/* Icon + name */}
      <div className="flex items-center gap-3">
        {department.logoUrl ? (
          <Image src={department.logoUrl} alt={`${department.shortName} department logo`} width={40} height={40} className="size-10 rounded-lg object-cover" />
        ) : (
          <div
            className="size-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <Building2 className="size-5" style={{ color }} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-[#0033A0] transition-colors truncate">
            {department.shortName}
          </h3>
        </div>
      </div>

      {/* Description */}
      {department.description && (
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
          {department.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-400 mt-auto">
        <span className="flex items-center gap-1">
          <FolderOpen className="size-3" />
          {department._count.collections} collections
        </span>
        <span className="flex items-center gap-1">
          <Users className="size-3" />
          {department._count.followers} followers
        </span>
      </div>

      {/* CTA */}
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033A0] opacity-0 group-hover:opacity-100 transition-opacity">
        Browse storefront <ArrowRight className="size-3" />
      </span>
    </Link>
  )
}
