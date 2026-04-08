'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '../../components/PageHeader'
import ScenarioBrowser from '../../components/audio/scenarios/ScenarioBrowser'

export default function ScenariosPage() {
  const router = useRouter()
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Interactive Scenarios"
        subtitle="Practice professional skills through AI-powered role-play"
      />
      <ScenarioBrowser onSelect={id => router.push(`/audio/scenarios/${id}`)} />
    </div>
  )
}
