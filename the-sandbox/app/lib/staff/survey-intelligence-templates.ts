/**
 * Survey Intelligence — Template Registry
 *
 * Pre-built survey templates with categorized questions, word limits,
 * and writing tips. Templates are static data — no DB storage needed.
 */

export interface SurveyTemplateQuestion {
  questionNumber: number
  questionText: string
  category: string
  wordLimit: number
  writingTips: string
}

export interface SurveyTemplate {
  key: string
  title: string
  organization: string
  description: string
  categories: string[]
  questions: SurveyTemplateQuestion[]
}

export const EVIDENCE_CATEGORIES = [
  'compensation-benefits',
  'professional-development',
  'mission-pride',
  'senior-leadership',
  'diversity-inclusion',
  'work-life-balance',
  'facilities-security',
  'governance',
  'communication',
  'teaching-environment',
  'stress-relief',
  'community-service',
  'culture',
  'research',
  'student-success',
  'technology',
] as const

export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number]

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    key: 'great-colleges-2026',
    title: 'Great Colleges to Work For 2026',
    organization: 'ModernThink',
    description:
      'Annual higher education workplace recognition survey. Responses should be specific, evidence-based, and highlight UK-unique programs. Evaluators read hundreds of these — specificity cuts through.',
    categories: [
      'compensation-benefits',
      'professional-development',
      'stress-relief',
      'community-service',
      'diversity-inclusion',
      'work-life-balance',
      'governance',
      'senior-leadership',
      'communication',
      'teaching-environment',
      'mission-pride',
      'facilities-security',
    ],
    questions: [
      {
        questionNumber: 1,
        questionText:
          'Please highlight any unique perks, benefits or practices that contribute to what makes your institution\'s culture great.',
        category: 'compensation-benefits',
        wordLimit: 300,
        writingTips:
          'Lead with what\'s genuinely unusual — things peer institutions DON\'T have. Tuition waivers are common; UK\'s specific structure might not be. Think: employee education benefits, on-campus amenities, unique leave policies, employee senate, shared governance, specific DEI programs with names and participation numbers.',
      },
      {
        questionNumber: 2,
        questionText:
          'Describe up to three activities your institution initiates to relieve workday stress and promote fun.',
        category: 'stress-relief',
        wordLimit: 250,
        writingTips:
          'Name exactly 3. Each needs: program name, who runs it, rough participation numbers, one-sentence "why it works." Prioritize recurring, institutionally sponsored activities over one-offs or grassroots efforts.',
      },
      {
        questionNumber: 3,
        questionText:
          'Please list any community service initiatives or programs that your institution participated in during the past fiscal year to support its local community.',
        category: 'community-service',
        wordLimit: 300,
        writingTips:
          'Lead with the biggest (United Way campaign, Big Blue Give results). Name 3-5 specific programs with outcomes (volunteers, hours, dollars raised). End with UK\'s land-grant mission framing — community service isn\'t optional, it\'s constitutional.',
      },
      {
        questionNumber: 4,
        questionText:
          'Describe how your institution ensures that compensation (salary, pay increases, bonuses) is competitive and equitable across all employee groups.',
        category: 'compensation-benefits',
        wordLimit: 400,
        writingTips:
          'Include specific dollar amounts, percentage increases, date ranges. Reference market studies, equity audits, or CUPA-HR benchmarking. Mention any unique benefits (tuition remission percentages, retirement match, employee emergency fund).',
      },
      {
        questionNumber: 5,
        questionText:
          'Describe your institution\'s approach to professional development for all employee categories (faculty, staff, administration).',
        category: 'professional-development',
        wordLimit: 400,
        writingTips:
          'Name specific programs (leadership academies, tuition assistance, conference funding pools). Include dollar amounts allocated and participation numbers. Reference career advancement pathways.',
      },
      {
        questionNumber: 6,
        questionText:
          'How does your institution communicate its mission and strategic vision to employees? How do employees connect their daily work to that mission?',
        category: 'mission-pride',
        wordLimit: 350,
        writingTips:
          'Reference the strategic plan by name. Describe how mission connects to daily work. Town halls, UKNow, Sandy, newsletters. Include specific examples of mission in action.',
      },
      {
        questionNumber: 7,
        questionText:
          'What specific programs, policies, and structures does your institution have in place to advance diversity, equity, and inclusion? Provide evidence of outcomes.',
        category: 'diversity-inclusion',
        wordLimit: 500,
        writingTips:
          'Name offices (Chief Diversity Officer, MLK Center). Include demographic trend data. Reference training programs, ERGs, recruitment initiatives. Outcomes > intentions — what changed?',
      },
      {
        questionNumber: 8,
        questionText:
          'How does your institution support work-life balance for employees? Describe flexible work policies, family support, and wellness initiatives.',
        category: 'work-life-balance',
        wordLimit: 350,
        writingTips:
          'Reference specific policies (flexible work arrangement policy, parental leave, sabbatical). Include participation rates. Mention wellness programs with specific names and enrollment numbers.',
      },
      {
        questionNumber: 9,
        questionText:
          'How are faculty and staff included in institutional governance and decision-making? Describe shared governance structures and their effectiveness.',
        category: 'governance',
        wordLimit: 400,
        writingTips:
          'Name specific bodies (University Senate, Staff Senate, advisory committees). Describe how input leads to policy changes — cite a recent example. Include representation numbers.',
      },
      {
        questionNumber: 10,
        questionText:
          'Describe how senior leaders demonstrate transparency, accessibility, and commitment to employee well-being.',
        category: 'senior-leadership',
        wordLimit: 350,
        writingTips:
          'Name specific initiatives (President\'s open forums, Provost listening sessions). Describe crisis communication approach. Include frequency and format of leader-employee interactions.',
      },
      {
        questionNumber: 11,
        questionText:
          'How does your institution support excellence in teaching? Describe resources, recognition, and innovation in pedagogy.',
        category: 'teaching-environment',
        wordLimit: 400,
        writingTips:
          'Name teaching centers (CELT). Awards programs. Instructional technology support. Class size data. Innovative pedagogy examples. Student evaluation process improvements.',
      },
      {
        questionNumber: 12,
        questionText:
          'Describe recent investments in facilities, technology, and campus safety that improve the work environment for employees.',
        category: 'facilities-security',
        wordLimit: 350,
        writingTips:
          'Specific capital projects with dollar amounts. Technology upgrades. Safety systems, emergency notification. Reference UK Police statistics if favorable.',
      },
    ],
  },
  {
    key: 'carnegie-community-2026',
    title: 'Carnegie Community Engagement Classification 2026',
    organization: 'Carnegie Foundation',
    description:
      'Elective classification recognizing institutional commitment to community engagement. Focuses on partnerships, impact measurement, and reciprocity.',
    categories: ['community-service', 'teaching-environment', 'research', 'diversity-inclusion', 'mission-pride'],
    questions: [
      {
        questionNumber: 1,
        questionText:
          'Describe how community engagement is defined and understood at your institution. How is it aligned with your mission and strategic plan?',
        category: 'mission-pride',
        wordLimit: 500,
        writingTips:
          'Quote the mission statement directly. Show alignment between strategic plan goals and community engagement. Name the office or individual who coordinates engagement. Reference the land-grant mission.',
      },
      {
        questionNumber: 2,
        questionText:
          'Provide examples of reciprocal community-campus partnerships that have had measurable impact.',
        category: 'community-service',
        wordLimit: 600,
        writingTips:
          'Name 3-5 partnerships with specific community organizations. Include outcomes for both the community partner AND the university. Use numbers: people served, grants funded, programs launched.',
      },
      {
        questionNumber: 3,
        questionText:
          'How does your institution support and reward faculty for community-engaged teaching and scholarship?',
        category: 'teaching-environment',
        wordLimit: 400,
        writingTips:
          'Tenure/promotion criteria that value engagement. Course designations for service-learning. Funding for community-based research. Faculty recognition awards.',
      },
    ],
  },
  {
    key: 'custom',
    title: 'Custom Survey',
    organization: '',
    description: 'Enter your own survey questions. You can add questions manually after creating the project.',
    categories: [],
    questions: [],
  },
]

export function getTemplate(key: string): SurveyTemplate | undefined {
  return SURVEY_TEMPLATES.find((t) => t.key === key)
}

export function listTemplates(): Pick<SurveyTemplate, 'key' | 'title' | 'organization' | 'description'>[] {
  return SURVEY_TEMPLATES.map(({ key, title, organization, description }) => ({
    key,
    title,
    organization,
    description,
  }))
}
