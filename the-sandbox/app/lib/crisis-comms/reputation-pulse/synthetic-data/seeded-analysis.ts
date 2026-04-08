/**
 * Pre-computed analysis results for the 48 synthetic posts.
 *
 * This eliminates the need to call 4 Haiku + 1 Sonnet API on every page load.
 * The results mirror what the AI pipeline would produce for sprout-7day-posts.ts.
 *
 * Also includes Sandy's initial narration so the interview stream can be skipped.
 */

import type {
  SentimentResult,
  ThemeCluster,
  AIDetectionResult,
  CrisisIntelligenceBrief,
} from '../types'

// ── Sentiment Results (all 48 posts) ─────────────────────────────────────

export const SEEDED_SENTIMENT: SentimentResult[] = [
  // --- Positive (18) ---
  { postId: 'sp-001', sentiment: 'positive', confidence: 0.96, reason: 'Enthusiastic praise for Rupp Arena atmosphere and the basketball team.' },
  { postId: 'sp-002', sentiment: 'positive', confidence: 0.94, reason: 'Celebrates a major research publication in a prestigious journal.' },
  { postId: 'sp-003', sentiment: 'positive', confidence: 0.91, reason: 'Genuine praise for a new campus amenity at the library.' },
  { postId: 'sp-004', sentiment: 'positive', confidence: 0.98, reason: 'Emotional celebration of graduate school acceptance; first-generation milestone.' },
  { postId: 'sp-005', sentiment: 'positive', confidence: 0.88, reason: 'Alumni nostalgia and pride in campus improvements.' },
  { postId: 'sp-006', sentiment: 'positive', confidence: 0.97, reason: 'Major fundraising achievement for pediatric cancer research.' },
  { postId: 'sp-007', sentiment: 'positive', confidence: 0.90, reason: 'Celebrates milestone adoption of AI-powered student tools.' },
  { postId: 'sp-008', sentiment: 'positive', confidence: 0.93, reason: 'Major NIH grant announcement for Appalachian cancer research.' },
  { postId: 'sp-009', sentiment: 'positive', confidence: 0.92, reason: 'Genuine appreciation for campus natural beauty.' },
  { postId: 'sp-010', sentiment: 'positive', confidence: 0.89, reason: 'Celebrates athletic success with team pride.' },
  { postId: 'sp-011', sentiment: 'positive', confidence: 0.87, reason: 'Student praising a specific professor and academic quality.' },
  { postId: 'sp-012', sentiment: 'positive', confidence: 0.85, reason: 'Highlights successful alumni mentorship program milestone.' },
  { postId: 'sp-013', sentiment: 'positive', confidence: 0.90, reason: 'Relatable student culture content showing community bonding.' },
  { postId: 'sp-014', sentiment: 'positive', confidence: 0.88, reason: 'Fun community engagement event announcement from academic department.' },
  { postId: 'sp-015', sentiment: 'positive', confidence: 0.93, reason: 'Parent expressing strong positive impression of campus visit.' },
  { postId: 'sp-016', sentiment: 'positive', confidence: 0.86, reason: 'Student recommending a campus performance with genuine enthusiasm.' },
  { postId: 'sp-017', sentiment: 'positive', confidence: 0.95, reason: 'Impressive Match Day medical school placement results.' },
  { postId: 'sp-018', sentiment: 'positive', confidence: 0.94, reason: 'SEC championship victory celebration.' },

  // --- Negative (13 organic + 5 AI-sounding) ---
  { postId: 'sn-001', sentiment: 'negative', confidence: 0.95, reason: 'Frustrated student describing repeated unfair parking tickets.' },
  { postId: 'sn-002', sentiment: 'negative', confidence: 0.93, reason: 'Mocking campus dining food quality with strong negative language.' },
  { postId: 'sn-003', sentiment: 'negative', confidence: 0.97, reason: 'Serious health and safety complaint about recurring dorm mold with asthma risk.' },
  { postId: 'sn-004', sentiment: 'negative', confidence: 0.96, reason: 'Anger about tuition increases affecting working students.' },
  { postId: 'sn-005', sentiment: 'negative', confidence: 0.94, reason: 'Parent frustrated about course availability causing extra semester costs.' },
  { postId: 'sn-006', sentiment: 'negative', confidence: 0.92, reason: 'Safety concern about unlit campus pathways at night.' },
  { postId: 'sn-007', sentiment: 'negative', confidence: 0.91, reason: 'Alumni criticizing fundraising priorities over student advising quality.' },
  { postId: 'sn-008', sentiment: 'negative', confidence: 0.95, reason: 'Data-backed pedestrian safety complaint with incident history.' },
  { postId: 'sn-009', sentiment: 'negative', confidence: 0.97, reason: 'Adjunct faculty highlighting extreme pay disparity with athletics.' },
  { postId: 'sn-010', sentiment: 'negative', confidence: 0.96, reason: 'Environmental concern about teaching garden destruction for parking.' },
  { postId: 'sn-011', sentiment: 'negative', confidence: 0.94, reason: 'Organized labor action by grad workers citing below-living-wage pay.' },
  { postId: 'sn-012', sentiment: 'negative', confidence: 0.93, reason: 'TA describing unsustainable workload and compensation.' },
  { postId: 'sn-013', sentiment: 'negative', confidence: 0.98, reason: 'Accessibility crisis: broken elevator blocking wheelchair access for 6 weeks.' },
  { postId: 'sn-ai-001', sentiment: 'negative', confidence: 0.88, reason: 'Broad criticism of tuition, infrastructure, and accountability.' },
  { postId: 'sn-ai-002', sentiment: 'negative', confidence: 0.86, reason: 'Critiques athletic vs. academic spending priorities.' },
  { postId: 'sn-ai-003', sentiment: 'negative', confidence: 0.84, reason: 'Frames campus safety as pattern of institutional negligence.' },
  { postId: 'sn-ai-004', sentiment: 'negative', confidence: 0.87, reason: 'Taxpayer-framed criticism of administrative spending growth.' },
  { postId: 'sn-ai-005', sentiment: 'negative', confidence: 0.85, reason: 'Calls for infrastructure improvements citing peer institution benchmarks.' },

  // --- Neutral (12) ---
  { postId: 'su-001', sentiment: 'neutral', confidence: 0.92, reason: 'Simple informational question about library hours.' },
  { postId: 'su-002', sentiment: 'neutral', confidence: 0.90, reason: 'Transfer student seeking factual information about credit evaluation.' },
  { postId: 'su-003', sentiment: 'neutral', confidence: 0.94, reason: 'Weather advisory with factual campus closure information.' },
  { postId: 'su-004', sentiment: 'neutral', confidence: 0.88, reason: 'Routine retail announcement about new merchandise.' },
  { postId: 'su-005', sentiment: 'neutral', confidence: 0.86, reason: 'Commuter asking factual question about construction timeline.' },
  { postId: 'su-006', sentiment: 'neutral', confidence: 0.93, reason: 'Library announcing extended hours for finals — informational.' },
  { postId: 'su-007', sentiment: 'neutral', confidence: 0.95, reason: 'Schedule change announcement for spring football game.' },
  { postId: 'su-008', sentiment: 'neutral', confidence: 0.94, reason: 'Parking lot closure notice with alternative directions.' },
  { postId: 'su-009', sentiment: 'neutral', confidence: 0.89, reason: 'Student org event announcement for LSAT prep workshop.' },
  { postId: 'su-010', sentiment: 'neutral', confidence: 0.87, reason: 'Dining services announcing new menu rotation.' },
  { postId: 'su-011', sentiment: 'neutral', confidence: 0.93, reason: 'Transit schedule modification notice.' },
  { postId: 'su-012', sentiment: 'neutral', confidence: 0.91, reason: 'Student weather club sharing a weekly campus forecast.' },
]

