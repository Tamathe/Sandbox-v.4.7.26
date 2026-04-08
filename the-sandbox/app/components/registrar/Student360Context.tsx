'use client'

import { createContext, useContext } from 'react'

interface Student360ContextValue {
  openStudent360: (studentId: string) => void
}

export const Student360Context = createContext<Student360ContextValue>({
  openStudent360: () => {},
})

export function useStudent360() {
  return useContext(Student360Context)
}
