'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import PlaygroundLayout from '../components/playground/PlaygroundLayout'

export default function PlaygroundPage() {
  return <Suspense fallback={null}><PlaygroundPageInner /></Suspense>
}

function PlaygroundPageInner() {
  const searchParams = useSearchParams()
  const initialPrompt = searchParams.get('prompt')?.trim() ?? ''
  const returnTo = searchParams.get('from') ?? '/studio'

  useEffect(() => {
    document.title = 'Playground | University of Kentucky'
  }, [])

  return <PlaygroundLayout initialPrompt={initialPrompt} returnTo={returnTo} />
}
