'use client'

import { useState } from 'react'
import { AlertTriangle, Flame, ShieldAlert, Megaphone, Play, LogIn, Clock, ChevronRight, Loader2 } from 'lucide-react'
import { DEMO_SCENARIOS } from '../../../lib/crisis-comms/command-center/demo-scenarios'
import type { InitiateRequest, SerializedIncident, SeverityLevel } from '../../../lib/crisis-comms/command-center/types'
import SeverityBadge from './SeverityBadge'
import { IncidentStatusBadge } from './StatusBadge'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  ShieldAlert,
  Megaphone,
}

interface InitiationPhaseProps {
  loading: boolean
  pastIncidents: SerializedIncident[]
  onInitiate: (input: InitiateRequest) => void
  onJoinRoom: (roomCode: string) => void
  onResume: (incidentId: string) => void
}

export default function InitiationPhase({
  loading,
  pastIncidents,
  onInitiate,
  onJoinRoom,
  onResume,
}: InitiationPhaseProps) {
  const [title, setTitle] = useState('')
  const [inputText, setInputText] = useState('')
  const [roomCode, setRoomCode] = useState('')

  function handleInitiate() {
    if (!title.trim() || !inputText.trim()) return
    onInitiate({ title: title.trim(), inputText: inputText.trim() })
  }

  function handleDemoSelect(scenario: (typeof DEMO_SCENARIOS)[number]) {
    onInitiate({ title: scenario.title, inputText: scenario.inputText, severity: scenario.severity })
  }

  function handleJoin() {
    if (!roomCode.trim()) return
    onJoinRoom(roomCode.trim())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 text-[#0033A0] animate-spin mx-auto" />
          <p className="text-sm font-medium text-gray-700">Analyzing incident...</p>
          <p className="text-xs text-gray-400">Sandy is generating your AI situation assessment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: New Incident */}
        <div className="border rounded-2xl shadow-sm bg-white p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-gray-900">New Incident</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Incident Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chemistry Lab Explosion"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste the incident report, email, memo, or briefing
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={10}
              placeholder="Paste the raw text that triggered this crisis response..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
            />
          </div>

          <button
            onClick={handleInitiate}
            disabled={!title.trim() || !inputText.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="size-4" />
            Initiate Crisis Response
          </button>

          {/* Join Room */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Join Existing Room</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Enter room code..."
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
              />
              <button
                onClick={handleJoin}
                disabled={!roomCode.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-[#0033A0] border border-[#0033A0] hover:bg-[#0033A0]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <LogIn className="size-4" />
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Right: Demo Scenarios */}
        <div className="border rounded-2xl shadow-sm bg-white p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-gray-900">Demo Scenarios</h2>
          <p className="text-sm text-gray-500">Click a scenario to launch a crisis response immediately.</p>

          <div className="space-y-3">
            {DEMO_SCENARIOS.map((scenario) => {
              const Icon = ICON_MAP[scenario.icon] ?? AlertTriangle
              return (
                <button
                  key={scenario.id}
                  onClick={() => handleDemoSelect(scenario)}
                  className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-[#0033A0]/40 hover:bg-[#0033A0]/5 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-gray-100 group-hover:bg-[#0033A0]/10 transition-colors shrink-0">
                      <Icon className="size-5 text-gray-600 group-hover:text-[#0033A0]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{scenario.title}</span>
                        <SeverityBadge severity={scenario.severity} />
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{scenario.description}</p>
                    </div>
                    <ChevronRight className="size-4 text-gray-400 mt-1 shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Past Incidents */}
      {pastIncidents.length > 0 && (
        <div className="border rounded-2xl shadow-sm bg-white p-6">
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">Past Incidents</h2>
          <div className="space-y-2">
            {pastIncidents.map((inc) => (
              <button
                key={inc.id}
                onClick={() => onResume(inc.id)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-[#0033A0]/40 hover:bg-[#0033A0]/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900">{inc.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <SeverityBadge severity={inc.severity as SeverityLevel} />
                    <IncidentStatusBadge status={inc.status} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                  <Clock className="size-3.5" />
                  {timeAgo(inc.createdAt)}
                </div>
                <ChevronRight className="size-4 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
