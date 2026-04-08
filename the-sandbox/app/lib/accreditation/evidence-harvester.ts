import { prisma } from '../prisma'
import type { EvidenceHarvestResult } from './types'

/** Harvest evidence for all auto-harvestable standards */
export async function harvestAllEvidence(cycleId: string): Promise<EvidenceHarvestResult[]> {
  const standards = await prisma.accreditationStandard.findMany({
    where: { autoHarvestable: true, isActive: true },
  })

  const results = await Promise.all(
    standards.map(standard => harvestForStandard(standard.id, cycleId, standard))
  )

  return results
}

async function harvestForStandard(
  standardId: string,
  cycleId: string,
  standard: { standardNumber: string; harvestSources: unknown }
): Promise<EvidenceHarvestResult> {
  const sources = (standard.harvestSources as { model: string; description: string }[]) ?? []
  let harvested = 0
  let skipped = 0
  const errors: string[] = []

  for (const source of sources) {
    try {
      switch (source.model) {
        case 'GradebookEntry':
          harvested += await harvestGradebookEvidence(standardId, cycleId)
          break
        case 'RubricBreakdown':
          harvested += await harvestRubricEvidence(standardId, cycleId)
          break
        case 'AssessmentEvidence':
          harvested += await harvestAssessmentEvidence(standardId, cycleId)
          break
        case 'CompetencyRecord':
          harvested += await harvestCompetencyEvidence(standardId, cycleId)
          break
        case 'StudentConceptMastery':
          harvested += await harvestConceptMasteryEvidence(standardId, cycleId)
          break
        case 'Course':
          harvested += await harvestCourseEvidence(standardId, cycleId)
          break
        case 'CourseWeek':
        case 'CourseMaterial':
          harvested += await harvestCourseMaterialEvidence(standardId, cycleId)
          break
        case 'AccessibilityReport':
          harvested += await harvestAccessibilityEvidence(standardId, cycleId)
          break
        case 'SuccessIntervention':
          harvested += await harvestInterventionEvidence(standardId, cycleId)
          break
        case 'ContentFeedback':
        case 'ImprovementSuggestion':
          harvested += await harvestFeedbackEvidence(standardId, cycleId)
          break
        case 'ToolSession':
          harvested += await harvestToolSessionEvidence(standardId, cycleId)
          break
        case 'CourseAIPolicy':
          harvested += await harvestAIPolicyEvidence(standardId, cycleId)
          break
        case 'CourseEnrollment':
          harvested += await harvestEnrollmentEvidence(standardId, cycleId)
          break
        default:
          skipped++
      }
    } catch (err) {
      errors.push(`${source.model}: ${(err as Error).message}`)
    }
  }

  return { standardId, harvested, skipped, errors }
}

