'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="size-8 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-600">Something went wrong</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 text-sm text-[#0033A0] hover:underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
