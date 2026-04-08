import { redirect } from 'next/navigation'

export const revalidate = 3600

export default function AccessibilityCompliancePage() {
  redirect('/ada-tool?tab=dashboard')
}
