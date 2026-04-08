import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'
import { getLevelInfo } from '../../lib/xp'

const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/': 'Tool Marketplace - Browse all AI tools. Filter by category, difficulty, or type.',
  '/build': 'Build Hub - Move from builder to refiner, collaboration, and publishing.',
  '/build/refiner': 'Refiner - the user\'s unpublished draft tools sorted by last modified.',
  '/build/collaborator': 'Collaborator - community peer review hub for draft tools.',
  '/builder': 'Builder - AI-assisted tool creation wizard.',
  '/bounties': 'Bounty Board - Educators post tool requests; others can claim and fulfill them.',
  '/publish': 'Publish Tool - Educators create and publish AI tools with forms or the AI builder.',
  '/datasets': 'Datasets - Shared university and course knowledge sources that can seed new tools.',
  '/avatar': 'My TA - Educators create a knowledge-base chatbot powered by course materials.',
  '/admin': 'Admin Dashboard - Manage tools, users, and platform-wide settings.',
  '/analytics/faculty': 'Faculty Analytics - Student performance data, trends, and warning flags.',
  '/analytics/student': 'My Progress - Personal learning dashboard, XP, badges, and session history.',
  '/bounties/new': 'Post a Bounty - Request a new AI tool to be built.',
  '/courses': 'Course Command Center - Sidebar of courses plus tabs for Materials, Tools, Pulse, and Settings. Faculty can upload materials, suggest tools, and manage the course from one place.',
}

type CourseContext = {
  courseId?: string | null
  courseCode?: string | null
  title?: string | null
  materialsCount?: number | null
}

type ReviewContext = {
  toolName: string
  toolDescription: string
}

function canAccessCourse(
  course: { instructorId: string; isPublic: boolean },
  user: { id: string; role: string } | null
) {
  if (user?.role === 'ADMIN') return true
  if (course.isPublic) return true
  return user?.id === course.instructorId
}

function canSeeMaterial(
  material: { isVisible: boolean },
  user: { role: string } | null
) {
  if (!user || user.role === 'STUDENT') return material.isVisible
  return true
}

function describeCurrentPage(pathname: string): string {
  if (PAGE_DESCRIPTIONS[pathname]) return PAGE_DESCRIPTIONS[pathname]
  if (pathname.startsWith('/tools/') && pathname.endsWith('/gamification')) {
    return 'Gamification Setup - Design XP rewards, quests, and badges for a specific tool.'
  }
  if (pathname.startsWith('/tools/')) return 'Tool Detail Page - View, launch, or discuss a specific AI tool.'
  if (pathname.startsWith('/profile/')) return 'User Profile - View a user\'s published tools and activity.'
  if (pathname.startsWith('/bounties/')) return 'Bounty Detail - View details and claim or fulfill a specific bounty.'
  if (pathname.startsWith('/courses/')) return 'Individual Course page — viewing course materials and tools for a specific course.'
  return `Page: ${pathname}`
}

