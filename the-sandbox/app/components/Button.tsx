'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

const variantClasses = {
  primary:
    'bg-[#0033A0] text-white hover:opacity-90',
  secondary:
    'border border-gray-300 bg-white text-gray-700 hover:border-[#0033A0] hover:text-[#0033A0] hover:bg-blue-50',
  ghost:
    'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  danger:
    'bg-red-600 text-white hover:bg-red-700',
} as const

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
} as const

const iconSizes = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' } as const

export type ButtonVariant = keyof typeof variantClasses
export type ButtonSize = keyof typeof sizeClasses

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : icon ? (
        <span className={iconSizes[size]}>{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
