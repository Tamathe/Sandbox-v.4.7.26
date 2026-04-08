export interface WriteRoomField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select'
  placeholder?: string
  required: boolean
  options?: readonly string[]
}

export interface WriteRoomTool {
  slug: string
  title: string
  description: string
  icon: string
  variant?: 'before-after' | 'sectioned'
  fields: readonly WriteRoomField[]
}

export const WRITE_ROOM_TOOLS: WriteRoomTool[] = [
  {
    slug: 'ai-policy-builder',
    title: 'AI Policy Builder',
    description: 'Draft editable syllabus AI-use language grounded in course governance and policy context',
    icon: 'ShieldCheck',
    fields: [],
  },
  {
    slug: 'resume-builder',
    title: 'Resume Builder',
    description: 'Generate a polished, professional resume from your experience and target role',
    icon: 'FileText',
    fields: [
      { name: 'targetRole', label: 'Target Role', type: 'text', placeholder: 'e.g., Software Engineer at Google', required: true },
      { name: 'experience', label: 'Work Experience', type: 'textarea', placeholder: 'List your roles, companies, dates, and key accomplishments...', required: true },
      { name: 'education', label: 'Education', type: 'textarea', placeholder: 'Degrees, institutions, graduation dates, honors...', required: false },
      { name: 'skills', label: 'Skills', type: 'textarea', placeholder: 'Technical skills, languages, certifications...', required: false },
      { name: 'style', label: 'Resume Style', type: 'select', options: ['Professional', 'Creative', 'Academic', 'Technical'], required: true },
    ],
  },
  {
    slug: 'cover-letter',
    title: 'Cover Letter Generator',
    description: 'Craft a tailored cover letter for any job posting in seconds',
    icon: 'Mail',
    fields: [
      { name: 'jobPosting', label: 'Job Posting', type: 'textarea', placeholder: 'Paste the job description or key requirements...', required: true },
      { name: 'background', label: 'Your Background', type: 'textarea', placeholder: 'Relevant experience, skills, and why you want this role...', required: true },
      { name: 'tone', label: 'Tone', type: 'select', options: ['Formal', 'Enthusiastic', 'Confident', 'Conversational'], required: true },
    ],
  },
  {
    slug: 'email-rewriter',
    title: 'Email Rewriter',
    description: 'Transform any email draft into the perfect tone and style',
    icon: 'RefreshCw',
    variant: 'before-after',
    fields: [
      { name: 'originalEmail', label: 'Your Email Draft', type: 'textarea', placeholder: 'Paste the email you want to improve...', required: true },
      { name: 'intent', label: 'Make It...', type: 'select', options: ['More Professional', 'More Friendly', 'More Concise', 'More Persuasive'], required: true },
    ],
  },
  {
    slug: 'linkedin-optimizer',
    title: 'LinkedIn Optimizer',
    description: 'Optimize your LinkedIn profile sections for maximum impact',
    icon: 'UserCheck',
    variant: 'sectioned',
    fields: [
      { name: 'currentHeadline', label: 'Current Headline', type: 'text', placeholder: 'e.g., Student at University of Kentucky', required: true },
      { name: 'currentAbout', label: 'Current About Section', type: 'textarea', placeholder: 'Paste your current About section (or describe yourself)...', required: true },
      { name: 'targetRole', label: 'Target Role / Industry', type: 'text', placeholder: 'What kind of roles are you targeting?', required: true },
    ],
  },
]

export function getWriteRoomTool(slug: string): WriteRoomTool | undefined {
  return WRITE_ROOM_TOOLS.find(t => t.slug === slug)
}
