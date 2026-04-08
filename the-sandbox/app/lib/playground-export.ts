import JSZip from 'jszip'

function extractBetween(source: string, pattern: RegExp) {
  const match = source.match(pattern)
  return match?.[1]?.trim() ?? ''
}

function stripRuntimeWrapper(scriptContent: string) {
  return scriptContent
    .replace(/const\s+\{\s*useState,\s*useEffect,\s*useRef,\s*useCallback,\s*useMemo\s*\}\s*=\s*React;\s*/g, '')
    .replace(
      /ReactDOM\.createRoot\(document\.getElementById\('root'\)\)\.render\(<App\s*\/>\);?\s*/g,
      ''
    )
    .trim()
}

export function sanitizeExportName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'my-sandbox-app'
}

export function buildExportReadme() {
  return `# Your App - Built at the University of Kentucky

## Get Started in 5 Steps

1. **Install Node.js** - https://nodejs.org (download the LTS version)
2. **Install VS Code** - https://code.visualstudio.com
3. **Unzip this folder** anywhere on your computer
4. **Open VS Code** - File -> Open Folder -> select the unzipped folder
5. **Open the Terminal** in VS Code (Ctrl+\` on Windows, Cmd+\` on Mac)
   Run: \`npm install\` then \`npm run dev\`
   Your app opens at http://localhost:5173

## Keep Building

- Add a database (free): https://supabase.com
- Deploy your app free: https://vercel.com
- Ask Claude for help: paste your App.jsx and describe what to add next
`
}

export function buildViteProjectFiles(code: string) {
  const rawScript = extractBetween(
    code,
    /<script\s+type=["']text\/babel["'][^>]*>([\s\S]*?)<\/script>/i
  )

  const appBody = stripRuntimeWrapper(rawScript)

  const appSource = `import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

${appBody}

export default App
`

  return {
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox Export</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-white min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`,
    'src/App.jsx': appSource,
    'package.json': JSON.stringify(
      {
        name: 'uky-export',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^19.2.0',
          'react-dom': '^19.2.0',
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.7.0',
          vite: '^7.1.0',
        },
      },
      null,
      2
    ),
    'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`,
    'README.md': buildExportReadme(),
  }
}

export async function buildPlaygroundExportZip(appName: string, code: string) {
  const zip = new JSZip()
  const folder = zip.folder(sanitizeExportName(appName))

  if (!folder) {
    throw new Error('Failed to create export folder')
  }

  const files = buildViteProjectFiles(code)

  for (const [filePath, contents] of Object.entries(files)) {
    folder.file(filePath, contents)
  }

  return zip.generateAsync({ type: 'nodebuffer' })
}