// ── Theme Clusters ───────────────────────────────────────────────────────

export const SEEDED_THEMES: ThemeCluster[] = [
  {
    themeId: 'theme-athletics-spirit',
    label: 'Athletics & School Spirit',
    postIds: ['sp-001', 'sp-006', 'sp-010', 'sp-013', 'sp-016', 'sp-018', 'su-007'],
    sentimentBreakdown: { positive: 6, negative: 0, neutral: 1 },
    sampleQuotes: [
      'Rupp Arena was ELECTRIC last night',
      '$1.8 million raised for the Golden Matrix Fund!',
      'This team 🤝 SEC Championship trophy',
    ],
  },
  {
    themeId: 'theme-academic-research',
    label: 'Academic Excellence & Research',
    postIds: ['sp-002', 'sp-007', 'sp-008', 'sp-011', 'sp-014', 'sp-017'],
    sentimentBreakdown: { positive: 6, negative: 0, neutral: 0 },
    sampleQuotes: [
      'Our paper on polymer nanostructures just got accepted in JACS!',
      'UK\'s Markey Cancer Center receives $45M NIH grant',
      '97% of our graduating class matched into their top 3 choices!',
    ],
  },
  {
    themeId: 'theme-campus-community',
    label: 'Campus Life & Community',
    postIds: ['sp-003', 'sp-004', 'sp-005', 'sp-009', 'sp-012', 'sp-015', 'su-001', 'su-002', 'su-004', 'su-009'],
    sentimentBreakdown: { positive: 6, negative: 0, neutral: 4 },
    sampleQuotes: [
      'I JUST GOT INTO UK\'S DNP PROGRAM!! First in my family to go to grad school.',
      'The arboretum in spring is genuinely one of the most beautiful places in Kentucky',
      'Our alumni mentorship program just matched its 5,000th pair',
    ],
  },
  {
    themeId: 'theme-safety-infrastructure',
    label: 'Campus Safety & Infrastructure',
    postIds: ['sn-003', 'sn-006', 'sn-008', 'sn-013', 'sn-ai-003', 'sn-ai-005'],
    sentimentBreakdown: { positive: 0, negative: 6, neutral: 0 },
    sampleQuotes: [
      'Mold. In my dorm. For the FOURTH time this year.',
      'The path between Whitehall and the chemistry building has ZERO lighting',
      'The elevator in Patterson Office Tower has been broken for 6 WEEKS',
    ],
  },
  {
    themeId: 'theme-labor-compensation',
    label: 'Labor & Compensation Equity',
    postIds: ['sn-009', 'sn-011', 'sn-012', 'sn-ai-002'],
    sentimentBreakdown: { positive: 0, negative: 4, neutral: 0 },
    sampleQuotes: [
      'Teaching 4 sections at UK for $12k/semester with no benefits',
      'UK grad workers make 40% below the living wage for Fayette County',
      'Spent my weekend grading 120 essays for $800/month',
    ],
  },
  {
    themeId: 'theme-tuition-admin',
    label: 'Tuition & Administrative Priorities',
    postIds: ['sn-001', 'sn-002', 'sn-004', 'sn-005', 'sn-007', 'sn-010', 'sn-ai-001', 'sn-ai-004'],
    sentimentBreakdown: { positive: 0, negative: 8, neutral: 0 },
    sampleQuotes: [
      'Tuition going up AGAIN next year??? Some of us are already working 3 jobs.',
      'My daughter can\'t get into any of her required classes because UK oversold enrollment AGAIN',
      'UK just paved over the pollinator garden behind the Ag building for MORE parking',
    ],
  },
  {
    themeId: 'theme-logistics-services',
    label: 'Campus Logistics & Services',
    postIds: ['su-003', 'su-005', 'su-006', 'su-008', 'su-010', 'su-011', 'su-012'],
    sentimentBreakdown: { positive: 0, negative: 0, neutral: 7 },
    sampleQuotes: [
      'Ice advisory for Fayette County tonight through 6am',
      'Lot R2 will be closed March 22–24 for repaving',
      'Extended hours begin next week for finals prep',
    ],
  },
]

