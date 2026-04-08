import { createElement } from 'react'
import {
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Compass,
  GraduationCap,
  Lightbulb,
  MessageSquare,
  Palette,
  Search,
  ShieldAlert,
  Sparkles,
  Sunrise,
  Users,
  Zap,
  type LucideProps,
  type LucideIcon,
} from 'lucide-react'

const AGENT_ICON_MAP: Record<string, LucideIcon> = {
  BarChart: BarChart3,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Compass,
  GraduationCap,
  Lightbulb,
  MessageSquare,
  Palette,
  Search,
  Shield: ShieldAlert,
  ShieldAlert,
  Sparkles,
  Sunrise,
  Users,
  Zap,
}

export function getAgentProfileIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Bot
  return AGENT_ICON_MAP[iconName] ?? Bot
}

export function renderAgentProfileIcon(iconName?: string | null, props?: LucideProps) {
  return createElement(getAgentProfileIcon(iconName), props)
}
