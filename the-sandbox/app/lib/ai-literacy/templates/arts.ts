import type { AssignmentTemplateData } from './types'

export const ARTS_ASSIGNMENTS: AssignmentTemplateData[] = [
  // ─── FOUNDATION tier (aiLevel: PROHIBIT) ────────────────────────────

  {
    disciplineFamily: 'ARTS',
    title: 'Live Performance or Critique',
    description:
      'Present your original creative work to peers in a live setting—a dance performance, exhibition walkthrough, or studio critique—and explain the choices behind it. Respond to at least 3 audience questions in real time, articulating and defending creative decisions no AI tool can replicate.',
    assignmentType: 'PRESENTATION',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'Present your original creative work in 8-12 minutes and answer at least 3 peer/instructor questions live. No AI-generated scripts, talking points, or presentation aids are permitted. Grading weighs artistic rationale, critical engagement with feedback, and Q&A depth.',
    rubricRows: [
      {
        criterion: 'Artistic Rationale',
        excellent: 'Articulates clear, specific reasons for every major creative decision; connects choices to broader artistic influences or conceptual goals.',
        proficient: 'Explains most creative decisions clearly; connections to larger artistic intentions are present but occasionally vague.',
        developing: 'Provides general explanations for some choices but struggles to articulate why specific decisions were made.',
        insufficient: 'Cannot explain creative decisions beyond surface-level descriptions of what was done.',
      },
      {
        criterion: 'Responsiveness to Questions',
        excellent: 'Answers all 3+ questions with thoughtful, specific responses that demonstrate deep engagement with the work and its context.',
        proficient: 'Answers questions adequately; responses show genuine understanding but occasionally lack depth.',
        developing: 'Answers are superficial or deflective; difficulty engaging with critical perspectives.',
        insufficient: 'Unable to respond meaningfully to questions; relies on vague or irrelevant answers.',
      },
      {
        criterion: 'Presentation Presence & Clarity',
        excellent: 'Confident, well-organized delivery; engages audience effectively; pacing and structure are polished.',
        proficient: 'Generally clear delivery with minor organizational gaps; audience remains engaged.',
        developing: 'Delivery is disorganized or rushed; audience engagement is inconsistent.',
        insufficient: 'Presentation lacks structure; inaudible, unclear, or significantly under time.',
      },
      {
        criterion: 'Creative Agency',
        excellent: 'Demonstrates unmistakable personal voice; every element reflects deliberate, independent creative judgment.',
        proficient: 'Personal voice is evident; most elements reflect intentional creative choices.',
        developing: 'Some evidence of personal voice, but work feels derivative or choices seem arbitrary.',
        insufficient: 'No discernible personal creative perspective; work appears assembled without intentionality.',
      },
    ],
    implementationNotes:
      'Schedule presentations across multiple class sessions to avoid marathon critique days—4-5 per 75-minute session works well. Assign audience members specific roles (one asks about process, one about context, one about alternatives) to ensure substantive Q&A. Record sessions with student consent so they can self-assess later.',
    documentationTemplate: null,
    tags: ['performance', 'critique', 'studio-critique', 'choreography', 'creative-voice', 'live-assessment'],
  },

  {
    disciplineFamily: 'ARTS',
    title: 'Sketchbook/Practice Journal',
    description:
      'Maintain a daily creative practice journal over 3-4 weeks: hand-drawn figure studies, musical scale exercises in all 12 keys, movement notation for a phrase you are developing, or material experiments with printmaking inks. Entries must show physical evidence of process—erased lines, revised passages, margin notes—that no AI generation can replicate. Assessment rewards consistency, growth, and authentic creative exploration over polish.',
    assignmentType: 'PORTFOLIO',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'Complete a minimum of 20 dated, hand-made entries (at least 15 minutes each) in a physical journal—drawing, instrumental practice, choreographic notation, or material experimentation. Digital entries, printouts, and AI-generated content are not accepted. Journals are collected twice for review; grading rewards consistency, visible experimentation, and growth over time—not polish.',
    rubricRows: [
      {
        criterion: 'Consistency & Volume',
        excellent: '20+ dated entries with evidence of sustained, regular practice throughout the period; no clustering.',
        proficient: '16-19 entries with generally consistent pacing; minor gaps.',
        developing: '10-15 entries with uneven distribution; evidence of cramming near due dates.',
        insufficient: 'Fewer than 10 entries or entries appear fabricated in a single session.',
      },
      {
        criterion: 'Evidence of Process',
        excellent: 'Journal shows rich physical evidence of experimentation—erasures, revisions, annotations, multiple attempts, material tests.',
        proficient: 'Clear evidence of working through problems; some annotations and revisions visible.',
        developing: 'Entries appear as finished products rather than working process; minimal revision evidence.',
        insufficient: 'Entries are too clean or uniform to reflect genuine practice; no evidence of struggle or iteration.',
      },
      {
        criterion: 'Creative Exploration & Risk-Taking',
        excellent: 'Entries show deliberate experimentation with new techniques, materials, or approaches; comfort zone is consistently pushed.',
        proficient: 'Some experimentation evident; student tries new approaches in several entries.',
        developing: 'Most entries repeat familiar approaches with little variation.',
        insufficient: 'No evidence of exploration; entries are repetitive and formulaic.',
      },
      {
        criterion: 'Growth Over Time',
        excellent: 'Clear progression in skill, complexity, or conceptual depth from first to last entry; student can articulate what changed.',
        proficient: 'Noticeable improvement in at least one dimension across the journal period.',
        developing: 'Minimal growth; later entries are not substantially different from early ones.',
        insufficient: 'No discernible development; quality or engagement declines over time.',
      },
    ],
    implementationNotes:
      'Provide identical blank journals or specify an approved format so you can verify physical authenticity. Do a brief mid-period check-in where students show journals in class to prevent last-minute fabrication. Emphasize from day one that messy, exploratory entries score higher than polished ones—students trained in portfolio culture need explicit permission to be rough.',
    documentationTemplate: null,
    tags: ['sketchbook', 'daily-practice', 'figure-drawing', 'printmaking', 'movement-notation', 'physical-evidence'],
  },

  {
    disciplineFamily: 'ARTS',
    title: 'In-Studio Improvisation',
    description:
      'Respond to a creative prompt in real time within a controlled studio, rehearsal, or workshop space—sculpt with found materials, improvise a 2-minute movement phrase, or compose a melodic response on your instrument. You have a fixed window (20-45 minutes depending on medium) to generate original work. Assessment focuses on creative thinking under constraint, risk-taking, and commitment to decisions without external assistance.',
    assignmentType: 'EXAM',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'Receive a creative prompt and respond with original work using only studio-provided materials within the designated time window. No personal devices, reference images, AI tools, or pre-prepared materials are permitted. Assessment is based on creative problem-solving, risk-taking, and coherence of choices—not technical polish. This baseline of independent creative thinking will be referenced in later assignments.',
    rubricRows: [
      {
        criterion: 'Creative Problem-Solving',
        excellent: 'Response to the prompt is inventive and unexpected; student transforms constraints into creative opportunities.',
        proficient: 'Response addresses the prompt thoughtfully with some original interpretation of the constraints.',
        developing: 'Response is literal or predictable; minimal creative interpretation of the prompt.',
        insufficient: 'Response does not meaningfully engage with the prompt or constraints.',
      },
      {
        criterion: 'Risk-Taking & Commitment',
        excellent: 'Student makes bold choices and commits fully; willingness to fail productively is evident.',
        proficient: 'Student takes some risks and generally follows through on decisions.',
        developing: 'Student plays it safe; choices are cautious and conventional.',
        insufficient: 'Student appears paralyzed by the constraints; work is minimal or abandoned.',
      },
      {
        criterion: 'Coherence Under Constraint',
        excellent: 'Final piece has internal logic and intentionality despite time pressure; choices build on each other.',
        proficient: 'Most choices feel intentional; some elements are underdeveloped but the overall direction is clear.',
        developing: 'Work feels scattered; individual moments may work but do not cohere into a unified response.',
        insufficient: 'No discernible coherence; work appears random or unfinished to the point of unreadability.',
      },
    ],
    implementationNotes:
      'Write prompts that are specific enough to provide structure but open enough to allow divergent responses—"Create a 2-minute movement phrase that begins and ends in stillness" rather than "dance something." Have all materials pre-staged so no time is lost on logistics. For large classes, run sessions in groups of 8-12 to maintain an intimate, low-pressure atmosphere.',
    documentationTemplate: null,
    tags: ['improvisation', 'studio', 'sculpture', 'music-composition', 'timed', 'creative-thinking'],
  },

  // ─── AWARENESS tier (aiLevel: CAUTIOUS) ─────────────────────────────

  {
    disciplineFamily: 'ARTS',
    title: 'Art Historical Research Paper',
    description:
      'Write a 2,000-2,500 word research paper situating an artist, movement, or specific work within its historical and cultural context—for example, analyzing Kara Walker\'s silhouettes within the tradition of American history painting, or tracing minimalism\'s influence on contemporary set design. Use AI tools to locate sources and summarize background, but all analysis, argument, and interpretive claims must be your own. Disclose any AI assistance and distinguish between AI-gathered facts and original interpretation.',
    assignmentType: 'ESSAY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Write a 2,000-2,500 word essay on an approved artist, movement, or work; engage with at least 5 scholarly sources. AI may assist with source discovery and factual summaries, but all analysis and interpretive claims must be your own. Disclose every instance of AI use via the documentation template appendix; undisclosed AI-generated analysis is an academic integrity violation.',
    rubricRows: [
      {
        criterion: 'Original Analysis & Argument',
        excellent: 'Thesis is original, specific, and well-supported; analysis reveals genuine insight into the work\'s significance that goes beyond what AI summaries provide.',
        proficient: 'Clear thesis with solid supporting analysis; argument is coherent though not groundbreaking.',
        developing: 'Thesis is vague or derivative; analysis stays at the level of general observation.',
        insufficient: 'No discernible thesis; paper reads as a summary rather than an argument.',
      },
      {
        criterion: 'Source Engagement & Scholarship',
        excellent: 'Engages critically with 5+ scholarly sources; synthesizes perspectives rather than quoting in isolation.',
        proficient: 'Uses required sources appropriately; some synthesis across sources.',
        developing: 'Sources are present but used superficially or in isolation; limited synthesis.',
        insufficient: 'Fewer than required sources; sources are non-scholarly or not meaningfully integrated.',
      },
      {
        criterion: 'AI Usage Transparency',
        excellent: 'Documentation clearly distinguishes AI-assisted research from original work; student reflects on how AI shaped their process.',
        proficient: 'AI usage is documented adequately; distinction between AI-gathered and original content is clear.',
        developing: 'Documentation is incomplete or vague about what AI contributed.',
        insufficient: 'No documentation provided despite apparent AI usage; or undisclosed AI-generated analysis.',
      },
      {
        criterion: 'Writing Quality & Artistic Voice',
        excellent: 'Prose is precise, engaging, and demonstrates command of art-historical vocabulary; writer\'s perspective is vivid.',
        proficient: 'Writing is clear and competent; appropriate use of terminology.',
        developing: 'Writing is functional but lacks precision or art-historical register.',
        insufficient: 'Writing is unclear, disorganized, or reads as AI-generated boilerplate.',
      },
    ],
    implementationNotes:
      'Require a topic proposal and annotated bibliography at the midpoint so you can catch over-reliance on AI-generated research early. In class, run a "source audit" exercise where students explain verbally why they chose 2 of their sources—this reveals whether they actually read them. Provide the documentation template on the first day so students know the expectation from the start.',
    documentationTemplate:
      '## AI Usage Documentation — Art Historical Research Paper\n\n**AI Tool(s) Used:** [e.g., ChatGPT, Perplexity, Consensus]\n**Purpose of Use:** [e.g., locating sources, summarizing artist biography, finding exhibition dates]\n\n### AI-Assisted Research\nFor each instance of AI use, document:\n- **Prompt given to AI:** [exact prompt]\n- **Information obtained:** [what the AI provided]\n- **How you verified it:** [cross-reference with scholarly source]\n- **Where it appears in your paper:** [section/paragraph]\n\n### Original Analysis Declaration\nThe following sections contain entirely my own analysis and interpretation:\n- [List sections]\n\n### Reflection\nHow did AI assistance shape your research process? What would you have done differently without it? (3-5 sentences)',
    tags: ['art-history', 'research', 'set-design', 'visual-culture', 'source-analysis', 'ai-disclosure'],
  },

  {
    disciplineFamily: 'ARTS',
    title: 'Design Iteration with AI Mood Board',
    description:
      'Use Midjourney, DALL-E, or Stable Diffusion to generate 8-12 reference images as a mood board for an original design project—a poster series, textile pattern, or stage set concept. Document every AI prompt and explain how each reference informed your design decisions without replacing them. Deliver your original work plus a process document showing the journey from AI inspiration to human creation.',
    assignmentType: 'PROJECT',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Generate a mood board of 8-12 AI reference images using approved tools (DALL-E, Midjourney, or equivalent) as a starting point for original design work. Document every prompt and submit the full mood board alongside your final piece. Write a 500-750 word process document explaining how each reference informed your design and where you departed from AI suggestions. Submitting AI-generated images as finished work results in a zero.',
    rubricRows: [
      {
        criterion: 'Design Originality & Transformation',
        excellent: 'Final design is clearly original; AI references are visibly transformed through the student\'s personal aesthetic and technical skills.',
        proficient: 'Design shows clear evolution from AI references; student\'s voice is evident in the final work.',
        developing: 'Design stays close to AI references with minimal personal transformation.',
        insufficient: 'Design is essentially a recreation of AI-generated images; no meaningful transformation.',
      },
      {
        criterion: 'Process Documentation Quality',
        excellent: 'Every AI prompt is recorded; the journey from reference to final design is meticulously documented with specific, insightful annotations.',
        proficient: 'Most prompts documented; process narrative clearly connects references to design choices.',
        developing: 'Documentation is incomplete or vague about how AI references influenced specific decisions.',
        insufficient: 'Documentation is missing or does not connect AI references to the final design.',
      },
      {
        criterion: 'Material/Medium Mastery',
        excellent: 'Final design demonstrates strong command of chosen medium; technical quality supports and enhances the concept in ways AI generation cannot.',
        proficient: 'Competent execution; technical skills are adequate to realize the design intent.',
        developing: 'Technical limitations undermine the design concept; execution does not surpass AI output quality.',
        insufficient: 'Execution is poor or incomplete; design intent is unclear.',
      },
      {
        criterion: 'Curatorial Judgment',
        excellent: 'Mood board selections are purposeful and diverse; student articulates precisely what AI contributed (palette, composition, texture) versus what required personal meaning and cultural nuance.',
        proficient: 'Selections show intentional curation; reflection distinguishes AI contributions from personal ones.',
        developing: 'Selections appear arbitrary; reflection is generic about where human judgment diverged from AI.',
        insufficient: 'No curatorial logic; mood board is a random dump of AI outputs with no meaningful reflection.',
      },
    ],
    implementationNotes:
      'Demonstrate AI mood board creation in class so all students start from the same baseline of tool literacy. Set clear boundaries about which AI tools are approved and provide accounts if needed—equity of access matters. Schedule a mid-project desk critique where students present mood boards alongside early design sketches, which prevents last-minute AI-to-final-product shortcuts.',
    documentationTemplate:
      '## AI Mood Board Documentation\n\n**AI Tool(s) Used:** [tool name and version]\n**Number of Images Generated:** [total attempts, not just final selections]\n\n### Mood Board Images\nFor each AI-generated reference image included in your mood board:\n- **Prompt used:** [exact text]\n- **Why selected:** [what quality, color, composition, or concept attracted you]\n- **How it influenced your design:** [specific design decision it informed]\n- **Where you departed from it:** [what you changed and why]\n\n### Design Evolution Summary\nDescribe in 500-750 words how your design evolved from the AI mood board to the final piece. Be specific about moments where you followed AI inspiration and moments where you deliberately chose a different direction.',
    tags: ['mood-board', 'graphic-design', 'textile-design', 'set-design', 'ai-imagery', 'iteration'],
  },

  {
    disciplineFamily: 'ARTS',
    title: 'Composition Analysis with AI Comparison',
    description:
      'Perform an independent close analysis of a specific composition—a Coltrane solo, a Rothko canvas, or a scene from a Sondheim musical—then prompt an AI to analyze the same work. Submit both analyses alongside a comparative essay identifying what the AI captured accurately, what it missed (embodied rhythm, brushwork texture, dramatic pacing), and what this reveals about the limits of computational analysis in the arts.',
    assignmentType: 'ESSAY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Write your own 800-1,000 word close analysis of an assigned composition first, then prompt an AI to analyze the same work and submit its full responses as an appendix. Write a 600-800 word comparative essay evaluating what the AI captured versus what it missed. Complete your analysis before consulting the AI—reversing this order undermines the exercise and will be evident in your writing. Grading prioritizes your analytical quality and comparative critique depth.',
    rubricRows: [
      {
        criterion: 'Quality of Independent Analysis',
        excellent: 'Analysis demonstrates sophisticated use of discipline-specific methods; observations are precise, well-supported, and reveal genuine insight into the work.',
        proficient: 'Competent analysis using appropriate methods; observations are accurate and well-organized.',
        developing: 'Analysis is superficial or relies heavily on description rather than interpretation.',
        insufficient: 'Analysis lacks disciplinary rigor; reads as casual impression rather than formal analysis.',
      },
      {
        criterion: 'AI Prompt Strategy',
        excellent: 'Prompts are thoughtfully constructed to elicit meaningful analysis; student iterates on prompts to test AI\'s analytical range.',
        proficient: 'Prompts are clear and appropriate; at least 2-3 different angles tested.',
        developing: 'Prompts are generic or only test one dimension of analysis.',
        insufficient: 'Single vague prompt; no attempt to probe AI\'s capabilities.',
      },
      {
        criterion: 'Comparative Critique Depth',
        excellent: 'Identifies specific, non-obvious gaps in AI analysis (emotional nuance, cultural context, embodied experience, aesthetic judgment) with clear examples.',
        proficient: 'Identifies meaningful differences between human and AI analysis with supporting evidence.',
        developing: 'Comparison is surface-level ("the AI missed the emotional parts") without specific examples.',
        insufficient: 'No substantive comparison; merely states AI is "good" or "bad" at analysis.',
      },
      {
        criterion: 'Artistic Voice Preservation',
        excellent: 'Student\'s own analytical voice is distinct and confident throughout; personal perspective enriches the analysis.',
        proficient: 'Student\'s voice is present and distinguishable from AI output.',
        developing: 'Student\'s voice is inconsistent; some passages read as paraphrased AI content.',
        insufficient: 'Student\'s voice is absent; analysis is indistinguishable from AI-generated text.',
      },
    ],
    implementationNotes:
      'Assign the independent analysis as a separate submission due 3-5 days before the comparative essay to ensure students actually do their own work first. Choose compositions rich enough to reward close analysis but accessible enough that AI tools will have training data on them—canonical works from the last 50 years work well. Discuss results in class as a group to surface patterns in what AI consistently misses across different students\' analyses.',
    documentationTemplate:
      '## AI Comparison Documentation\n\n**AI Tool Used:** [tool name]\n**Composition Analyzed:** [title, creator, year]\n\n### AI Prompts & Responses\nFor each prompt:\n- **Prompt #[N]:** [exact text]\n- **AI Response:** [full text, unedited]\n- **Your assessment:** [1-2 sentences on what was accurate/inaccurate]\n\n### Key Differences Identified\n| Aspect | Your Analysis | AI Analysis | Significance of Difference |\n|--------|--------------|-------------|---------------------------|\n| [e.g., emotional tone] | [your take] | [AI\'s take] | [why this matters] |\n\n### Reflection\nWhat does this comparison reveal about the current capabilities and limitations of AI analysis in [your discipline]? (3-5 sentences)',
    tags: ['analysis', 'music-composition', 'theatre', 'painting', 'ai-comparison', 'close-reading'],
  },

  // ─── PARTNERSHIP tier (aiLevel: GUIDED) ──────────────────────────────

  {
    disciplineFamily: 'ARTS',
    title: 'Creative Process Documentation',
    description:
      'Document 5+ stages of your creative process with photos, screen captures, or audio clips—from initial thumbnail sketches through final glaze application, from first rehearsal blocking through tech week adjustments. At each stage, capture what you tried, what worked, what failed, and what changed. Where AI was used, log the prompt, output, and your editorial decisions. The portfolio proves you drove the creative process regardless of tools involved.',
    assignmentType: 'PORTFOLIO',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Submit 5+ dated stages of your major project, each with visual/audio/textual evidence and a 150-250 word annotation describing what you attempted, what succeeded, what failed, and what changed. For any stage involving AI tools, document exact prompts, raw outputs, and your editorial decisions. Stages must represent genuine turning points—not arbitrary snapshots. Grading weighs process reflection depth, decision-making rationale, and AI documentation rigor.',
    rubricRows: [
      {
        criterion: 'Turning-Point Selection',
        excellent: 'Each stage captures a genuine inflection point with rich visual/textual evidence; annotations reveal sophisticated awareness of creative decision-making.',
        proficient: 'Stages are well-chosen and documented; annotations clearly explain what happened and why.',
        developing: 'Stages feel arbitrary or pro forma; annotations describe what was done but not why.',
        insufficient: 'Fewer than 5 stages; documentation is cursory or fabricated after the fact.',
      },
      {
        criterion: 'AI Usage Documentation Rigor',
        excellent: 'Every AI interaction is logged with exact prompts, full outputs, and detailed editorial rationale; pattern of AI use shows intentional, strategic integration.',
        proficient: 'AI interactions are documented clearly; editorial decisions are explained.',
        developing: 'AI documentation is incomplete—missing prompts, truncated outputs, or vague editorial notes.',
        insufficient: 'AI was clearly used but not documented, or documentation is fabricated.',
      },
      {
        criterion: 'Creative Agency Across Stages',
        excellent: 'Student\'s creative voice and judgment clearly drive every stage; AI is one tool among many, never the decision-maker.',
        proficient: 'Student maintains creative control; AI contributions are integrated thoughtfully.',
        developing: 'Student\'s agency is inconsistent; some stages feel AI-driven rather than student-driven.',
        insufficient: 'AI appears to drive creative decisions; student is editing AI output rather than creating.',
      },
      {
        criterion: 'Reflective Depth',
        excellent: 'Annotations show genuine self-awareness about creative choices, including honest assessment of failures and surprises.',
        proficient: 'Reflections are thoughtful and honest; student acknowledges what did not work.',
        developing: 'Reflections are surface-level or only describe successes.',
        insufficient: 'No meaningful reflection; annotations read as captions rather than analysis.',
      },
    ],
    implementationNotes:
      'Set interim check-in dates for stages 1-2 and 3-4 so students cannot fabricate the portfolio retroactively. In class, run short "process share" sessions where 2-3 students present a single stage and discuss their decisions—peer accountability improves documentation quality dramatically. Provide exemplar portfolios from past semesters (with permission) so students understand the expected depth.',
    documentationTemplate:
      '## Creative Process Documentation — Stage [N] of [Total]\n\n**Date:** [date]\n**Medium/Tools Used:** [list all, including AI tools if any]\n\n### What I Attempted\n[Describe what you set out to do at this stage]\n\n### What Happened\n[Describe the outcome—include visual/audio/textual evidence]\n\n### What Worked / What Failed\n[Be specific and honest]\n\n### What I Changed as a Result\n[How did this stage redirect the project?]\n\n### AI Usage (if applicable)\n- **Tool:** [name]\n- **Prompt:** [exact text]\n- **Raw Output:** [paste or screenshot]\n- **My Editorial Decision:** [what I kept, changed, or rejected, and why]\n- **Impact on the Work:** [how did this AI interaction shape the next stage?]',
    tags: ['process', 'ceramics', 'theatre-production', 'portfolio', 'creative-process', 'reflection'],
  },

  {
    disciplineFamily: 'ARTS',
    title: 'AI as Creative Collaborator',
    description:
      'Use AI as an explicit creative partner throughout ideation and iteration—generate lyric fragments with ChatGPT and set them to original music, use Runway to prototype motion graphics then hand-animate the final cut, or dialogue with an AI about color theory while mixing paint on canvas. Submit the finished work, a complete AI collaboration log, and a 500-word reflection analyzing what AI contributed versus what required human creative judgment.',
    assignmentType: 'PROJECT',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Submit three components: (1) the finished creative work, (2) a complete AI Collaboration Log with every significant prompt, output, and your editorial response, and (3) a 500-word reflection analyzing where AI expanded possibilities versus where human judgment was essential. Use AI substantively across multiple stages—not a single query. Passively accepting AI output without directing the collaboration will lower your grade.',
    rubricRows: [
      {
        criterion: 'Quality of Final Creative Work',
        excellent: 'Work is accomplished, original, and demonstrates clear artistic vision; AI collaboration enhanced rather than diluted the student\'s voice.',
        proficient: 'Work is competent and shows evidence of a personal creative vision informed by AI collaboration.',
        developing: 'Work is adequate but feels generic; AI collaboration may have homogenized the student\'s voice.',
        insufficient: 'Work is incomplete or reads as lightly edited AI output rather than original creation.',
      },
      {
        criterion: 'AI Collaboration Strategy',
        excellent: 'Student used AI at multiple stages with increasingly sophisticated prompts; log reveals an evolving, strategic approach to human-AI collaboration.',
        proficient: 'AI was used at several stages with clear purpose; collaboration shows intentionality.',
        developing: 'AI use is limited to a single stage or purpose; collaboration feels perfunctory.',
        insufficient: 'AI was either barely used or used without strategic thought; log shows copy-paste behavior.',
      },
      {
        criterion: 'Artistic Voice Preservation',
        excellent: 'Reflection pinpoints specific moments where the student\'s voice steered the work away from AI defaults; personal aesthetic is unmistakable in the final piece.',
        proficient: 'Student\'s voice is evident; reflection distinguishes AI contributions from human ones with concrete examples.',
        developing: 'Voice is inconsistent; reflection is vague or one-sided (all praise or all criticism of AI).',
        insufficient: 'No discernible personal voice; final work is indistinguishable from lightly edited AI output.',
      },
      {
        criterion: 'Collaboration Log Completeness',
        excellent: 'Every significant AI interaction is documented with prompts, outputs, and editorial decisions; log tells a coherent story of the collaboration.',
        proficient: 'Most interactions documented; log provides a clear picture of the human-AI dynamic.',
        developing: 'Log is incomplete or lacks editorial decision documentation.',
        insufficient: 'Log is missing, fabricated, or documents only trivial interactions.',
      },
    ],
    implementationNotes:
      'Run an in-class workshop on effective AI prompting for creative work before the project begins—many art students have limited experience with generative AI and default to single-shot prompts. Require a mid-project check-in where students share their collaboration log so far and discuss strategies. Pair this with the earlier Foundation-tier assignment so students can compare their AI-assisted work against their unassisted baseline.',
    documentationTemplate:
      '## AI Collaboration Log\n\n**Project Title:** [title]\n**AI Tool(s) Used:** [list all]\n**Total AI Interactions:** [approximate number]\n\n### Interaction Log\nFor each significant interaction:\n\n**Interaction #[N] — [Stage: Ideation / Development / Refinement / Other]**\n- **My Goal:** [what I was trying to accomplish]\n- **Prompt:** [exact text or description of input]\n- **AI Output:** [paste, screenshot, or describe]\n- **My Response:** [what I kept, modified, rejected, or was inspired by]\n- **Why:** [rationale for my editorial decisions]\n\n### 500-Word Reflection\nAddress the following:\n1. At what moments did AI expand your creative possibilities in ways you would not have reached alone?\n2. At what moments was human judgment essential—where AI output was inadequate, inappropriate, or creatively flat?\n3. How did your approach to AI collaboration change over the course of the project?\n4. Would you call this a genuine collaboration? Why or why not?',
    tags: ['collaboration', 'ai-partner', 'songwriting', 'motion-graphics', 'painting', 'ideation'],
  },

  {
    disciplineFamily: 'ARTS',
    title: 'Adaptive Design Challenge',
    description:
      'Receive a realistic client brief—rebrand a local coffee shop, design a festival poster, or create a wayfinding system for a campus building—and use AI to generate 3-5 initial concepts. Then iterate through 3+ critique-and-revision cycles, refining AI outputs with your knowledge of typography, color theory, and audience context. The project exposes the gap between AI-generated first drafts and professionally resolved design work.',
    assignmentType: 'PROJECT',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Generate 3-5 AI design concepts from the provided client brief in week one, then conduct 3+ documented critique-and-revision cycles over two weeks. Each cycle requires an annotation explaining what was wrong and what design principles you applied to fix it. Submit the full revision history, all AI prompts/outputs, the final design, and a 400-word reflection on the gap between AI drafts and professionally resolved work.',
    rubricRows: [
      {
        criterion: 'Iteration Quality & Depth',
        excellent: 'Each revision cycle shows substantial, expert-level improvements; student applies specific design principles to transform generic AI output into resolved work.',
        proficient: '3+ revision cycles with clear improvements; design principles are applied appropriately.',
        developing: 'Revisions are minor or cosmetic; student tweaks AI output rather than genuinely redesigning.',
        insufficient: 'Fewer than 3 cycles or revisions do not demonstrate meaningful improvement.',
      },
      {
        criterion: 'Disciplinary Expertise Application',
        excellent: 'Annotations reference specific principles (typography, color theory, spatial composition, user experience) with precision; expertise transforms the work.',
        proficient: 'Annotations reference relevant principles; expertise is evident in the final work.',
        developing: 'Principles mentioned are generic or incorrectly applied.',
        insufficient: 'No evidence of disciplinary knowledge applied to revisions.',
      },
      {
        criterion: 'Client Brief Fulfillment',
        excellent: 'Final design fully addresses client brief with attention to audience, context, and practical constraints; solution is presentation-ready.',
        proficient: 'Final design addresses most brief requirements; minor gaps in audience or context consideration.',
        developing: 'Design partially addresses the brief; significant requirements overlooked.',
        insufficient: 'Design does not meaningfully respond to the client brief.',
      },
      {
        criterion: 'Process Documentation & Reflection',
        excellent: 'Complete revision history with insightful annotations; reflection articulates the specific gap between AI drafts and professional work in concrete terms.',
        proficient: 'Documentation is thorough; reflection identifies meaningful differences between AI and professional output.',
        developing: 'Documentation has gaps; reflection is generic.',
        insufficient: 'Documentation is incomplete or missing; reflection absent.',
      },
    ],
    implementationNotes:
      'Write client briefs that are realistic but constrained enough that AI tools will produce recognizable starting points—a local restaurant rebrand or event poster works better than a vague "design something." Schedule peer critiques at the midpoint where students present AI drafts alongside their revisions, which makes the value of disciplinary expertise visible to the whole class. Have a practicing designer guest-critique final submissions if possible.',
    documentationTemplate:
      '## Adaptive Design Challenge — Revision Log\n\n**Client Brief Summary:** [1-2 sentences]\n**AI Tool(s) Used:** [list all]\n\n### Initial AI Concepts\n- **Prompt #[N]:** [exact text]\n- **AI Output:** [image/description]\n- **Initial Assessment:** [what works, what doesn\'t, and why]\n\n### Revision Cycle [N]\n- **What was wrong with the previous version:** [specific critique using design vocabulary]\n- **Disciplinary knowledge applied:** [e.g., "adjusted type hierarchy per Bringhurst\'s principles," "revised color palette for WCAG accessibility"]\n- **Changes made:** [describe specific revisions]\n- **AI involvement (if any):** [new prompts, regenerations, or purely manual work]\n- **Result:** [image/description of revised version]\n\n### Final Reflection (400 words)\nWhat is the difference between what AI generated and what you submitted? What disciplinary knowledge was essential to closing that gap?',
    tags: ['graphic-design', 'typography', 'wayfinding', 'client-brief', 'prototyping', 'critique'],
  },

  // ─── FLUENCY tier (aiLevel: REQUIRE) ─────────────────────────────────

  {
    disciplineFamily: 'ARTS',
    title: 'Human-AI Collaborative Exhibition',
    description:
      'Create a series of 3-5 works exploring human-AI collaboration as medium—for example, a print series where each edition layer alternates between your hand-pulled ink and AI-generated imagery, or a sound installation pairing AI-composed ambient textures with live cello. Curate the works into an exhibition (physical or digital) with a 750-1,000 word artist statement addressing authorship, creativity, and the conceptual implications of AI as collaborator.',
    assignmentType: 'PORTFOLIO',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'Create 3-5 works where AI is integral to the creative process, curate them into an exhibition (gallery, digital portfolio, or performance program), and write a 750-1,000 word artist statement on authorship and creative agency. Submit a full process archive of all AI interactions. Present your exhibition in a 15-minute artist talk plus Q&A. Grading prioritizes conceptual depth, curatorial coherence, and sophistication of engagement with AI as a creative question—not technical polish alone.',
    rubricRows: [
      {
        criterion: 'Conceptual Depth & Inquiry',
        excellent: 'Body of work poses genuine, provocative questions about human-AI creativity; conceptual framework is original and intellectually rigorous.',
        proficient: 'Work engages meaningfully with human-AI collaboration as a concept; ideas are clearly articulated.',
        developing: 'Conceptual engagement is surface-level; work uses AI but does not interrogate the implications.',
        insufficient: 'No conceptual framework; AI is used as a production tool without artistic inquiry.',
      },
      {
        criterion: 'Curatorial Coherence',
        excellent: 'Pieces work together as a unified exhibition; sequencing, presentation, and artist statement create a compelling narrative arc.',
        proficient: 'Exhibition has clear thematic unity; pieces relate to each other and to the artist statement.',
        developing: 'Pieces are loosely connected; exhibition feels like a collection rather than a curated experience.',
        insufficient: 'No discernible curatorial logic; pieces appear unrelated.',
      },
      {
        criterion: 'Artist Statement & Critical Voice',
        excellent: 'Statement is eloquent, specific, and demonstrates sophisticated thinking about authorship and creativity in the age of AI; references relevant artistic or theoretical precedents.',
        proficient: 'Statement clearly addresses authorship and AI\'s role; writing is competent and specific.',
        developing: 'Statement is generic or relies on cliches about AI and art; lacks personal critical voice.',
        insufficient: 'Statement is missing, perfunctory, or does not address the assignment\'s conceptual requirements.',
      },
      {
        criterion: 'Process Archive Quality',
        excellent: 'Archive is comprehensive, well-organized, and itself tells a story of evolving human-AI creative practice across the body of work.',
        proficient: 'Archive documents AI interactions clearly across all pieces.',
        developing: 'Archive is incomplete or inconsistently documented.',
        insufficient: 'Archive is missing or fabricated.',
      },
      {
        criterion: 'Exhibition Presentation',
        excellent: 'Artist talk is compelling, well-rehearsed, and demonstrates deep ownership of the work; Q&A responses are substantive.',
        proficient: 'Presentation is clear and shows command of the material; Q&A is adequate.',
        developing: 'Presentation is disorganized or reads from notes excessively; Q&A responses are thin.',
        insufficient: 'Presentation is unprepared or absent.',
      },
    ],
    implementationNotes:
      'Frame this as the capstone of the AI literacy sequence so students build on skills from earlier tiers. Invite outside critics (other faculty, practicing artists, gallery professionals) to the exhibition presentations—external audience raises the stakes and the quality. If physical exhibition space is limited, a well-designed digital portfolio (e.g., a simple website) is an acceptable format that also teaches professional presentation skills.',
    documentationTemplate:
      '## Human-AI Collaborative Exhibition — Process Archive\n\n**Exhibition Title:** [title]\n**Number of Works:** [N]\n**AI Tool(s) Used Across Exhibition:** [list all]\n\n### Per-Work Documentation\n\n**Work #[N]: [Title]**\n- **Medium:** [description]\n- **Concept:** [what this piece explores about human-AI collaboration]\n- **AI Role:** [how AI was used — generation, transformation, conversation, data source, etc.]\n- **Key AI Interactions:**\n  - Prompt: [text] → Output: [description] → My decision: [what I did with it]\n  - [repeat for significant interactions]\n- **What is "mine" in this piece:** [what the human brought that AI could not]\n\n### Artist Statement (750-1,000 words)\nAddress:\n1. What does "authorship" mean when AI is a collaborator?\n2. What did AI collaboration reveal about your own creative process?\n3. Where does the art reside—in the prompt, the output, the curation, or the concept?\n4. How does this body of work position itself within current debates about AI and art?\n\n### Exhibition Design Rationale\nWhy did you sequence and present the works in this order? What narrative or conceptual arc does the exhibition create?',
    tags: ['exhibition', 'printmaking', 'sound-installation', 'curation', 'artist-statement', 'ai-as-medium'],
  },

  {
    disciplineFamily: 'ARTS',
    title: 'AI Tool Critique and Creative Manifesto',
    description:
      'Test Midjourney, DALL-E, and Stable Diffusion (or 3+ AI tools relevant to your discipline—Suno for music, Runway for video, ElevenLabs for voice) through structured experimentation. Document aesthetic defaults, biases, and blind spots. Then write and present a creative manifesto taking a clear, argued position on AI\'s role in your art form, grounded in your testing evidence.',
    assignmentType: 'PRESENTATION',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'Systematically test 3+ AI creative tools using standardized prompts (provided) plus your own exploratory prompts; compile findings into a 1,500-2,000 word critique identifying aesthetic biases, defaults, and capability limits. Write a 500-750 word manifesto taking a bold, evidence-grounded position on AI\'s role in your art form. Present your manifesto in a 10-minute talk followed by structured class debate. Grading is based on testing rigor, critique specificity, and argumentative strength.',
    rubricRows: [
      {
        criterion: 'Testing Rigor & Methodology',
        excellent: 'Systematic, well-designed experiments across 3+ tools; standardized and exploratory prompts reveal non-obvious patterns in AI behavior.',
        proficient: '3+ tools tested with clear methodology; findings are specific and evidence-based.',
        developing: 'Testing is superficial or limited to obvious capabilities; fewer than 3 tools tested thoroughly.',
        insufficient: 'No systematic testing; critique is based on impressions rather than evidence.',
      },
      {
        criterion: 'Bias & Limitation Identification',
        excellent: 'Identifies specific aesthetic biases (style defaults, cultural blind spots, technical constraints) with concrete examples; connects biases to training data or model design where possible.',
        proficient: 'Identifies several meaningful biases or limitations with supporting examples.',
        developing: 'Identifies only surface-level limitations (e.g., "it can\'t do hands"); lacks analytical depth.',
        insufficient: 'No meaningful analysis of biases or limitations.',
      },
      {
        criterion: 'Manifesto Argumentative Strength',
        excellent: 'Manifesto takes a bold, specific position grounded in testing evidence; argument is compelling, nuanced, and acknowledges counterpoints.',
        proficient: 'Clear position supported by evidence; argument is coherent if not groundbreaking.',
        developing: 'Position is vague or not supported by the testing evidence; manifesto reads as opinion piece.',
        insufficient: 'No clear position; manifesto is generic or contradicts the testing findings.',
      },
      {
        criterion: 'Presentation & Debate Engagement',
        excellent: 'Presentation is commanding and well-structured; student defends position skillfully in debate with specific evidence.',
        proficient: 'Presentation is clear; student engages in debate with reasonable responses.',
        developing: 'Presentation is adequate but debate responses lack substance or evidence.',
        insufficient: 'Presentation is unprepared; student cannot defend their position.',
      },
      {
        criterion: 'Critical Depth & Disciplinary Knowledge',
        excellent: 'Critique demonstrates deep understanding of disciplinary standards and connects AI tool analysis to broader questions in the field.',
        proficient: 'Critique references disciplinary context; analysis goes beyond surface-level tool review.',
        developing: 'Limited connection to disciplinary knowledge; reads as a generic tech review.',
        insufficient: 'No disciplinary grounding; critique could apply to any field.',
      },
    ],
    implementationNotes:
      'Provide a standardized set of 5-8 test prompts that all students run across all tools so you can compare results in class discussion—this also prevents students from cherry-picking favorable outputs. Allocate class time for manifesto presentations and structure the Q&A as a formal debate where other students must challenge the presenter. Consider publishing the best manifestos on a class blog or department site to give the assignment real-world stakes.',
    documentationTemplate:
      '## AI Tool Critique — Testing Documentation\n\n### Tools Tested\n| Tool | Version/Date | Discipline Relevance | Access Method |\n|------|-------------|---------------------|---------------|\n| [name] | [version] | [why relevant to your art form] | [free/paid/institutional] |\n\n### Standardized Test Results\nFor each of the provided test prompts, run on each tool:\n\n**Prompt: "[standardized prompt text]"**\n| Tool | Output Description | Quality (1-5) | Notable Observations |\n|------|--------------------|---------------|---------------------|\n| [tool] | [describe] | [score] | [biases, defaults, failures] |\n\n### Exploratory Testing\nFor each tool, document 3+ original prompts designed to test specific capabilities:\n- **Prompt:** [text]\n- **Hypothesis:** [what you expected]\n- **Result:** [what happened]\n- **Analysis:** [what this reveals about the tool]\n\n### Bias & Limitation Map\n| Category | Observation | Evidence | Severity |\n|----------|-------------|----------|----------|\n| Aesthetic defaults | [e.g., "defaults to Western classical composition"] | [specific outputs] | [high/medium/low] |\n| Cultural blind spots | [observation] | [evidence] | [severity] |\n| Technical constraints | [observation] | [evidence] | [severity] |\n\n### Creative Manifesto (500-750 words)\n[Your argued position on AI\'s role in your art form, grounded in your testing evidence]',
    tags: ['tool-critique', 'manifesto', 'generative-ai', 'music-production', 'bias-analysis', 'debate'],
  },
]
