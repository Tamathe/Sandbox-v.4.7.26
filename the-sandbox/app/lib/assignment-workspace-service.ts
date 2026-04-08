// Assignment Workspace Service
// Provides workflow suggestions and Sandy context for the assignment workspace.

export interface WorkflowStep {
  label: string
  tab: 'sandy' | 'notes' | 'draft' | 'submit'
}

export interface WorkflowSuggestion {
  steps: WorkflowStep[]
  estimatedMinutes: number
}

/**
 * Heuristic-first workflow suggestion based on assignment description and type.
 * Falls back to a generic research→draft→submit flow.
 */
export function suggestWorkflow(
  description: string | null,
  type: string,
  assessmentMode: string = 'TRADITIONAL'
): WorkflowSuggestion {
  const desc = (description ?? '').toLowerCase()

  if (assessmentMode === 'PROCESS' && type === 'AI_EXPERIENCE') {
    return {
      steps: [
        { label: 'Work through the task with Sandy', tab: 'sandy' },
        { label: 'Capture what changed in your thinking', tab: 'notes' },
        { label: 'Annotate your transcript', tab: 'submit' },
        { label: 'Reflect and submit', tab: 'submit' },
      ],
      estimatedMinutes: 45,
    }
  }

  // Essay / writing assignments
  if (desc.includes('essay') || desc.includes('write') || desc.includes('analysis') || desc.includes('paper') || desc.includes('report')) {
    return {
      steps: [
        { label: 'Outline your argument', tab: 'notes' },
        { label: 'Research key points with Sandy', tab: 'sandy' },
        { label: 'Write your draft', tab: 'draft' },
        { label: 'Ask Sandy to review against rubric', tab: 'sandy' },
        { label: 'Polish and submit', tab: 'submit' },
      ],
      estimatedMinutes: 90,
    }
  }

  // Quiz / exam prep
  if (desc.includes('quiz') || desc.includes('exam') || desc.includes('questions') || desc.includes('test')) {
    return {
      steps: [
        { label: 'Review key concepts with Sandy', tab: 'sandy' },
        { label: 'Take notes on tricky areas', tab: 'notes' },
        { label: 'Submit when ready', tab: 'submit' },
      ],
      estimatedMinutes: 30,
    }
  }

  // Research / investigation
  if (desc.includes('research') || desc.includes('investigate') || desc.includes('find') || desc.includes('identify')) {
    return {
      steps: [
        { label: 'Discuss the topic with Sandy', tab: 'sandy' },
        { label: 'Collect research notes', tab: 'notes' },
        { label: 'Draft your findings', tab: 'draft' },
        { label: 'Review and submit', tab: 'submit' },
      ],
      estimatedMinutes: 60,
    }
  }

  // Presentation
  if (desc.includes('presentation') || desc.includes('slides') || desc.includes('present')) {
    return {
      steps: [
        { label: 'Brainstorm with Sandy', tab: 'sandy' },
        { label: 'Outline your presentation', tab: 'notes' },
        { label: 'Submit your deck', tab: 'submit' },
      ],
      estimatedMinutes: 45,
    }
  }

  // Default generic workflow
  return {
    steps: [
      { label: 'Understand requirements with Sandy', tab: 'sandy' },
      { label: 'Plan your approach', tab: 'notes' },
      { label: 'Write your response', tab: 'draft' },
      { label: 'Submit', tab: 'submit' },
    ],
    estimatedMinutes: 60,
  }
}

/**
 * Build Sandy system prompt context for the assignment workspace.
 */
export function buildAssignmentContext(args: {
  title: string
  courseCode: string
  courseName: string
  description: string | null
  dueLabel: string
  rubricText: string | null
  currentDraft: string | null
  relatedConcepts: string[]
}): string {
  const { title, courseCode, courseName, description, dueLabel, rubricText, currentDraft, relatedConcepts } = args

  return `The student is working on the following assignment:
- Title: ${title}
- Course: ${courseCode} — ${courseName}
- Due: ${dueLabel}
- Description: ${description || 'No description provided'}
${rubricText ? `- Rubric:\n${rubricText}` : '- No rubric provided'}
${currentDraft ? `- Student's current draft (${currentDraft.split(/\s+/).length} words):\n${currentDraft}` : '- No draft yet'}
${relatedConcepts.length > 0 ? `- Concepts the student is still developing: ${relatedConcepts.join(', ')}` : ''}

Help the student complete this assignment. You can:
1. Explain the assignment requirements
2. Break down the rubric criteria
3. Help brainstorm and outline
4. Generate examples or reference material
5. Review their draft against the rubric
6. Suggest improvements

IMPORTANT: Do NOT write the entire assignment for the student. Guide them through the thinking process. Ask questions, suggest structure, and help them develop their own ideas.`
}

/**
 * Format rubric criteria into readable text for Sandy context.
 */
export function formatRubricForContext(
  criteria: Array<{
    title: string
    maxPoints: number
    description: string | null
    bands: Array<{ label: string; description: string }>
  }>,
  totalPoints: number
): string {
  if (criteria.length === 0) return ''

  return criteria
    .map((c) => {
      const weight = totalPoints > 0 ? Math.round((c.maxPoints / totalPoints) * 100) : 0
      const bandDesc = c.bands.length > 0 ? ` Levels: ${c.bands.map((b) => b.label).join(', ')}` : ''
      return `  - ${c.title} (${weight}%, ${c.maxPoints} pts): ${c.description || 'No description'}${bandDesc}`
    })
    .join('\n')
}
