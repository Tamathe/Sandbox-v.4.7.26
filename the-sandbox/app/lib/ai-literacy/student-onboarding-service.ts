import { Prisma } from '../../generated/prisma'
import { prisma } from '../prisma'
import { inferDisciplineFromCourses } from './student-literacy-profile-service'

function toJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue
}

export async function getOnboardingStatus(userId: string) {
  const profile = await prisma.studentLiteracyProfile.findUnique({
    where: { userId },
    select: {
      onboardingCompleted: true,
      onboardingStep: true,
      onboardingResponses: true,
    },
  })

  return {
    completed: profile?.onboardingCompleted ?? false,
    step: profile?.onboardingStep ?? 0,
    responses: profile?.onboardingResponses ?? null,
  }
}

export async function submitOnboardingStep(
  userId: string,
  step: number,
  data: Record<string, unknown>,
) {
  const existing = await prisma.studentLiteracyProfile.findUnique({
    where: { userId },
    select: { onboardingResponses: true },
  })

  const prev = (existing?.onboardingResponses as Record<string, unknown>) ?? {}
  const merged = { ...prev, ...data }

  await prisma.studentLiteracyProfile.upsert({
    where: { userId },
    create: {
      userId,
      onboardingStep: step,
      onboardingResponses: toJson(merged),
    },
    update: {
      onboardingStep: step,
      onboardingResponses: toJson(merged),
    },
  })

  return { step, responses: merged }
}

// Map onboarding comfort level → initial practicalSkill
const COMFORT_TO_PRACTICAL: Record<number, number> = {
  1: 10, 2: 25, 3: 40, 4: 60, 5: 75,
}

// Map onboarding AI usage → initial communication
const USAGE_TO_COMMUNICATION: Record<string, number> = {
  never: 10, casual: 30, regular: 50, daily: 70,
}

export async function completeOnboarding(
  userId: string,
  responses: Record<string, unknown>,
) {
  const existing = await prisma.studentLiteracyProfile.findUnique({
    where: { userId },
    select: { onboardingResponses: true },
  })

  const prev = (existing?.onboardingResponses as Record<string, unknown>) ?? {}
  const merged = { ...prev, ...responses }

  const discipline = await inferDisciplineFromCourses(userId)

  // Seed initial dimensions from onboarding answers
  const comfort = typeof merged.comfort === 'number' ? merged.comfort : 3
  const usage = typeof merged.usage === 'string' ? merged.usage : 'casual'
  const practicalSkill = COMFORT_TO_PRACTICAL[comfort] ?? 40
  const communication = USAGE_TO_COMMUNICATION[usage] ?? 30

  await prisma.studentLiteracyProfile.upsert({
    where: { userId },
    create: {
      userId,
      onboardingCompleted: true,
      onboardingStep: 4,
      onboardingResponses: toJson(merged),
      practicalSkill,
      communication,
      skepticism: 0,
      judgment: 0,
      readiness: Math.round((practicalSkill + communication) / 4),
      ...(discipline ? { disciplineFamily: discipline } : {}),
    },
    update: {
      onboardingCompleted: true,
      onboardingStep: 4,
      onboardingResponses: toJson(merged),
      practicalSkill,
      communication,
      skepticism: 0,
      judgment: 0,
      readiness: Math.round((practicalSkill + communication) / 4),
      ...(discipline ? { disciplineFamily: discipline } : {}),
    },
  })

  return { completed: true, responses: merged, disciplineFamily: discipline }
}
