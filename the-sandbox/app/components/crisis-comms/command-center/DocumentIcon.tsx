'use client'

import { Newspaper, Mail, Twitter, Camera, Globe, Users, Monitor, List, MessageSquareWarning, FileText } from 'lucide-react'
import type { DocumentType } from '../../../lib/crisis-comms/command-center/types'

const ICON_MAP: Record<DocumentType, React.ComponentType<{ className?: string }>> = {
  EMERGENCY_TEXT_ALERT: MessageSquareWarning,
  PRESS_STATEMENT: Newspaper,
  INTERNAL_EMAIL: Mail,
  SOCIAL_TWITTER: Twitter,
  SOCIAL_INSTAGRAM: Camera,
  SOCIAL_FACEBOOK: Globe,
  PARENT_NOTIFICATION: Users,
  WEBSITE_BANNER: Monitor,
  TALKING_POINTS: List,
  AFTER_ACTION_REPORT: FileText,
}

export default function DocumentIcon({ type, className }: { type: DocumentType; className?: string }) {
  const Icon = ICON_MAP[type] ?? Newspaper
  return <Icon className={className} />
}