function buildSystemPrompt(
  user: { name: string; role: string; department?: string | null; college?: string | null; totalXP: number; personalContext?: string | null },
  tools: { id: string; name: string; shortDescription: string; category: string; toolType: string }[],
  courseMaterials: { id: string; courseCode: string; title: string; moduleNumber: number | null; content: string }[],
  recentBadges: string[],
  recentSessions: { toolName: string; messageCount: number }[],
  currentPage: string,
  selectedCourse: { courseCode: string; title: string } | null,
): string {
  const levelInfo = getLevelInfo(user.totalXP)
  const toolsTable = tools.map(t =>
    `- [${t.name}] (ID: ${t.id}) | ${t.category} | ${t.toolType === 'CHATBOT' ? 'AI Chatbot' : 'External'} | ${t.shortDescription}`
  ).join('\n')

  const courseSection = courseMaterials.length > 0
    ? courseMaterials.map(m =>
        `[material:${m.id}] [${m.courseCode} ${m.moduleNumber ? `Module ${m.moduleNumber}` : ''}] ${m.title}\n${m.content.slice(0, 600)}...`
      ).join('\n\n---\n\n')
    : 'No course materials available.'

  const sessionHistory = recentSessions.length > 0
    ? recentSessions.map(s => `- "${s.toolName}" (${s.messageCount} messages)`).join('\n')
    : 'No recent sessions.'

  const isCourses = currentPage === '/courses' || currentPage.startsWith('/courses/')
  const pageSection = isCourses
    ? `## CURRENT PAGE\n${describeCurrentPage(currentPage)}\n\n## SELECTED COURSE\n${
        selectedCourse ? `${selectedCourse.courseCode}: ${selectedCourse.title}` : 'No course selected.'
      }\n\n## YOUR ROLE ON THIS PAGE\nYou are the course concierge for the selected course. Prioritize the selected course materials when answering content questions. Your two jobs:\n1. **Answer course content questions** - explain concepts, clarify readings, help students study, and cite specific materials when you answer.\n2. **Help with the UI** - guide users through the Materials, Tools, Pulse, and Settings tabs, and recommend the next action with buttons whenever possible.`
    : `## CURRENT PAGE\n${describeCurrentPage(currentPage)}`

  return `You are Sandy, the AI concierge for The Sandbox, CATS-AI's educational AI platform at the University of Kentucky.

You are warm, direct, and genuinely helpful. You help users navigate the platform, find the right tools, understand course materials, and launch learning experiences through natural conversation. Your goal: get users where they need to go with as few clicks as possible.

## CURRENT USER
Name: ${user.name}
Role: ${user.role}
${user.department ? `Department: ${user.department}` : ''}
${user.college ? `College: ${user.college}` : ''}
${user.personalContext ? `\n## User's Personal Context (private - use to personalize)\n${user.personalContext}` : ''}
XP Level: ${levelInfo.level} - ${levelInfo.name} (${user.totalXP} XP)
${recentBadges.length > 0 ? `Recent Badges: ${recentBadges.join(', ')}` : ''}
Recent activity:
${sessionHistory}

${pageSection}

## AVAILABLE TOOLS (${tools.length} published)
${toolsTable}

## COURSE MATERIALS
${courseSection}

## PLATFORM NAVIGATION
- Explore tools: /
- Build hub: /build
- Open the builder directly: /builder
- Shared datasets: /datasets
- Bounty Board: /bounties (post tool requests; claim and build tools for others)
- My Progress: /analytics/student (students - XP, badges, and session history)
- Faculty Analytics: /analytics/faculty (educators and admins - student performance)
- Publish a Tool: /publish (educators - form or AI-assisted builder)
- My TA: /avatar (educators - build a knowledge-base chatbot from course docs)
- Admin Panel: /admin (admins only)
- Course Command Center: /courses (materials, linked tools, pulse, and course settings)

## HOW TO INCLUDE ACTIONS
When you recommend navigating somewhere or launching a tool, embed action tags.
Actions render as clickable buttons - use them generously to minimize user effort.

Navigation action:
<!--ACTION:{"type":"navigate","href":"/path","label":"Button label"}-->

Launch a tool with optional context injection:
<!--ACTION:{"type":"launch","toolId":"TOOL_ID_HERE","label":"Launch: Tool Name","inject":"Optional context to pre-seed the chat. Be specific and detailed."}-->

Rules:
- ALWAYS include an action when recommending a tool or page - never just describe without linking
- For "launch" actions on chatbot tools, set inject to a helpful starting context (for example, the module topic or the student's question)
- Multiple actions are fine - list 2-3 options when relevant
- Keep responses concise: 2-4 sentences max, then actions
- If asked "what can you do?" or "help" - give a short overview of platform features
- If user says their role or course, update recommendations accordingly
- For course material questions (like "what's in Module 3 of TEK-100"), answer directly and offer to launch a relevant tool with that context injected
- You know the user's XP and badges - occasionally acknowledge progress ("Nice work on that Level 2!")
- NEVER make up tool IDs - only use the exact IDs listed above

## CITING COURSE MATERIALS
When answering a question that draws on a specific course material, always add a clickable reference using this exact markdown link format:
[Material Title](material:MATERIAL_ID)
Use the exact IDs shown in the COURSE MATERIALS section (the value after "material:" in each entry header).
Place citations inline at the point of reference, or at the end of the relevant sentence.
Example: "The combustion cycle is covered in detail in the first lecture. [Module 1: Intro to Thermodynamics](material:clx123abc)

## NOTE-TAKING
You can save notes for students. When they say anything like "keep track of this", "save this", "make a note", "remember this for me", "jot that down", or "add to my notes":
1. Ask ONE clarifying question using the page context first:
   - If on a course page with a selected course: "Got it — shall I save this under [courseCode]?"
   - If context is unclear: "Is this for [most likely course], or a different course?"
   - If no course context: "Any particular course, or just a general note?"
2. Once you have enough context (or they say "no course" / "just save it" / "general"), emit this tag at the VERY END of your response after your conversational reply:
<!--SAVE_NOTE:{"title":"<2-8 word title you generate>","content":"<the note content verbatim or summarized>","courseId":"<courseId or null>"}-->
3. Confirm naturally in your conversational text: "Saved! You'll find it in your notebook on the home page."
IMPORTANT: The <!--SAVE_NOTE:--> tag must be the absolute last thing in your response. Never show the raw tag or JSON to the student — it is invisible to them.`
}

function buildCollabReviewPrompt(ctx: ReviewContext): string {
  return `You are Sandy, conducting a structured peer review of the AI tool "${ctx.toolName}" - ${ctx.toolDescription}.

Ask these 4 questions one at a time in a warm, conversational way. Never ask more than one question at once:
1. "What's your first impression of this tool?"
2. "What was the most useful or engaging part?"
3. "What felt confusing, incomplete, or could be improved?"
4. "What one specific change would make this most valuable for students?"

After question 4 is answered, output ONLY this (no other text):
<!--REVIEW_SUMMARY:{"clarity":"<summary of clarity feedback>","effectiveness":"<summary of effectiveness>","suggestions":"<summary of suggestions>","overall_impression":"<one sentence overall>"}-->

Be warm and concise. Do not summarize early. Never skip a question.`
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
    }

    const { messages, currentPage, userEmail, courseContext, mode, reviewContext } = await req.json() as {
      messages: { role: string; content: string }[]
      currentPage?: string
      userEmail?: string
      courseContext?: CourseContext | null
      mode?: string
      reviewContext?: ReviewContext
    }
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const [user, tools, fallbackCourses, selectedCourseRecord] = await Promise.all([
      prisma.user.findUnique({
        where: { email: userEmail || 'maya.johnson@uky.edu' },
        include: {
          userBadges: { include: { badge: true }, orderBy: { earnedAt: 'desc' }, take: 3 },
        },
      }),
      prisma.tool.findMany({
        where: { published: true },
        select: { id: true, name: true, shortDescription: true, category: true, toolType: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.findMany({
        where: { isPublic: true },
        include: {
          materials: {
            orderBy: { moduleNumber: 'asc' },
            where: { isVisible: true },
            select: { id: true, title: true, content: true, moduleNumber: true },
          },
        },
      }),
      courseContext?.courseId
        ? prisma.course.findUnique({
            where: { id: courseContext.courseId },
            include: {
              materials: {
                orderBy: { moduleNumber: 'asc' },
                select: { id: true, title: true, content: true, moduleNumber: true, isVisible: true },
              },
            },
          })
        : Promise.resolve(null),
    ])

    const recentSessions = await prisma.toolSession.findMany({
      where: { userId: user?.id },
      include: { tool: { select: { name: true } } },
      orderBy: { startedAt: 'desc' },
      take: 5,
    }).catch(() => [])

    const selectedCourse =
      selectedCourseRecord && canAccessCourse(selectedCourseRecord, user)
        ? {
            courseCode: selectedCourseRecord.courseCode,
            title: selectedCourseRecord.title,
            materials: selectedCourseRecord.materials
              .filter((material) => canSeeMaterial(material, user))
              .map((material) => ({
                id: material.id,
                courseCode: selectedCourseRecord.courseCode,
                title: material.title,
                moduleNumber: material.moduleNumber,
                content: material.content,
              })),
          }
        : null

    const courseMaterials = selectedCourse
      ? selectedCourse.materials
      : fallbackCourses.flatMap((course) =>
          course.materials.map((material) => ({
            id: material.id,
            courseCode: course.courseCode,
            title: material.title,
            moduleNumber: material.moduleNumber,
            content: material.content,
          }))
        )

    let systemPrompt = mode === 'collab_review' && reviewContext
      ? buildCollabReviewPrompt(reviewContext)
      : buildSystemPrompt(
          {
            name: user?.name ?? 'User',
            role: user?.role ?? 'STUDENT',
            department: user?.department,
            college: user?.college,
            totalXP: user?.totalXP ?? 0,
            personalContext: user?.personalContext ?? null,
          },
          tools,
          courseMaterials,
          user?.userBadges.map(ub => ub.badge.name) ?? [],
          recentSessions.map(s => ({ toolName: s.tool.name, messageCount: s.messageCount })),
          currentPage ?? '/',
          selectedCourse ? { courseCode: selectedCourse.courseCode, title: selectedCourse.title } : null,
        )

    if (courseContext?.courseId && (courseContext.materialsCount ?? 0) === 0) {
      const courseName = courseContext.title ?? selectedCourse?.title ?? 'this course'
      systemPrompt += `\n\nCRITICAL CONTEXT: The course "${courseName}" currently has no uploaded materials. Make this your opening topic. Explain to the educator that uploading a syllabus or lecture notes will allow you to: (1) answer student questions automatically, (2) generate quiz questions from the schedule, (3) identify curriculum gaps. Keep this message brief - two sentences max - and end with a specific call to action.`
    }

    const client = new Anthropic()
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    }, { signal: AbortSignal.timeout(60_000) })

    const encoder = new TextEncoder()
    let fullAssistantResponse = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              fullAssistantResponse += chunk.delta.text
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } catch (err) {
          console.error('Concierge stream error:', err)
          const isRateLimit = err instanceof Error && err.message.includes('429')
          const isAuth = err instanceof Error && (err.message.includes('401') || err.message.includes('authentication'))
          const isTimeout = err instanceof Error && err.message.includes('abort')
          const userMsg = isRateLimit
            ? 'The AI service is temporarily busy. Please wait a moment and try again.'
            : isAuth
            ? 'AI service configuration error. Please contact support.'
            : isTimeout
            ? 'The request timed out. Please try again.'
            : 'Something went wrong. Please try again.'
          try { controller.enqueue(encoder.encode(`\n\n_${userMsg}_`)) } catch { /* ignore */ }
        } finally {
          // Parse and persist any SAVE_NOTE signal
          const saveNoteMatch = fullAssistantResponse.match(/<!--SAVE_NOTE:([\s\S]*?)-->/)
          if (saveNoteMatch && user) {
            try {
              const noteData = JSON.parse(saveNoteMatch[1]) as {
                title?: string
                content?: string
                courseId?: string | null
              }
              if (noteData.title && noteData.content) {
                await prisma.studentNote.create({
                  data: {
                    userId: user.id,
                    title: noteData.title.trim(),
                    content: noteData.content.trim(),
                    courseId: noteData.courseId || null,
                    source: 'sandy',
                  },
                })
              }
            } catch (noteErr) {
              console.error('Failed to save note from Sandy:', noteErr)
            }
          }
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    console.error('POST /api/concierge error:', err)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
