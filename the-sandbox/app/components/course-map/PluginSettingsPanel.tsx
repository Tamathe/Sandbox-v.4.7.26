'use client'

import { useState } from 'react'
import {
  X,
  Settings,
  ToggleLeft,
  ToggleRight,
  Trash2,
  RefreshCw,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import type { PluginEntry } from '../../lib/course-map/plugin-registry'

// ── Props ──────────────────────────────────────────────────────────────────

interface PluginSettingsPanelProps {
  plugins: PluginEntry[]
  onEnable: (pluginId: string) => Promise<void>
  onDisable: (pluginId: string) => Promise<void>
  onUpdateConfig: (pluginId: string, config: Record<string, string | number | boolean>) => void
  onClearData: (pluginId: string) => void
  onClose: () => void
}

export default function PluginSettingsPanel({
  plugins,
  onEnable,
  onDisable,
  onUpdateConfig,
  onClearData,
  onClose,
}: PluginSettingsPanelProps) {
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [clearConfirm, setClearConfirm] = useState<string | null>(null)

  const handleToggle = async (pluginId: string, isEnabled: boolean) => {
    setToggling(pluginId)
    try {
      if (isEnabled) {
        await onDisable(pluginId)
      } else {
        await onEnable(pluginId)
      }
    } finally {
      setToggling(null)
    }
  }

  const handleClear = (pluginId: string) => {
    onClearData(pluginId)
    setClearConfirm(null)
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l-2 border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Settings className="size-5 text-[#0033A0]" />
          <h2 className="text-lg font-extrabold text-gray-900">Plugin Settings</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <X className="size-5" />
        </button>
      </div>

      {/* Plugin list */}
      <div className="flex-1 overflow-y-auto p-5">
        {plugins.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <Package className="size-10 text-gray-300" />
            <p className="mt-2 text-sm text-gray-400">No plugins installed.</p>
          </div>
        )}

        <div className="space-y-3">
          {plugins.map((entry) => {
            const isExpanded = expandedPlugin === entry.manifest.id
            const isEnabled = entry.status === 'enabled'
            const hasError = entry.status === 'error'

            return (
              <div key={entry.manifest.id} className="rounded-xl border-2 border-gray-200 bg-white">
                {/* Plugin header row */}
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => setExpandedPlugin(isExpanded ? null : entry.manifest.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <div className={`flex size-9 items-center justify-center rounded-lg ${
                      isEnabled ? 'bg-emerald-50' : hasError ? 'bg-red-50' : 'bg-gray-100'
                    }`}>
                      <Package className={`size-4 ${
                        isEnabled ? 'text-emerald-600' : hasError ? 'text-red-500' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{entry.manifest.name}</h3>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        v{entry.manifest.version}
                        {hasError && (
                          <span className="flex items-center gap-0.5 text-red-500">
                            <AlertTriangle className="size-3" /> Error
                          </span>
                        )}
                        {isEnabled && (
                          <span className="flex items-center gap-0.5 text-emerald-600">
                            <CheckCircle className="size-3" /> Active
                          </span>
                        )}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleToggle(entry.manifest.id, isEnabled)}
                    disabled={toggling === entry.manifest.id}
                    className="shrink-0"
                  >
                    {toggling === entry.manifest.id ? (
                      <Loader2 className="size-6 animate-spin text-gray-400" />
                    ) : isEnabled ? (
                      <ToggleRight className="size-7 text-[#0033A0]" />
                    ) : (
                      <ToggleLeft className="size-7 text-gray-300" />
                    )}
                  </button>
                </div>

                {/* Expanded config */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4">
                    {entry.manifest.configSchema.length === 0 ? (
                      <p className="text-xs text-gray-400">This plugin has no configurable settings.</p>
                    ) : (
                      <div className="space-y-3">
                        {entry.manifest.configSchema.map((field) => (
                          <div key={field.key}>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">
                              {field.label}
                            </label>
                            {field.type === 'boolean' ? (
                              <button
                                onClick={() => {
                                  const updated = { ...entry.config, [field.key]: !entry.config[field.key] }
                                  onUpdateConfig(entry.manifest.id, updated)
                                }}
                                className="flex items-center gap-2"
                              >
                                {entry.config[field.key] ? (
                                  <ToggleRight className="size-5 text-[#0033A0]" />
                                ) : (
                                  <ToggleLeft className="size-5 text-gray-300" />
                                )}
                                <span className="text-xs text-gray-600">{entry.config[field.key] ? 'On' : 'Off'}</span>
                              </button>
                            ) : field.type === 'select' ? (
                              <select
                                value={String(entry.config[field.key] ?? field.default)}
                                onChange={(e) => {
                                  const updated = { ...entry.config, [field.key]: e.target.value }
                                  onUpdateConfig(entry.manifest.id, updated)
                                }}
                                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                              >
                                {field.options?.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            ) : field.type === 'number' ? (
                              <input
                                type="number"
                                value={Number(entry.config[field.key] ?? field.default)}
                                onChange={(e) => {
                                  const updated = { ...entry.config, [field.key]: Number(e.target.value) }
                                  onUpdateConfig(entry.manifest.id, updated)
                                }}
                                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                              />
                            ) : (
                              <input
                                type="text"
                                value={String(entry.config[field.key] ?? field.default)}
                                onChange={(e) => {
                                  const updated = { ...entry.config, [field.key]: e.target.value }
                                  onUpdateConfig(entry.manifest.id, updated)
                                }}
                                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#0033A0] focus:outline-none focus:ring-1 focus:ring-[#0033A0]"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Plugin data management */}
                    <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                      {clearConfirm === entry.manifest.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600">Clear all plugin data?</span>
                          <button
                            onClick={() => handleClear(entry.manifest.id)}
                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setClearConfirm(null)}
                            className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setClearConfirm(entry.manifest.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="size-3.5" />
                          Clear Plugin Data
                        </button>
                      )}

                      {/* Update indicator placeholder */}
                      <div className="ml-auto">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <RefreshCw className="size-3" />
                          Up to date
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
