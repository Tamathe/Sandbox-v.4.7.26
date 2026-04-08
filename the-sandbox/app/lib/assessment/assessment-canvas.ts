import {
  ASSESSMENT_MODES,
  CANVAS_COMPOSITE_METHODS,
  type AssessmentCanvasAssignmentInput,
  type AssessmentCanvasConfig,
  type AssessmentCanvasModeConfigMap,
  type AssessmentCanvasModeState,
  type AssessmentCanvasModeStateUnion,
  type AssessmentMode,
  type AuthenticCanvasMetricWeights,
  type CanvasCompositeMethod,
  type EvidenceType,
} from './types';

export const ASSESSMENT_CANVAS_VERSION = 1;

const DEFAULT_MODE_WEIGHTS: Record<AssessmentMode, number> = {
  TRADITIONAL: 1,
  PROCESS: 0.3,
  DIVERGENCE: 0.3,
  TEACHBACK: 0.3,
  CROSS_EXAM: 0.3,
  AUTHENTIC: 0.3,
  MASTERY_GATE: 0.3,
};

const MODE_EVIDENCE_TYPES: Record<AssessmentMode, readonly EvidenceType[]> = {
  TRADITIONAL: [],
  PROCESS: ['SANDY_TRANSCRIPT', 'STUDENT_ANNOTATION'],
  DIVERGENCE: ['SIMULATION_THREAD'],
  TEACHBACK: ['TEACHBACK_SESSION'],
  CROSS_EXAM: ['DEBATE_SESSION', 'FISHBOWL_SESSION'],
  AUTHENTIC: ['TOOL_USAGE'],
  MASTERY_GATE: ['CONCEPT_MASTERY', 'FLASHCARD_MASTERY'],
};

const MODE_LABELS: Record<AssessmentMode, string> = {
  TRADITIONAL: 'Traditional Submission',
  PROCESS: 'Process Evidence',
  DIVERGENCE: 'Divergence Mapping',
  TEACHBACK: 'Teach-Back',
  CROSS_EXAM: 'Cross-Exam',
  AUTHENTIC: 'Authentic Audience',
  MASTERY_GATE: 'Mastery Gate',
};