/** Harvest rubric-based assessment data as Standard 8.2a evidence */
async function harvestRubricEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()

  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'rubric_data', semesterCode: currentSemester },
  })
  if (existing) return 0

  const rubrics = await prisma.rubricBreakdown.count({
    where: { generatedAt: { gte: getSemesterStart(currentSemester) } },
  })

  const byProgram = await prisma.rubricBreakdown.groupBy({
    by: ['submissionId'],
    where: { generatedAt: { gte: getSemesterStart(currentSemester) } },
    _count: true,
  })

  if (rubrics === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Rubric-Based Assessment Data`,
      description: `${rubrics} rubric-scored assessments collected across ${byProgram.length} assignments during ${currentSemester}. Each assessment includes dimensional AI scoring with faculty review.`,
      evidenceType: 'rubric_data',
      sourceType: 'auto_harvest',
      sourceModel: 'RubricBreakdown',
      sourceCount: rubrics,
      quality: rubrics >= 100 ? 'EXCELLENT' : rubrics >= 20 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, rubrics / 100),
      completeness: Math.min(1, rubrics / 50),
      recency: 1.0,
      alignment: 0.9,
      semesterCode: currentSemester,
      dataSnapshot: {
        totalRubrics: rubrics,
        assignmentCount: byProgram.length,
        harvestedAt: new Date().toISOString(),
      },
    },
  })

  return 1
}

/** Harvest gradebook data for Standard 8.1 */
async function harvestGradebookEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'assessment_data', semesterCode: currentSemester },
  })
  if (existing) return 0

  const entries = await prisma.gradebookEntry.count({
    where: {
      facultyScore: { not: null },
      reviewedAt: { gte: getSemesterStart(currentSemester) },
    },
  })

  if (entries === 0) return 0

  const allEntries = await prisma.gradebookEntry.findMany({
    where: {
      facultyScore: { not: null },
      reviewedAt: { gte: getSemesterStart(currentSemester) },
    },
    select: { facultyScore: true },
  })

  const scores = allEntries.map(e => e.facultyScore!)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const passRate = scores.filter(s => s >= 60).length / scores.length

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Student Achievement Data`,
      description: `${entries} graded assessments. Average score: ${avg.toFixed(1)}%. Pass rate: ${(passRate * 100).toFixed(1)}%.`,
      evidenceType: 'assessment_data',
      sourceType: 'auto_harvest',
      sourceModel: 'GradebookEntry',
      sourceCount: entries,
      quality: entries >= 200 ? 'EXCELLENT' : entries >= 50 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, entries / 200),
      completeness: Math.min(1, entries / 100),
      recency: 1.0,
      alignment: 0.85,
      semesterCode: currentSemester,
      dataSnapshot: {
        totalEntries: entries,
        avgScore: avg,
        passRate,
        harvestedAt: new Date().toISOString(),
      },
    },
  })

  return 1
}

