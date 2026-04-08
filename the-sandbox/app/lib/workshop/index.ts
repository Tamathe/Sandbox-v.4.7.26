export interface WorkshopTool {
  slug: string
  title: string
  tagline: string
  description: string
  emoji: string
  icon: string                    // lucide-react icon component name
  color: string                   // Tailwind text color
  bg: string                      // Tailwind bg color
  border: string                  // Tailwind border classes
  headerGradient: string          // CSS gradient for chat header
  systemPrompt: string
  welcomeMessage: string
  starterQuestions: string[]
  features: string[]
  model: 'haiku' | 'sonnet'
  supportsUpload?: boolean
  uploadAcceptTypes?: string[]    // e.g. ['application/pdf', 'text/plain']
  uploadMaxSizeMB?: number        // default 10
  status: 'live' | 'in-development'
}

import { GRANT_FINDER } from './grant-finder'
import { SPACE_OPTIMIZER } from './space-optimizer'
import { GRANT_WRITER } from './grant-writer'

const WORKSHOP_TOOLS: WorkshopTool[] = [
  GRANT_FINDER,
  SPACE_OPTIMIZER,
  GRANT_WRITER,
]

export function getWorkshopTool(slug: string): WorkshopTool | undefined {
  return WORKSHOP_TOOLS.find(t => t.slug === slug)
}

export function getAllWorkshopTools(): WorkshopTool[] {
  return WORKSHOP_TOOLS
}
