'use client'

import { Mic, MessageSquare, Clock, ChevronDown, ChevronUp, CheckCircle2, HelpCircle, Users, Radio, Zap } from 'lucide-react'
import DynamicMarkdown from '../../DynamicMarkdown'
import type {
  SpokespersonPhase,
  SpokespersonInterviewState,
  DrillScores,
  DrillHistoryEntry,
  AnswerAnnotation,
} from '../../../lib/crisis-comms/spokesperson-trainer/types'
import { getPresetById } from '../../../lib/crisis-comms/spokesperson-trainer/scenario-presets'
import ScenarioSelector from './ScenarioSelector'
import DifficultySelector from './DifficultySelector'
import RoleSelector from './RoleSelector'
import KeyMessagesEditor from './KeyMessagesEditor'
import DebriefPanel from './DebriefPanel'
import DrillHistory from './DrillHistory'
import ReplayPanel from './ReplayPanel'
import PrepSheetExport from './PrepSheetExport'
import type { Difficulty } from '../../../lib/crisis-comms/spokesperson-trainer/types'

interface InterviewScorecardProps {
  phase: SpokespersonPhase
  interviewState: SpokespersonInterviewState
  scores: DrillScores | null
  debriefText: string
  drillHistory: DrillHistoryEntry[]
  showHistory: boolean
  setShowHistory: (show: boolean) => void
  onSelectScenario: (id: string, title: string) => void
  onSelectDifficulty: (difficulty: Difficulty) => void
  onSelectRole: (role: string) => void
  onBeginInterview: () => void
  onKeyMessagesChange: (messages: string[]) => void
  totalDrillCount: number
  annotations: AnswerAnnotation[]
  isAnnotating: boolean
  onBackToDebrief: () => void
}

/** Strip HTML comment markers from debrief text for clean rendering */
function cleanDebriefText(text: string): string {
  return text
    .replace(/<!--CHIPS:\[.*?\]-->/g, '')
    .replace(/<!--PHASE:[\w-]+-->/g, '')
    .replace(/<!--SCORE:\w+:\d+-->/g, '')
    .replace(/<!--COACH:[^>]*-->/g, '')
    .replace(/<!--INJECT:[^>]*-->/g, '')
    .trim()
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-sm font-bold text-gray-900 mt-4 mb-1">{children}</h2>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 space-y-0.5 mt-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-0.5 mt-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-[#0033A0]/30 pl-3 italic text-gray-600 my-2">{children}</blockquote>
  ),
}

