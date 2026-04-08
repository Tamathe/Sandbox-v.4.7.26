/**
 * team-analyzer-service.ts
 *
 * Sandy-powered team structure analysis. User provides team member info
 * and activity descriptions. Sandy maps functional domains, identifies
 * gaps and overlaps, and proposes restructuring options.
 */

export interface TeamAnalyzerInterviewState {
  phase: 'team-setup' | 'data-intake' | 'analysis' | 'results' | 'exploring'
  teamMembers: string | null
  activityData: string | null
  additionalContext: string | null
}

export interface TeamAnalyzerGenerateRequest {
  preflight: { user: { name: string; role: string; department: string | null } }
  interviewState: TeamAnalyzerInterviewState
  teamData: string
}

export interface TeamAnalyzerInterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: { user: { name: string; role: string; department: string | null } }
  interviewState: TeamAnalyzerInterviewState
}

export function getTeamAnalyzerGeneratePrompt(req: TeamAnalyzerGenerateRequest): string {
  return `You are Sandy, analyzing a university team's actual work activities to map their functional structure.

## User
${req.preflight.user.name} (${req.preflight.user.role}, ${req.preflight.user.department ?? 'University of Kentucky'})

## Team Data Provided
${req.teamData}

${req.interviewState.teamMembers ? `## Team Members\n${req.interviewState.teamMembers}` : ''}
${req.interviewState.additionalContext ? `## Additional Context\n${req.interviewState.additionalContext}` : ''}

## Instructions
Analyze the team's actual work activities and produce a structured analysis. This is NOT about job titles — it's about what the team ACTUALLY does based on the data provided.

Format your response with these exact section headers:

## Functional Domain Map
For each domain the team covers, list:
- Domain name (e.g., "Crisis & Compliance Response")
- Activities that fall under it
- Team members involved
- Estimated capacity (% of team time)

## Gaps & Blind Spots
Areas that are under-resourced, unowned, or at risk if one person leaves.

## Overlaps & Redundancies
Where multiple people duplicate effort or where responsibilities are unclear.

## Restructuring Options

### Option A: [Name]
- Description
- Pros
- Cons

### Option B: [Name]
- Description
- Pros
- Cons

### Option C: [Name]
- Description
- Pros
- Cons

## 30-Day Onboarding Guide
What a new team member would need to know in their first 30 days based on this analysis.

Rules:
- Be specific — reference actual activities and people mentioned in the data
- Don't sugarcoat gaps — if the team is overextended, say so
- Each restructuring option should be genuinely different (not minor variations)
- The onboarding guide should be actionable, not generic
- 800-1200 words total`
}

export function getTeamAnalyzerInterviewPrompt(req: TeamAnalyzerInterviewRequest): string {
  const firstName = req.preflight.user.name.split(' ')[0]
  return `You are Sandy, the AI concierge at the University of Kentucky.
You're helping ${firstName} analyze their team's structure based on actual work activities.

## Current State
Phase: ${req.interviewState.phase}
Team members: ${req.interviewState.teamMembers ? 'provided' : 'not yet'}
Activity data: ${req.interviewState.activityData ? 'provided' : 'not yet'}

## Your Approach
- Keep messages to 2-3 sentences max, then ONE question.
- Be concise. Don't over-explain.
- Every message MUST end with chips: <!--CHIPS:["option1","option2"]-->
- Every message MUST include phase: <!--PHASE:phase-name-->

## Interview Flow
1. TEAM_SETUP: "Who's on your team? List names and official titles."
2. DATA_INTAKE: "Now describe what the team actually does. Paste email categories, meeting topics, project lists — or just describe it."
3. ANALYSIS: Sandy says "Got it — analyzing now." → triggers generation
4. RESULTS: Sandy comments on the analysis, offers to dig deeper
5. EXPLORING: Follow-up questions about the analysis`
}

const CHIPS_REGEX = /<!--CHIPS:(\[.*?\])-->/
const PHASE_REGEX = /<!--PHASE:(\w[\w-]*)-->/

export function extractChips(text: string): string[] {
  const match = CHIPS_REGEX.exec(text)
  if (!match) return []
  try { return JSON.parse(match[1]) as string[] } catch { return [] }
}

export function extractPhase(text: string): string | null {
  const match = PHASE_REGEX.exec(text)
  return match ? match[1] : null
}
