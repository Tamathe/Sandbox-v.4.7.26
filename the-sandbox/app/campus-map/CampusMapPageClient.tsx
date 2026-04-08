'use client'

import dynamic from 'next/dynamic'

const CampusMapClient = dynamic(
  () => import('../components/campus-map/CampusMapClient'),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
)

export default function CampusMapPageClient() {
  return (
    <div className="p-4 lg:p-6">
      <CampusMapClient />
    </div>
  )
}

function MapSkeleton() {
  return (
    <div className="h-[calc(100vh-8rem)] animate-pulse bg-gray-100 flex items-center justify-center rounded-2xl">
      <p className="text-gray-400">Loading campus map...</p>
    </div>
  )
}
