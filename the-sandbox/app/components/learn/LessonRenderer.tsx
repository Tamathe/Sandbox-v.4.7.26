'use client'

import ReadingLesson from './lesson-renderers/ReadingLesson'
import ToolLesson from './lesson-renderers/ToolLesson'
import ChatbotLesson from './lesson-renderers/ChatbotLesson'
import VideoLesson from './lesson-renderers/VideoLesson'
import AssessmentLesson from './lesson-renderers/AssessmentLesson'

type LessonType = 'READING' | 'TOOL' | 'CHATBOT' | 'VIDEO' | 'ASSESSMENT'

type Props = {
  type: LessonType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentRef: any
}

export default function LessonRenderer({ type, contentRef }: Props) {
  switch (type) {
    case 'READING':
      return <ReadingLesson contentRef={contentRef} />
    case 'TOOL':
      return <ToolLesson contentRef={contentRef} />
    case 'CHATBOT':
      return <ChatbotLesson contentRef={contentRef} />
    case 'VIDEO':
      return <VideoLesson contentRef={contentRef} />
    case 'ASSESSMENT':
      return <AssessmentLesson contentRef={contentRef} />
    default:
      return <p className="text-sm text-slate-500">Unknown lesson type.</p>
  }
}
