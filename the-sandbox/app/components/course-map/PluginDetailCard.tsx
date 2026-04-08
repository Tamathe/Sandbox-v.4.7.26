'use client'

import { useState } from 'react'
import {
  X,
  Download,
  Trash2,
  Shield,
  ToggleLeft,
  ToggleRight,
  Star,
  Loader2,
  Package,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import type { PluginManifest, PluginEntry, PluginPermission } from '../../lib/course-map/plugin-registry'

// ── Permission labels ──────────────────────────────────────────────────────

const PERMISSION_LABELS: Record<PluginPermission, { label: string; description: string; level: 'low' | 'medium' | 'high' }> = {
  'read-map': { label: 'Read Map', description: 'View map structure and metadata', level: 'low' },
  'read-nodes': { label: 'Read Nodes', description: 'Access node data and properties', level: 'low' },
  'write-map': { label: 'Write Map', description: 'Modify map structure (add/remove edges)', level: 'medium' },
  'write-nodes': { label: 'Write Nodes', description: 'Create, update, and delete nodes', level: 'high' },
  'api-access': { label: 'API Access', description: 'Make external API calls', level: 'high' },
}

const LEVEL_COLORS = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200',
}

// ── Props ──────────────────────────────────────────────────────────────────

interface PluginDetailCardProps {
  manifest: PluginManifest
  pluginEntry: PluginEntry | undefined
  onInstall: (pluginId: string) => Promise<void>
  onUninstall: (pluginId: string) => Promise<void>
  onEnable: (pluginId: string) => Promise<void>
  onDisable: (pluginId: string) => Promise<void>
  onUpdateConfig: (pluginId: string, config: Record<string, string | number | boolean>) => void
  onClose: () => void
}

export default function PluginDetailCard({
  manifest,
  pluginEntry,
  onInstall,
  onUninstall,
  onEnable,
  onDisable,
  onUpdateConfig,
  onClose,
}: PluginDetailCardProps) {
  const [actionLoading, setActionLoading] = useState(false)
  const [localConfig, setLocalConfig] = useState<Record<string, string | number | boolean>>(
    pluginEntry?.config || {}
  )

  const isInstalled = !!pluginEntry
  const isEnabled = pluginEntry?.status === 'enabled'
  const hasError = pluginEntry?.status === 'error'

  const handleAction = async (fn: () => Promise<void>) => {
    setActionLoading(true)
    try {
      await fn()
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfigChange = (key: string, value: string | number | boolean) => {
    const updated = { ...localConfig, [key]: value }
    setLocalConfig(updated)
    if (isInstalled) {
      onUpdateConfig(manifest.id, updated)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-lg rounded-2xl border-2 border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#0033A0]/10">
              <Package className="size-6 text-[#0033A0]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">{manifest.name}</h2>
              <p className="text-sm text-gray-500">v{manifest.version} · {manifest.author}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {/* Description */}
          <p className="text-sm leading-relaxed text-gray-700">{manifest.description}</p>

          {/* Status */}
          {isInstalled && (
            <div className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
              isEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
              hasError ? 'border-red-200 bg-red-50 text-red-700' :
              'border-gray-200 bg-gray-50 text-gray-600'
            }`}>
              {isEnabled && <><CheckCircle className="size-4" /> Plugin is active</>}
              {hasError && <><AlertTriangle className="size-4" /> Error: {pluginEntry?.error}</>}
              {!isEnabled && !hasError && <><Package className="size-4" /> Plugin is disabled</>}
            </div>
          )}

          {/* Permissions */}
          <div className="mt-5">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Shield className="size-4" />
              Permissions Required
            </div>
            <div className="mt-2 space-y-1.5">
              {manifest.permissions.map((perm) => {
                const info = PERMISSION_LABELS[perm]
                return (
                  <div
                    key={perm}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${LEVEL_COLORS[info.level]}`}
                  >
                    <div>
                      <span className="text-xs font-semibold">{info.label}</span>
                      <span className="ml-2 text-xs opacity-70">{info.description}</span>
                    </div>
                    <span className="rounded-full bg-white/50 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                      {info.level}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Configuration */}
          {manifest.configSchema.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-gray-900">Configuration</h3>
              <div className="mt-2 space-y-3">
                {manifest.configSchema.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      {field.label}
                      {field.description && (
                        <span className="ml-1 font-normal text-gray-400">— {field.description}</span>
                      )}
                    </label>
                    {field.type === 'boolean' ? (
                      <button
                        onClick={() => handleConfigChange(field.key, !localConfig[field.key])}
                        className="flex items-center gap-2 text-sm"
                        disabled={!isInstalled}
                      >
                        {localConfig[field.key] ? (
                          <ToggleRight className="size-6 text-[#0033A0]" />
                        ) : (
                          <ToggleLeft className="size-6 text-gray-300" />
                        )}
                        <span className="text-xs text-gray-600">{localConfig[field.key] ? 'Enabled' : 'Disabled'}</span>
                      </button>
                    ) : field.type === 'select' ? (
                      <select
                        value={String(localConfig[field.key] ?? field.default)}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        disabled={!isInstalled}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={Number(localConfig[field.key] ?? field.default)}
                        onChange={(e) => handleConfigChange(field.key, Number(e.target.value))}
                        disabled={!isInstalled}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50"
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(localConfig[field.key] ?? field.default)}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        disabled={!isInstalled}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0] disabled:opacity-50"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews placeholder */}
          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Star className="size-4" />
              Reviews
            </div>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`size-4 ${s <= 4 ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
              ))}
              <span className="ml-1 text-xs text-gray-500">4.0 (placeholder)</span>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">Reviews will be available in a future update.</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          {isInstalled ? (
            <>
              <button
                onClick={() => handleAction(() => isEnabled ? onDisable(manifest.id) : onEnable(manifest.id))}
                disabled={actionLoading}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isEnabled
                    ? 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    : 'bg-[#0033A0] text-white hover:bg-[#002680]'
                } disabled:opacity-50`}
              >
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : isEnabled ? <ToggleLeft className="size-4" /> : <ToggleRight className="size-4" />}
                {isEnabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => handleAction(() => onUninstall(manifest.id))}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Uninstall
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAction(() => onInstall(manifest.id))}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002680] disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Install Plugin
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
