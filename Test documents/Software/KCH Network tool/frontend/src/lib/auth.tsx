'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from './api'
import type { User } from './types'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string, hospitalSite?: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('kch_token')
    if (savedToken) {
      setToken(savedToken)
      api.setToken(savedToken)
      // Validate token
      api.getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('kch_token')
          setToken(null)
          api.setToken(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password)
    setToken(response.access_token)
    setUser(response.user)
    api.setToken(response.access_token)
    localStorage.setItem('kch_token', response.access_token)
  }, [])

  const register = useCallback(async (email: string, password: string, fullName: string, hospitalSite?: string) => {
    const response = await api.register(email, password, fullName, hospitalSite)
    setToken(response.access_token)
    setUser(response.user)
    api.setToken(response.access_token)
    localStorage.setItem('kch_token', response.access_token)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    api.setToken(null)
    localStorage.removeItem('kch_token')
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
