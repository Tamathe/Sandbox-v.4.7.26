export interface MeetingMachineField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select'
  placeholder?: string
  required: boolean
  options?: readonly string[]
}

export interface MeetingMachineStep {
  label: string
  inputType: 'form' | 'textarea' | 'ai-output' | 'final-output'
  editable?: boolean
  placeholder?: string
  fields?: readonly MeetingMachineField[]
}

export interface MeetingMachineTool {
  slug: string
  title: string
  description: string
  icon: string
  steps: readonly MeetingMachineStep[]
}

export const MEETING_MACHINE_TOOLS: MeetingMachineTool[] = [
  {
    slug: 'agenda-builder',
    title: 'Agenda Builder',
    description: 'Generate a perfectly timed meeting agenda from a few inputs',
    icon: 'CalendarClock',
    steps: [
      {
        label: 'Meeting Details',
        inputType: 'form',
        fields: [
          { name: 'title', label: 'Meeting Title', type: 'text', required: true },
          { name: 'attendees', label: 'Attendees', type: 'textarea', placeholder: 'Names and roles...', required: true },
          { name: 'duration', label: 'Duration (minutes)', type: 'select', options: ['15', '30', '45', '60', '90'], required: true },
          { name: 'topics', label: 'Topics to Cover', type: 'textarea', placeholder: 'List the key topics...', required: true },
        ],
      },
      { label: 'AI-Generated Agenda', inputType: 'ai-output', editable: true },
      { label: 'Final Agenda', inputType: 'final-output' },
    ],
  },
  {
    slug: 'minutes-taker',
    title: 'Minutes Taker',
    description: 'Turn messy meeting notes into structured, professional minutes',
    icon: 'NotebookPen',
    steps: [
      { label: 'Raw Notes', inputType: 'textarea', placeholder: 'Paste your meeting notes or transcript...' },
      { label: 'Structured Minutes', inputType: 'ai-output', editable: true },
      { label: 'Final Minutes', inputType: 'final-output' },
    ],
  },
  {
    slug: 'action-items',
    title: 'Action Item Tracker',
    description: 'Extract every action item, owner, and deadline from meeting notes',
    icon: 'ListChecks',
    steps: [
      { label: 'Meeting Notes', inputType: 'textarea', placeholder: 'Paste meeting notes, transcript, or minutes...' },
      { label: 'Extracted Actions', inputType: 'ai-output', editable: true },
      { label: 'Action Item List', inputType: 'final-output' },
    ],
  },
  {
    slug: 'follow-up-drafter',
    title: 'Follow-up Drafter',
    description: 'Draft personalized follow-up emails for every meeting participant',
    icon: 'Forward',
    steps: [
      {
        label: 'Meeting Context',
        inputType: 'form',
        fields: [
          { name: 'meetingTopic', label: 'Meeting Topic', type: 'text', required: true },
          { name: 'attendees', label: 'Attendees & Roles', type: 'textarea', required: true },
          { name: 'keyDecisions', label: 'Key Decisions Made', type: 'textarea', required: true },
          { name: 'actionItems', label: 'Action Items', type: 'textarea', placeholder: 'Who owes what by when...', required: false },
        ],
      },
      { label: 'Draft Emails', inputType: 'ai-output', editable: true },
      { label: 'Final Emails', inputType: 'final-output' },
    ],
  },
]

export function getMeetingMachineTool(slug: string): MeetingMachineTool | undefined {
  return MEETING_MACHINE_TOOLS.find(t => t.slug === slug)
}
