import type {
  AssessmentMode as PrismaAssessmentMode,
  EvidenceType as PrismaEvidenceType,
  Prisma,
} from '../../generated/prisma';
import { prisma } from '../prisma';
import { toJsonValue } from '../prisma-utils';
import {
  buildAssessmentInstructions,
  deriveCanvasEvidenceTypes,
  extractAssessmentModeConfig,
  getCanvasModeState,
  getEnabledCanvasModes,
  isAssessmentCanvasConfig,
  isCanvasModeEnabled,
  normalizeCanvasConfig,
  pickPrimaryCanvasMode,
  resolveCanvasConfigFromAssignment,
  validateCanvasConfig,
} from './assessment-canvas';
import type {
  AssessmentCanvasAssignmentInput,
  AssessmentCanvasAssignmentPayload,
  AssessmentCanvasConfig,
  AssessmentMode,
} from './types';

function createHttpError(message: string, status: number) {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}


type CanvasAssignmentRow = {
  id: string;
  title: string;
  isPublished: boolean;
  assessmentMode: PrismaAssessmentMode;
  assessmentConfig: Prisma.JsonValue | null;
  evidenceTypes: PrismaEvidenceType[];
  processWeight: number | null;
  course: {
    id: string;
    title: string;
  };
};

async function getAssignmentOrThrow(assignmentId: string): Promise<CanvasAssignmentRow> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      title: true,
      isPublished: true,
      assessmentMode: true,
      assessmentConfig: true,
      evidenceTypes: true,
      processWeight: true,
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!assignment) {
    throw createHttpError('Assignment not found', 404);
  }

  return assignment;
}

function buildCanvasPayload(
  assignment: CanvasAssignmentRow,
  config: AssessmentCanvasConfig
): AssessmentCanvasAssignmentPayload {
  const normalized = normalizeCanvasConfig(config);

  return {
    generatedAt: new Date().toISOString(),
    assignment: {
      id: assignment.id,
      title: assignment.title,
      courseId: assignment.course.id,
      courseTitle: assignment.course.title,
      isPublished: assignment.isPublished,
      primaryMode: pickPrimaryCanvasMode(normalized),
      enabledModes: getEnabledCanvasModes(normalized).map((mode) => mode.mode),
      evidenceTypes: deriveCanvasEvidenceTypes(normalized),
      processWeight: isCanvasModeEnabled(normalized, 'PROCESS')
        ? getCanvasModeState(normalized, 'PROCESS').weight
        : null,
    },
    config: normalized,
  };
}

export async function getCanvasConfig(assignmentId: string): Promise<AssessmentCanvasConfig> {
  const assignment = await getAssignmentOrThrow(assignmentId);

  return resolveCanvasConfigFromAssignment({
    assessmentMode: assignment.assessmentMode,
    assessmentConfig: assignment.assessmentConfig,
    processWeight: assignment.processWeight,
  });
}

export async function getCanvasConfigPayload(
  assignmentId: string
): Promise<AssessmentCanvasAssignmentPayload> {
  const assignment = await getAssignmentOrThrow(assignmentId);
  const config = resolveCanvasConfigFromAssignment({
    assessmentMode: assignment.assessmentMode,
    assessmentConfig: assignment.assessmentConfig,
    processWeight: assignment.processWeight,
  });

  return buildCanvasPayload(assignment, config);
}

export async function saveCanvasConfig(
  assignmentId: string,
  config: AssessmentCanvasConfig
): Promise<AssessmentCanvasAssignmentPayload> {
  await getAssignmentOrThrow(assignmentId);

  const normalized = normalizeCanvasConfig(config);
  const validationErrors = validateCanvasConfig(normalized);
  if (validationErrors.length > 0) {
    throw createHttpError(validationErrors[0], 400);
  }

  const primaryMode = pickPrimaryCanvasMode(normalized);
  const enabledEvidenceTypes = deriveCanvasEvidenceTypes(normalized);
  const processWeight = isCanvasModeEnabled(normalized, 'PROCESS')
    ? getCanvasModeState(normalized, 'PROCESS').weight
    : null;

  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      assessmentConfig: toJsonValue(normalized),
      assessmentMode: primaryMode as PrismaAssessmentMode,
      evidenceTypes: enabledEvidenceTypes as PrismaEvidenceType[],
      processWeight,
    },
    select: {
      id: true,
      title: true,
      isPublished: true,
      assessmentMode: true,
      assessmentConfig: true,
      evidenceTypes: true,
      processWeight: true,
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return buildCanvasPayload(updated, normalized);
}

export async function getCanvasInstructionsPayload(assignmentId: string) {
  const payload = await getCanvasConfigPayload(assignmentId);

  return {
    generatedAt: new Date().toISOString(),
    assignment: {
      id: payload.assignment.id,
      title: payload.assignment.title,
      primaryMode: payload.assignment.primaryMode,
      enabledModes: payload.assignment.enabledModes,
      compositeMethod: payload.config.compositeMethod,
    },
    instructions: buildAssessmentInstructions(payload.config),
  };
}

export function extractModeConfigFromAssignment<M extends AssessmentMode>(
  input: AssessmentCanvasAssignmentInput,
  mode: M
) {
  return extractAssessmentModeConfig(input, mode);
}

export function assignmentHasCanvasMode(
  input: AssessmentCanvasAssignmentInput,
  mode: AssessmentMode
) {
  return isCanvasModeEnabled(resolveCanvasConfigFromAssignment(input), mode);
}

export {
  buildAssessmentInstructions,
  deriveCanvasEvidenceTypes,
  getCanvasModeState,
  getEnabledCanvasModes,
  isAssessmentCanvasConfig,
  normalizeCanvasConfig,
  pickPrimaryCanvasMode,
  resolveCanvasConfigFromAssignment,
  validateCanvasConfig,
};
