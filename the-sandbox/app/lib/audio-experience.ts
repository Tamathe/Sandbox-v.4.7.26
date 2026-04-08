export const OPENAI_AUDIO_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const

export type OpenAIAudioVoice = (typeof OPENAI_AUDIO_VOICES)[number]

export type AudioEngine = 'openai' | 'azure' | 'webspeech'

export interface ToolAudioConfig {
  audioEnabled: boolean
  audioPersonaName: string | null
  audioEngine: string
  audioVoiceName: string | null
  audioSpeakingStyle: string | null
  audioSpeed: number
  audioSystemSuffix: string | null
  audioBackgroundTrack: string | null
}

export interface AudioPersonaPreset {
  id: string
  label: string
  description: string
  audioPersonaName: string
  audioVoiceName: OpenAIAudioVoice
  audioSpeed: number
  audioSystemSuffix: string
  audioBackgroundTrack: string | null
}

export interface AudioPlayerPersona {
  toolId: string
  toolName: string
  personaName: string
  voiceName: string
  speed: number
  backgroundTrack: string | null
  artworkUrl: string | null
}

export const AUDIO_PERSONA_PRESETS: AudioPersonaPreset[] = [
  {
    id: 'debate-partner',
    label: 'Debate Partner',
    description: 'Punchy rebuttals that challenge the learner without turning into a lecture.',
    audioPersonaName: 'Debate Partner',
    audioVoiceName: 'onyx',
    audioSpeed: 1,
    audioSystemSuffix:
      'You are in audio mode. Keep responses under 3 sentences. Use no markdown, no bullet lists, and no headers. Speak conversationally, challenge the learner directly, and leave a natural pause between points.',
    audioBackgroundTrack: null,
  },
  {
    id: 'language-coach',
    label: 'Language Coach',
    description: 'Warm, patient coaching with one correction at a time.',
    audioPersonaName: 'Language Coach',
    audioVoiceName: 'nova',
    audioSpeed: 0.95,
    audioSystemSuffix:
      'You are in audio mode. Keep responses under 3 short sentences. Use no markdown, no bullet lists, and no headers. Correct gently, give one example at a time, and speak like a live tutor.',
    audioBackgroundTrack: null,
  },
  {
    id: 'mindfulness-guide',
    label: 'Mindfulness Guide',
    description: 'Calm, affirming prompts for reflection, breathing, and reset moments.',
    audioPersonaName: 'Mindfulness Guide',
    audioVoiceName: 'shimmer',
    audioSpeed: 0.85,
    audioSystemSuffix:
      'You are in audio mode. Keep responses under 3 sentences. Use no markdown, no bullet lists, and no headers. Speak slowly, calmly, and affirmingly, using brief natural pauses.',
    audioBackgroundTrack: null,
  },
  {
    id: 'study-buddy',
    label: 'Study Buddy',
    description: 'Friendly, collaborative encouragement that keeps the learner moving.',
    audioPersonaName: 'Study Buddy',
    audioVoiceName: 'alloy',
    audioSpeed: 1,
    audioSystemSuffix:
      'You are in audio mode. Keep responses under 3 sentences. Use no markdown, no bullet lists, and no headers. Speak conversationally, use we language, and keep the student motivated.',
    audioBackgroundTrack: null,
  },
  {
    id: 'news-anchor',
    label: 'News Anchor',
    description: 'Clear and formal briefings with a crisp, structured delivery.',
    audioPersonaName: 'News Anchor',
    audioVoiceName: 'echo',
    audioSpeed: 1,
    audioSystemSuffix:
      'You are in audio mode. Keep responses under 3 sentences. Use no markdown, no bullet lists, and no headers. Speak clearly, formally, and concisely as if delivering a broadcast.',
    audioBackgroundTrack: null,
  },
]

export const AUDIO_BACKGROUND_TRACK_OPTIONS = [
  { value: '', label: 'None' },
  { value: '/sounds/white-noise.wav', label: 'White noise' },
] as const

