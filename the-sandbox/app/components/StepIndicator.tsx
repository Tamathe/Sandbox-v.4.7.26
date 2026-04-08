'use client'

interface StepIndicatorProps {
  stepCount: number
  currentStep: number
}

export default function StepIndicator({ stepCount, currentStep }: StepIndicatorProps) {
  if (stepCount <= 1) return null

  return (
    <div className="flex items-center gap-1.5 justify-center py-1">
      {Array.from({ length: stepCount }, (_, i) => (
        <div
          key={i}
          className={`size-1.5 rounded-full transition-colors ${
            i <= currentStep ? 'bg-[#0033A0]' : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  )
}
