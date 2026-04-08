'use client'

import { useState, useMemo } from 'react'
import {
  X,
  Search,
  Package,
  Download,
  Trash2,
  CheckCircle,
  Layers,
  BarChart3,
  Users,
  Eye,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react'
import type { PluginManifest, PluginEntry } from '../../lib/course-map/plugin-registry'
import type { SamplePluginDef } from '../../lib/course-map/sample-plugins'

// ── Category config ────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Node Types', 'Calculators', 'Trackers', 'Visualizations', 'Integrations'] as const

const CATEGORY_ICONS: Record<string, typeof Layers> = {
  'Node Types': Layers,
  'Calculators': BarChart3,
  'Trackers': Users,
  'Visualizations': Eye,
  'Integrations': LinkIcon,
}

// ── Props ──────────────────────────────────────────────────────────────────

interface PluginMarketplaceProps {
  installedPlugins: PluginEntry[]
  availablePlugins: SamplePluginDef[]
  onInstall: (pluginId: string) => Promise<void>
  onUninstall: (pluginId: string) => Promise<void>
  onSelectPlugin: (manifest: PluginManifest) => void
  onClose: () => void
}

export default function PluginMarketplace({
  installedPlugins,
  availablePlugins,
  onInstall,
  onUninstall,
  onSelectPlugin,
  onClose,
}: PluginMarketplaceProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [tab, setTab] = useState<'available' | 'installed'>('available')
  const [installing, setInstalling] = useState<string | null>(null)
  const [uninstalling, setUninstalling] = useState<string | null>(null)

  const installedIds = useMemo(() => new Set(installedPlugins.map((p) => p.manifest.id)), [installedPlugins])

  const filteredAvailable = useMemo(() => {
    return availablePlugins.filter((p) => {
      if (category !== 'All' && p.manifest.category !== category) return false
      if (search && !p.manifest.name.toLowerCase().includes(search.toLowerCase()) && !p.manifest.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [availablePlugins, category, search])

  const filteredInstalled = useMemo(() => {
    return installedPlugins.filter((p) => {
      if (category !== 'All' && p.manifest.category !== category) return false
      if (search && !p.manifest.name.toLowerCase().includes(search.toLowerCase()) && !p.manifest.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [installedPlugins, category, search])

  const handleInstall = async (pluginId: string) => {
    setInstalling(pluginId)
    try {
      await onInstall(pluginId)
    } finally {
      setInstalling(null)
    }
  }

  const handleUninstall = async (pluginId: string) => {
    setUninstalling(pluginId)
    try {
      await onUninstall(pluginId)
    } finally {
      setUninstalling(null)
    }
  }

  const categoryBadgeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of CATEGORIES) {
      if (cat === 'All') {
        counts[cat] = tab === 'installed' ? installedPlugins.length : availablePlugins.length
      } else {
        counts[cat] = tab === 'installed'
          ? installedPlugins.filter((p) => p.manifest.category === cat).length
          : availablePlugins.filter((p) => p.manifest.category === cat).length
      }
    }
    return counts
  }, [tab, installedPlugins, availablePlugins])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border-2 border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Package className="size-6 text-[#0033A0]" />
            <h2 className="text-xl font-extrabold text-gray-900">Plugin Marketplace</h2>
            <span className="rounded-full bg-[#0033A0]/10 px-2.5 py-0.5 text-xs font-bold text-[#0033A0]">
              {installedPlugins.length} installed
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-3">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setTab('available')}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === 'available' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Available
              <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                {availablePlugins.length}
              </span>
            </button>
            <button
              onClick={() => setTab('installed')}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === 'installed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Installed
              <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                {installedPlugins.length}
              </span>
            </button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-6 py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                category === cat
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat !== 'All' && CATEGORY_ICONS[cat] && (() => {
                const Icon = CATEGORY_ICONS[cat]
                return <Icon className="size-3.5" />
              })()}
              {cat}
              {categoryBadgeCounts[cat] > 0 && (
                <span className={`ml-1 rounded-full px-1.5 text-[10px] ${
                  category === cat ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {categoryBadgeCounts[cat]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Plugin grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'available' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredAvailable.length === 0 && (
                <p className="col-span-full py-12 text-center text-sm text-gray-400">No plugins match your search.</p>
              )}
              {filteredAvailable.map((def) => {
                const isInstalled = installedIds.has(def.manifest.id)
                return (
                  <div
                    key={def.manifest.id}
                    className="group flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-[#0033A0]/10">
                          <Package className="size-5 text-[#0033A0]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">{def.manifest.name}</h3>
                          <p className="text-xs text-gray-500">v{def.manifest.version} · {def.manifest.author}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                        {def.manifest.category}
                      </span>
                    </div>
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-gray-600">{def.manifest.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => onSelectPlugin(def.manifest)}
                        className="text-xs font-semibold text-[#0033A0] hover:underline"
                      >
                        View Details
                      </button>
                      {isInstalled ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle className="size-3.5" /> Installed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInstall(def.manifest.id)}
                          disabled={installing === def.manifest.id}
                          className="flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#002680] disabled:opacity-50"
                        >
                          {installing === def.manifest.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                          Install
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'installed' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredInstalled.length === 0 && (
                <p className="col-span-full py-12 text-center text-sm text-gray-400">No plugins installed yet.</p>
              )}
              {filteredInstalled.map((entry) => (
                <div
                  key={entry.manifest.id}
                  className="group flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex size-10 items-center justify-center rounded-lg ${
                        entry.status === 'enabled' ? 'bg-emerald-50' : entry.status === 'error' ? 'bg-red-50' : 'bg-gray-100'
                      }`}>
                        <Package className={`size-5 ${
                          entry.status === 'enabled' ? 'text-emerald-600' : entry.status === 'error' ? 'text-red-500' : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{entry.manifest.name}</h3>
                        <p className="text-xs text-gray-500">v{entry.manifest.version} · {entry.status}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      entry.status === 'enabled' ? 'bg-emerald-50 text-emerald-600' :
                      entry.status === 'error' ? 'bg-red-50 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-gray-600">{entry.manifest.description}</p>
                  {entry.error && (
                    <p className="mt-1 text-xs text-red-500">Error: {entry.error}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => onSelectPlugin(entry.manifest)}
                      className="text-xs font-semibold text-[#0033A0] hover:underline"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => handleUninstall(entry.manifest.id)}
                      disabled={uninstalling === entry.manifest.id}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      {uninstalling === entry.manifest.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      Uninstall
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
