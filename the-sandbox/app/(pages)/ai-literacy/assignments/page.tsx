'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen, RefreshCw, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import AssignmentScanner from '../../../components/ai-literacy/AssignmentScanner'
import VulnerabilityReport from '../../../components/ai-literacy/VulnerabilityReport'
import RedesignTemplates from '../../../components/ai-literacy/RedesignTemplates'
import ScanComparison from '../../../components/ai-literacy/ScanComparison'
import LoadingSpinner from '../../../components/LoadingSpinner'
import Button from '../../../components/Button'
import PathwayNav from '../../../components/ai-literacy/PathwayNav'

type Tab = 'scanner' | 'templates'

interface ScanResult {
  aiCompletability: number
  bloomLevel: string
  vulnerabilities: { type: string; description: string; severity: 'low' | 'medium' | 'high' | 'critical' }[]
  suggestions: { title: string; description: string; effort: 'low' | 'medium' | 'high'; bloomShift: string | null; example: string }[]
  summary: string
  detectedTypes?: string[]
}

interface CourseWithAssignments {
  id: string
  courseCode: string
  title: string
  assignments: { id: string; title: string; description: string | null; category: string | null }[]
}

interface RedesignTemplate {
  id: string
  originalType: string
  redesignApproach: string
  description: string
  bloomShift: string
  effort: 'low' | 'medium' | 'high'
  before: string
  after: string
}

export default function AssignmentRedesignPage() {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState<Tab>('scanner')
  const [courses, setCourses] = useState<CourseWithAssignments[]>([])
  const [templates, setTemplates] = useState<RedesignTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [previousScan, setPreviousScan] = useState<ScanResult | null>(null)
  const [showRescan, setShowRescan] = useState(false)
  const [rescanText, setRescanText] = useState('')
  const [rescanResult, setRescanResult] = useState<ScanResult | null>(null)
  const [lastScannedText, setLastScannedText] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ai-literacy/assignments/scan', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) {
          const data = await res.json()
          setCourses(data.courses)
          setTemplates(data.templates)
        }
      } catch (err) {
        console.error('Failed to load assignment scan data:', err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [currentUser.email])

  async function handleScan(text: string, type?: string, discipline?: string) {
    setScanning(true)
    setScanResult(null)
    setLastScannedText(text)
    try {
      const res = await fetch('/api/ai-literacy/assignments/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ assignmentText: text, assignmentType: type, discipline }),
      })
      if (res.ok) {
        setScanResult(await res.json())
      }
    } catch {
      // handle error
    } finally {
      setScanning(false)
    }
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Link href="/ai-literacy" className="hover:text-gray-900">AI Literacy</Link>
          <ChevronRight className="size-3" />
          <span>Assignment Redesign Studio</span>
        </nav>
      </div>
      <PageHeader
        title="Assignment Redesign Studio"
        subtitle="Scan your assignments for AI vulnerability and get actionable redesign suggestions"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-8">
          <button
            onClick={() => setTab('scanner')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'scanner' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search className="size-4" />
            Scan Assignment
          </button>
          <button
            onClick={() => setTab('templates')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'templates' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="size-4" />
            Redesign Templates
          </button>
        </div>

        {tab === 'scanner' && (
          <div className="space-y-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                <div className="border rounded-2xl shadow-sm p-6 bg-white">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Choose an assignment to scan</h3>
                  <AssignmentScanner courses={courses} onScan={handleScan} scanning={scanning} />
                </div>

                {scanResult && !rescanResult && (
                  <>
                    <VulnerabilityReport
                      aiCompletability={scanResult.aiCompletability}
                      bloomLevel={scanResult.bloomLevel}
                      vulnerabilities={scanResult.vulnerabilities}
                      suggestions={scanResult.suggestions}
                      summary={scanResult.summary}
                      detectedTypes={scanResult.detectedTypes}
                      assignmentText={lastScannedText}
                      userEmail={currentUser.email}
                      onRedesignComplete={(redesignedText) => {
                        setPreviousScan(scanResult)
                        setRescanText(redesignedText)
                        setShowRescan(true)
                      }}
                    />

                    {/* Rescan flow */}
                    {!showRescan ? (
                      <button
                        onClick={() => { setPreviousScan(scanResult); setShowRescan(true) }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                      >
                        <RefreshCw className="size-4" />
                        Rescan After Redesign
                      </button>
                    ) : (
                      <div className="border rounded-2xl shadow-sm p-6 bg-white space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Paste your redesigned assignment</h3>
                        <textarea
                          value={rescanText}
                          onChange={e => setRescanText(e.target.value)}
                          rows={6}
                          placeholder="Paste the redesigned assignment text here to compare..."
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0033A0] outline-none resize-none"
                        />
                        <div className="flex gap-3">
                          <Button
                            onClick={async () => {
                              if (rescanText.trim().length < 10) return
                              setScanning(true)
                              const res = await fetch('/api/ai-literacy/assignments/scan', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
                                body: JSON.stringify({ assignmentText: rescanText }),
                              })
                              if (res.ok) setRescanResult(await res.json())
                              setScanning(false)
                            }}
                            disabled={rescanText.trim().length < 10 || scanning}
                            loading={scanning}
                            icon={!scanning ? <Search /> : undefined}
                          >
                            Compare
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => { setShowRescan(false); setRescanText('') }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Comparison view */}
                {rescanResult && previousScan && (
                  <div className="space-y-4">
                    <ScanComparison original={previousScan} redesigned={rescanResult} />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setRescanResult(null)
                        setPreviousScan(null)
                        setShowRescan(false)
                        setRescanText('')
                        setScanResult(null)
                      }}
                    >
                      Start New Scan
                    </Button>
                  </div>
                )}

              </>
            )}
          </div>
        )}

        {tab === 'templates' && (
          <RedesignTemplates templates={templates} />
        )}

        <PathwayNav />
      </div>
    </>
  )
}