/** Harvest multi-modal assessment evidence for Standard 8.2a */
async function harvestAssessmentEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'assessment_data', sourceModel: 'AssessmentEvidence', semesterCode: currentSemester },
  })
  if (existing) return 0

  const count = await prisma.assessmentEvidence.count({
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
  })

  if (count === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Multi-Modal Assessment Evidence`,
      description: `${count} assessment evidence artifacts collected through the Assessment Reimagined framework.`,
      evidenceType: 'assessment_data',
      sourceType: 'auto_harvest',
      sourceModel: 'AssessmentEvidence',
      sourceCount: count,
      quality: count >= 50 ? 'EXCELLENT' : count >= 10 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, count / 50),
      completeness: Math.min(1, count / 25),
      recency: 1.0,
      alignment: 0.95,
      semesterCode: currentSemester,
      dataSnapshot: { totalEvidence: count, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

/** Harvest competency records for Standard 8.2a/8.2b */
async function harvestCompetencyEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'competency_data', semesterCode: currentSemester },
  })
  if (existing) return 0

  const count = await prisma.competencyRecord.count({
    where: { computedAt: { gte: getSemesterStart(currentSemester) } },
  })

  if (count === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Cross-Course Competency Records`,
      description: `${count} competency demonstrations recorded across courses, tracking student mastery of program-level outcomes.`,
      evidenceType: 'competency_data',
      sourceType: 'auto_harvest',
      sourceModel: 'CompetencyRecord',
      sourceCount: count,
      quality: count >= 50 ? 'EXCELLENT' : count >= 10 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, count / 50),
      completeness: Math.min(1, count / 25),
      recency: 1.0,
      alignment: 0.9,
      semesterCode: currentSemester,
      dataSnapshot: { totalRecords: count, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

/** Harvest concept mastery data for Standard 8.2a */
async function harvestConceptMasteryEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'assessment_data', sourceModel: 'StudentConceptMastery', semesterCode: currentSemester },
  })
  if (existing) return 0

  const count = await prisma.studentConceptMastery.count({
    where: { lastSeenAt: { gte: getSemesterStart(currentSemester) } },
  })

  if (count === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Per-Concept Mastery Tracking Data`,
      description: `${count} concept mastery records tracking granular student understanding at the concept level.`,
      evidenceType: 'assessment_data',
      sourceType: 'auto_harvest',
      sourceModel: 'StudentConceptMastery',
      sourceCount: count,
      quality: count >= 100 ? 'EXCELLENT' : count >= 20 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, count / 100),
      completeness: Math.min(1, count / 50),
      recency: 1.0,
      alignment: 0.8,
      semesterCode: currentSemester,
      dataSnapshot: { totalRecords: count, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

/** Harvest course catalog data for Standard 9.1 */
async function harvestCourseEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'syllabi', sourceModel: 'Course', semesterCode: currentSemester },
  })
  if (existing) return 0

  const count = await prisma.course.count({ where: { isPublic: true } })
  if (count === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Course Catalog & Structure Data`,
      description: `${count} published courses with descriptions, learning outcomes, and structured content.`,
      evidenceType: 'syllabi',
      sourceType: 'auto_harvest',
      sourceModel: 'Course',
      sourceCount: count,
      quality: count >= 30 ? 'EXCELLENT' : count >= 10 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, count / 30),
      completeness: Math.min(1, count / 15),
      recency: 1.0,
      alignment: 0.85,
      semesterCode: currentSemester,
      dataSnapshot: { totalCourses: count, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

/** Harvest course materials for Standard 9.1 */
async function harvestCourseMaterialEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'course_materials', semesterCode: currentSemester },
  })
  if (existing) return 0

  const materials = await prisma.courseMaterial.count({
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
  })
  const weeks = await prisma.courseWeek.count()

  if (materials === 0 && weeks === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Course Materials & Weekly Structure`,
      description: `${materials} course materials uploaded and ${weeks} weekly content structures defined across all courses.`,
      evidenceType: 'course_materials',
      sourceType: 'auto_harvest',
      sourceModel: 'CourseMaterial',
      sourceCount: materials + weeks,
      quality: materials >= 50 ? 'EXCELLENT' : materials >= 15 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, materials / 50),
      completeness: Math.min(1, (materials + weeks) / 60),
      recency: 1.0,
      alignment: 0.8,
      semesterCode: currentSemester,
      dataSnapshot: { totalMaterials: materials, totalWeeks: weeks, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

/** Harvest accessibility reports for Standard 13.7 */
async function harvestAccessibilityEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'accessibility_report', semesterCode: currentSemester },
  })
  if (existing) return 0

  const reports = await prisma.accessibilityReport.count({
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
  })

  if (reports === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} ADA Compliance Scan Reports`,
      description: `${reports} accessibility compliance scans conducted on course materials, tools, and content.`,
      evidenceType: 'accessibility_report',
      sourceType: 'auto_harvest',
      sourceModel: 'AccessibilityReport',
      sourceCount: reports,
      quality: reports >= 50 ? 'EXCELLENT' : reports >= 10 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, reports / 50),
      completeness: Math.min(1, reports / 20),
      recency: 1.0,
      alignment: 0.95,
      semesterCode: currentSemester,
      dataSnapshot: { totalReports: reports, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

/** Harvest student support interventions for Standard 12.1 */
async function harvestInterventionEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'student_support', semesterCode: currentSemester },
  })
  if (existing) return 0

  const interventions = await prisma.successIntervention.count({
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
  })

  if (interventions === 0) return 0

  const outcomes = await prisma.successIntervention.groupBy({
    by: ['outcome'],
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
    _count: true,
  })

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Student Support Intervention Data`,
      description: `${interventions} student support interventions recorded. Outcome tracking: ${outcomes.map(o => `${o.outcome}: ${o._count}`).join(', ')}.`,
      evidenceType: 'student_support',
      sourceType: 'auto_harvest',
      sourceModel: 'SuccessIntervention',
      sourceCount: interventions,
      quality: interventions >= 20 ? 'EXCELLENT' : interventions >= 5 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, interventions / 20),
      completeness: 0.8,
      recency: 1.0,
      alignment: 0.9,
      semesterCode: currentSemester,
      dataSnapshot: { totalInterventions: interventions, outcomes, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

/** Harvest student feedback for Standard 12.4 */
async function harvestFeedbackEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'feedback', semesterCode: currentSemester },
  })
  if (existing) return 0

  const feedbackCount = await prisma.contentFeedback.count({
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
  })
  const suggestionsCount = await prisma.improvementSuggestion.count({
    where: { createdAt: { gte: getSemesterStart(currentSemester) } },
  })

  const total = feedbackCount + suggestionsCount
  if (total === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Student Feedback & Complaints Data`,
      description: `${feedbackCount} content feedback items and ${suggestionsCount} improvement suggestions collected, demonstrating active student voice mechanisms.`,
      evidenceType: 'feedback',
      sourceType: 'auto_harvest',
      sourceModel: 'ContentFeedback',
      sourceCount: total,
      quality: total >= 50 ? 'EXCELLENT' : total >= 10 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, total / 50),
      completeness: Math.min(1, total / 25),
      recency: 1.0,
      alignment: 0.85,
      semesterCode: currentSemester,
      dataSnapshot: { feedbackCount, suggestionsCount, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

/** Harvest tool session data for Standard 12.1 */
async function harvestToolSessionEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'student_support', sourceModel: 'ToolSession', semesterCode: currentSemester },
  })
  if (existing) return 0

  const sessions = await prisma.toolSession.count({
    where: { startedAt: { gte: getSemesterStart(currentSemester) } },
  })

  if (sessions === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} AI Tutoring & Study Support Usage`,
      description: `${sessions} AI-powered tutoring and study support sessions conducted, demonstrating technology-enhanced student support services.`,
      evidenceType: 'student_support',
      sourceType: 'auto_harvest',
      sourceModel: 'ToolSession',
      sourceCount: sessions,
      quality: sessions >= 200 ? 'EXCELLENT' : sessions >= 50 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, sessions / 200),
      completeness: Math.min(1, sessions / 100),
      recency: 1.0,
      alignment: 0.75,
      semesterCode: currentSemester,
      dataSnapshot: { totalSessions: sessions, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

/** Harvest AI usage policies for Standard 10.7 */
async function harvestAIPolicyEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'ai_policy', semesterCode: currentSemester },
  })
  if (existing) return 0

  const policies = await prisma.courseAIPolicy.count()
  if (policies === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Course AI Usage Policies`,
      description: `${policies} course-level AI usage policies published, demonstrating transparent policy communication for technology-augmented learning.`,
      evidenceType: 'ai_policy',
      sourceType: 'auto_harvest',
      sourceModel: 'CourseAIPolicy',
      sourceCount: policies,
      quality: policies >= 20 ? 'EXCELLENT' : policies >= 5 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, policies / 20),
      completeness: Math.min(1, policies / 10),
      recency: 1.0,
      alignment: 0.8,
      semesterCode: currentSemester,
      dataSnapshot: { totalPolicies: policies, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

/** Harvest enrollment data for Standard 8.1 */
async function harvestEnrollmentEvidence(standardId: string, cycleId: string): Promise<number> {
  const currentSemester = getCurrentSemester()
  const existing = await prisma.accreditationEvidence.findFirst({
    where: { standardId, cycleId, evidenceType: 'completion_rates', semesterCode: currentSemester },
  })
  if (existing) return 0

  const enrollments = await prisma.courseEnrollment.count({
    where: { enrolledAt: { gte: getSemesterStart(currentSemester) } },
  })

  if (enrollments === 0) return 0

  await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId,
      title: `${currentSemester} Enrollment Data`,
      description: `${enrollments} course enrollments recorded during ${currentSemester}.`,
      evidenceType: 'completion_rates',
      sourceType: 'auto_harvest',
      sourceModel: 'CourseEnrollment',
      sourceCount: enrollments,
      quality: enrollments >= 100 ? 'EXCELLENT' : enrollments >= 20 ? 'GOOD' : 'FAIR',
      qualityScore: Math.min(1, enrollments / 100),
      completeness: Math.min(1, enrollments / 50),
      recency: 1.0,
      alignment: 0.85,
      semesterCode: currentSemester,
      dataSnapshot: { totalEnrollments: enrollments, harvestedAt: new Date().toISOString() },
    },
  })

  return 1
}

// ─── Utility functions ───────────────────────────────────────────────────────

export function getCurrentSemester(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (month >= 0 && month <= 4) return `SP${year}`
  if (month >= 5 && month <= 7) return `SU${year}`
  return `FA${year}`
}

export function getSemesterStart(code: string): Date {
  const year = parseInt(code.slice(2))
  if (code.startsWith('SP')) return new Date(year, 0, 1)
  if (code.startsWith('SU')) return new Date(year, 5, 1)
  return new Date(year, 7, 1)
}
