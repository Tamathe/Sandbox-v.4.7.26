import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'
import type { StandardSeedData } from './types'

/** SACSCOC standards relevant to the University of Kentucky platform data */
export const SACSCOC_STANDARDS: StandardSeedData[] = [
  {
    sectionNumber: '6',
    sectionTitle: 'Faculty',
    standardNumber: '6.1',
    standardTitle: 'Full-time Faculty',
    description: 'The institution employs an adequate number of full-time faculty members to support the mission and goals of the institution.',
    evidenceTypes: ['faculty_credential', 'course_assignment'],
    collectionFrequency: 'annual',
    autoHarvestable: false,
    harvestSources: null,
  },
  {
    sectionNumber: '6',
    sectionTitle: 'Faculty',
    standardNumber: '6.2a',
    standardTitle: 'Faculty Qualifications',
    description: 'For each of its educational programs, the institution employs a sufficient number of full-time faculty members to ensure curriculum and program quality, improvement, and student learning.',
    evidenceTypes: ['faculty_credential', 'course_assignment', 'teaching_evaluation'],
    collectionFrequency: 'annual',
    autoHarvestable: false,
    harvestSources: null,
  },
  {
    sectionNumber: '8',
    sectionTitle: 'Student Achievement',
    standardNumber: '8.1',
    standardTitle: 'Student Achievement',
    description: "The institution identifies, evaluates, and publishes goals and outcomes for student achievement appropriate to the institution's mission, the nature of the students it serves, and the kinds of programs offered.",
    evidenceTypes: ['assessment_data', 'completion_rates', 'retention_data'],
    collectionFrequency: 'continuous',
    autoHarvestable: true,
    harvestSources: [
      { model: 'GradebookEntry', description: 'Course grade distributions and pass rates' },
      { model: 'CourseEnrollment', description: 'Enrollment and completion counts' },
    ],
  },
  {
    sectionNumber: '8',
    sectionTitle: 'Student Achievement',
    standardNumber: '8.2a',
    standardTitle: 'Student Learning Outcomes',
    description: 'The institution identifies expected outcomes, assesses the extent to which it achieves these outcomes, and provides evidence of seeking improvement based on analysis of the results.',
    evidenceTypes: ['assessment_data', 'rubric_data', 'competency_data', 'improvement_actions'],
    collectionFrequency: 'continuous',
    autoHarvestable: true,
    harvestSources: [
      { model: 'RubricBreakdown', description: 'Per-submission dimensional AI scoring' },
      { model: 'AssessmentEvidence', description: 'Multi-modal assessment evidence' },
      { model: 'CompetencyRecord', description: 'Cross-course competency aggregation' },
      { model: 'StudentConceptMastery', description: 'Per-concept mastery tracking' },
    ],
  },
  {
    sectionNumber: '8',
    sectionTitle: 'Student Achievement',
    standardNumber: '8.2b',
    standardTitle: 'Student Outcomes: General Education',
    description: 'The institution identifies expected outcomes for its general education program, assesses the extent to which it achieves these outcomes, and provides evidence of seeking improvement.',
    evidenceTypes: ['competency_data', 'general_education_assessment'],
    collectionFrequency: 'annual',
    autoHarvestable: true,
    harvestSources: [
      { model: 'CompetencyRecord', description: 'Cross-course competency for gen-ed outcomes' },
    ],
  },
  {
    sectionNumber: '9',
    sectionTitle: 'Educational Program Structure',
    standardNumber: '9.1',
    standardTitle: 'Program Content',
    description: "Educational programs are appropriate in content, rigor, and expected learning outcomes and are consistent with the institution's mission.",
    evidenceTypes: ['syllabi', 'course_materials', 'program_structure'],
    collectionFrequency: 'per_cycle',
    autoHarvestable: true,
    harvestSources: [
      { model: 'Course', description: 'Course catalog and descriptions' },
      { model: 'CourseWeek', description: 'Weekly content structure' },
      { model: 'CourseMaterial', description: 'Uploaded course materials' },
    ],
  },
  {
    sectionNumber: '10',
    sectionTitle: 'Educational Policies, Procedures, and Practices',
    standardNumber: '10.7',
    standardTitle: 'Policies for Awarding Credit',
    description: 'The institution publishes and implements policies for determining the amount and level of credit awarded for courses.',
    evidenceTypes: ['policy_document', 'grading_policy', 'ai_policy'],
    collectionFrequency: 'on_change',
    autoHarvestable: true,
    harvestSources: [
      { model: 'CourseAIPolicy', description: 'AI usage policies per course' },
    ],
  },
  {
    sectionNumber: '12',
    sectionTitle: 'Academic and Student Support Services',
    standardNumber: '12.1',
    standardTitle: 'Student Support Services',
    description: 'The institution provides appropriate academic and student support programs, services, and activities consistent with its mission.',
    evidenceTypes: ['student_support', 'intervention_data', 'advising_data'],
    collectionFrequency: 'continuous',
    autoHarvestable: true,
    harvestSources: [
      { model: 'SuccessIntervention', description: 'Student success intervention records' },
      { model: 'ToolSession', description: 'AI tutoring and study support usage' },
    ],
  },
  {
    sectionNumber: '12',
    sectionTitle: 'Academic and Student Support Services',
    standardNumber: '12.4',
    standardTitle: 'Student Complaints',
    description: 'The institution publishes and follows an established process for addressing student complaints.',
    evidenceTypes: ['feedback', 'complaint_process', 'resolution_data'],
    collectionFrequency: 'continuous',
    autoHarvestable: true,
    harvestSources: [
      { model: 'ContentFeedback', description: 'Student feedback on tools and courses' },
      { model: 'ImprovementSuggestion', description: 'Student improvement suggestions' },
    ],
  },
  {
    sectionNumber: '13',
    sectionTitle: 'Financial and Physical Resources',
    standardNumber: '13.7',
    standardTitle: 'Physical Resources',
    description: 'The institution ensures adequate physical facilities and resources, both on and off campus, that support its mission and programs.',
    evidenceTypes: ['accessibility_report', 'digital_accessibility'],
    collectionFrequency: 'continuous',
    autoHarvestable: true,
    harvestSources: [
      { model: 'AccessibilityReport', description: 'ADA compliance scan reports' },
    ],
  },
]

/** Seed standards into the database */
export async function seedStandards() {
  let created = 0
  for (const std of SACSCOC_STANDARDS) {
    await prisma.accreditationStandard.upsert({
      where: { body_standardNumber: { body: 'SACSCOC', standardNumber: std.standardNumber } },
      create: {
        body: 'SACSCOC',
        sectionNumber: std.sectionNumber,
        sectionTitle: std.sectionTitle,
        standardNumber: std.standardNumber,
        standardTitle: std.standardTitle,
        description: std.description,
        evidenceTypes: std.evidenceTypes,
        collectionFrequency: std.collectionFrequency,
        autoHarvestable: std.autoHarvestable,
        harvestSources: std.harvestSources ?? Prisma.JsonNull,
      },
      update: {
        description: std.description,
        evidenceTypes: std.evidenceTypes,
        autoHarvestable: std.autoHarvestable,
        harvestSources: std.harvestSources ?? Prisma.JsonNull,
      },
    })
    created++
  }
  return { created }
}
