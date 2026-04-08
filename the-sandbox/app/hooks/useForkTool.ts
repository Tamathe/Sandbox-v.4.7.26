import { useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'

export function useForkTool(toolId: string, userEmail: string) {
  const [forking, setForking] = useState(false)
  const router = useRouter()

  const handleFork = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (forking) return

    setForking(true)
    try {
      const response = await fetch(`/api/tools/${toolId}/fork`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      if (!response.ok) return
      const data = await response.json() as { sessionId?: string }
      if (data.sessionId) {
        router.push(`/builder?sessionId=${encodeURIComponent(data.sessionId)}`)
      }
    } finally {
      setForking(false)
    }
  }

  return { forking, handleFork }
}