export default function InterviewScorecard({
  phase,
  interviewState,
  scores,
  debriefText,
  drillHistory,
  showHistory,
  setShowHistory,
  onSelectScenario,
  onSelectDifficulty,
  onSelectRole,
  onBeginInterview,
  onKeyMessagesChange,
  totalDrillCount,
  annotations,
  isAnnotating,
  onBackToDebrief,
}: InterviewScorecardProps) {
  const preset = interviewState.scenarioId && interviewState.scenarioId !== 'custom'
    ? getPresetById(interviewState.scenarioId)
    : null

  const buttonLabel = interviewState.scenarioId === 'custom'
    ? 'Describe My Scenario to Sandy'
    : 'Start Interview'

  return (
    <div className="space-y-4">
      {/* Setup phase — scenario + difficulty + role + key messages selection */}
      {phase === 'setup' && (
        <>
          <ScenarioSelector
            selectedId={interviewState.scenarioId}
            onSelect={onSelectScenario}
          />
          <RoleSelector
            selected={interviewState.userRole ?? 'University Spokesperson'}
            onSelect={onSelectRole}
          />
          <DifficultySelector
            selected={interviewState.difficulty}
            onSelect={onSelectDifficulty}
          />
          <KeyMessagesEditor
            keyMessages={interviewState.keyMessages}
            onChange={onKeyMessagesChange}
          />
          {interviewState.scenarioId && (
            <button
              type="button"
              onClick={onBeginInterview}
              className="w-full py-3 rounded-xl bg-[#0033A0] text-white font-semibold text-sm hover:bg-[#002580] transition-colors"
            >
              {buttonLabel}
            </button>
          )}
        </>
      )}

      {/* Interview phase — live stats + scenario fact sheet */}
      {phase === 'interview' && (
        <div className="space-y-4">
          {/* Live stats card */}
          <div className="border rounded-2xl shadow-sm bg-white p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center size-10 rounded-xl bg-red-50">
                <Radio className="size-5 text-red-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Interview in Progress</h3>
                <p className="text-sm text-gray-500">
                  {interviewState.scenarioTitle ?? 'Custom scenario'} — {interviewState.userRole ?? 'Spokesperson'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <MessageSquare className="size-4 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-900">{interviewState.questionsAnswered}</p>
                <p className="text-xs text-gray-500">Responses</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Mic className="size-4 text-gray-400 mx-auto mb-1" />
                <p className="text-sm font-semibold text-gray-700 capitalize">
                  {interviewState.difficulty === 'press-conference' ? 'Press Conf.' : interviewState.difficulty}
                </p>
                <p className="text-xs text-gray-500">Difficulty</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Clock className="size-4 text-gray-400 mx-auto mb-1" />
                <p className="text-sm font-semibold text-gray-700">
                  {interviewState.injectDelivered ? (
                    <span className="flex items-center justify-center gap-1">
                      <Zap className="size-3 text-amber-500" /> Breaking
                    </span>
                  ) : 'Live'}
                </p>
                <p className="text-xs text-gray-500">Status</p>
              </div>
            </div>

            {/* Key messages reminder during interview */}
            {interviewState.keyMessages.length > 0 && (
              <div className="mt-3 bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-[#0033A0] mb-1">Your key messages:</p>
                {interviewState.keyMessages.map((msg, i) => (
                  <p key={i} className="text-xs text-gray-600">{i + 1}. {msg}</p>
                ))}
              </div>
            )}
          </div>

          {/* Scenario fact sheet (preset scenarios only) */}
          {preset && (
            <div className="border rounded-2xl shadow-sm bg-white p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Reference: {preset.title}</h3>
              <p className="text-xs text-gray-400 -mt-2">Use these facts. Do not speculate beyond them.</p>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-gray-700">Confirmed Facts</span>
                  </div>
                  <ul className="space-y-1">
                    {preset.factSheet.confirmedFacts.map((fact, i) => (
                      <li key={i} className="text-xs text-gray-600 pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-gray-400">
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <HelpCircle className="size-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-gray-700">Unknown / Unconfirmed</span>
                  </div>
                  <ul className="space-y-1">
                    {preset.factSheet.unknownFacts.map((fact, i) => (
                      <li key={i} className="text-xs text-gray-600 pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-amber-400">
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Users className="size-3.5 text-[#0033A0]" />
                    <span className="text-xs font-semibold text-gray-700">Stakeholder Positions</span>
                  </div>
                  <ul className="space-y-1">
                    {preset.factSheet.stakeholderPositions.map((pos, i) => (
                      <li key={i} className="text-xs text-gray-600 pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-blue-400">
                        {pos}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Radio className="size-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">Media Landscape</span>
                  </div>
                  <p className="text-xs text-gray-600 pl-5">{preset.factSheet.mediaLandscape}</p>
                </div>

                {/* Show new inject facts once delivered */}
                {preset.inject && interviewState.injectDelivered && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Zap className="size-3.5 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-800">Breaking Update</span>
                    </div>
                    <p className="text-xs font-medium text-amber-900 mb-1">{preset.inject.headline}</p>
                    <ul className="space-y-0.5">
                      {preset.inject.newFacts.map((fact, i) => (
                        <li key={i} className="text-xs text-amber-800 pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-amber-500">
                          {fact}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Debrief / model-response phase — structured scores + qualitative feedback */}
      {(phase === 'debrief' || phase === 'model-response') && scores && (
        <div className="space-y-4">
          <DebriefPanel
            scores={scores}
            scenarioTitle={interviewState.scenarioTitle}
            difficulty={interviewState.difficulty}
          />

          {/* Export prep sheet */}
          <div className="flex justify-end">
            <PrepSheetExport
              scenarioTitle={interviewState.scenarioTitle ?? 'Custom'}
              difficulty={interviewState.difficulty}
              userRole={interviewState.userRole ?? 'Spokesperson'}
              keyMessages={interviewState.keyMessages}
              scores={scores}
              debriefText={debriefText}
              annotations={annotations}
            />
          </div>

          {/* Qualitative feedback from Sandy's debrief */}
          {debriefText && (
            <div className="border rounded-2xl shadow-sm bg-white p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Sandy&apos;s Full Debrief</h3>
              <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                <DynamicMarkdown components={mdComponents}>{cleanDebriefText(debriefText)}</DynamicMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Replay phase — annotated transcript review */}
      {phase === 'replay' && (
        <div className="space-y-4">
          {scores && (
            <DebriefPanel
              scores={scores}
              scenarioTitle={interviewState.scenarioTitle}
              difficulty={interviewState.difficulty}
            />
          )}
          <div className="border rounded-2xl shadow-sm bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Answer-by-Answer Review</h3>
              <button
                type="button"
                onClick={onBackToDebrief}
                className="text-xs font-medium text-[#0033A0] hover:underline"
              >
                Back to Debrief
              </button>
            </div>
            <ReplayPanel
              annotations={annotations}
              loading={isAnnotating}
              keyMessages={interviewState.keyMessages}
            />
          </div>
        </div>
      )}

      {/* Drill history toggle (visible after at least one drill) */}
      {totalDrillCount > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0033A0] transition-colors"
          >
            {showHistory ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            Drill History ({totalDrillCount})
          </button>
          {showHistory && (
            <div className="mt-3">
              <DrillHistory entries={drillHistory} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
