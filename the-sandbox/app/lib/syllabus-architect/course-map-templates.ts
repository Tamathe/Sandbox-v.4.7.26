/**
 * Built-in course map template presets.
 *
 * Each preset generates a TemplateGraphData structure (nodes, edges, units)
 * that can be applied to any course via createMapFromTemplate in template-service.ts.
 * These are static, curated templates — not user-created.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { TemplateGraphData } from './template-service'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CourseMapPreset {
  id: string
  name: string
  description: string
  category: PresetCategory
  nodeCount: number
  edgeCount: number
  thumbnailColor: string
  generate: () => TemplateGraphData
}

export type PresetCategory =
  | 'Lecture'
  | 'Lab'
  | 'Seminar'
  | 'Project'
  | 'Clinical'
  | 'Workshop'

export interface TemplateSuggestion {
  templateId: string
  templateName: string
  reasoning: string
  confidence: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let idCounter = 0
function tmpId(): string {
  return `preset-${++idCounter}`
}

function resetIds(): void {
  idCounter = 0
}

function makeNode(
  id: string,
  label: string,
  unitId: string | null,
  nodeType: string,
  xPos: number,
  yPos: number,
) {
  return { id, courseUnitId: unitId, label, nodeType, xPos, yPos, archived: false }
}

function makeEdge(id: string, from: string, to: string, edgeType: string) {
  return { id, fromNodeId: from, toNodeId: to, edgeType }
}

function makeUnit(id: string, label: string, unitType: string, position: number) {
  return { id, label, description: null, unitType, position, modules: [] }
}

// ── Preset Generators ───────────────────────────────────────────────────────

function generate16WeekLecture(): TemplateGraphData {
  resetIds()
  const units = Array.from({ length: 16 }, (_, i) =>
    makeUnit(tmpId(), `Week ${i + 1}`, i === 7 ? 'EXAM' : i === 15 ? 'EXAM' : 'LECTURE', i),
  )
  const nodes = units.map((u, i) =>
    makeNode(tmpId(), u.label, u.id, 'UNIT', 60 + (i % 4) * 220, 60 + Math.floor(i / 4) * 140),
  )
  const edges = nodes.slice(1).map((n, i) =>
    makeEdge(tmpId(), nodes[i].id, n.id, 'SEQUENCE'),
  )
  return { units, nodes, edges }
}

function generateLabLectureHybrid(): TemplateGraphData {
  resetIds()
  const units: ReturnType<typeof makeUnit>[] = []
  const nodes: ReturnType<typeof makeNode>[] = []
  const edges: ReturnType<typeof makeEdge>[] = []
  for (let w = 0; w < 14; w++) {
    const lecUnit = makeUnit(tmpId(), `Week ${w + 1} Lecture`, 'LECTURE', w * 2)
    const labUnit = makeUnit(tmpId(), `Week ${w + 1} Lab`, 'LAB', w * 2 + 1)
    units.push(lecUnit, labUnit)
    const lecNode = makeNode(tmpId(), lecUnit.label, lecUnit.id, 'UNIT', 60, 60 + w * 120)
    const labNode = makeNode(tmpId(), labUnit.label, labUnit.id, 'UNIT', 300, 60 + w * 120)
    nodes.push(lecNode, labNode)
    edges.push(makeEdge(tmpId(), lecNode.id, labNode.id, 'CONCURRENT'))
    if (w > 0) {
      edges.push(makeEdge(tmpId(), nodes[(w - 1) * 2].id, lecNode.id, 'SEQUENCE'))
    }
  }
  // Final exam
  const examUnit = makeUnit(tmpId(), 'Final Exam', 'EXAM', 28)
  units.push(examUnit)
  const examNode = makeNode(tmpId(), 'Final Exam', examUnit.id, 'UNIT', 180, 60 + 14 * 120)
  nodes.push(examNode)
  edges.push(makeEdge(tmpId(), nodes[nodes.length - 3].id, examNode.id, 'SEQUENCE'))
  return { units, nodes, edges }
}

function generateSeminarDiscussion(): TemplateGraphData {
  resetIds()
  const intro = makeUnit(tmpId(), 'Introduction & Frameworks', 'LECTURE', 0)
  const units = [intro]
  const topics = [
    'Foundational Readings', 'Theory & Practice', 'Case Study I',
    'Comparative Analysis', 'Student Presentations I', 'Case Study II',
    'Guest Speaker Week', 'Student Presentations II', 'Synthesis & Review',
  ]
  topics.forEach((t, i) => units.push(makeUnit(tmpId(), t, 'DISCUSSION', i + 1)))
  const final = makeUnit(tmpId(), 'Final Seminar Paper', 'ASSIGNMENT', topics.length + 1)
  units.push(final)

  const nodes = units.map((u, i) =>
    makeNode(tmpId(), u.label, u.id, 'UNIT', 60 + (i % 3) * 240, 60 + Math.floor(i / 3) * 140),
  )
  const edges = nodes.slice(1).map((n, i) =>
    makeEdge(tmpId(), nodes[i].id, n.id, 'SEQUENCE'),
  )
  return { units, nodes, edges }
}

function generateProjectBased(): TemplateGraphData {
  resetIds()
  const phases = [
    { label: 'Project Brief & Team Formation', type: 'LECTURE' },
    { label: 'Research & Discovery', type: 'ASSIGNMENT' },
    { label: 'Proposal & Planning', type: 'ASSIGNMENT' },
    { label: 'Prototype I', type: 'ASSIGNMENT' },
    { label: 'Peer Review Checkpoint', type: 'DISCUSSION' },
    { label: 'Prototype II — Iteration', type: 'ASSIGNMENT' },
    { label: 'User Testing & Feedback', type: 'LAB' },
    { label: 'Final Build', type: 'ASSIGNMENT' },
    { label: 'Presentation & Demo Day', type: 'EXAM' },
    { label: 'Reflection & Portfolio', type: 'ASSIGNMENT' },
  ]
  const units = phases.map((p, i) => makeUnit(tmpId(), p.label, p.type, i))
  const nodes = units.map((u, i) =>
    makeNode(tmpId(), u.label, u.id, 'UNIT', 180, 60 + i * 110),
  )
  const edges = nodes.slice(1).map((n, i) =>
    makeEdge(tmpId(), nodes[i].id, n.id, 'SEQUENCE'),
  )
  // Peer review prerequisite for iteration
  edges.push(makeEdge(tmpId(), nodes[4].id, nodes[5].id, 'PREREQUISITE'))
  return { units, nodes, edges }
}

function generateClinicalRotation(): TemplateGraphData {
  resetIds()
  const orientUnit = makeUnit(tmpId(), 'Clinical Orientation', 'LECTURE', 0)
  const rotations = [
    'Rotation 1 — Primary Care', 'Rotation 2 — Emergency',
    'Rotation 3 — Surgery', 'Rotation 4 — Pediatrics',
    'Rotation 5 — Psychiatry', 'Rotation 6 — OB/GYN',
  ]
  const rotUnits = rotations.map((r, i) => makeUnit(tmpId(), r, 'LAB', i + 1))
  const caseUnit = makeUnit(tmpId(), 'Case Log Review', 'ASSIGNMENT', 7)
  const evalUnit = makeUnit(tmpId(), 'Clinical Competency Exam', 'EXAM', 8)
  const units = [orientUnit, ...rotUnits, caseUnit, evalUnit]

  const orientNode = makeNode(tmpId(), orientUnit.label, orientUnit.id, 'UNIT', 260, 40)
  const rotNodes = rotUnits.map((u, i) =>
    makeNode(tmpId(), u.label, u.id, 'UNIT', (i % 2) * 300 + 60, 160 + Math.floor(i / 2) * 140),
  )
  const caseNode = makeNode(tmpId(), caseUnit.label, caseUnit.id, 'UNIT', 260, 160 + 3 * 140)
  const evalNode = makeNode(tmpId(), evalUnit.label, evalUnit.id, 'UNIT', 260, 160 + 4 * 140)
  const nodes = [orientNode, ...rotNodes, caseNode, evalNode]

  const edges: ReturnType<typeof makeEdge>[] = []
  // Orientation prerequisite for all rotations
  for (const rn of rotNodes) {
    edges.push(makeEdge(tmpId(), orientNode.id, rn.id, 'PREREQUISITE'))
  }
  // All rotations feed into case log
  for (const rn of rotNodes) {
    edges.push(makeEdge(tmpId(), rn.id, caseNode.id, 'SEQUENCE'))
  }
  edges.push(makeEdge(tmpId(), caseNode.id, evalNode.id, 'SEQUENCE'))
  return { units, nodes, edges }
}

function generateFlippedClassroom(): TemplateGraphData {
  resetIds()
  const units: ReturnType<typeof makeUnit>[] = []
  const nodes: ReturnType<typeof makeNode>[] = []
  const edges: ReturnType<typeof makeEdge>[] = []
  for (let w = 0; w < 12; w++) {
    const preUnit = makeUnit(tmpId(), `W${w + 1} Pre-Class Material`, 'LECTURE', w * 2)
    const activeUnit = makeUnit(tmpId(), `W${w + 1} Active Learning`, 'DISCUSSION', w * 2 + 1)
    units.push(preUnit, activeUnit)
    const preNode = makeNode(tmpId(), preUnit.label, preUnit.id, 'UNIT', 60, 60 + w * 120)
    const activeNode = makeNode(tmpId(), activeUnit.label, activeUnit.id, 'UNIT', 320, 60 + w * 120)
    nodes.push(preNode, activeNode)
    edges.push(makeEdge(tmpId(), preNode.id, activeNode.id, 'PREREQUISITE'))
    if (w > 0) {
      edges.push(makeEdge(tmpId(), nodes[(w - 1) * 2 + 1].id, preNode.id, 'SEQUENCE'))
    }
  }
  return { units, nodes, edges }
}

function generateWorkshopIntensive(): TemplateGraphData {
  resetIds()
  const sessions = [
    { label: 'Day 1 — Foundations', type: 'LECTURE' },
    { label: 'Day 1 — Hands-On Workshop', type: 'LAB' },
    { label: 'Day 2 — Advanced Techniques', type: 'LECTURE' },
    { label: 'Day 2 — Practice Lab', type: 'LAB' },
    { label: 'Day 3 — Group Project Work', type: 'ASSIGNMENT' },
    { label: 'Day 3 — Peer Critique', type: 'DISCUSSION' },
    { label: 'Day 4 — Final Project Build', type: 'ASSIGNMENT' },
    { label: 'Day 4 — Presentations', type: 'EXAM' },
  ]
  const units = sessions.map((s, i) => makeUnit(tmpId(), s.label, s.type, i))
  const nodes = units.map((u, i) =>
    makeNode(tmpId(), u.label, u.id, 'UNIT', (i % 2) * 280 + 60, 60 + Math.floor(i / 2) * 140),
  )
  const edges: ReturnType<typeof makeEdge>[] = []
  // Sequential within each day, concurrent between morning/afternoon
  for (let d = 0; d < 4; d++) {
    const am = d * 2
    const pm = d * 2 + 1
    edges.push(makeEdge(tmpId(), nodes[am].id, nodes[pm].id, 'CONCURRENT'))
    if (d > 0) {
      edges.push(makeEdge(tmpId(), nodes[(d - 1) * 2 + 1].id, nodes[am].id, 'SEQUENCE'))
    }
  }
  return { units, nodes, edges }
}

function generateCapstone(): TemplateGraphData {
  resetIds()
  const phases = [
    { label: 'Literature Review', type: 'ASSIGNMENT' },
    { label: 'Methodology Design', type: 'ASSIGNMENT' },
    { label: 'IRB / Ethics Approval', type: 'OTHER' },
    { label: 'Data Collection', type: 'LAB' },
    { label: 'Analysis & Findings', type: 'ASSIGNMENT' },
    { label: 'Draft Thesis', type: 'ASSIGNMENT' },
    { label: 'Committee Review', type: 'DISCUSSION' },
    { label: 'Revisions', type: 'ASSIGNMENT' },
    { label: 'Defense Presentation', type: 'EXAM' },
    { label: 'Final Submission', type: 'ASSIGNMENT' },
  ]
  const units = phases.map((p, i) => makeUnit(tmpId(), p.label, p.type, i))
  const nodes = units.map((u, i) =>
    makeNode(tmpId(), u.label, u.id, 'UNIT', 180, 60 + i * 100),
  )
  const edges = nodes.slice(1).map((n, i) =>
    makeEdge(tmpId(), nodes[i].id, n.id, 'SEQUENCE'),
  )
  // IRB prerequisite for data collection
  edges.push(makeEdge(tmpId(), nodes[2].id, nodes[3].id, 'PREREQUISITE'))
  return { units, nodes, edges }
}

function generateModularSkills(): TemplateGraphData {
  resetIds()
  const core = makeUnit(tmpId(), 'Core Foundations', 'LECTURE', 0)
  const tracks = [
    { label: 'Track A — Analysis', type: 'LECTURE' },
    { label: 'Track B — Design', type: 'LAB' },
    { label: 'Track C — Communication', type: 'DISCUSSION' },
  ]
  const trackUnits = tracks.map((t, i) => makeUnit(tmpId(), t.label, t.type, i + 1))
  const integration = makeUnit(tmpId(), 'Integration Project', 'ASSIGNMENT', 4)
  const assessment = makeUnit(tmpId(), 'Skills Assessment', 'EXAM', 5)
  const units = [core, ...trackUnits, integration, assessment]

  const coreNode = makeNode(tmpId(), core.label, core.id, 'UNIT', 240, 40)
  const trackNodes = trackUnits.map((u, i) =>
    makeNode(tmpId(), u.label, u.id, 'UNIT', i * 220 + 60, 200),
  )
  const intNode = makeNode(tmpId(), integration.label, integration.id, 'UNIT', 240, 360)
  const assessNode = makeNode(tmpId(), assessment.label, assessment.id, 'UNIT', 240, 500)
  const nodes = [coreNode, ...trackNodes, intNode, assessNode]

  const edges: ReturnType<typeof makeEdge>[] = []
  for (const tn of trackNodes) {
    edges.push(makeEdge(tmpId(), coreNode.id, tn.id, 'PREREQUISITE'))
    edges.push(makeEdge(tmpId(), tn.id, intNode.id, 'SEQUENCE'))
  }
  edges.push(makeEdge(tmpId(), intNode.id, assessNode.id, 'SEQUENCE'))
  return { units, nodes, edges }
}

function generateCaseStudy(): TemplateGraphData {
  resetIds()
  const intro = makeUnit(tmpId(), 'Case Method Introduction', 'LECTURE', 0)
  const cases = Array.from({ length: 6 }, (_, i) =>
    makeUnit(tmpId(), `Case Study ${i + 1}`, 'DISCUSSION', i + 1),
  )
  const midterm = makeUnit(tmpId(), 'Midterm Case Analysis', 'EXAM', 7)
  const field = makeUnit(tmpId(), 'Field Research', 'LAB', 8)
  const final = makeUnit(tmpId(), 'Final Case Presentation', 'EXAM', 9)
  const units = [intro, ...cases, midterm, field, final]

  const nodes = units.map((u, i) =>
    makeNode(tmpId(), u.label, u.id, 'UNIT', 60 + (i % 3) * 220, 60 + Math.floor(i / 3) * 140),
  )
  const edges = nodes.slice(1).map((n, i) =>
    makeEdge(tmpId(), nodes[i].id, n.id, 'SEQUENCE'),
  )
  return { units, nodes, edges }
}

// ── Preset Catalog ──────────────────────────────────────────────────────────

export const COURSE_MAP_PRESETS: CourseMapPreset[] = [
  {
    id: 'lecture-16-week',
    name: '16-Week Lecture Series',
    description: 'Traditional semester-long lecture course with midterm and final exams.',
    category: 'Lecture',
    nodeCount: 16,
    edgeCount: 15,
    thumbnailColor: '#2563eb',
    generate: generate16WeekLecture,
  },
  {
    id: 'lab-lecture-hybrid',
    name: 'Lab + Lecture Hybrid',
    description: '14-week course pairing weekly lectures with concurrent lab sessions.',
    category: 'Lab',
    nodeCount: 29,
    edgeCount: 27,
    thumbnailColor: '#059669',
    generate: generateLabLectureHybrid,
  },
  {
    id: 'seminar-discussion',
    name: 'Seminar Discussion',
    description: 'Reading-intensive seminar with student presentations and a final paper.',
    category: 'Seminar',
    nodeCount: 11,
    edgeCount: 10,
    thumbnailColor: '#9333ea',
    generate: generateSeminarDiscussion,
  },
  {
    id: 'project-based',
    name: 'Project-Based Learning',
    description: 'Multi-phase project course from proposal through demo day and reflection.',
    category: 'Project',
    nodeCount: 10,
    edgeCount: 10,
    thumbnailColor: '#d97706',
    generate: generateProjectBased,
  },
  {
    id: 'clinical-rotation',
    name: 'Clinical Rotation',
    description: '6-rotation clinical placement with case log and competency exam.',
    category: 'Clinical',
    nodeCount: 9,
    edgeCount: 13,
    thumbnailColor: '#dc2626',
    generate: generateClinicalRotation,
  },
  {
    id: 'flipped-classroom',
    name: 'Flipped Classroom',
    description: '12-week flipped format: pre-class material feeds into active learning sessions.',
    category: 'Lecture',
    nodeCount: 24,
    edgeCount: 23,
    thumbnailColor: '#0891b2',
    generate: generateFlippedClassroom,
  },
  {
    id: 'workshop-intensive',
    name: 'Workshop Intensive',
    description: '4-day intensive workshop with hands-on labs and final presentations.',
    category: 'Workshop',
    nodeCount: 8,
    edgeCount: 7,
    thumbnailColor: '#ea580c',
    generate: generateWorkshopIntensive,
  },
  {
    id: 'capstone',
    name: 'Capstone / Thesis',
    description: '10-phase capstone from literature review through defense and final submission.',
    category: 'Project',
    nodeCount: 10,
    edgeCount: 10,
    thumbnailColor: '#4f46e5',
    generate: generateCapstone,
  },
  {
    id: 'modular-skills',
    name: 'Modular Skills Tracks',
    description: 'Core foundations branching into 3 parallel skill tracks, converging at integration project.',
    category: 'Workshop',
    nodeCount: 6,
    edgeCount: 7,
    thumbnailColor: '#65a30d',
    generate: generateModularSkills,
  },
  {
    id: 'case-study',
    name: 'Case Study Method',
    description: '6 sequential case studies with midterm analysis, field research, and final presentation.',
    category: 'Seminar',
    nodeCount: 10,
    edgeCount: 9,
    thumbnailColor: '#db2777',
    generate: generateCaseStudy,
  },
]

/**
 * Lookup a preset by ID.
 */
