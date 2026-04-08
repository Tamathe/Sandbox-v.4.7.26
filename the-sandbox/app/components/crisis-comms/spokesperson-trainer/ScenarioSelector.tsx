'use client'

import {
  Shield, CloudLightning, ShieldAlert, Heart, AlertTriangle, PenLine,
} from 'lucide-react'
import { SCENARIO_PRESETS } from '../../../lib/crisis-comms/spokesperson-trainer/scenario-presets'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  CloudLightning,
  ShieldAlert,
  Heart,
  AlertTriangle,
}

interface ScenarioSelectorProps {
  selectedId: string | null
  onSelect: (id: string, title: string) => void
}

export default function ScenarioSelector({ selectedId, onSelect }: ScenarioSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Choose a Scenario</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SCENARIO_PRESETS.map((preset) => {
          const Icon = ICON_MAP[preset.icon] ?? ShieldAlert
          const isSelected = selectedId === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id, preset.title)}
              className={`text-left border rounded-2xl p-4 transition-all hover:shadow-sm ${
                isSelected
                  ? 'border-[#0033A0] bg-[#0033A0]/5 ring-1 ring-[#0033A0]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex items-center justify-center size-9 rounded-xl shrink-0 ${
                  isSelected ? 'bg-[#0033A0]/10' : 'bg-gray-100'
                }`}>
                  <Icon className={`size-4.5 ${isSelected ? 'text-[#0033A0]' : 'text-gray-500'}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isSelected ? 'text-[#0033A0]' : 'text-gray-900'}`}>
                    {preset.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{preset.summary}</p>
                </div>
              </div>
            </button>
          )
        })}

        {/* Custom scenario */}
        <button
          type="button"
          onClick={() => onSelect('custom', 'Custom Scenario')}
          className={`text-left border rounded-2xl p-4 transition-all hover:shadow-sm ${
            selectedId === 'custom'
              ? 'border-[#0033A0] bg-[#0033A0]/5 ring-1 ring-[#0033A0]'
              : 'border-gray-200 bg-white hover:border-gray-300 border-dashed'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`flex items-center justify-center size-9 rounded-xl shrink-0 ${
              selectedId === 'custom' ? 'bg-[#0033A0]/10' : 'bg-gray-100'
            }`}>
              <PenLine className={`size-4.5 ${selectedId === 'custom' ? 'text-[#0033A0]' : 'text-gray-500'}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${selectedId === 'custom' ? 'text-[#0033A0]' : 'text-gray-900'}`}>
                Custom Scenario
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Describe your own crisis situation to practice with.</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
