import { writeFile } from 'fs/promises'
import path from 'path'
import {
  buildArchitectureReport,
  renderArchitectureReportMarkdown,
} from '../app/lib/architecture-report'

async function main() {
  const repoRoot = process.cwd()
  const report = await buildArchitectureReport({ repoRoot })
  const markdown = renderArchitectureReportMarkdown(report, 'legal')
  const outputPath = path.join(repoRoot, 'SYSTEM-INTERDEPENDENCIES.md')

  await writeFile(outputPath, `${markdown.trim()}\n`, 'utf8')

  console.log(`Wrote ${outputPath}`)
}

main().catch((error) => {
  console.error('Failed to export system interdependencies:', error)
  process.exit(1)
})
