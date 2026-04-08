'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import PlaygroundLayout from '../components/playground/PlaygroundLayout'

export default function PlaygroundPage() {
  const searchParams = useSearchParams()
  const initialPrompt = searchParams.get('prompt')?.trim() ?? ''

  useEffect(() => {
    document.title = 'Playground | The Sandbox'
  }, [])

  return <PlaygroundLayout initialPrompt={initialPrompt} />
}
