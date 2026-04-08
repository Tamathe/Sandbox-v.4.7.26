'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  PieChart,
  Save,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import {
  buildAssessmentInstructions,
  formatAssessmentModeLabel,
  getCanvasModeState,
  getEnabledCanvasModes,
  pickPrimaryCanvasMode,
  setCanvasCompositeMethod,
  setCanvasModeEnabled,
  setCanvasModeWeight,
  updateCanvasModeConfig,
} from '../../lib/assessment/assessment-canvas';
import type {
  AssessmentCanvasAssignmentPayload,
  AssessmentCanvasConfig,
  AssessmentMode,
  AuthenticCanvasMetricWeights,
  CanvasCompositeMethod,
} from '../../lib/assessment/types';

interface AssessmentCanvasDesignerProps {
  userEmail: string;
  assignmentId: string;
  assignmentTitle: string;
  onSaved?: (payload: AssessmentCanvasAssignmentPayload) => Promise<void> | void;
}

const MODE_META: Record<
  AssessmentMode,
  {
    description: string;
    accent: string;
    tint: string;
    border: string;
    chartColor: string;
  }
> = {
  TRADITIONAL: {
    description: 'Standard submission and rubric-based evaluation.',
    accent: 'text-sky-700',
    tint: 'bg-sky-50',
    border: 'border-sky-200',
    chartColor: '#0ea5e9',
  },
  PROCESS: {
    description: 'Credit the thinking process, annotations, and revision path.',
    accent: 'text-amber-700',
    tint: 'bg-amber-50',
    border: 'border-amber-200',
    chartColor: '#f59e0b',
  },
  DIVERGENCE: {
    description: 'Assess judgment and coherence in ambiguous scenarios.',
    accent: 'text-violet-700',
    tint: 'bg-violet-50',
    border: 'border-violet-200',
    chartColor: '#8b5cf6',
  },
  TEACHBACK: {
    description: 'Score clarity and depth when students teach the concept back.',
    accent: 'text-pink-700',
    tint: 'bg-pink-50',
    border: 'border-pink-200',
    chartColor: '#ec4899',
  },
  CROSS_EXAM: {
    description: 'Evaluate argument defense under pressure.',
    accent: 'text-rose-700',
    tint: 'bg-rose-50',
    border: 'border-rose-200',
    chartColor: '#f43f5e',
  },
  AUTHENTIC: {
    description: 'Blend real-world adoption, impact, and iteration evidence.',
    accent: 'text-emerald-700',
    tint: 'bg-emerald-50',
    border: 'border-emerald-200',
    chartColor: '#10b981',
  },
  MASTERY_GATE: {
    description: 'Tie the assignment to adaptive mastery checkpoints.',
    accent: 'text-indigo-700',
    tint: 'bg-indigo-50',
    border: 'border-indigo-200',
    chartColor: '#4f46e5',
  },
};

function roundWeight(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function listToTextarea(value: string[]) {
  return value.join('\n');
}

function textareaToList(value: string) {
  return [...new Set(value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean))];
}

function rebalanceAuthenticMetricWeights(
  weights: AuthenticCanvasMetricWeights,
  key: keyof AuthenticCanvasMetricWeights,
  nextValue: number
): AuthenticCanvasMetricWeights {
  const metrics = Object.keys(weights) as Array<keyof AuthenticCanvasMetricWeights>;
  const clamped = Math.max(0.05, Math.min(0.85, nextValue));
  const others = metrics.filter((metric) => metric !== key);
  const otherTotal = others.reduce((sum, metric) => sum + weights[metric], 0);
  const remaining = 1 - clamped;
  let assigned = 0;

  const nextWeights = { ...weights, [key]: roundWeight(clamped) };
  others.forEach((metric, index) => {
    const normalized =
      otherTotal > 0 ? remaining * (weights[metric] / otherTotal) : remaining / others.length;
    const value =
      index === others.length - 1
        ? roundWeight(1 - nextWeights[key] - assigned)
        : roundWeight(normalized);
    nextWeights[metric] = value;
    assigned += index === others.length - 1 ? 0 : value;
  });

  return nextWeights;
}

