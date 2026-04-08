export type UxAuditSectionId = 'student' | 'educator' | 'admin' | 'cross-cutting'

export interface UxAuditStep {
  id: string
  stepNumber: number
  title: string
  routeHints: string[]
  instructions: string[]
  observe: string[]
}

export interface UxAuditSection {
  id: UxAuditSectionId
  title: string
  description: string
  steps: UxAuditStep[]
}

function finalizeStep(
  section: UxAuditSection | null,
  step: UxAuditStep | null
): UxAuditSection | null {
  if (!section || !step) return section
  return {
    ...section,
    steps: [...section.steps, step],
  }
}

function extractRouteHints(line: string) {
  const routeHints = new Set<string>()
  const inlineCodeMatches = line.matchAll(/`(\/[^`]+)`/g)
  for (const match of inlineCodeMatches) {
    routeHints.add(match[1])
  }
  return [...routeHints]
}

function normalizeSection(line: string): Pick<UxAuditSection, 'id' | 'title'> | null {
  if (line.startsWith('# PERSONA 1')) {
    return { id: 'student', title: 'Student Audit' }
  }
  if (line.startsWith('# PERSONA 2')) {
    return { id: 'educator', title: 'Educator Audit' }
  }
  if (line.startsWith('# PERSONA 3')) {
    return { id: 'admin', title: 'Admin Audit' }
  }
  if (line.startsWith('# CROSS-CUTTING CHECKS')) {
    return { id: 'cross-cutting', title: 'Cross-Cutting Checks' }
  }
  return null
}

export function parseUxAuditMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/)
  const sections: UxAuditSection[] = []
  let currentSection: UxAuditSection | null = null
  let currentStep: UxAuditStep | null = null
  let mode: 'instructions' | 'observe' = 'instructions'

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line || line === '---') continue
    if (line.startsWith('## ') && !line.startsWith('## Step ')) {
      currentSection = finalizeStep(currentSection, currentStep)
      currentStep = null
      mode = 'instructions'
      continue
    }

    if (line.startsWith('# FINAL FRICTION REPORT')) {
      currentSection = finalizeStep(currentSection, currentStep)
      currentStep = null
      break
    }

    const normalizedSection = normalizeSection(line)
    if (normalizedSection) {
      currentSection = finalizeStep(currentSection, currentStep)
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        ...normalizedSection,
        description: '',
        steps: [],
      }
      currentStep = null
      mode = 'instructions'
      continue
    }

    if (!currentSection) continue

    if (line.startsWith('> ')) {
      currentSection = {
        ...currentSection,
        description: [currentSection.description, line.replace(/^>\s*/, '')]
          .filter(Boolean)
          .join(' '),
      }
      continue
    }

    const stepMatch = line.match(/^## Step (\d+)\s+[—-]\s+(.+)$/)
    if (stepMatch) {
      if (!currentSection) continue
      const sectionId = currentSection.id
      currentSection = finalizeStep(currentSection, currentStep)
      const stepNumber = Number(stepMatch[1])
      currentStep = {
        id: `${sectionId}-${stepNumber}`,
        stepNumber,
        title: stepMatch[2].trim(),
        routeHints: [],
        instructions: [],
        observe: [],
      }
      mode = 'instructions'
      continue
    }

    if (!currentStep) continue

    if (line === '**Observe:**') {
      mode = 'observe'
      continue
    }

    const routeHints = extractRouteHints(line)
    if (routeHints.length > 0) {
      currentStep.routeHints = Array.from(new Set([...currentStep.routeHints, ...routeHints]))
    }

    if (mode === 'observe') {
      if (line.startsWith('- ')) {
        currentStep.observe.push(line.replace(/^- /, '').trim())
      }
      continue
    }

    if (line.startsWith('- ')) {
      currentStep.instructions.push(line.replace(/^- /, '').trim())
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      currentStep.instructions.push(line.replace(/^\d+\.\s+/, '').trim())
      continue
    }

    if (line.startsWith('Navigate to') || line.startsWith('While still on') || line.startsWith('Open a course') || line.startsWith('Back on')) {
      currentStep.instructions.push(line)
      continue
    }
  }

  currentSection = finalizeStep(currentSection, currentStep)
  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}
