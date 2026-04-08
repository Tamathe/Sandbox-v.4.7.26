'use client'

import Link from 'next/link'
import { ArrowLeft, Radio, Loader2, RotateCcw, AlertTriangle, X } from 'lucide-react'
import { useCommandCenter } from '../../hooks/useCommandCenter'
import SeverityBadge from '../../components/crisis-comms/command-center/SeverityBadge'
import { IncidentStatusBadge } from '../../components/crisis-comms/command-center/StatusBadge'
import InitiationPhase from '../../components/crisis-comms/command-center/InitiationPhase'
import AssessmentPhase from '../../components/crisis-comms/command-center/AssessmentPhase'
import WorkspacePhase from '../../components/crisis-comms/command-center/WorkspacePhase'
import type { SeverityLevel } from '../../lib/crisis-comms/command-center/types'

export default function CommandCenterPage() {
  const {
    phase,
    incident,
    assessment,
    activeDocument,
    activeDocumentId,
    loading,
    error,
    pastIncidents,
    initiate,
    editAssessment,
    confirmAssessment,
    selectDocument,
    updateDocument,
    aiEdit,
    updateStatus,
    joinRoom,
    resumeIncident,
    resetToInitiation,
    clearError,
  } = useCommandCenter()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/hub"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] transition-colors"
            >
              <ArrowLeft className="size-4" /> Hub
            </Link>
            {(phase === 'workspace' || phase === 'archived') && (
              <button
                onClick={resetToInitiation}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] transition-colors"
              >
                <RotateCcw className="size-3.5" /> New Incident
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-red-50">
              <Radio className="size-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-gray-900">Crisis Command Center</h1>
              {incident ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-gray-600 truncate">{incident.title}</span>
                  <SeverityBadge severity={incident.severity as SeverityLevel} />
                  <IncidentStatusBadge status={incident.status} />
                </div>
              ) : (
                <p className="text-sm text-gray-500">Crisis Communications War Room</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className={phase === 'workspace' ? 'px-4 sm:px-6 lg:px-8 pt-4' : 'max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4'}>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-600 p-0.5">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className={`flex-1 ${phase === 'workspace' ? 'px-4 sm:px-6 lg:px-8 py-4' : 'max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6'}`}>
        {phase === 'initiation' && (
          <InitiationPhase
            loading={loading}
            pastIncidents={pastIncidents}
            onInitiate={initiate}
            onJoinRoom={joinRoom}
            onResume={resumeIncident}
          />
        )}

        {phase === 'assessment' && assessment && (
          <AssessmentPhase
            assessment={assessment}
            loading={loading}
            incidentInputText={incident?.inputText ?? ''}
            onEdit={editAssessment}
            onConfirm={confirmAssessment}
            onBack={resetToInitiation}
          />
        )}

        {phase === 'assessment' && !assessment && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 text-[#0033A0] animate-spin" />
          </div>
        )}

        {(phase === 'workspace' || phase === 'archived') && incident && (
          <WorkspacePhase
            incident={incident}
            activeDocument={activeDocument}
            activeDocumentId={activeDocumentId}
            loading={loading}
            onSelectDocument={selectDocument}
            onUpdateDocument={updateDocument}
            onAiEdit={aiEdit}
            onUpdateStatus={updateStatus}
          />
        )}
      </div>
    </div>
  )
}
