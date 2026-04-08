'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { RegistrarNav } from './RegistrarNav'
import { Student360Context } from './Student360Context'
import { Student360Drawer } from './Student360Drawer'
import PageHeader from '../PageHeader'

interface RegistrarLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function RegistrarLayout({
  children,
  title = 'Registrar Command Center',
  subtitle = 'University of Kentucky \u2014 Office of the Registrar',
}: RegistrarLayoutProps) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [student360Id, setStudent360Id] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser.role !== 'REGISTRAR' && currentUser.role !== 'ADMIN') {
      router.push('/')
    }
  }, [currentUser, router])

  return (
    <Student360Context.Provider value={{ openStudent360: setStudent360Id }}>
      <div className="min-h-screen bg-gray-50">
        <PageHeader title={title} subtitle={subtitle} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-6">
            <RegistrarNav />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
        <Student360Drawer
          studentId={student360Id}
          onClose={() => setStudent360Id(null)}
        />
      </div>
    </Student360Context.Provider>
  )
}
