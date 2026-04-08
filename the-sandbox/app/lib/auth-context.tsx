'use client'

import React, { createContext, useContext, useState } from 'react'

export type DemoUser = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'EDUCATOR' | 'STUDENT'
  department: string
  college: string
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'user-admin',
    name: 'Alex Thompson',
    email: 'admin@uky.edu',
    role: 'ADMIN',
    department: 'Center for AI and Academics Innovation',
    college: 'CATS-AI',
  },
  {
    id: 'user-dipaola',
    name: 'Dr. Robert DiPaola',
    email: 'bob.dipaola@uky.edu',
    role: 'ADMIN',
    department: 'Office of the Provost',
    college: 'University of Kentucky',
  },
  {
    id: 'user-monday',
    name: 'Eric Monday',
    email: 'eric.monday@uky.edu',
    role: 'ADMIN',
    department: 'Finance and Administration',
    college: 'University of Kentucky',
  },
  {
    id: 'user-price',
    name: 'Heath Price',
    email: 'heath.price@uky.edu',
    role: 'EDUCATOR',
    department: 'College of Engineering',
    college: 'College of Engineering',
  },
  {
    id: 'user-mcclure-student',
    name: 'Ian McClure',
    email: 'ian.mcclure.student@uky.edu',
    role: 'STUDENT',
    department: 'J. David Rosenberg College of Law',
    college: 'J. David Rosenberg College of Law',
  },
  {
    id: 'user-tiana',
    name: 'Tiana The',
    email: 'tiana.the@uky.edu',
    role: 'STUDENT',
    department: 'Department of English',
    college: 'College of Arts & Sciences',
  },
]

type AuthContextType = {
  currentUser: DemoUser
  setCurrentUser: (user: DemoUser) => void
}

const AuthContext = createContext<AuthContextType>({
  currentUser: DEMO_USERS[0],
  setCurrentUser: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<DemoUser>(() => {
    if (typeof window === 'undefined') return DEMO_USERS[0]

    try {
      const stored = localStorage.getItem('sandbox-demo-user-email')
      if (stored) {
        const found = DEMO_USERS.find((u) => u.email === stored)
        if (found) return found
      }
    } catch {}

    return DEMO_USERS[0]
  })

  const setCurrentUser = (user: DemoUser) => {
    setCurrentUserState(user)
    try {
      localStorage.setItem('sandbox-demo-user-email', user.email)
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
