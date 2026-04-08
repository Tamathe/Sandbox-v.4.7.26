import { promises as fs } from 'fs'
import path from 'path'
import UxAuditRunner from '../../components/admin/UxAuditRunner'
import { parseUxAuditMarkdown } from '../../lib/ux-audit'

async function loadAuditSections() {
  const scriptPath = path.join(process.cwd(), '..', 'ux-audit-script.md')
  const markdown = await fs.readFile(scriptPath, 'utf8')
  return parseUxAuditMarkdown(markdown)
}

export default async function UxAuditPage() {
  const sections = await loadAuditSections()
  return <UxAuditRunner sections={sections} />
}
