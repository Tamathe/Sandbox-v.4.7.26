'use client'

import { useState } from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'

interface Props {
  userEmail: string
}

export default function PromptLabSandbox({ userEmail }: Props) {
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [sandyTip, setSandyTip] = useState('')
  const [loading, setLoading] = useState(false)

  const headers = { 'Content-Type': 'application/json', 'x-demo-user-email': userEmail }

  async function handleRun() {
    if (!prompt.trim()) return
    setLoading(true)
    setOutput('')
    setSandyTip('')

    try {
      // Run the prompt first
      const execRes = await fetch('/api/ai-literacy/prompt-lab/execute', {
        method: 'POST', headers, body: JSON.stringify({ prompt }),
      })
      const execData = await execRes.json()
      const outputText = execData.output ?? ''
      setOutput(outputText)

      // Save to sandbox + get Sandy tip
      const sandboxRes = await fetch('/api/ai-literacy/prompt-lab/sandbox', {
        method: 'POST', headers, body: JSON.stringify({ prompt, output: outputText }),
      })
      const sandboxData = await sandboxRes.json()
      setSandyTip(sandboxData.sandyTip ?? '')
    } catch {
      // fetch failed — output stays empty, user can retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h3 className="font-extrabold text-gray-900 mb-1">Free-Form Sandbox</h3>
        <p className="text-sm text-gray-500 mb-4">Write any prompt and get coaching tips from Sandy.</p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type any prompt here — experiment freely..."
          rows={6}
          disabled={loading}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30 focus:border-[#0033A0] resize-y disabled:opacity-50 mb-4"
        />

        <button
          onClick={handleRun}
          disabled={!prompt.trim() || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0033A0] text-white rounded-lg font-semibold text-sm hover:bg-[#002878] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {loading ? 'Running...' : 'Run Prompt'}
        </button>
      </div>

      {output && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">AI Output</h3>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{output}</p>
        </div>
      )}

      {sandyTip && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-[#0033A0]" />
            <h3 className="font-semibold text-[#0033A0] text-sm">Sandy&apos;s Coaching Tip</h3>
          </div>
          <p className="text-sm text-gray-700">{sandyTip}</p>
        </div>
      )}
    </div>
  )
}