const DEFAULT_MODE_CONFIGS: AssessmentCanvasModeConfigMap = {
  TRADITIONAL: {},
  PROCESS: {
    annotationRequired: true,
    minMessages: 10,
  },
  DIVERGENCE: {
    scenario: '',
    turns: 5,
    coherenceWeight: 0.6,
  },
  TEACHBACK: {
    concepts: [],
    timeLimitMinutes: 10,
  },
  CROSS_EXAM: {
    format: 'DEBATE',
    aiWeight: 0.4,
  },
  AUTHENTIC: {
    usagePeriodDays: 14,
    weights: {
      functionality: 0.4,
      usage: 0.3,
      impact: 0.2,
      iteration: 0.1,
    },
    uniqueUsersTarget: 10,
    totalSessionsTarget: 24,
    repeatUsersTarget: 4,
    durationTargetSeconds: 120,
  },
  MASTERY_GATE: {
    concepts: [],
    bloomFloor: 3,
    passThreshold: 0.8,
    gateId: null,
  },
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function roundWeight(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function normalizeMetricWeights(value: unknown): AuthenticCanvasMetricWeights {
  const raw = isRecord(value) ? value : {};
  const preliminary = {
    functionality: clampNumber(raw.functionality, 0.4, 0.05, 0.9),
    usage: clampNumber(raw.usage, 0.3, 0.05, 0.9),
    impact: clampNumber(raw.impact, 0.2, 0.05, 0.9),
    iteration: clampNumber(raw.iteration, 0.1, 0.05, 0.9),
  };

  const total =
    preliminary.functionality +
    preliminary.usage +
    preliminary.impact +
    preliminary.iteration;

  return {
    functionality: roundWeight(preliminary.functionality / total),
    usage: roundWeight(preliminary.usage / total),
    impact: roundWeight(preliminary.impact / total),
    iteration: roundWeight(
      1 -
        (roundWeight(preliminary.functionality / total) +
          roundWeight(preliminary.usage / total) +
          roundWeight(preliminary.impact / total))
    ),
  };
}

export function formatAssessmentModeLabel(mode: AssessmentMode): string {
  return MODE_LABELS[mode];
}

export function getCanvasEvidenceTypesForMode(mode: AssessmentMode): EvidenceType[] {
  return [...MODE_EVIDENCE_TYPES[mode]];
}

export function getDefaultCanvasModeConfig<M extends AssessmentMode>(
  mode: M
): AssessmentCanvasModeConfigMap[M] {
  return cloneJson(DEFAULT_MODE_CONFIGS[mode]);
}

export function createDefaultCanvasConfig(): AssessmentCanvasConfig {
  return {
    version: ASSESSMENT_CANVAS_VERSION,
    compositeMethod: 'weighted_average',
    modes: ASSESSMENT_MODES.map((mode) => ({
      mode,
      enabled: mode === 'TRADITIONAL',
      weight: DEFAULT_MODE_WEIGHTS[mode],
      config: getDefaultCanvasModeConfig(mode),
    })) as AssessmentCanvasModeStateUnion[],
  };
}

function normalizeModeConfig<M extends AssessmentMode>(
  mode: M,
  value: unknown
): AssessmentCanvasModeConfigMap[M] {
  const raw = isRecord(value) ? value : {};

  switch (mode) {
    case 'TRADITIONAL':
      return {} as AssessmentCanvasModeConfigMap[M];
    case 'PROCESS':
      return {
        annotationRequired:
          typeof raw.annotationRequired === 'boolean' ? raw.annotationRequired : true,
        minMessages: Math.round(clampNumber(raw.minMessages, 10, 1, 100)),
      } as AssessmentCanvasModeConfigMap[M];
    case 'DIVERGENCE':
      return {
        scenario: typeof raw.scenario === 'string' ? raw.scenario.trim() : '',
        turns: Math.round(clampNumber(raw.turns, 5, 1, 20)),
        coherenceWeight: roundWeight(clampNumber(raw.coherenceWeight, 0.6, 0, 1)),
      } as AssessmentCanvasModeConfigMap[M];
    case 'TEACHBACK':
      return {
        concepts: normalizeStringArray(raw.concepts),
        timeLimitMinutes: Math.round(clampNumber(raw.timeLimitMinutes, 10, 1, 180)),
      } as AssessmentCanvasModeConfigMap[M];
    case 'CROSS_EXAM':
      return {
        format: raw.format === 'FISHBOWL' ? 'FISHBOWL' : 'DEBATE',
        aiWeight: roundWeight(clampNumber(raw.aiWeight, 0.4, 0, 1)),
      } as AssessmentCanvasModeConfigMap[M];
    case 'AUTHENTIC':
      return {
        usagePeriodDays: Math.round(clampNumber(raw.usagePeriodDays, 14, 1, 180)),
        weights: normalizeMetricWeights(raw.weights),
        uniqueUsersTarget: Math.round(clampNumber(raw.uniqueUsersTarget, 10, 1, 500)),
        totalSessionsTarget: Math.round(clampNumber(raw.totalSessionsTarget, 24, 1, 1000)),
        repeatUsersTarget: Math.round(clampNumber(raw.repeatUsersTarget, 4, 1, 200)),
        durationTargetSeconds: Math.round(
          clampNumber(raw.durationTargetSeconds, 120, 30, 7200)
        ),
      } as AssessmentCanvasModeConfigMap[M];
    case 'MASTERY_GATE':
      return {
        concepts: normalizeStringArray(raw.concepts),
        bloomFloor: Math.round(clampNumber(raw.bloomFloor, 3, 1, 6)),
        passThreshold: roundWeight(clampNumber(raw.passThreshold, 0.8, 0.5, 1)),
        gateId: typeof raw.gateId === 'string' && raw.gateId.trim().length > 0 ? raw.gateId : null,
      } as AssessmentCanvasModeConfigMap[M];
    default:
      return getDefaultCanvasModeConfig(mode);
  }
}

function coerceAssessmentMode(value: unknown): AssessmentMode | null {
  if (typeof value !== 'string') return null;
  return ASSESSMENT_MODES.includes(value as AssessmentMode) ? (value as AssessmentMode) : null;
}

function coerceCompositeMethod(value: unknown): CanvasCompositeMethod {
  if (typeof value !== 'string') return 'weighted_average';
  return CANVAS_COMPOSITE_METHODS.includes(value as CanvasCompositeMethod)
    ? (value as CanvasCompositeMethod)
    : 'weighted_average';
}

function normalizeModeStates(
  modes: AssessmentCanvasModeStateUnion[]
): AssessmentCanvasModeStateUnion[] {
  const enabledModes = modes.filter((mode) => mode.enabled);
  if (enabledModes.length === 0) {
    return modes.map((mode) => ({ ...mode })) as AssessmentCanvasModeStateUnion[];
  }

  const totalWeight = enabledModes.reduce(
    (sum, mode) => sum + (mode.weight > 0 ? mode.weight : 0),
    0
  );
  const fallbackWeight = 1 / enabledModes.length;
  let assigned = 0;

  const enabledWeightMap = new Map<AssessmentMode, number>();
  enabledModes.forEach((mode, index) => {
    const normalized =
      totalWeight > 0 ? (mode.weight > 0 ? mode.weight : 0) / totalWeight : fallbackWeight;
    const weight =
      index === enabledModes.length - 1 ? roundWeight(1 - assigned) : roundWeight(normalized);
    assigned += index === enabledModes.length - 1 ? 0 : weight;
    enabledWeightMap.set(mode.mode, weight);
  });

  return modes.map((mode) => ({
    ...mode,
    weight: mode.enabled ? enabledWeightMap.get(mode.mode) ?? fallbackWeight : roundWeight(mode.weight),
  })) as AssessmentCanvasModeStateUnion[];
}

export function isAssessmentCanvasConfig(value: unknown): value is AssessmentCanvasConfig {
  return (
    isRecord(value) &&
    Array.isArray(value.modes) &&
    typeof value.compositeMethod === 'string' &&
    value.modes.every(
      (item) =>
        isRecord(item) &&
        typeof item.mode === 'string' &&
        typeof item.enabled === 'boolean' &&
        'config' in item
    )
  );
}

export function normalizeCanvasConfig(value: unknown): AssessmentCanvasConfig {
  const defaults = createDefaultCanvasConfig();
  const raw = isRecord(value) ? value : {};
  const rawModes = Array.isArray(raw.modes) ? raw.modes : [];
  const rawModeMap = new Map<string, Record<string, unknown>>();

  rawModes.forEach((entry) => {
    if (!isRecord(entry) || typeof entry.mode !== 'string') return;
    rawModeMap.set(entry.mode, entry);
  });

  return {
    version: Math.max(
      1,
      Math.round(clampNumber(raw.version, ASSESSMENT_CANVAS_VERSION, 1, 99))
    ),
    compositeMethod: coerceCompositeMethod(raw.compositeMethod),
    modes: normalizeModeStates(
      ASSESSMENT_MODES.map((mode) => {
        const fallback = defaults.modes.find((entry) => entry.mode === mode)!;
        const rawEntry = rawModeMap.get(mode);
        const enabled =
          typeof rawEntry?.enabled === 'boolean' ? rawEntry.enabled : fallback.enabled;

        return {
          mode,
          enabled,
          weight: roundWeight(
            clampNumber(rawEntry?.weight, fallback.weight, 0, 1)
          ),
          config: normalizeModeConfig(mode, rawEntry?.config),
        };
      }) as AssessmentCanvasModeStateUnion[]
    ),
  };
}

export function validateCanvasConfig(config: AssessmentCanvasConfig): string[] {
  const errors: string[] = [];
  const enabledModes = getEnabledCanvasModes(config);

  if (enabledModes.length === 0) {
    errors.push('At least one assessment mode must be enabled.');
  }

  const totalWeight = enabledModes.reduce((sum, mode) => sum + mode.weight, 0);
  if (enabledModes.length > 0 && Math.abs(totalWeight - 1) > 0.01) {
    errors.push('Enabled mode weights must sum to 1.0.');
  }

  return errors;
}

export function getCanvasModeState<M extends AssessmentMode>(
  config: AssessmentCanvasConfig,
  mode: M
): AssessmentCanvasModeState<M> {
  const found = config.modes.find((entry) => entry.mode === mode);
  if (found) {
    return found as AssessmentCanvasModeState<M>;
  }

  return {
    mode,
    enabled: false,
    weight: DEFAULT_MODE_WEIGHTS[mode],
    config: getDefaultCanvasModeConfig(mode),
  };
}

export function getEnabledCanvasModes(
  config: AssessmentCanvasConfig
): AssessmentCanvasModeStateUnion[] {
  return config.modes.filter((mode) => mode.enabled) as AssessmentCanvasModeStateUnion[];
}

export function isCanvasModeEnabled(
  config: AssessmentCanvasConfig,
  mode: AssessmentMode
): boolean {
  return getCanvasModeState(config, mode).enabled;
}

export function pickPrimaryCanvasMode(config: AssessmentCanvasConfig): AssessmentMode {
  const enabledModes = getEnabledCanvasModes(config);
  if (enabledModes.length === 0) return 'TRADITIONAL';

  return [...enabledModes].sort((left, right) => {
    if (right.weight !== left.weight) return right.weight - left.weight;
    return ASSESSMENT_MODES.indexOf(left.mode) - ASSESSMENT_MODES.indexOf(right.mode);
  })[0].mode;
}

export function deriveCanvasEvidenceTypes(config: AssessmentCanvasConfig): EvidenceType[] {
  return [
    ...new Set(
      getEnabledCanvasModes(config).flatMap((mode) => getCanvasEvidenceTypesForMode(mode.mode))
    ),
  ];
}

export function legacyAssignmentToCanvas(
  input: AssessmentCanvasAssignmentInput
): AssessmentCanvasConfig {
  const primaryMode = coerceAssessmentMode(input.assessmentMode) ?? 'TRADITIONAL';
  const modes = createDefaultCanvasConfig().modes.map((mode) => ({
    ...mode,
    enabled: false,
    weight: DEFAULT_MODE_WEIGHTS[mode.mode],
  })) as AssessmentCanvasModeStateUnion[];

  const processWeight =
    input.processWeight == null ? null : clampNumber(input.processWeight, 0, 0, 1);
  const legacyProcessBlend =
    processWeight != null && processWeight > 0 && processWeight < 1 ? roundWeight(processWeight) : null;

  const enableMode = (mode: AssessmentMode, weight: number) => {
    const index = modes.findIndex((entry) => entry.mode === mode);
    if (index < 0) return;
    modes[index] = {
      ...modes[index],
      enabled: true,
      weight: roundWeight(weight),
    };
  };

  if (primaryMode === 'PROCESS' && legacyProcessBlend != null) {
    enableMode('PROCESS', legacyProcessBlend);
    enableMode('TRADITIONAL', roundWeight(1 - legacyProcessBlend));
  } else if (primaryMode !== 'PROCESS' && legacyProcessBlend != null) {
    enableMode(primaryMode, roundWeight(1 - legacyProcessBlend));
    enableMode('PROCESS', legacyProcessBlend);
  } else {
    enableMode(primaryMode, 1);
  }

  const primaryIndex = modes.findIndex((entry) => entry.mode === primaryMode);
  if (primaryIndex >= 0) {
    modes[primaryIndex] = {
      ...modes[primaryIndex],
      config: normalizeModeConfig(primaryMode, input.assessmentConfig),
    } as AssessmentCanvasModeStateUnion;
  }

  return normalizeCanvasConfig({
    version: ASSESSMENT_CANVAS_VERSION,
    compositeMethod: 'weighted_average',
    modes,
  });
}

export function resolveCanvasConfigFromAssignment(
  input: AssessmentCanvasAssignmentInput
): AssessmentCanvasConfig {
  if (isAssessmentCanvasConfig(input.assessmentConfig)) {
    return normalizeCanvasConfig(input.assessmentConfig);
  }

  return legacyAssignmentToCanvas(input);
}

export function assignmentSupportsAssessmentMode(
  input: AssessmentCanvasAssignmentInput,
  mode: AssessmentMode
): boolean {
  return isCanvasModeEnabled(resolveCanvasConfigFromAssignment(input), mode);
}

export function extractAssessmentModeConfig<M extends AssessmentMode>(
  input: AssessmentCanvasAssignmentInput,
  mode: M
): AssessmentCanvasModeConfigMap[M] {
  return cloneJson(getCanvasModeState(resolveCanvasConfigFromAssignment(input), mode).config);
}

export function setCanvasModeEnabled(
  config: AssessmentCanvasConfig,
  mode: AssessmentMode,
  enabled: boolean
): AssessmentCanvasConfig {
  const current = getCanvasModeState(config, mode);
  if (!enabled && current.enabled && getEnabledCanvasModes(config).length === 1) {
    return config;
  }

  const currentlyEnabled = getEnabledCanvasModes(config);
  const averageWeight =
    currentlyEnabled.length > 0
      ? currentlyEnabled.reduce((sum, entry) => sum + entry.weight, 0) / currentlyEnabled.length
      : 1;

  return normalizeCanvasConfig({
    ...config,
    modes: config.modes.map((entry) =>
      entry.mode === mode
        ? {
            ...entry,
            enabled,
            weight: enabled && !current.enabled ? averageWeight : entry.weight,
          }
        : entry
    ),
  });
}

export function setCanvasModeWeight(
  config: AssessmentCanvasConfig,
  mode: AssessmentMode,
  desiredWeight: number
): AssessmentCanvasConfig {
  const enabledModes = getEnabledCanvasModes(config);
  const target = enabledModes.find((entry) => entry.mode === mode);
  if (!target) return config;

  if (enabledModes.length === 1) {
    return normalizeCanvasConfig({
      ...config,
      modes: config.modes.map((entry) =>
        entry.mode === mode ? { ...entry, weight: 1 } : entry
      ),
    });
  }

  const clampedWeight = clampNumber(desiredWeight, target.weight, 0.05, 0.95);
  const otherModes = enabledModes.filter((entry) => entry.mode !== mode);
  const otherTotal = otherModes.reduce((sum, entry) => sum + entry.weight, 0);
  const remaining = 1 - clampedWeight;

  return normalizeCanvasConfig({
    ...config,
    modes: config.modes.map((entry) => {
      if (!entry.enabled) return entry;
      if (entry.mode === mode) {
        return { ...entry, weight: clampedWeight };
      }

      const proportionalWeight =
        otherTotal > 0 ? remaining * (entry.weight / otherTotal) : remaining / otherModes.length;

      return {
        ...entry,
        weight: roundWeight(proportionalWeight),
      };
    }),
  });
}

export function updateCanvasModeConfig<M extends AssessmentMode>(
  config: AssessmentCanvasConfig,
  mode: M,
  patch: Partial<AssessmentCanvasModeConfigMap[M]>
): AssessmentCanvasConfig {
  const current = getCanvasModeState(config, mode);

  return normalizeCanvasConfig({
    ...config,
    modes: config.modes.map((entry) =>
      entry.mode === mode
        ? {
            ...entry,
            config: normalizeModeConfig(mode, {
              ...(current.config as Record<string, unknown>),
              ...(patch as Record<string, unknown>),
            }),
          }
        : entry
    ),
  });
}

export function setCanvasCompositeMethod(
  config: AssessmentCanvasConfig,
  compositeMethod: CanvasCompositeMethod
): AssessmentCanvasConfig {
  return normalizeCanvasConfig({
    ...config,
    compositeMethod,
  });
}

function formatWeight(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}

function formatConceptList(concepts: string[]): string {
  if (concepts.length === 0) return 'selected course concepts';
  if (concepts.length === 1) return concepts[0];
  if (concepts.length === 2) return `${concepts[0]} and ${concepts[1]}`;
  return `${concepts.slice(0, -1).join(', ')}, and ${concepts[concepts.length - 1]}`;
}

function buildCompositeMethodLine(method: CanvasCompositeMethod): string {
  switch (method) {
    case 'highest':
      return 'Your strongest demonstrated mode will carry the most weight in the final composite.';
    case 'portfolio':
      return 'Faculty will review the full body of evidence as a portfolio rather than relying on a single blended score.';
    case 'weighted_average':
    default:
      return 'Your final result combines the enabled modes using the weighted mix shown below.';
  }
}

export function buildAssessmentInstructions(config: AssessmentCanvasConfig): string {
  const normalized = normalizeCanvasConfig(config);
  const enabledModes = getEnabledCanvasModes(normalized);

  const lines = ['How You Will Be Assessed', buildCompositeMethodLine(normalized.compositeMethod), ''];

  enabledModes.forEach((entry) => {
    switch (entry.mode) {
      case 'TRADITIONAL':
        lines.push(
          `- ${MODE_LABELS.TRADITIONAL} (${formatWeight(entry.weight)}): Submit the required assignment deliverable through the course assignment flow.`
        );
        break;
      case 'PROCESS':
        lines.push(
          `- ${MODE_LABELS.PROCESS} (${formatWeight(entry.weight)}): Work with Sandy and document your thinking. ${entry.config.annotationRequired ? 'Annotations are required.' : 'Annotations are encouraged.'} Aim for at least ${entry.config.minMessages} substantive messages.`
        );
        break;
      case 'DIVERGENCE':
        lines.push(
          `- ${MODE_LABELS.DIVERGENCE} (${formatWeight(entry.weight)}): Navigate a branching scenario over about ${entry.config.turns} turns and justify your decisions. Coherence counts for ${Math.round(entry.config.coherenceWeight * 100)}% of this mode.`
        );
        if (entry.config.scenario) {
          lines.push(`  Scenario focus: ${entry.config.scenario}`);
        }
        break;
      case 'TEACHBACK':
        lines.push(
          `- ${MODE_LABELS.TEACHBACK} (${formatWeight(entry.weight)}): Teach back ${formatConceptList(entry.config.concepts)} within a ${entry.config.timeLimitMinutes}-minute session.`
        );
        break;
      case 'CROSS_EXAM':
        lines.push(
          `- ${MODE_LABELS.CROSS_EXAM} (${formatWeight(entry.weight)}): Defend your reasoning in a ${entry.config.format.toLowerCase()} format. AI scoring contributes ${Math.round(entry.config.aiWeight * 100)}% of this mode.`
        );
        break;
      case 'AUTHENTIC':
        lines.push(
          `- ${MODE_LABELS.AUTHENTIC} (${formatWeight(entry.weight)}): Build something that earns real-world use over a ${entry.config.usagePeriodDays}-day evidence window. Functionality, usage, impact, and iteration all matter.`
        );
        break;
      case 'MASTERY_GATE':
        lines.push(
          `- ${MODE_LABELS.MASTERY_GATE} (${formatWeight(entry.weight)}): Demonstrate mastery of ${formatConceptList(entry.config.concepts)} at Bloom level ${entry.config.bloomFloor} or higher, with a ${Math.round(entry.config.passThreshold * 100)}% pass threshold.`
        );
        break;
      default:
        break;
    }
  });

  return lines.join('\n').trim();
}