export const VOICE_DESCRIPTORS: Record<OpenAIAudioVoice, { label: string; description: string; bestFor: string }> = {
  alloy:   { label: 'Alloy',   description: 'Clear and neutral',       bestFor: 'General tutoring, study tools' },
  echo:    { label: 'Echo',    description: 'Warm and conversational',  bestFor: 'Coaching, feedback tools' },
  fable:   { label: 'Fable',   description: 'Expressive and dynamic',   bestFor: 'Storytelling, creative tools' },
  onyx:    { label: 'Onyx',    description: 'Deep and authoritative',   bestFor: 'Dramatic roles, debate, Hamlet' },
  nova:    { label: 'Nova',    description: 'Bright and encouraging',   bestFor: 'Language learning, quizzes' },
  shimmer: { label: 'Shimmer', description: 'Calm and measured',        bestFor: 'Mindfulness, reflection tools' },
}

export const SIMULATION_SYSTEM_SUFFIX = `

FORMATTING RULES — always follow these:
- Always prefix your response with the speaking character's name in bold caps followed by a colon and space: **CHARACTER NAME:** then their dialogue
- Stay strictly in character. Never break the fourth wall or refer to yourself as an AI.
- When a scene transitions, add a brief italicized stage direction on its own line: *[Scene: The castle ramparts, midnight]*
- Never speak as multiple characters in a single response.
- If the user goes off-script, respond in character with how that character would realistically react.`

export interface PodcastHostPair {
  id: string
  label: string
  voiceA: string  // Azure Neural voice name for Host A
  voiceB: string  // Azure Neural voice name for Host B
}

export const AZURE_PODCAST_VOICE_PAIRS: PodcastHostPair[] = [
  { id: 'alex-sam-default', label: 'Alex & Sam (Default)', voiceA: 'en-US-AndrewMultilingualNeural', voiceB: 'en-US-AvaMultilingualNeural' },
  { id: 'morgan-jordan', label: 'Morgan & Jordan', voiceA: 'en-US-BrianMultilingualNeural', voiceB: 'en-US-EmmaMultilingualNeural' },
]

export function getAudioPresetById(id: string | null | undefined) {
  if (!id) return null
  return AUDIO_PERSONA_PRESETS.find((preset) => preset.id === id) ?? null
}

export function sanitizeSpeechText(input: string) {
  return input
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[`*_>#~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SENTENCE_BOUNDARY_REGEX =
  /([.!?]["')\]]?)(?=(?:\s+[A-Z0-9"'])|$)/g

const COMMON_ABBREVIATIONS = new Set([
  'dr.',
  'mr.',
  'mrs.',
  'ms.',
  'prof.',
  'sr.',
  'jr.',
  'vs.',
  'etc.',
  'e.g.',
  'i.e.',
  'u.s.',
  'u.k.',
])

export function extractCompleteSentences(input: string, isFinal = false) {
  const sentences: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  // Reset stateful regex lastIndex (g-flag persists between exec calls)
  SENTENCE_BOUNDARY_REGEX.lastIndex = 0

  while ((match = SENTENCE_BOUNDARY_REGEX.exec(input)) !== null) {
    const endIndex = match.index + match[0].length
    const candidate = input.slice(lastIndex, endIndex).trim()
    const lastWord = candidate.split(/\s+/).at(-1)?.toLowerCase() ?? ''
    const singleInitial = /^[A-Z]\.$/.test(candidate.split(/\s+/).at(-1) ?? '')

    if (COMMON_ABBREVIATIONS.has(lastWord) || singleInitial) {
      continue
    }

    if (candidate) {
      sentences.push(candidate)
    }
    lastIndex = endIndex
  }

  const remainder = input.slice(lastIndex).trimStart()

  if (isFinal && remainder.trim()) {
    sentences.push(remainder.trim())
    return { sentences, remainder: '' }
  }

  return { sentences, remainder }
}
