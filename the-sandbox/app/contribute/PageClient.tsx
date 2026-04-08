'use client'

import { useState } from 'react'
import { MessageSquareText, FolderHeart, Lightbulb, MapPin, Trophy } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TabNav, { type Tab } from '../components/TabNav'
import FeedbackTab from '../components/contribute/FeedbackTab'
import CollectionsTab from '../components/contribute/CollectionsTab'
import SuggestionsTab from '../components/contribute/SuggestionsTab'
import CampusTipsTab from '../components/contribute/CampusTipsTab'
import ImpactTab from '../components/contribute/ImpactTab'

const TABS: Tab[] = [
  { id: 'feedback', label: 'Feedback', icon: MessageSquareText },
  { id: 'collections', label: 'Collections', icon: FolderHeart },
  { id: 'suggestions', label: 'Suggestions', icon: Lightbulb },
  { id: 'campus-tips', label: 'Campus Tips', icon: MapPin },
  { id: 'impact', label: 'Impact', icon: Trophy },
]

export default function ContributePage() {
  const [activeTab, setActiveTab] = useState('feedback')

  return (
    <>
      <PageHeader
        title="Contribute"
        subtitle="Help make the University of Kentucky platform better for every Wildcat"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} className="mb-8" />

        {activeTab === 'feedback' && <FeedbackTab />}
        {activeTab === 'collections' && <CollectionsTab />}
        {activeTab === 'suggestions' && <SuggestionsTab />}
        {activeTab === 'campus-tips' && <CampusTipsTab />}
        {activeTab === 'impact' && <ImpactTab />}
      </div>
    </>
  )
}
