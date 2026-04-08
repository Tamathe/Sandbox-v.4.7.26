/**
 * Sandy Universal Agent — Audio Experience Platform Tools
 *
 * 6 tools: play_audio_episode, generate_podcast, start_voice_tutoring,
 * launch_scenario, get_audio_recommendations, suggest_voice_tutoring_mode
 */

import type { ToolModule } from '../agent-types'
import { browseEpisodes, getForYouFeed } from '../../audio/audio-hub-service'
import { suggestVoiceTutoringMode } from '../../audio/voice-session-service'
import { listScenarios } from '../../audio/scenario-service'

export const audioTools: ToolModule = {
  tools: [
    {
      name: 'play_audio_episode',
      description:
        'Search for a podcast episode and return playback details. Use when a user asks to play, find, or listen to a podcast or audio episode.',
      category: 'content',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      reliability: 'navigation',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for the episode title or topic' },
          tag: { type: 'string', description: 'Optional topic tag to filter by' },
        },
        required: [],
      },
    },
    {
      name: 'generate_podcast',
      description:
        'Navigate to the Podcastify flow so the user can create an AI-generated podcast from course material or a document.',
      category: 'content',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      reliability: 'navigation',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'start_voice_tutoring',
      description:
        'Launch a voice tutoring session. Supports 5 modes: socratic (questions to probe understanding), rehearsal (explain-it-back), walkthrough (guided topic tour), assessment (oral exam prep), scenario (interactive roleplay). Navigates to the Audio Hub.',
      category: 'content',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN'],
      reliability: 'navigation',
      input_schema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['socratic', 'rehearsal', 'walkthrough', 'assessment', 'scenario'],
            description: 'Voice tutoring mode to launch',
          },
          courseId: { type: 'string', description: 'Optional course context for the session' },
        },
        required: [],
      },
    },
    {
      name: 'launch_scenario',
      description:
        'Start an interactive scenario (clinical case, interview, debate, or roleplay). If a scenarioId is provided, navigates directly to that scenario. Otherwise returns a list of available scenarios.',
      category: 'content',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN'],
      reliability: 'navigation',
      input_schema: {
        type: 'object',
        properties: {
          scenarioId: { type: 'string', description: 'Specific scenario ID to launch directly' },
          courseId: { type: 'string', description: 'Filter scenarios by course' },
        },
        required: [],
      },
    },
    {
      name: 'get_audio_recommendations',
      description:
        'Get personalized podcast episode recommendations for the current user based on their enrollment and listening history.',
      category: 'content',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      reliability: 'live',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'suggest_voice_tutoring_mode',
      description:
        'Recommend the best voice tutoring mode based on the student\'s current context (upcoming assessment, just finished reading, low quiz scores, new topic).',
      category: 'content',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN'],
      reliability: 'navigation',
      input_schema: {
        type: 'object',
        properties: {
          justFinishedReading: { type: 'boolean', description: 'True if student just completed a reading' },
          assessmentWithin3Days: { type: 'boolean', description: 'True if there is an assessment within 3 days' },
          lowQuizScores: { type: 'boolean', description: 'True if recent quiz scores are low' },
          newTopic: { type: 'boolean', description: 'True if the student is starting a new topic' },
        },
        required: [],
      },
    },
  ],

  handlers: {
    play_audio_episode: async (args) => {
      const query = args.query as string | undefined
      const tag = args.tag as string | undefined
      const result = await browseEpisodes(query, tag, 0, 10)
      return {
        navigateTo: '/audio',
        episodes: result.episodes.slice(0, 5).map((ep) => ({
          id: ep.id,
          title: ep.sourceName,
          durationSecs: ep.durationSecs,
          cdnUrl: ep.cdnUrl,
        })),
        total: result.total,
        message: result.episodes.length
          ? `Found ${result.total} episode(s). Navigate to /audio to play them.`
          : 'No episodes found for that query.',
      }
    },

    generate_podcast: async () => {
      return {
        navigateTo: '/audio',
        action: 'open_podcastify',
        message: 'Navigate to the Audio Hub to create a new podcast from your course material.',
      }
    },

    start_voice_tutoring: async (args) => {
      const mode = args.mode as string | undefined
      const courseId = args.courseId as string | undefined
      return {
        navigateTo: '/audio',
        action: 'start_voice_tutoring',
        mode: mode ?? 'socratic',
        courseId: courseId ?? null,
        message: `Navigate to the Audio Hub to start a ${mode ?? 'socratic'} voice tutoring session.`,
      }
    },

    launch_scenario: async (args) => {
      const scenarioId = args.scenarioId as string | undefined
      const courseId = args.courseId as string | undefined

      if (scenarioId) {
        return {
          navigateTo: `/audio/scenarios/${scenarioId}`,
          message: `Launching scenario. Navigate to /audio/scenarios/${scenarioId}.`,
        }
      }

      const scenarios = await listScenarios({
        published: true,
        ...(courseId ? { courseId } : {}),
      })
      return {
        navigateTo: '/audio/scenarios',
        scenarios: scenarios.slice(0, 10).map((s) => ({
          id: s.id,
          title: s.title,
          templateType: s.templateType,
          description: s.description,
        })),
        total: scenarios.length,
        message: `Found ${scenarios.length} available scenario(s). Navigate to /audio/scenarios to browse.`,
      }
    },

    get_audio_recommendations: async (_args, user) => {
      const feed = await getForYouFeed(user.id)
      const top5 = [
        ...feed.continueListening,
        ...feed.recommended,
        ...feed.trending,
      ].slice(0, 5)
      return {
        recommendations: top5.map((ep) => ({
          id: ep.id,
          title: ep.sourceName,
          durationSecs: ep.durationSecs,
          completedPct: ep.completedPct ?? 0,
        })),
        navigateTo: '/audio',
        message: top5.length
          ? `Here are ${top5.length} recommended episodes for you.`
          : 'No recommendations available yet. Listen to a few episodes to personalize your feed.',
      }
    },

    suggest_voice_tutoring_mode: async (args) => {
      const signals = {
        justFinishedReading: (args.justFinishedReading as boolean | undefined) ?? false,
        assessmentWithin3Days: (args.assessmentWithin3Days as boolean | undefined) ?? false,
        lowQuizScores: (args.lowQuizScores as boolean | undefined) ?? false,
        newTopic: (args.newTopic as boolean | undefined) ?? false,
      }
      const suggestion = suggestVoiceTutoringMode(signals)
      return {
        mode: suggestion.mode,
        reason: suggestion.reason,
        navigateTo: '/audio',
        action: 'start_voice_tutoring',
        message: `Recommended mode: ${suggestion.mode}. ${suggestion.reason}`,
      }
    },
  },
}
