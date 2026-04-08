// Run once with: npx ts-node scripts/generate-voice-previews.ts
// Requires OPENAI_API_KEY in environment
// Outputs: public/sounds/voice-previews/{voice}.mp3

import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const
const PREVIEW_TEXT = 'Welcome. I am your AI learning companion, ready to help you explore and discover.'
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'sounds', 'voice-previews')

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  for (const voice of VOICES) {
    console.log(`Generating ${voice}...`)
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: PREVIEW_TEXT,
    })
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(path.join(OUTPUT_DIR, `${voice}.mp3`), buffer)
    console.log(`  ✓ ${voice}.mp3`)
  }
  console.log('Done.')
}

main().catch(console.error)