export function getPreset(presetId: string): CourseMapPreset | undefined {
  return COURSE_MAP_PRESETS.find((p) => p.id === presetId)
}

// ── AI Template Suggestion (Task 52) ────────────────────────────────────────

/**
 * Analyze syllabus text and suggest the best-fit templates.
 * Uses Haiku for fast, cheap analysis.
 */
export async function suggestTemplate(syllabusText: string): Promise<TemplateSuggestion[]> {
  const catalogDesc = COURSE_MAP_PRESETS.map(
    (p) => `- id: "${p.id}", name: "${p.name}", category: "${p.category}", description: "${p.description}"`,
  ).join('\n')

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a curriculum design expert. Analyze the following syllabus text and recommend the top 3 best-fit course map templates from the catalog below.

## Template Catalog
${catalogDesc}

## Syllabus Text
${syllabusText.slice(0, 8000)}

Return ONLY valid JSON — an array of exactly 3 objects:
[
  { "templateId": "...", "templateName": "...", "reasoning": "1-2 sentence explanation", "confidence": 0.0-1.0 }
]
Order by best fit first. confidence is 0.0 to 1.0.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0]) as TemplateSuggestion[]
    return parsed
      .filter((s) => s.templateId && s.reasoning && typeof s.confidence === 'number')
      .slice(0, 3)
  } catch {
    return []
  }
}
