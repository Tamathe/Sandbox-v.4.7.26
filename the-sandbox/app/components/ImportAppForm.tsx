'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Globe, Github, Tag, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

const TECH_STACK_OPTIONS = [
  'Next.js', 'React', 'Vue', 'Angular', 'Svelte',
  'Node.js', 'Express', 'FastAPI', 'Flask', 'Django',
  'Python', 'TypeScript', 'JavaScript',
  'Streamlit', 'Tailwind CSS', 'PostgreSQL', 'MongoDB',
  'Prisma', 'Sanity', 'Firebase',
  'OpenAI', 'Anthropic', 'LangChain',
]

const CATEGORY_OPTIONS = [
  'Learn', 'Practice', 'Campus', 'General', 'STEM', 'Medicine', 'Law', 'Business', 'Arts',
]

export default function ImportAppForm() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [fullDescription, setFullDescription] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [category, setCategory] = useState('General')
  const [techStack, setTechStack] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ toolId: string; message: string } | null>(null)

  function toggleTag(tag: string) {
    setTechStack(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function addCustomTag() {
    const trimmed = customTag.trim()
    if (trimmed && !techStack.includes(trimmed)) {
      setTechStack(prev => [...prev, trimmed])
    }
    setCustomTag('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/tools/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({
          name,
          shortDescription,
          fullDescription: fullDescription || shortDescription,
          externalUrl,
          category,
          techStack,
          repoUrl: repoUrl || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to import app')
      }

      const data = await res.json()
      setSuccess({ toolId: data.toolId, message: data.message })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl border-2 border-green-200 p-8 text-center">
        <CheckCircle2 className="size-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-extrabold text-gray-900 mb-2">App Imported!</h2>
        <p className="text-sm text-gray-600 mb-6">{success.message}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/tools/${success.toolId}`)}
            className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-semibold text-sm hover:bg-[#002580] transition-colors"
          >
            View Your App
          </button>
          <button
            type="button"
            onClick={() => {
              setSuccess(null)
              setName('')
              setShortDescription('')
              setFullDescription('')
              setExternalUrl('')
              setCategory('General')
              setTechStack([])
              setRepoUrl('')
              setThumbnailUrl('')
            }}
            className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Import Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-6">
      <div className="flex items-start gap-4 mb-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-[#0033A0] flex-shrink-0">
          <Upload className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Import Your App</h2>
          <p className="text-sm text-gray-500">
            Bring your own web app onto the platform. It shows up as a card in the Hub
            {currentUser.role === 'STUDENT' && ' (pending admin approval)'}.
          </p>
        </div>
      </div>

      {/* App Name */}
      <div>
        <label htmlFor="import-name" className="block text-sm font-semibold text-gray-700 mb-1">
          App Name <span className="text-red-500">*</span>
        </label>
        <input
          id="import-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Clinical Trial Matcher"
          required
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#0033A0] transition-colors"
        />
      </div>

      {/* Short Description */}
      <div>
        <label htmlFor="import-short-desc" className="block text-sm font-semibold text-gray-700 mb-1">
          Short Description <span className="text-red-500">*</span>
        </label>
        <input
          id="import-short-desc"
          type="text"
          value={shortDescription}
          onChange={e => setShortDescription(e.target.value)}
          placeholder="One line about what your app does"
          required
          maxLength={200}
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#0033A0] transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1">{shortDescription.length}/200</p>
      </div>

      {/* Full Description */}
      <div>
        <label htmlFor="import-full-desc" className="block text-sm font-semibold text-gray-700 mb-1">
          Full Description
        </label>
        <textarea
          id="import-full-desc"
          value={fullDescription}
          onChange={e => setFullDescription(e.target.value)}
          placeholder="Tell people what your app does, how it works, and why you built it…"
          rows={4}
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#0033A0] transition-colors resize-none"
        />
      </div>

      {/* App URL */}
      <div>
        <label htmlFor="import-url" className="block text-sm font-semibold text-gray-700 mb-1">
          <Globe className="size-4 inline -mt-0.5 mr-1" />
          Live URL <span className="text-red-500">*</span>
        </label>
        <input
          id="import-url"
          type="url"
          value={externalUrl}
          onChange={e => setExternalUrl(e.target.value)}
          placeholder="https://my-app.vercel.app"
          required
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#0033A0] transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1">HTTPS required. Deploy free on Vercel, Railway, Render, or GitHub Pages.</p>
      </div>

      {/* Repo URL (optional) */}
      <div>
        <label htmlFor="import-repo" className="block text-sm font-semibold text-gray-700 mb-1">
          <Github className="size-4 inline -mt-0.5 mr-1" />
          Repository URL <span className="text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <input
          id="import-repo"
          type="url"
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
          placeholder="https://github.com/username/repo"
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#0033A0] transition-colors"
        />
      </div>

      {/* Thumbnail URL (optional) */}
      <div>
        <label htmlFor="import-thumbnail" className="block text-sm font-semibold text-gray-700 mb-1">
          Thumbnail URL <span className="text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <input
          id="import-thumbnail"
          type="url"
          value={thumbnailUrl}
          onChange={e => setThumbnailUrl(e.target.value)}
          placeholder="https://example.com/screenshot.png"
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-[#0033A0] transition-colors"
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="import-category" className="block text-sm font-semibold text-gray-700 mb-1">
          Category
        </label>
        <select
          id="import-category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#0033A0] transition-colors"
        >
          {CATEGORY_OPTIONS.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Tech Stack Tags */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Tag className="size-4 inline -mt-0.5 mr-1" />
          Tech Stack
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {TECH_STACK_OPTIONS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                techStack.includes(tag)
                  ? 'bg-[#0033A0] text-white border-[#0033A0]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#0033A0] hover:text-[#0033A0]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTag}
            onChange={e => setCustomTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            placeholder="Add custom tag…"
            className="flex-1 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0033A0] transition-colors"
          />
          <button
            type="button"
            onClick={addCustomTag}
            disabled={!customTag.trim()}
            className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Add
          </button>
        </div>
        {techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {techStack.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[#0033A0] text-xs font-semibold"
              >
                {tag}
                <button type="button" onClick={() => toggleTag(tag)} className="hover:text-red-500">
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="size-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !name.trim() || !shortDescription.trim() || !externalUrl.trim()}
        className="w-full py-3.5 rounded-xl bg-[#0033A0] text-white font-bold text-sm hover:bg-[#002580] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Importing…
          </>
        ) : (
          <>
            <Upload className="size-4" />
            Import App
          </>
        )}
      </button>
    </form>
  )
}