function buildMixGradient(config: AssessmentCanvasConfig) {
  const enabledModes = getEnabledCanvasModes(config);
  if (enabledModes.length === 0) {
    return 'conic-gradient(#e2e8f0 0deg 360deg)';
  }

  let cursor = 0;
  const segments = enabledModes.map((mode) => {
    const start = cursor * 360;
    cursor += mode.weight;
    const end = cursor * 360;
    return `${MODE_META[mode.mode].chartColor} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

function CompositeMethodSelect({
  value,
  onChange,
}: {
  value: CanvasCompositeMethod;
  onChange: (value: CanvasCompositeMethod) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Composite Method
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CanvasCompositeMethod)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
      >
        <option value="weighted_average">Weighted Average</option>
        <option value="highest">Highest Score</option>
        <option value="portfolio">Portfolio</option>
      </select>
    </label>
  );
}

export default function AssessmentCanvasDesigner({
  userEmail,
  assignmentId,
  assignmentTitle,
  onSaved,
}: AssessmentCanvasDesignerProps) {
  const [payload, setPayload] = useState<AssessmentCanvasAssignmentPayload | null>(null);
  const [canvas, setCanvas] = useState<AssessmentCanvasConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const nextPayload = await apiFetch<AssessmentCanvasAssignmentPayload>(
          userEmail,
          `/api/assessment/canvas/${assignmentId}`
        );

        if (!cancelled) {
          setPayload(nextPayload);
          setCanvas(nextPayload.config);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load assessment canvas');
          setPayload(null);
          setCanvas(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, userEmail]);

  const enabledModes = useMemo(
    () => (canvas ? getEnabledCanvasModes(canvas) : []),
    [canvas]
  );
  const instructions = useMemo(
    () => (canvas ? buildAssessmentInstructions(canvas) : ''),
    [canvas]
  );
  const primaryMode = useMemo(
    () => (canvas ? pickPrimaryCanvasMode(canvas) : 'TRADITIONAL'),
    [canvas]
  );

  async function handleSave() {
    if (!canvas) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await apiFetch<AssessmentCanvasAssignmentPayload>(
        userEmail,
        `/api/assessment/canvas/${assignmentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ config: canvas }),
        }
      );

      setPayload(saved);
      setCanvas(saved.config);
      setSuccess('Assessment canvas saved.');
      await onSaved?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assessment canvas');
    } finally {
      setSaving(false);
    }
  }

  function applyConfig(nextCanvas: AssessmentCanvasConfig) {
    setCanvas(nextCanvas);
    setSuccess(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border-2 border-gray-200 bg-white p-14">
        <Loader2 className="size-5 animate-spin text-[#0033A0]" />
      </div>
    );
  }

  if (!canvas || !payload) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? 'Assessment canvas is unavailable for this assignment.'}
      </div>
    );
  }

  const safeCanvas = canvas;
  const safePayload = payload;
  const mixGradient = buildMixGradient(safeCanvas);

  function renderModeFields(mode: AssessmentMode) {
    switch (mode) {
      case 'TRADITIONAL':
        return (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
            Traditional mode uses the existing assignment submission flow with no extra mode-specific settings.
          </div>
        );
      case 'PROCESS': {
        const config = getCanvasModeState(safeCanvas, 'PROCESS').config;
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={config.annotationRequired}
                onChange={(event) =>
                  applyConfig(
                    updateCanvasModeConfig(safeCanvas, 'PROCESS', {
                      annotationRequired: event.target.checked,
                    })
                  )
                }
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">Require annotations</p>
                <p className="text-xs text-slate-500">
                  Students must annotate their Sandy transcript before submission.
                </p>
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Minimum Messages
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={config.minMessages}
                onChange={(event) =>
                  applyConfig(
                    updateCanvasModeConfig(safeCanvas, 'PROCESS', {
                      minMessages: Number(event.target.value),
                    })
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              />
            </label>
          </div>
        );
      }
      case 'DIVERGENCE': {
        const config = getCanvasModeState(safeCanvas, 'DIVERGENCE').config;
        return (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scenario Prompt
              </span>
              <textarea
                value={config.scenario}
                onChange={(event) =>
                  applyConfig(
                    updateCanvasModeConfig(safeCanvas, 'DIVERGENCE', {
                      scenario: event.target.value,
                    })
                  )
                }
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
                placeholder="A student team must decide how to respond to a public health communication failure..."
              />
            </label>
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Turns
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.turns}
                  onChange={(event) =>
                    applyConfig(
                      updateCanvasModeConfig(safeCanvas, 'DIVERGENCE', {
                        turns: Number(event.target.value),
                      })
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Coherence Weight
                </span>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.coherenceWeight}
                    onChange={(event) =>
                      applyConfig(
                        updateCanvasModeConfig(safeCanvas, 'DIVERGENCE', {
                          coherenceWeight: Number(event.target.value),
                        })
                      )
                    }
                    className="w-full"
                  />
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {Math.round(config.coherenceWeight * 100)}%
                  </p>
                </div>
              </label>
            </div>
          </div>
        );
      }
      case 'TEACHBACK': {
        const config = getCanvasModeState(safeCanvas, 'TEACHBACK').config;
        return (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Concepts
              </span>
              <textarea
                value={listToTextarea(config.concepts)}
                onChange={(event) =>
                  applyConfig(
                    updateCanvasModeConfig(safeCanvas, 'TEACHBACK', {
                      concepts: textareaToList(event.target.value),
                    })
                  )
                }
                rows={4}
                placeholder="Enter one concept per line"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Time Limit
              </span>
              <input
                type="number"
                min={1}
                max={180}
                value={config.timeLimitMinutes}
                onChange={(event) =>
                  applyConfig(
                    updateCanvasModeConfig(safeCanvas, 'TEACHBACK', {
                      timeLimitMinutes: Number(event.target.value),
                    })
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              />
            </label>
          </div>
        );
      }
      case 'CROSS_EXAM': {
        const config = getCanvasModeState(safeCanvas, 'CROSS_EXAM').config;
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Format
              </span>
              <select
                value={config.format}
                onChange={(event) =>
                  applyConfig(
                    updateCanvasModeConfig(safeCanvas, 'CROSS_EXAM', {
                      format: event.target.value as 'DEBATE' | 'FISHBOWL',
                    })
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              >
                <option value="DEBATE">Debate</option>
                <option value="FISHBOWL">Fishbowl</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                AI Weight
              </span>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.aiWeight}
                  onChange={(event) =>
                    applyConfig(
                      updateCanvasModeConfig(safeCanvas, 'CROSS_EXAM', {
                        aiWeight: Number(event.target.value),
                      })
                    )
                  }
                  className="w-full"
                />
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {Math.round(config.aiWeight * 100)}%
                </p>
              </div>
            </label>
          </div>
        );
      }
      case 'AUTHENTIC': {
        const config = getCanvasModeState(safeCanvas, 'AUTHENTIC').config;
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Usage Window
                </span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={config.usagePeriodDays}
                  onChange={(event) =>
                    applyConfig(
                      updateCanvasModeConfig(safeCanvas, 'AUTHENTIC', {
                        usagePeriodDays: Number(event.target.value),
                      })
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Unique Users Target
                </span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={config.uniqueUsersTarget}
                  onChange={(event) =>
                    applyConfig(
                      updateCanvasModeConfig(safeCanvas, 'AUTHENTIC', {
                        uniqueUsersTarget: Number(event.target.value),
                      })
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Session Target
                </span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={config.totalSessionsTarget}
                  onChange={(event) =>
                    applyConfig(
                      updateCanvasModeConfig(safeCanvas, 'AUTHENTIC', {
                        totalSessionsTarget: Number(event.target.value),
                      })
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Repeat Users Target
                </span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={config.repeatUsersTarget}
                  onChange={(event) =>
                    applyConfig(
                      updateCanvasModeConfig(safeCanvas, 'AUTHENTIC', {
                        repeatUsersTarget: Number(event.target.value),
                      })
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
                />
              </label>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Metric weights</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Rebalance functionality, usage, impact, and iteration within the authentic slice.
                  </p>
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Duration target: {config.durationTargetSeconds}s
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(Object.entries(config.weights) as Array<
                  [keyof AuthenticCanvasMetricWeights, number]
                >).map(([metric, weight]) => (
                  <label key={metric} className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {metric}
                    </span>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <input
                        type="range"
                        min={0.05}
                        max={0.85}
                        step={0.05}
                        value={weight}
                        onChange={(event) =>
                          applyConfig(
                            updateCanvasModeConfig(safeCanvas, 'AUTHENTIC', {
                              weights: rebalanceAuthenticMetricWeights(
                                config.weights,
                                metric,
                                Number(event.target.value)
                              ),
                            })
                          )
                        }
                        className="w-full"
                      />
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {Math.round(weight * 100)}%
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      }
      case 'MASTERY_GATE': {
        const config = getCanvasModeState(safeCanvas, 'MASTERY_GATE').config;
        return (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Concepts
              </span>
              <textarea
                value={listToTextarea(config.concepts)}
                onChange={(event) =>
                  applyConfig(
                    updateCanvasModeConfig(safeCanvas, 'MASTERY_GATE', {
                      concepts: textareaToList(event.target.value),
                    })
                  )
                }
                rows={4}
                placeholder="Enter one concept per line"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
              />
            </label>
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bloom Floor
                </span>
                <select
                  value={config.bloomFloor}
                  onChange={(event) =>
                    applyConfig(
                      updateCanvasModeConfig(safeCanvas, 'MASTERY_GATE', {
                        bloomFloor: Number(event.target.value),
                      })
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
                >
                  <option value={1}>1 - Remember</option>
                  <option value={2}>2 - Understand</option>
                  <option value={3}>3 - Apply</option>
                  <option value={4}>4 - Analyze</option>
                  <option value={5}>5 - Evaluate</option>
                  <option value={6}>6 - Create</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pass Threshold
                </span>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <input
                    type="range"
                    min={0.5}
                    max={1}
                    step={0.05}
                    value={config.passThreshold}
                    onChange={(event) =>
                      applyConfig(
                        updateCanvasModeConfig(safeCanvas, 'MASTERY_GATE', {
                          passThreshold: Number(event.target.value),
                        })
                      )
                    }
                    className="w-full"
                  />
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {Math.round(config.passThreshold * 100)}%
                  </p>
                </div>
              </label>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border-2 border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0033A0]">
            Design Your Assessment
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">{assignmentTitle}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Primary compatibility mode: {formatAssessmentModeLabel(primaryMode)}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {success && (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              {success}
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002580] disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save canvas
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <CompositeMethodSelect
                value={safeCanvas.compositeMethod}
                onChange={(value) => applyConfig(setCanvasCompositeMethod(safeCanvas, value))}
              />

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <PieChart className="size-4 text-[#0033A0]" />
                  Assessment mode mix
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-5">
                  <div
                    className="relative size-32 rounded-full"
                    style={{ background: mixGradient }}
                    aria-hidden="true"
                  >
                    <div className="absolute inset-5 rounded-full bg-white" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Enabled
                        </p>
                        <p className="text-2xl font-semibold text-slate-900">
                          {enabledModes.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-[220px] flex-1 space-y-2">
                    {enabledModes.map((mode) => (
                      <div
                        key={mode.mode}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: MODE_META[mode.mode].chartColor }}
                          />
                          <span className="text-sm font-medium text-slate-700">
                            {formatAssessmentModeLabel(mode.mode)}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {Math.round(mode.weight * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {safeCanvas.modes.map((entry) => {
              const meta = MODE_META[entry.mode];

              return (
                <div
                  key={entry.mode}
                  className={`rounded-3xl border p-4 transition ${
                    entry.enabled
                      ? `${meta.border} ${meta.tint} shadow-sm`
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm font-semibold ${entry.enabled ? meta.accent : 'text-slate-900'}`}>
                        {formatAssessmentModeLabel(entry.mode)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        applyConfig(setCanvasModeEnabled(safeCanvas, entry.mode, !entry.enabled))
                      }
                      className={`inline-flex min-w-[88px] items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        entry.enabled
                          ? 'bg-[#0033A0] text-white hover:bg-[#002580]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {entry.enabled ? 'Enabled' : 'Enable'}
                    </button>
                  </div>

                  {entry.enabled && (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Weight
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Auto-normalized across enabled modes.
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-slate-900">
                            {Math.round(entry.weight * 100)}%
                          </p>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                          <input
                            type="range"
                            min={5}
                            max={95}
                            step={5}
                            value={Math.round(entry.weight * 100)}
                            onChange={(event) =>
                              applyConfig(
                                setCanvasModeWeight(
                                  safeCanvas,
                                  entry.mode,
                                  Number(event.target.value) / 100
                                )
                              )
                            }
                            className="w-full"
                          />
                          <input
                            type="number"
                            min={5}
                            max={95}
                            step={5}
                            value={Math.round(entry.weight * 100)}
                            onChange={(event) =>
                              applyConfig(
                                setCanvasModeWeight(
                                  safeCanvas,
                                  entry.mode,
                                  Number(event.target.value) / 100
                                )
                              )
                            }
                            className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0033A0]"
                          />
                        </div>
                      </div>

                      {renderModeFields(entry.mode)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="size-4 text-[#0033A0]" />
              Student-facing instructions preview
            </div>
            <p className="mt-2 text-sm text-slate-500">
              This preview updates live as you change the mode mix.
            </p>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              {instructions}
            </pre>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Canvas summary</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Primary compatibility mode</span>
                <span className="font-semibold text-slate-900">
                  {formatAssessmentModeLabel(primaryMode)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Enabled evidence streams</span>
                <span className="font-semibold text-slate-900">{enabledModes.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Published assignment</span>
                <span className="font-semibold text-slate-900">
                  {safePayload.assignment.isPublished ? 'Yes' : 'Draft'}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Enabled modes
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {enabledModes.map((mode) => (
                    <span
                      key={mode.mode}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${MODE_META[mode.mode].tint} ${MODE_META[mode.mode].accent}`}
                    >
                      {formatAssessmentModeLabel(mode.mode)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
