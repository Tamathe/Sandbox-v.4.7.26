'use client'

import Editor, { type OnMount } from '@monaco-editor/react'
import { Check, Clipboard, Code2, Loader2, Play } from 'lucide-react'
import { useState } from 'react'

interface CodeEditorProps {
  code: string
  autoRunOnGenerate: boolean
  onAutoRunChange: (enabled: boolean) => void
  onChange: (code: string) => void
  onRun: (code: string) => void
  runLabel?: string
  runPulse?: boolean
  onEditorMount?: (editor: Parameters<OnMount>[0], monaco: Parameters<OnMount>[1]) => void
}

export default function CodeEditor({
  code,
  autoRunOnGenerate,
  onAutoRunChange,
  onChange,
  onRun,
  runLabel,
  runPulse,
  onEditorMount,
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => onRun(editor.getValue()),
    )
    onEditorMount?.(editor, monaco)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-[#0b1220] shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Code2 className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Code Editor</h2>
            <p className="text-xs text-slate-400">Editable HTML preview source</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRun(code)}
            disabled={!code.trim()}
            title="Run (Ctrl+Shift+Enter)"
            className={`flex items-center gap-2 rounded-2xl bg-[#0033A0] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:bg-slate-700${runPulse ? ' animate-pulse ring-2 ring-[#0033A0]/50' : ''}`}
          >
            <Play className="size-4" />
            {runLabel ?? 'Run'}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!code.trim()}
            title="Copy code"
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="size-4 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Clipboard className="size-4" />
                Copy
              </>
            )}
          </button>

          <label className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            <span>Auto-run</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoRunOnGenerate}
              onClick={() => onAutoRunChange(!autoRunOnGenerate)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoRunOnGenerate ? 'bg-[#0033A0]' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full bg-white transition-transform ${
                  autoRunOnGenerate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          defaultLanguage="html"
          language="html"
          path="playground-app.html"
          theme="vs-dark"
          value={code}
          onChange={(value) => onChange(value ?? '')}
          onMount={handleMount}
          loading={
            <div className="flex h-full items-center justify-center gap-3 bg-[#0b1220] text-sm text-slate-300">
              <Loader2 className="size-4 animate-spin" />
              Loading editor...
            </div>
          }
          options={{
            automaticLayout: true,
            fontSize: 13,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-4">
        <p className="text-xs text-slate-400">
          Edit the generated file directly, then run it again in the preview.
        </p>

        <button
          type="button"
          onClick={() => onRun(code)}
          disabled={!code.trim()}
          className={`inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400${runPulse ? ' animate-pulse ring-2 ring-[#0033A0]/50' : ''}`}
        >
          <Play className="size-4" />
          {runLabel ?? 'Run'}
          <span className="text-xs opacity-60">(⌘⇧↵)</span>
        </button>
      </div>
    </div>
  )
}
