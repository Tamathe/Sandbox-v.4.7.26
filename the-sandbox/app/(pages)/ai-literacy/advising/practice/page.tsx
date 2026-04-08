'use client'

import { useState, useRef, useCallback } from 'react'
import { ArrowLeft, Send, Loader2, MessageCircle, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../../../lib/auth-context'
import PageHeader from '../../../../components/PageHeader'
import type { ChatMessage } from '../../../../lib/types'

const SCENARIOS = [
  {
    id: 'admits-ai',
    title: 'Student Admits AI Use',
    situation: 'A student comes to your office hours and admits they used ChatGPT on their last essay. They seem genuinely uncertain about whether this was okay.',
    studentPersonality: 'anxious but honest first-year student who wants to do the right thing',
  },
  {
    id: 'asks-about-tools',
    title: 'Student Asks About AI Tools',
    situation: 'A student asks you which AI tools they should be using for your course, assuming AI use is fine since "everyone does it."',
    studentPersonality: 'confident junior who is tech-savvy and genuinely curious, not trying to cheat',
  },
  {
    id: 'struggling-reliance',
    title: 'Student Struggling from AI Reliance',
    situation: 'You notice a student who previously did well is now turning in work that reads differently. In a one-on-one meeting, they reveal they\'ve been using AI for everything and feel like they can\'t write without it anymore.',
    studentPersonality: 'frustrated and slightly embarrassed sophomore who knows they have a problem but doesn\'t know how to fix it',
  },
  {
    id: 'ethical-use',
    title: 'Student Wants Ethical AI Use',
    situation: 'A graduate student approaches you wanting to use AI tools ethically in their research. They want guidance on what\'s appropriate for literature reviews, data analysis, and writing.',
    studentPersonality: 'thoughtful and motivated grad student who wants clear guidelines rather than blanket approval or prohibition',
  },
  {
    id: 'colleague-frustrated',
    title: 'Colleague Frustrated with AI',
    situation: 'A fellow faculty member vents that "students are all cheating with AI" and wants to know how you handle it. They\'re considering banning all technology from their classroom.',
    studentPersonality: 'stressed mid-career professor in a different department who feels overwhelmed and wants simple answers',
  },
]


export default function AdvisingPracticePage() {
  const { currentUser } = useAuth()
  const [selectedScenario, setSelectedScenario] = useState<typeof SCENARIOS[0] | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ended, setEnded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const startScenario = (scenario: typeof SCENARIOS[0]) => {
    setSelectedScenario(scenario)
    setMessages([])
    setEnded(false)

    // Sandy opens as the student
    const opening: ChatMessage = {
      id: `opening-${Date.now()}`,
      role: 'assistant',
      content: getOpeningLine(scenario),
    }
    setMessages([opening])
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !selectedScenario) return

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Call Sandy concierge with roleplay system prompt
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({
        messages: newMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        systemOverride: buildRoleplayPrompt(selectedScenario),
      }),
    })

    if (res.ok) {
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          assistantText += decoder.decode(value, { stream: true })
          setMessages([...newMessages, { id: `assistant-${Date.now()}`, role: 'assistant', content: assistantText }])
        }
      }
    }

    setLoading(false)
    setTimeout(scrollToBottom, 100)
  }, [input, loading, selectedScenario, messages, currentUser.email])

  const endPractice = useCallback(async () => {
    setEnded(true)
    setLoading(true)

    // Ask Sandy to break character and give feedback
    const feedbackMessages = [
      ...messages,
      { role: 'user' as const, content: '[END ROLEPLAY] Please break character and provide coaching feedback on how I handled this conversation. What did I do well? What could I improve? Be specific and constructive.' },
    ]

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
      body: JSON.stringify({
        messages: feedbackMessages.map(m => ({ role: m.role, content: m.content })),
        systemOverride: buildRoleplayPrompt(selectedScenario!),
      }),
    })

    if (res.ok) {
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let feedbackText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          feedbackText += decoder.decode(value, { stream: true })
          setMessages([...messages, { id: `feedback-${Date.now()}`, role: 'assistant', content: `**Sandy's Coaching Feedback:**\n\n${feedbackText}` }])
        }
      }
    }

    setLoading(false)
    setTimeout(scrollToBottom, 100)
  }, [messages, selectedScenario, currentUser.email])

  // Scenario selection
  if (!selectedScenario) {
    return (
      <>
        <PageHeader
          title="Advising Practice"
          subtitle="Practice AI conversations with Sandy roleplaying as a student or colleague"
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/ai-literacy/advising" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="size-4" /> Back to Advising Framework
          </Link>

          <div className="space-y-3">
            {SCENARIOS.map(scenario => (
              <button
                key={scenario.id}
                onClick={() => startScenario(scenario)}
                className="w-full text-left p-4 border rounded-2xl bg-white hover:shadow-md hover:border-gray-300 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <MessageCircle className="size-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{scenario.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{scenario.situation}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  // Chat interface
  return (
    <>
      <PageHeader
        title={`Practice: ${selectedScenario.title}`}
        subtitle="Sandy is roleplaying — respond as you would in a real advising conversation"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedScenario(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="size-4" /> Choose Different Scenario
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => startScenario(selectedScenario)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border rounded-lg hover:bg-gray-50"
            >
              <RotateCcw className="size-3" /> Restart
            </button>
            {!ended && messages.length > 2 && (
              <button
                onClick={endPractice}
                className="px-4 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg font-medium hover:bg-amber-100"
              >
                End Practice & Get Feedback
              </button>
            )}
          </div>
        </div>

        {/* Scenario context */}
        <div className="p-3 bg-gray-50 rounded-xl mb-4 text-xs text-gray-600">
          <span className="font-medium">Scenario:</span> {selectedScenario.situation}
        </div>

        {/* Messages */}
        <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 text-sm ${
                m.role === 'user'
                  ? 'bg-[#0033A0] text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white border border-gray-100 rounded-2xl rounded-tl-sm text-gray-800'
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm">
                <Loader2 className="size-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {!ended && (
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && void sendMessage()}
              placeholder="Respond to the student..."
              className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-[#0033A0] outline-none"
              disabled={loading}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              className="size-10 bg-[#0033A0] text-white rounded-xl flex items-center justify-center hover:bg-[#002880] disabled:opacity-50 transition-colors"
            >
              <Send className="size-4" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function getOpeningLine(scenario: typeof SCENARIOS[0]): string {
  switch (scenario.id) {
    case 'admits-ai':
      return "Hey professor... do you have a minute? I wanted to talk to you about something. Um, so for the last essay... I used ChatGPT to help me with it. I'm not sure if that was okay or not, but I didn't want to lie about it."
    case 'asks-about-tools':
      return "Hi! I was wondering — what AI tools should I be using for this class? A bunch of my friends use Claude and ChatGPT for their papers and stuff. I figured I should ask which ones you recommend."
    case 'struggling-reliance':
      return "Thanks for meeting with me. I... honestly, I'm kind of struggling. I've been using AI for basically everything this semester — not just your class. And now when I try to write something on my own, I just stare at the screen. I don't even know if I can write anymore."
    case 'ethical-use':
      return "Professor, I'm working on my thesis and I want to be really intentional about how I use AI tools. I've been using them for some initial literature searches and to help organize my notes, but I want to make sure I'm doing this the right way. Can you help me think through what's appropriate?"
    case 'colleague-frustrated':
      return "I don't know how you deal with it. I'm pretty sure half my students are turning in AI-generated work. I've tried those detection tools and they're useless. I'm honestly thinking about just banning laptops entirely and going back to handwritten exams."
    default:
      return "Hi, can we talk?"
  }
}

function buildRoleplayPrompt(scenario: typeof SCENARIOS[0]): string {
  return `You are Sandy, roleplaying as a specific person in an AI advising scenario for faculty practice.

SCENARIO: ${scenario.situation}

YOUR CHARACTER: You are a ${scenario.studentPersonality}. Stay in character throughout the conversation. React naturally to what the faculty member says — if they're empathetic, open up more. If they're dismissive, become defensive. If they give clear guidance, feel relieved.

IMPORTANT RULES:
- Stay in character as the student/colleague. Do not break character unless the user says "[END ROLEPLAY]"
- Be realistic — real students have mixed feelings, ask follow-up questions, and sometimes push back
- Don't make it too easy — include realistic complications (peer pressure, grade anxiety, time pressure, confusion about policies)
- Keep responses conversational length (2-4 sentences usually)
- If the faculty member says [END ROLEPLAY], break character completely and provide coaching feedback on how they handled the conversation. Be specific: what they did well, what they could improve, and specific phrases or approaches that were effective or could be better.`
}
