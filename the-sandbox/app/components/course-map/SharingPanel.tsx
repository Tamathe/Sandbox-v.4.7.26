'use client'

import { useState, useCallback, useRef } from 'react'
import {
  X,
  Share2,
  Download,
  Upload,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  Eye,
  Pencil,
  FileDown,
  ImageDown,
  Printer,
  Loader2,
  Users,
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import {
  CourseMapSharingService,
  type ShareLink,
  type SharedUser,
  type SharePermission,
  type ImportPreview,
} from '../../lib/course-map/sharing-service'

// ── Types ────────────────────────────────────────────────────────────────────

interface MapNode {
  id: string
  courseMapId: string
  courseUnitId: string | null
  label: string
  nodeType: string
  xPos: number
  yPos: number
  archived: boolean
}

interface MapEdge {
  id: string
  courseMapId: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

interface CourseUnit {
  id: string
  label: string
  unitType: string
  position: number
  startDate: string | null
  endDate: string | null
  modules: Array<{ id: string; label: string; lessons: Array<{ id: string; label: string }> }>
}

interface GraphMap {
  id: string
  courseId?: string
  courseCode?: string
  courseTitle?: string
  nodes: MapNode[]
  edges: MapEdge[]
  units: CourseUnit[]
}

interface SharingPanelProps {
  graphMap: GraphMap
  userEmail: string
  canvasRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  onImport?: (data: {
    nodes: Array<{ id: string; label: string; nodeType: string; xPos: number; yPos: number; courseUnitId: string | null; archived: boolean }>
    edges: Array<{ id: string; fromNodeId: string; toNodeId: string; edgeType: string }>
    units: Array<{ id: string; label: string; unitType: string; position: number; startDate: string | null; endDate: string | null }>
  }) => void
}

type TabId = 'share' | 'export' | 'import' | 'permissions'

// ── Component ────────────────────────────────────────────────────────────────

export default function SharingPanel({
  graphMap,
  userEmail,
  canvasRef,
  onClose,
  onImport,
}: SharingPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('share')

  // Share state
  const [sharePermission, setSharePermission] = useState<SharePermission>('view')
  const [shareLinks, setShareLinks] = useState<ShareLink[]>(() =>
    CourseMapSharingService.listSharedLinks(graphMap.id),
  )
  const [linkCopied, setLinkCopied] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)

  // Export state
  const [exportingJSON, setExportingJSON] = useState(false)
  const [jsonDone, setJsonDone] = useState(false)
  const [exportingPNG, setExportingPNG] = useState(false)
  const [pngDone, setPngDone] = useState(false)
  const [pngError, setPngError] = useState<string | null>(null)

  // Import state
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importData, setImportData] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Permissions state
  const [sharedUsers] = useState<SharedUser[]>(() =>
    CourseMapSharingService.listSharedUsers(graphMap.id),
  )

  // ── Share handlers ──────────────────────────────────────────────────────

  const handleGenerateLink = useCallback(() => {
    setGeneratingLink(true)
    setTimeout(() => {
      const link = CourseMapSharingService.generateShareLink(
        graphMap.id,
        sharePermission,
        userEmail,
      )
      setShareLinks((prev) => [link, ...prev])
      setGeneratingLink(false)
    }, 300)
  }, [graphMap.id, sharePermission, userEmail])

  const handleCopyLink = useCallback(async (link: ShareLink) => {
    const url = `${window.location.origin}/courses/${graphMap.courseId || graphMap.id}/course-map/embed?token=${link.token}`
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(link.id)
      setTimeout(() => setLinkCopied(null), 2000)
    } catch {
      // Clipboard API unavailable
    }
  }, [graphMap.courseId, graphMap.id])

  const handleRevokeLink = useCallback((linkId: string) => {
    CourseMapSharingService.revokeShareLink(linkId)
    setShareLinks((prev) => prev.filter((l) => l.id !== linkId))
  }, [])

  // ── Export handlers ─────────────────────────────────────────────────────

  const handleExportJSON = useCallback(() => {
    setExportingJSON(true)
    setTimeout(() => {
      CourseMapSharingService.exportAsJSON(graphMap, userEmail)
      setExportingJSON(false)
      setJsonDone(true)
      setTimeout(() => setJsonDone(false), 3000)
    }, 200)
  }, [graphMap, userEmail])

  const handleExportPNG = useCallback(async () => {
    if (!canvasRef.current) {
      setPngError('Canvas element not found')
      return
    }
    setExportingPNG(true)
    setPngError(null)
    try {
      await CourseMapSharingService.exportAsImage(
        canvasRef.current,
        `${graphMap.courseCode || 'course-map'}.png`,
      )
      setPngDone(true)
      setTimeout(() => setPngDone(false), 3000)
    } catch (err) {
      setPngError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExportingPNG(false)
    }
  }, [canvasRef, graphMap.courseCode])

  const handlePrint = useCallback(() => {
    if (!canvasRef.current) return
    CourseMapSharingService.printMap(canvasRef.current)
  }, [canvasRef])

  // ── Import handlers ─────────────────────────────────────────────────────

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      if (!content) return
      setImportData(content)
      const preview = CourseMapSharingService.previewImport(content)
      setImportPreview(preview)
    }
    reader.readAsText(file)

    // Reset input so same file can be selected again
    e.target.value = ''
  }, [])

  const handleImport = useCallback(() => {
    if (!importData || !importPreview?.valid || !onImport) return
    setImporting(true)
    try {
      const result = CourseMapSharingService.importFromJSON(
        importData,
        graphMap.courseId || graphMap.id,
      )
      onImport(result)
      setImportDone(true)
      setTimeout(() => {
        setImportDone(false)
        setImportPreview(null)
        setImportData(null)
      }, 3000)
    } finally {
      setImporting(false)
    }
  }, [importData, importPreview, onImport, graphMap.courseId, graphMap.id])

  const handleClearImport = useCallback(() => {
    setImportPreview(null)
    setImportData(null)
    setImportDone(false)
  }, [])

  // ── Tab definitions ─────────────────────────────────────────────────────

  const tabs: Array<{ id: TabId; label: string; icon: typeof Share2 }> = [
    { id: 'share', label: 'Share', icon: LinkIcon },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'permissions', label: 'Access', icon: Users },
  ]

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l-2 border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Share2 className="size-5 text-[#0033A0]" />
          <h2 className="text-lg font-extrabold text-gray-900">Share & Export</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
        >
          <X className="size-5 text-gray-500" />
        </button>
      </div>

      {/* Tab strip */}
      <div className="flex border-b border-gray-200" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#0033A0] text-[#0033A0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ── Share Tab ──────────────────────────────────────────── */}
        {activeTab === 'share' && (
          <>
            {/* Generate link card */}
            <div className="border-2 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-gray-900">Generate Share Link</h3>
              <p className="text-sm text-gray-500">
                Create a link to share this course map with others.
              </p>

              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">Permission:</label>
                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value as SharePermission)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                </select>
              </div>

              <button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880] disabled:opacity-50"
              >
                {generatingLink ? (
                  <><Loader2 className="size-4 animate-spin" /> Generating...</>
                ) : (
                  <><LinkIcon className="size-4" /> Generate Link</>
                )}
              </button>
            </div>

            {/* Active links */}
            {shareLinks.length > 0 && (
              <div className="border-2 rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-gray-900">Active Links</h3>
                <div className="space-y-2">
                  {shareLinks.map((link) => {
                    const isExpired = new Date(link.expiresAt) < new Date()
                    return (
                      <div
                        key={link.id}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                          isExpired
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {link.permission === 'edit' ? (
                              <Pencil className="size-3.5 text-amber-600" />
                            ) : (
                              <Eye className="size-3.5 text-blue-600" />
                            )}
                            <span className="text-sm font-medium text-gray-700 truncate">
                              {link.label}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                              link.permission === 'edit'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {link.permission === 'edit' ? 'Edit' : 'View'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="size-3 text-gray-400" />
                            <span className={`text-[10px] ${isExpired ? 'text-red-500' : 'text-gray-400'}`}>
                              {isExpired ? 'Expired' : `Expires ${new Date(link.expiresAt).toLocaleDateString()}`}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {link.accessCount} view{link.accessCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleCopyLink(link)}
                            className="rounded-lg p-1.5 hover:bg-gray-200 transition-colors"
                            title="Copy link"
                          >
                            {linkCopied === link.id ? (
                              <Check className="size-3.5 text-green-600" />
                            ) : (
                              <Copy className="size-3.5 text-gray-500" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRevokeLink(link.id)}
                            className="rounded-lg p-1.5 hover:bg-red-100 transition-colors"
                            title="Revoke link"
                          >
                            <Trash2 className="size-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Export Tab ─────────────────────────────────────────── */}
        {activeTab === 'export' && (
          <>
            {/* JSON Export */}
            <div className="border-2 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50">
                  <FileText className="size-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Export as JSON</h3>
                  <p className="text-sm text-gray-500">
                    Full map data — nodes, edges, units. Re-importable.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportJSON}
                disabled={exportingJSON}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880] disabled:opacity-50"
              >
                {exportingJSON ? (
                  <><Loader2 className="size-4 animate-spin" /> Exporting...</>
                ) : jsonDone ? (
                  <><Check className="size-4" /> Downloaded</>
                ) : (
                  <><FileDown className="size-4" /> Export JSON</>
                )}
              </button>
            </div>

            {/* PNG Export */}
            <div className="border-2 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-green-50">
                  <ImageDown className="size-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Export as PNG</h3>
                  <p className="text-sm text-gray-500">
                    High-resolution image of the current map view.
                  </p>
                </div>
              </div>
              {pngError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  <AlertTriangle className="size-4" />
                  {pngError}
                </div>
              )}
              <button
                onClick={handleExportPNG}
                disabled={exportingPNG}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880] disabled:opacity-50"
              >
                {exportingPNG ? (
                  <><Loader2 className="size-4 animate-spin" /> Capturing...</>
                ) : pngDone ? (
                  <><Check className="size-4" /> Downloaded</>
                ) : (
                  <><ImageDown className="size-4" /> Export PNG</>
                )}
              </button>
            </div>

            {/* Print */}
            <div className="border-2 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50">
                  <Printer className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Print Map</h3>
                  <p className="text-sm text-gray-500">
                    Open print dialog for the current map view.
                  </p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880]"
              >
                <Printer className="size-4" /> Print
              </button>
            </div>
          </>
        )}

        {/* ── Import Tab ─────────────────────────────────────────── */}
        {activeTab === 'import' && (
          <>
            {!importPreview ? (
              <div className="border-2 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50">
                    <Upload className="size-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Import from JSON</h3>
                    <p className="text-sm text-gray-500">
                      Upload a previously exported course map JSON file.
                    </p>
                  </div>
                </div>

                {/* Drop zone */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-8 text-gray-500 hover:border-[#0033A0] hover:bg-blue-50/30 transition-colors"
                >
                  <Upload className="size-8 text-gray-400" />
                  <span className="text-sm font-medium">Click to select a JSON file</span>
                  <span className="text-xs text-gray-400">or drag and drop</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border-2 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Import Preview</h3>
                  <button
                    onClick={handleClearImport}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                {importPreview.valid ? (
                  <>
                    {/* Source info */}
                    {(importPreview.courseCode || importPreview.courseTitle) && (
                      <div className="rounded-lg bg-blue-50 px-3 py-2">
                        <p className="text-sm font-semibold text-blue-900">
                          {importPreview.courseCode}{importPreview.courseCode && importPreview.courseTitle ? ' — ' : ''}{importPreview.courseTitle}
                        </p>
                        {importPreview.exportedBy && (
                          <p className="text-xs text-blue-700 mt-0.5">
                            Exported by {importPreview.exportedBy}
                            {importPreview.exportedAt && ` on ${new Date(importPreview.exportedAt).toLocaleDateString()}`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-gray-200 px-3 py-2 text-center">
                        <p className="text-xl font-extrabold text-gray-900">{importPreview.nodeCount}</p>
                        <p className="text-xs text-gray-500">Nodes</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 px-3 py-2 text-center">
                        <p className="text-xl font-extrabold text-gray-900">{importPreview.edgeCount}</p>
                        <p className="text-xs text-gray-500">Edges</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 px-3 py-2 text-center">
                        <p className="text-xl font-extrabold text-gray-900">{importPreview.unitCount}</p>
                        <p className="text-xs text-gray-500">Units</p>
                      </div>
                    </div>

                    {/* Import button */}
                    <button
                      onClick={handleImport}
                      disabled={importing || !onImport}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002880] disabled:opacity-50"
                    >
                      {importing ? (
                        <><Loader2 className="size-4 animate-spin" /> Importing...</>
                      ) : importDone ? (
                        <><Check className="size-4" /> Imported!</>
                      ) : (
                        <><Upload className="size-4" /> Import Map Data</>
                      )}
                    </button>

                    {!onImport && (
                      <p className="text-xs text-amber-600 text-center">
                        Import is read-only in the current context.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <AlertTriangle className="size-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-700">Invalid file</span>
                    </div>
                    {importPreview.errors.map((err, i) => (
                      <p key={i} className="text-sm text-red-600 pl-1">
                        {err}
                      </p>
                    ))}
                    <button
                      onClick={handleClearImport}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Try another file
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Permissions Tab ────────────────────────────────────── */}
        {activeTab === 'permissions' && (
          <>
            {/* Owner */}
            <div className="border-2 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-gray-900">Owner</h3>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#0033A0] text-white text-sm font-bold">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{userEmail}</p>
                  <p className="text-xs text-gray-500">Full access</p>
                </div>
                <ShieldCheck className="size-4 text-green-600" />
              </div>
            </div>

            {/* Shared users */}
            <div className="border-2 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-gray-900">Shared With</h3>

              {sharedUsers.length > 0 ? (
                <div className="space-y-2">
                  {sharedUsers.map((user) => (
                    <div
                      key={user.email}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2"
                    >
                      <div className="flex size-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-sm font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        user.permission === 'edit'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.permission === 'edit' ? 'Edit' : 'View'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="size-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No users have been added yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Share a link to give others access.
                  </p>
                </div>
              )}
            </div>

            {/* Active link summary */}
            <div className="border-2 rounded-2xl p-4 space-y-2">
              <h3 className="font-bold text-gray-900">Link Summary</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Active links</span>
                <span className="font-semibold text-gray-900">
                  {shareLinks.filter((l) => new Date(l.expiresAt) > new Date()).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Expired links</span>
                <span className="font-semibold text-gray-900">
                  {shareLinks.filter((l) => new Date(l.expiresAt) <= new Date()).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total views</span>
                <span className="font-semibold text-gray-900">
                  {shareLinks.reduce((sum, l) => sum + l.accessCount, 0)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
