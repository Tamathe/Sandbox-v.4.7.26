import React from 'react'
import { Loader2 } from 'lucide-react'

const sizeClasses = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
} as const

interface LoadingSpinnerProps {
  size?: keyof typeof sizeClasses
  className?: string
  label?: string
}

export default function LoadingSpinner({
  size = 'md',
  className = '',
  label,
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-[#0033A0]`} />
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  )
}
