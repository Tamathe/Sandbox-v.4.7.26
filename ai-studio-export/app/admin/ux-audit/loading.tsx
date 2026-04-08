import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#0033A0]" />
        <p className="text-sm text-slate-500">Loading UX audit runner...</p>
      </div>
    </div>
  )
}