// ── AI Detection (negative posts only — 18 posts) ───────────────────────

export const SEEDED_AI_DETECTION: AIDetectionResult[] = [
  // --- Organic negative (13 posts) → likely-human ---
  {
    postId: 'sn-001', humanLikelihood: 0.94, aiLikelihood: 0.06, confidence: 'high',
    topSignals: ['authentic frustration markers', 'specific personal detail', 'informal register'],
    explanation: 'Contains specific personal experience (E permit, bush-covered sign, "THIRD" emphasis) with genuine emotional markers typical of organic complaint posts.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-002', humanLikelihood: 0.96, aiLikelihood: 0.04, confidence: 'high',
    topSignals: ['humor and sarcasm', 'platform-native language', 'specific campus reference'],
    explanation: 'Uses characteristic Gen-Z humor ("war crime 💀"), specific dining location reference, and hyperbolic sarcasm consistent with authentic student voice.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-003', humanLikelihood: 0.97, aiLikelihood: 0.03, confidence: 'high',
    topSignals: ['specific location details', 'escalating frustration', 'personal health disclosure'],
    explanation: 'Mentions exact room number (Blanding Tower 614), specific health condition (asthma), and describes multiple failed remediation attempts — highly specific lived experience.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-004', humanLikelihood: 0.95, aiLikelihood: 0.05, confidence: 'high',
    topSignals: ['colloquial language', 'personal stakes', 'emotional authenticity'],
    explanation: 'Uses informal register ("AGAIN???", "fr"), references working 3 jobs — personal economic stakes with authentic voice.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-005', humanLikelihood: 0.93, aiLikelihood: 0.07, confidence: 'high',
    topSignals: ['parental perspective', 'financial specificity', 'direct institution address'],
    explanation: 'Written from a parent\'s perspective with specific financial concern (extra semester) and direct challenge to Board of Trustees — authentic stakeholder voice.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-006', humanLikelihood: 0.94, aiLikelihood: 0.06, confidence: 'high',
    topSignals: ['time-specific detail', 'location specificity', 'direct tagging behavior'],
    explanation: 'Mentions specific time (11pm), exact campus path, number of reports filed, and tags campus police — behavior consistent with genuine safety concern.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-007', humanLikelihood: 0.92, aiLikelihood: 0.08, confidence: 'high',
    topSignals: ['personal relationship context', 'specific criticism pairing', 'authentic frustration'],
    explanation: 'Juxtaposes personal experience (son\'s advisor non-responsive) with fundraising emails — specific, paired grievance typical of authentic alumni complaints.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-008', humanLikelihood: 0.91, aiLikelihood: 0.09, confidence: 'high',
    topSignals: ['data citation', 'organizational voice', 'specific incident reference'],
    explanation: 'References specific data (14 near-misses, third incident), uses organizational voice with direct institutional tagging — consistent with advocacy group communication.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-009', humanLikelihood: 0.95, aiLikelihood: 0.05, confidence: 'high',
    topSignals: ['specific compensation figures', 'emotional contrast', 'personal stakes'],
    explanation: 'Cites exact pay ($12k/semester) and contrasts with coach salary ($8M) — specific numeric details with genuine emotional weight.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-010', humanLikelihood: 0.93, aiLikelihood: 0.07, confidence: 'high',
    topSignals: ['before/after evidence', 'departmental knowledge', 'community impact framing'],
    explanation: 'References specific location (Ag building), attached photo evidence, and knowledge of 3 departments affected — insider knowledge consistent with student voice.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-011', humanLikelihood: 0.90, aiLikelihood: 0.10, confidence: 'high',
    topSignals: ['specific statistics', 'organizational action', 'collective voice'],
    explanation: 'Cites specific figures (40% below living wage, 87% signed cards) and describes concrete labor action — consistent with organized advocacy communications.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-012', humanLikelihood: 0.94, aiLikelihood: 0.06, confidence: 'high',
    topSignals: ['specific workload details', 'emotional authenticity', 'direct address'],
    explanation: 'Mentions exact numbers (120 essays, $800/month) with genuine emotional fatigue — authentic TA experience.',
    verdict: 'likely-human',
  },
  {
    postId: 'sn-013', humanLikelihood: 0.92, aiLikelihood: 0.08, confidence: 'high',
    topSignals: ['specific duration', 'accessibility focus', 'escalation history'],
    explanation: 'References exact duration (6 weeks), specific building and floors (Patterson Office Tower 8-18), lists specific offices contacted — detailed lived experience.',
    verdict: 'likely-human',
  },

  // --- AI-sounding negative posts (5 posts) ---
  {
    postId: 'sn-ai-001', humanLikelihood: 0.15, aiLikelihood: 0.85, confidence: 'high',
    topSignals: ['lexical uniformity', 'hedging patterns', 'formal register mismatch', 'generic framing', 'absence of personal detail'],
    explanation: 'Highly uniform sentence structure, generic "concerned citizen" framing with no personal experience, formal academic register atypical for social media, heavy hedging ("deeply concerning", "fundamental issues", "disproportionately impact") — strong AI authorship signals.',
    verdict: 'likely-ai',
  },
  {
    postId: 'sn-ai-002', humanLikelihood: 0.18, aiLikelihood: 0.82, confidence: 'high',
    topSignals: ['discourse markers', 'balanced hedging', 'formal sentence structure', 'generic statistics framing', 'absence of personal stakes'],
    explanation: 'Uses characteristic AI discourse markers ("it is important to note", "Furthermore", "raises serious questions"), perfectly balanced structure, no personal connection to the university — pattern consistent with AI-generated opinion content.',
    verdict: 'likely-ai',
  },
  {
    postId: 'sn-ai-003', humanLikelihood: 0.20, aiLikelihood: 0.80, confidence: 'high',
    topSignals: ['hedging patterns', 'lexical uniformity', 'generic institutional framing', 'sentence structure variance low', 'no personal experience'],
    explanation: 'Classic hedging ("While many perspectives exist"), references "broader pattern" without specifics, uniform sentence length, generic policy language — no personal campus connection evident.',
    verdict: 'likely-ai',
  },
  {
    postId: 'sn-ai-004', humanLikelihood: 0.22, aiLikelihood: 0.78, confidence: 'medium',
    topSignals: ['formal register', 'statistical framing without source', 'discourse markers', 'policy language', 'institutional critique template'],
    explanation: 'Cites a specific statistic (23% increase) without source — possible human research or fabricated AI stat. Heavy formal register ("It is imperative", "comprehensive review") but slightly more specific than typical AI output. Moderate-high confidence.',
    verdict: 'likely-ai',
  },
  {
    postId: 'sn-ai-005', humanLikelihood: 0.12, aiLikelihood: 0.88, confidence: 'high',
    topSignals: ['lexical uniformity', 'evidence-based language', 'formal policy recommendation', 'no personal identity', 'peer institution comparison template'],
    explanation: 'Nearly perfect formal writing with policy-recommendation structure, references "evidence-based" solutions and "peer institutions" without naming them, 7-day-old account with 4 total posts — strongest AI authorship signals in the dataset.',
    verdict: 'likely-ai',
  },
]

