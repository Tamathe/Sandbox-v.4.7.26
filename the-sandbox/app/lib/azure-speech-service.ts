export interface SsmlTurn {
  voiceName: string
  text: string
}

/**
 * Escapes text for safe inclusion in SSML XML content.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Synthesizes a multi-voice podcast using Azure Cognitive Services TTS.
 * Accepts an ordered list of SSML turns (each with a voice name and text),
 * posts a single SSML document to Azure, and returns the raw MP3 buffer.
 *
 * Required env vars: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
 */
export async function synthesizeMultiVoiceAudio(turns: SsmlTurn[]): Promise<Buffer> {
  const speechKey = process.env.AZURE_SPEECH_KEY
  const speechRegion = process.env.AZURE_SPEECH_REGION

  if (!speechKey) throw new Error('[azure-speech] Missing env var: AZURE_SPEECH_KEY')
  if (!speechRegion) throw new Error('[azure-speech] Missing env var: AZURE_SPEECH_REGION')

  const voiceElements = turns
    .map(({ voiceName, text }) => `  <voice name="${voiceName}">${escapeXml(text)}</voice>`)
    .join('\n')

  const ssml = [
    '<speak version="1.0"',
    '  xmlns="http://www.w3.org/2001/10/synthesis"',
    '  xml:lang="en-US">',
    voiceElements,
    '</speak>',
  ].join('\n')

  const endpoint = `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': speechKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3',
      'User-Agent': 'TheSandbox/1.0',
    },
    body: ssml,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(
      `[azure-speech] TTS request failed: HTTP ${response.status} — ${errText.slice(0, 200)}`,
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
