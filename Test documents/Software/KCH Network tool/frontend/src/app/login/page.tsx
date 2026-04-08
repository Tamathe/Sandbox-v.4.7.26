'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { login, register } = useAuth()
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [hospitalSite, setHospitalSite] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        await register(email, password, fullName, hospitalSite || undefined)
      } else {
        await login(email, password)
      }
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-kch-blue to-kch-blue-dark p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-kch-blue font-bold text-2xl">KCH</span>
          </div>
          <h1 className="text-2xl font-bold text-white">KCH Network</h1>
          <p className="text-blue-200 mt-1">Document Search System</p>
        </div>

        {/* Form card */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-kch-gray-900 mb-6">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-kch-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-kch-gray-700 mb-1">
                    Hospital Site
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={hospitalSite}
                    onChange={(e) => setHospitalSite(e.target.value)}
                    placeholder="Kentucky Children's Hospital"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-kch-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@uky.edu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-kch-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center py-2.5"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="text-sm text-kch-blue hover:underline"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          Kentucky Children&apos;s Hospital Network
        </p>
      </div>
    </div>
  )
}