// ── Crisis Intelligence Brief ────────────────────────────────────────────

export const SEEDED_BRIEF: CrisisIntelligenceBrief = {
  analysisTimestamp: '2026-03-25T14:30:00.000Z',
  postCount: 48,
  timelineWindow: 'Mar 18 – Mar 25, 2026',

  threatLevel: 'MODERATE',
  threatRationale: 'Multiple converging negative narratives around labor equity (grad worker petition with 87% sign rate), campus safety (pedestrian incidents, lighting gaps, elevator outage), and housing conditions (mold). Five likely AI-generated posts amplify tuition/safety themes but have low engagement. The grad worker unionization effort and accessibility violations carry the highest reputational risk due to potential media pickup and legal exposure.',

  sentimentDistribution: {
    positive: { count: 18, percentage: 38 },
    negative: { count: 18, percentage: 38 },
    neutral: { count: 12, percentage: 25 },
  },

  aiAuthorshipBreakdown: {
    likelyHuman: { count: 13, percentage: 72 },
    inconclusive: { count: 0, percentage: 0 },
    likelyAI: { count: 5, percentage: 28 },
  },

  themes: SEEDED_THEMES,

  pipelineFunnel: {
    totalPosts: 48,
    negativePosts: 18,
    aiFlaggedPosts: 5,
  },

  spreadAnalysis: {
    peakHour: 44, // ~day 2 around 4pm — tuition anger post
    velocityTrend: 'steady',
    platformBreakdown: {
      twitter: 30,
      reddit: 4,
      facebook: 4,
      instagram: 5,
      tiktok: 1,
      'news-comment': 0,
    },
  },

  responsePosture: 'engage',
  responseRationale: 'The grad worker unionization petition and accessibility elevator outage require proactive institutional response. Both topics have high organic engagement and potential for escalation to local/national media. The AI-generated posts can be monitored but do not require direct engagement due to low follower counts and engagement. Positive sentiment (38%) around athletics, research, and DanceBlue provides a strong foundation for narrative balance.',

  suggestedActions: [
    'Issue a public statement acknowledging the Patterson Office Tower elevator outage with a repair timeline and interim accommodations for wheelchair users.',
    'Prepare a proactive media holding statement on the grad worker union petition — emphasize ongoing dialogue and commitment to competitive compensation.',
    'Coordinate with Facilities Management to address the Blanding Tower mold reports and provide a student-facing update.',
    'Brief the Provost on the pedestrian safety data from Winslow St and initiate a joint review with Lexington city transportation.',
    'Monitor the 5 AI-flagged accounts for coordinated amplification patterns over the next 72 hours.',
  ],

  evidenceGaps: [
    'No direct confirmation on whether the 23% administrative spending increase cited in sn-ai-004 is accurate — verify against public budget data.',
    'The grad worker petition claims 87% signed cards — independent verification of unit size and card count not available from social media alone.',
    'Mold complaint severity unclear — no photos attached, no health department report referenced.',
    'Pedestrian incident data (14 near-misses) cited by @LexSafeStreets not independently verified.',
    'Unknown whether the 5 AI-flagged accounts are coordinated (same operator) or independent.',
  ],

  confidence: 'medium',
}

