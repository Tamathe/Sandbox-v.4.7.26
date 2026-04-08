'use client'

import { useState, useCallback } from 'react'
import {
  X,
  Download,
  FileText,
  Presentation,
  Table2,
  Link as LinkIcon,
  Loader2,
  Check,
  Copy,
  FileDown,
} from 'lucide-react'
import {
  exportToPDF,
  exportToSlides,
  exportToCSV,
  generateShareableLink,
  downloadCSV,
  downloadJSON,
  type GraphMap,
  type PdfExportOptions,
  type SlideExportOptions,
  type ShareableLinkData,
} from '../../lib/course-map/export-suite-service'

// ── Props ────────────────────────────────────────────────────────────────────

interface ExportSuitePanelProps {
  graphMap: GraphMap
  userEmail: string
  onClose: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ExportSuitePanel({
  graphMap,
  userEmail,
  onClose,
}: ExportSuitePanelProps) {
  // PDF options
  const [pdfIncludeDesc, setPdfIncludeDesc] = useState(true)
  const [pdfIncludePrereqs, setPdfIncludePrereqs] = useState(true)
  const [pdfPageSize, setPdfPageSize] = useState<'letter' | 'a4'>('letter')
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [pdfExporting, setPdfExporting] = useState(false)
  const [pdfDone, setPdfDone] = useState(false)

  // Slides options
  const [slidesIncludeDesc, setSlidesIncludeDesc] = useState(true)
  const [slidesIncludeModules, setSlidesIncludeModules] = useState(true)
  const [slidesExporting, setSlidesExporting] = useState(false)
  const [slidesDone, setSlidesDone] = useState(false)

  // CSV
  const [csvExporting, setCsvExporting] = useState(false)
  const [csvDone, setCsvDone] = useState(false)

  // Share link
  const [shareLink, setShareLink] = useState<ShareableLinkData | null>(null)
  const [shareLinkLoading, setShareLinkLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handlePdfExport = useCallback(async () => {
    setPdfExporting(true)
    setPdfDone(false)
    try {
      const options: PdfExportOptions = {
        includeDescriptions: pdfIncludeDesc,
        includePrerequisites: pdfIncludePrereqs,
        pageSize: pdfPageSize,
        orientation: pdfOrientation,
      }
      const pages = exportToPDF(graphMap, options)
      downloadJSON(pages, `${graphMap.courseCode || 'course-map'}-export.json`)
      setPdfDone(true)
      setTimeout(() => setPdfDone(false), 3000)
    } finally {
      setPdfExporting(false)
    }
  }, [graphMap, pdfIncludeDesc, pdfIncludePrereqs, pdfPageSize, pdfOrientation])

  const handleSlidesExport = useCallback(async () => {
    setSlidesExporting(true)
    setSlidesDone(false)
    try {
      const options: SlideExportOptions = {
        includeDescriptions: slidesIncludeDesc,
        includeModuleDetails: slidesIncludeModules,
      }
      const slides = exportToSlides(graphMap, options)
      downloadJSON(slides, `${graphMap.courseCode || 'course-map'}-slides.json`)
      setSlidesDone(true)
      setTimeout(() => setSlidesDone(false), 3000)
    } finally {
      setSlidesExporting(false)
    }
  }, [graphMap, slidesIncludeDesc, slidesIncludeModules])

  const handleCsvExport = useCallback(async () => {
    setCsvExporting(true)
    setCsvDone(false)
    try {
      const csv = exportToCSV(graphMap)
      downloadCSV(csv, `${graphMap.courseCode || 'course-map'}-export.csv`)
      setCsvDone(true)
      setTimeout(() => setCsvDone(false), 3000)
    } finally {
      setCsvExporting(false)
    }
  }, [graphMap])

  const handleShareLink = useCallback(async () => {
    setShareLinkLoading(true)
    try {
      const link = await generateShareableLink(graphMap.id, userEmail)
      setShareLink(link)
    } finally {
      setShareLinkLoading(false)
    }
  }, [graphMap.id, userEmail])

  const handleCopyLink = useCallback(async () => {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink.url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [shareLink])

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l-2 border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Download className="size-5 text-[#0033A0]" />
          <h2 className="text-lg font-extrabold text-gray-900">Export Course Map</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 transition-colors">
          <X className="size-5 text-gray-500" />
        </button>
      </div>

      {/* Export Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* PDF Export Card */}
        <div className="border-2 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-50">
              <FileText className="size-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">PDF Document</h3>
              <p className="text-sm text-gray-500">Course structure with layout and hierarchy</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pdfIncludeDesc}
                onChange={(e) => setPdfIncludeDesc(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-gray-700">Include descriptions</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pdfIncludePrereqs}
                onChange={(e) => setPdfIncludePrereqs(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-gray-700">Include prerequisites</span>
            </label>
            <div className="flex items-center gap-3">
              <select
                value={pdfPageSize}
                onChange={(e) => setPdfPageSize(e.target.value as 'letter' | 'a4')}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
              >
                <option value="letter">Letter</option>
                <option value="a4">A4</option>
              </select>
              <select
                value={pdfOrientation}
                onChange={(e) => setPdfOrientation(e.target.value as 'portrait' | 'landscape')}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
          </div>

          <button
            onClick={handlePdfExport}
            disabled={pdfExporting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880] disabled:opacity-50"
          >
            {pdfExporting ? (
              <><Loader2 className="size-4 animate-spin" /> Generating...</>
            ) : pdfDone ? (
              <><Check className="size-4" /> Downloaded</>
            ) : (
              <><FileDown className="size-4" /> Export PDF Data</>
            )}
          </button>
        </div>

        {/* Slides Export Card */}
        <div className="border-2 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-50">
              <Presentation className="size-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Slide Deck</h3>
              <p className="text-sm text-gray-500">One slide per unit with module breakdown</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={slidesIncludeDesc}
                onChange={(e) => setSlidesIncludeDesc(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-gray-700">Include descriptions</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={slidesIncludeModules}
                onChange={(e) => setSlidesIncludeModules(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-gray-700">Include module details</span>
            </label>
          </div>

          <button
            onClick={handleSlidesExport}
            disabled={slidesExporting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880] disabled:opacity-50"
          >
            {slidesExporting ? (
              <><Loader2 className="size-4 animate-spin" /> Generating...</>
            ) : slidesDone ? (
              <><Check className="size-4" /> Downloaded</>
            ) : (
              <><FileDown className="size-4" /> Export Slides Data</>
            )}
          </button>
        </div>

        {/* CSV Export Card */}
        <div className="border-2 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-green-50">
              <Table2 className="size-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">CSV Spreadsheet</h3>
              <p className="text-sm text-gray-500">Flat structure: units, modules, lessons, prerequisites</p>
            </div>
          </div>

          <button
            onClick={handleCsvExport}
            disabled={csvExporting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880] disabled:opacity-50"
          >
            {csvExporting ? (
              <><Loader2 className="size-4 animate-spin" /> Generating...</>
            ) : csvDone ? (
              <><Check className="size-4" /> Downloaded</>
            ) : (
              <><FileDown className="size-4" /> Export CSV</>
            )}
          </button>
        </div>

        {/* Shareable Link Card */}
        <div className="border-2 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50">
              <LinkIcon className="size-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Shareable Link</h3>
              <p className="text-sm text-gray-500">Read-only link with 7-day expiry</p>
            </div>
          </div>

          {!shareLink ? (
            <button
              onClick={handleShareLink}
              disabled={shareLinkLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880] disabled:opacity-50"
            >
              {shareLinkLoading ? (
                <><Loader2 className="size-4 animate-spin" /> Creating link...</>
              ) : (
                <><LinkIcon className="size-4" /> Generate Link</>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="flex-1 truncate text-sm text-gray-600 select-all">{shareLink.url}</span>
                <button
                  onClick={handleCopyLink}
                  className="rounded-lg p-1.5 hover:bg-gray-200 transition-colors"
                  title="Copy link"
                >
                  {linkCopied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4 text-gray-500" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Expires: {new Date(shareLink.expiresAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
