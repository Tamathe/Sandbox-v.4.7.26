import { prisma } from './prisma'

export type CoursePolicyContextItem = {
  id: string
  kind: 'course-policy' | 'grading-weight'
  title: string
  content: string
  policyType: string | null
  sourceSystem: string
  createdAt: string
}

export type CoursePolicyContextBundle = {
  items: CoursePolicyContextItem[]
  text: string | null
}

const MAX_CONTENT = 220

function truncateText(content: string, maxChars = MAX_CONTENT) {
  return content.length > maxChars ? `${content.slice(0, maxChars)}...` : content
}

function scoreContextItem(item: CoursePolicyContextItem, queryWords: string[]) {
  if (queryWords.length === 0) return 0

  const haystack = `${item.title} ${item.content} ${item.policyType ?? ''}`.toLowerCase()
  return queryWords.reduce((score, word) => {
    if (!haystack.includes(word)) return score
    if (item.title.toLowerCase().includes(word)) return score + 4
    if ((item.policyType ?? '').toLowerCase().includes(word)) return score + 3
    return score + 1
  }, 0)
}

function formatCoursePolicyContext(
  courseCode: string,
  items: CoursePolicyContextItem[],
  maxChars = 2000,
) {
  if (items.length === 0) return null

  const lines: string[] = [`Course Policies for ${courseCode}`]

  for (const item of items) {
    if (item.kind === 'course-policy') {
      lines.push(`\n[${(item.policyType ?? 'policy').replace('_', ' ')}] ${item.title}`)
      lines.push(truncateText(item.content))
      continue
    }

    lines.push('\nGrading Weights:')
    lines.push(item.content)
  }

  let text = lines.join('\n')
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars - 3)}...`
  }

  return text
}

export async function getRelevantCoursePolicyContext(
  courseId: string,
  courseCode: string,
  query?: string | null,
  limit = 4,
): Promise<CoursePolicyContextBundle> {
  const [policies, weights] = await Promise.all([
    prisma.coursePolicy.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, policyType: true, title: true, content: true, source: true, createdAt: true },
    }),
    prisma.gradingWeight.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, category: true, weight: true, description: true, source: true, createdAt: true },
    }),
  ])

  const items: CoursePolicyContextItem[] = [
    ...policies.map((policy) => ({
      id: policy.id,
      kind: 'course-policy' as const,
      title: policy.title,
      content: policy.content,
      policyType: policy.policyType,
      sourceSystem: policy.source,
      createdAt: policy.createdAt.toISOString(),
    })),
    ...(weights.length > 0
      ? [
          {
            id: 'grading-weights',
            kind: 'grading-weight' as const,
            title: 'Grading Weights',
            content: weights
              .map((weight) => {
                const pct = Math.round(weight.weight * 100)
                return `${weight.category}: ${pct}%${weight.description ? ` - ${weight.description}` : ''}`
              })
              .join('\n'),
            policyType: 'grading_weights',
            sourceSystem: weights[0]?.source ?? 'syllabus',
            createdAt: weights[weights.length - 1]?.createdAt.toISOString() ?? new Date().toISOString(),
          },
        ]
      : []),
  ]

  if (items.length === 0) return { items: [], text: null }

  const queryWords = (query ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2)

  const ranked = [...items]
    .map((item, index) => ({
      item,
      index,
      score: scoreContextItem(item, queryWords),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return left.index - right.index
    })

  const selectedItems =
    queryWords.length > 0
      ? ranked.filter((entry) => entry.score > 0).slice(0, limit).map((entry) => entry.item)
      : ranked.slice(0, limit).map((entry) => entry.item)

  const finalItems = selectedItems.length > 0 ? selectedItems : ranked.slice(0, limit).map((entry) => entry.item)

  return {
    items: finalItems,
    text: formatCoursePolicyContext(courseCode, finalItems),
  }
}

/**
 * Fetches course policies and grading weights formatted for injection into
 * Sandy's system prompt. Returns null if no policies exist or the text
 * would be empty. Output is capped at ~2000 chars.
 */
export async function getCoursePoliciesForContext(
  courseId: string,
  courseCode: string,
): Promise<string | null> {
  const bundle = await getRelevantCoursePolicyContext(courseId, courseCode, null, 6)
  return bundle.text
}
