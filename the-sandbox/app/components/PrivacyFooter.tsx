import { Lock } from 'lucide-react'

export function PrivacyFooter() {
  return (
    <p className="flex items-center justify-center gap-1.5 py-1 text-xs text-slate-400">
      <Lock size={11} />
      UKY Protected Environment - Data is not used to train external models
    </p>
  )
}
