'use client'

import Editor from '@monaco-editor/react'
import { Code2, Loader2, Play } from 'lucide-react'

interface CodeEditorProps {
  code: string
  autoRunOnGenerate: boolean
  onAutoRunChange: (enabled: boolean) => void
  onChange: (code: string) => void
  onRun: (code: string) => void
}

export default function CodeEditor({
  code,
  autoRunOnGenerate,
  onAutoRunChange,
  onChange,
  onRun,
}: CodeEditorProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-[#0b1220] shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Code Editor</h2>
            <p className="text-xs text-slate-400">Editable HTML preview source</p>
          </div>
        </div>

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
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                autoRunOnGenerate ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
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
          loading={
            <div className="flex h-full items-center justify-center gap-3 bg-[#0b1220] text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
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
          className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002580] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          <Play className="h-4 w-4" />
          Run
        </button>
      </div>
    </div>
  )
}