// ── Sandy's Initial Narration ────────────────────────────────────────────
// Pre-written so the hook can skip the Haiku streaming call on initial load.
// Includes CHIPS and PHASE markers the hook expects.

export function getSeededNarration(firstName: string): string {
  return `Here's what I found in the past 7 days, ${firstName}.

**The headline:** 48 posts analyzed, and the overall threat level is **MODERATE**. Sentiment is split almost evenly — 18 positive, 18 negative, 12 neutral — which means UK isn't in crisis, but there are real issues gaining traction that need attention.

**What deserves immediate attention:**

1. **Grad worker unionization** — This is the biggest story. The petition has 87% card signatures and the posts around it are getting serious organic engagement (1,800+ likes, 600+ shares). This has legs for media pickup.

2. **Accessibility failure** — The Patterson Office Tower elevator has been broken for 6 weeks, blocking wheelchair access to floors 8-18. This is a compliance risk, not just a PR problem.

3. **Campus safety** — Three pedestrian incidents on Winslow St this semester, plus unlit pathways reported near Whitehall. The safety coalition is citing data.

**What's noise you can ignore:** I flagged 5 of the 18 negative posts as likely AI-generated — new accounts, formal language, no personal connection to UK. They're amplifying the tuition and safety themes but getting almost zero engagement. Not worth direct response.

**The good news:** DanceBlue raised $1.8M, Markey Cancer Center landed a $45M NIH grant, and Match Day had a 97% top-3 placement rate. You have strong positive narratives to lean into.

<!--CHIPS:["Show AI-flagged posts","Walk me through themes","Draft a holding statement","What can we ignore?","Explain threat level"]-->
<!--PHASE:deep-dive-->`
}
