import type { AssignmentTemplateData } from './types'

export const SOCIAL_SCIENCES_ASSIGNMENTS: AssignmentTemplateData[] = [
  // ─────────────────────────────────────────────────────────────
  // FOUNDATION tier (3) — aiLevel: 'PROHIBIT'
  // ─────────────────────────────────────────────────────────────
  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'In-Class Data Interpretation',
    description:
      'Analyze a provided Pew Research dataset on political polarization entirely by hand during a proctored class session. No devices permitted. Compute measures of central tendency, identify outliers, and write an interpretive narrative — all without computational assistance.',
    assignmentType: 'PROBLEM_SET',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'This in-class data interpretation exercise is completed entirely without electronic devices or AI tools. You will receive a printed dataset and must produce all calculations, tables, and interpretive narrative by hand within the allotted class period. The purpose is to develop your unmediated capacity for statistical reasoning — a skill that underpins every other method you will learn in this course. Grading emphasizes accuracy of computation (30%), quality of interpretive narrative (40%), and identification of data limitations (30%). Any use of electronic devices during the exercise will result in a zero for the assignment.',
    rubricRows: [
      {
        criterion: 'Statistical Accuracy',
        excellent: 'All calculations correct; appropriate measures of central tendency and dispersion selected for data type',
        proficient: 'Minor calculation errors that do not affect interpretive conclusions; measures generally appropriate',
        developing: 'Multiple errors or inappropriate statistical measures chosen; conclusions partially supported',
        insufficient: 'Fundamental calculation errors or missing computations; conclusions unsupported by the data',
      },
      {
        criterion: 'Interpretive Narrative',
        excellent: 'Clear, specific claims tied directly to computed values; acknowledges uncertainty and alternative readings of the data',
        proficient: 'Claims supported by data but lack nuance; limited acknowledgment of ambiguity',
        developing: 'Generic claims loosely connected to data; interpretation reads as guesswork rather than evidence-based reasoning',
        insufficient: 'No interpretive narrative provided, or claims contradict the computed results',
      },
      {
        criterion: 'Identification of Limitations',
        excellent: 'Identifies sampling issues, measurement validity concerns, and confounders specific to this dataset',
        proficient: 'Notes at least two relevant limitations with some specificity',
        developing: 'Lists generic limitations (e.g., "small sample size") without connecting them to this particular dataset',
        insufficient: 'No limitations discussed or only irrelevant concerns mentioned',
      },
    ],
    implementationNotes:
      'Print datasets the morning of class to prevent early distribution. For sections above 40 students, prepare 2-3 dataset variants to reduce copying. Allow 50 minutes minimum — students consistently underestimate the time needed for hand calculation.',
    documentationTemplate: null,
    tags: ['data-literacy', 'in-class', 'no-ai', 'statistical-reasoning', 'descriptive-statistics', 'foundation'],
  },

  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'Fieldwork Observation Journal',
    description:
      'Maintain a handwritten field journal across four visits to an assigned fieldwork site (e.g., a community health clinic or public housing office). Record sensory detail, emergent patterns, and reflexive notes on positionality. No AI tool can substitute for embodied presence in a research setting.',
    assignmentType: 'PORTFOLIO',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'You will maintain a handwritten observation journal across four fieldwork visits this semester. Each entry must be completed on-site or immediately after leaving the field — not reconstructed later from memory. Entries should include thick description (what you see, hear, smell, and sense), analytic memos (emerging patterns or questions), and positionality notes (how your presence may be shaping what you observe). Journals will be collected in their original handwritten form; typed transcriptions are not accepted. Grading criteria: observational specificity (35%), analytic memo quality (35%), and reflexivity (30%). AI-generated or AI-assisted text is prohibited and constitutes an academic integrity violation for this assignment.',
    rubricRows: [
      {
        criterion: 'Observational Specificity',
        excellent: 'Rich sensory detail that transports the reader to the site; distinguishes observed behavior from inference; timestamps and spatial orientation noted',
        proficient: 'Good descriptive detail with occasional inference mixed into observation; most entries include contextual anchors',
        developing: 'Thin description that summarizes rather than depicts; hard to distinguish what was actually observed versus assumed',
        insufficient: 'Entries are vague, generic, or clearly reconstructed long after the visit',
      },
      {
        criterion: 'Analytic Memo Quality',
        excellent: 'Memos connect observations to course concepts or existing literature; pose testable questions; show intellectual progression across entries',
        proficient: 'Memos identify patterns and raise questions but do not consistently connect to theory',
        developing: 'Memos restate observations without analysis or pose only surface-level questions',
        insufficient: 'No analytic memos present, or memos are indistinguishable from description',
      },
      {
        criterion: 'Reflexivity and Positionality',
        excellent: 'Honest, specific reflection on how the researcher\'s identity, assumptions, and presence shape the data being collected',
        proficient: 'Some positionality awareness, though reflections tend toward the generic rather than the site-specific',
        developing: 'Reflexivity is perfunctory or formulaic — reads as a checkbox rather than genuine self-interrogation',
        insufficient: 'No reflexive notes or positionality awareness demonstrated',
      },
      {
        criterion: 'Consistency and Completeness',
        excellent: 'All required entries present with evidence of on-site completion; progression visible across the semester',
        proficient: 'Most entries complete; minor gaps in coverage but overall trajectory is clear',
        developing: 'Missing entries or clear evidence of batch-writing multiple entries at once',
        insufficient: 'Fewer than half the required entries submitted or journals appear fabricated',
      },
    ],
    implementationNotes:
      'Assign fieldwork sites early and discuss access logistics in week 2. For large sections, pair students at the same site but require independent journals — comparing paired journals is an effective authenticity check. Budget one class session for a journaling workshop before the first field visit.',
    documentationTemplate: null,
    tags: ['fieldwork', 'qualitative-methods', 'observation', 'no-ai', 'reflexivity'],
  },

  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'Oral Defense of Research Design',
    description:
      'Defend your chosen research methodology in a 10-minute oral examination. Expect probing questions on epistemological assumptions, sampling decisions, threats to validity, and why you chose this method over alternatives. This format makes AI assistance irrelevant — you must think on your feet.',
    assignmentType: 'EXAM',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'You will complete a 10-minute oral defense of your proposed research design. I will ask questions about your methodology, including why you chose it over alternatives, what epistemological assumptions underlie your approach, how you would handle specific threats to validity, and what limitations you anticipate. You may bring a single-page outline (no notes longer than one page, no electronic devices). This is an individual assessment — the conversation cannot be rehearsed with AI because the questions are responsive to your specific answers. Grading: methodological understanding (40%), ability to justify decisions under questioning (30%), awareness of limitations and alternatives (30%).',
    rubricRows: [
      {
        criterion: 'Methodological Understanding',
        excellent: 'Articulates precise rationale for method choice; explains alignment between research question, epistemology, and method; handles follow-up probes with depth',
        proficient: 'Demonstrates solid understanding of chosen method; can explain most design decisions but struggles with deeper epistemological questions',
        developing: 'Can describe the method procedurally but cannot explain why it fits the research question or what assumptions it carries',
        insufficient: 'Cannot articulate basic features of the chosen method or confuses key methodological concepts',
      },
      {
        criterion: 'Justification Under Questioning',
        excellent: 'Responds to challenging questions with reasoned, specific arguments; concedes valid critiques and explains how the design accounts for them',
        proficient: 'Provides adequate justifications for most decisions; occasionally defaults to vague or rehearsed answers when pressed',
        developing: 'Struggles to defend choices when questioned; relies on "that\'s just what the textbook said" rather than independent reasoning',
        insufficient: 'Cannot justify design decisions or becomes incoherent under questioning',
      },
      {
        criterion: 'Awareness of Alternatives and Limitations',
        excellent: 'Proactively names competing methods and explains trade-offs; identifies specific limitations and proposes mitigation strategies',
        proficient: 'Acknowledges at least one alternative method and several limitations when prompted',
        developing: 'Awareness of alternatives is superficial; limitations are generic rather than design-specific',
        insufficient: 'Cannot name an alternative method or identify meaningful limitations of the chosen design',
      },
    ],
    implementationNotes:
      'Schedule defenses across 2-3 class sessions to avoid marathon days. Prepare a standardized question bank with 15-20 probes but let the conversation flow naturally — scripted Q&A defeats the purpose. For sections over 30, recruit a TA or colleague as second examiner to manage scheduling.',
    documentationTemplate: null,
    tags: ['oral-exam', 'research-design', 'epistemology', 'no-ai', 'sampling-strategy', 'critical-thinking'],
  },

  // ─────────────────────────────────────────────────────────────
  // AWARENESS tier (3) — aiLevel: 'CAUTIOUS'
  // ─────────────────────────────────────────────────────────────
  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'Source Audit and Reliability Matrix',
    description:
      'Evaluate 10 sources for reliability, bias, ideological framing, and relevance to your research question. AI may help locate sources, but all evaluative judgment — distinguishing a credible GSS dataset from a misleading advocacy report — must be your own documented reasoning.',
    assignmentType: 'ESSAY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'You will compile and evaluate 10 sources relevant to your research question, constructing a reliability matrix that rates each source on authority, methodology, currency, bias, and relevance. You may use AI tools to help locate sources or generate initial search terms, but all evaluative judgments must be your own. For each source, provide a 150-word critical assessment explaining your ratings. Your submission must include a documentation appendix listing any AI tools used and how they assisted your search process. Grading: quality of source selection (20%), rigor of evaluation criteria (40%), clarity of written assessments (25%), AI documentation completeness (15%).',
    rubricRows: [
      {
        criterion: 'Evaluation Rigor',
        excellent: 'Each source assessed on all five dimensions with specific evidence; distinguishes between methodological and ideological bias; identifies funding sources and institutional affiliations',
        proficient: 'Most sources evaluated on multiple dimensions; bias analysis present but sometimes superficial',
        developing: 'Evaluations rely on surface features (e.g., "it\'s a .gov site so it\'s reliable") rather than substantive analysis',
        insufficient: 'Sources listed without meaningful evaluation, or ratings appear arbitrary',
      },
      {
        criterion: 'Source Diversity and Selection',
        excellent: 'Sources span multiple methodologies, perspectives, and publication types; deliberate inclusion of countervailing viewpoints',
        proficient: 'Reasonable variety but tends toward one type of source or one ideological perspective',
        developing: 'Sources are homogeneous in type or viewpoint; reliance on the first results from a single search',
        insufficient: 'Fewer than 10 sources, or sources are irrelevant to the research question',
      },
      {
        criterion: 'Critical Written Assessments',
        excellent: 'Assessments are specific, evidence-based, and demonstrate independent judgment; student explains how each source contributes to or complicates the research question',
        proficient: 'Assessments are competent but occasionally generic; some entries read as summaries rather than evaluations',
        developing: 'Assessments are brief, formulaic, or repeat the same observations across multiple sources',
        insufficient: 'No written assessments provided, or text appears AI-generated without original analysis',
      },
      {
        criterion: 'Source Discovery Transparency',
        excellent: 'Logs each AI search prompt, lists every AI-suggested source, and explains which were kept or rejected with rationale tied to the reliability matrix criteria',
        proficient: 'Documents AI tools and general search strategy but does not trace individual source suggestions back to specific prompts',
        developing: 'Vague acknowledgment of AI use without distinguishing AI-found sources from independently discovered ones',
        insufficient: 'No documentation provided despite evidence of AI-assisted searching',
      },
    ],
    implementationNotes:
      'Provide a sample reliability matrix in week 1 so students understand the expected format. The most common pitfall is students using AI to generate the evaluations themselves rather than just the search — spot-check by asking 2-3 students to explain their ratings in office hours. Works well in sections up to 60.',
    documentationTemplate:
      '## AI Use Documentation — Source Audit\n\n**AI Tool(s) Used:** [e.g., ChatGPT, Perplexity, Elicit]\n\n**Search Assistance:**\n- Prompt given to AI: [exact text]\n- Sources AI suggested: [list]\n- Sources I kept and why: [rationale]\n- Sources I rejected and why: [rationale]\n\n**Other AI Assistance:** [describe any other use]\n\n**Statement:** All evaluative judgments, reliability ratings, and critical assessments in this submission are my own work. AI was used only for source discovery as documented above.',
    tags: ['source-evaluation', 'research-skills', 'bias-analysis', 'information-literacy', 'cautious-ai'],
  },

  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'Survey Design Workshop',
    description:
      'Design a 15-20 item research survey instrument targeting a specified population (e.g., first-generation college students navigating financial aid). AI can assist with brainstorming question wording, but you must justify every item\'s inclusion, defend construct validity, and map each question to your research constructs.',
    assignmentType: 'PROJECT',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'You will design a 15-20 item survey instrument targeting a specified population and research question. Your deliverable includes the survey itself, a codebook, and a design rationale memo (1,500 words) explaining each question\'s purpose, response format, and how it maps to your constructs. You may use AI to brainstorm question wording or identify common pitfalls in survey design, but every question in your final instrument must be justified in your own words. Your rationale memo must address construct validity, potential response biases, and question ordering effects. Include a documentation appendix showing any AI-assisted brainstorming. Grading: instrument quality (30%), design rationale (40%), construct validity argument (20%), AI documentation (10%).',
    rubricRows: [
      {
        criterion: 'Instrument Quality',
        excellent: 'Questions are clear, unambiguous, and appropriately scaled; no double-barreled or leading questions; logical flow with effective transitions',
        proficient: 'Most questions are well-constructed; a few minor wording issues or ordering problems that would not significantly bias responses',
        developing: 'Multiple problematic questions (leading, double-barreled, or unclear); response options inconsistent or incomplete',
        insufficient: 'Survey would be unusable as a research instrument due to pervasive design flaws',
      },
      {
        criterion: 'Design Rationale and Construct Validity',
        excellent: 'Each question explicitly tied to a construct; rationale explains how the set of items maps to the research questions; validity threats identified and addressed',
        proficient: 'Most questions have clear rationale; construct mapping is present but some items lack explicit justification',
        developing: 'Rationale is generic or post-hoc; construct validity argument is weak or missing',
        insufficient: 'No rationale provided, or justifications do not match the actual survey content',
      },
      {
        criterion: 'Awareness of Survey Methodology',
        excellent: 'Demonstrates understanding of response bias, social desirability, question ordering effects, and sampling considerations specific to the target population',
        proficient: 'Addresses several methodological concerns but misses important issues for this particular population or topic',
        developing: 'Mentions methodology in generic terms without applying it to the specific instrument',
        insufficient: 'No awareness of survey methodology beyond basic question writing',
      },
      {
        criterion: 'AI Brainstorming vs. Original Design',
        excellent: 'Transparent log distinguishing AI-suggested question wording from student-authored items; shows iterative refinement of AI drafts with rationale for modifications',
        proficient: 'Documents which questions originated from AI brainstorming but does not detail how wording was refined',
        developing: 'Acknowledges AI use but impossible to tell which items were AI-suggested versus independently written',
        insufficient: 'No documentation despite instrument containing language patterns consistent with AI generation',
      },
    ],
    implementationNotes:
      'Run a peer review workshop in week 2 where students pilot-test each other\'s instruments — this catches problems AI brainstorming misses. For sections over 35, have students work in pairs on the instrument but submit individual rationale memos. The rationale memo is where authentic understanding becomes visible.',
    documentationTemplate:
      '## AI Use Documentation — Survey Design\n\n**AI Tool(s) Used:** [list tools]\n\n**Brainstorming Phase:**\n- What I asked AI to help with: [specific requests]\n- AI-suggested questions or wording: [list]\n- What I adopted (with modifications): [list with explanation]\n- What I rejected and why: [list with rationale]\n\n**Design Review:**\n- Did you ask AI to review your draft? [Yes/No]\n- If yes, what feedback did it give? [summary]\n- How did you respond to that feedback? [actions taken]\n\n**Statement:** The final instrument, codebook, and design rationale represent my own methodological reasoning. AI was used for brainstorming assistance as documented above.',
    tags: ['survey-design', 'construct-validity', 'research-methods', 'cautious-ai', 'methodology'],
  },

  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'Case Study with Personal Stake',
    description:
      'Apply a theoretical framework from the course — such as Durkheim\'s anomie or Bourdieu\'s cultural capital — to a case drawn from your own community or lived experience. AI may help summarize the theory, but the local context, personal analysis, and original interpretation must come from your direct knowledge.',
    assignmentType: 'CASE_STUDY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'You will select a situation, event, or phenomenon from your own community and analyze it through one theoretical framework covered in this course. Your case study (2,000-2,500 words) must include: a detailed description of the local context that demonstrates first-hand knowledge, an explanation of the chosen theory, application of the theory to your case, and a critical assessment of where the theory illuminates and where it falls short. You may use AI to help summarize the theoretical framework or locate supporting literature, but your case description and analysis must reflect your own experience and reasoning. Include a documentation appendix. Grading: depth of local context (25%), theoretical application (35%), critical assessment of fit (25%), AI documentation (15%).',
    rubricRows: [
      {
        criterion: 'Depth of Local Context',
        excellent: 'Provides specific, granular detail that could only come from direct experience; names places, dynamics, and stakeholders with insider knowledge',
        proficient: 'Reasonable local detail but occasionally relies on publicly available information rather than personal knowledge',
        developing: 'Context is thin or generic; could describe any community rather than a specific one the student knows',
        insufficient: 'No meaningful local context; case appears to be drawn from a textbook or AI-generated scenario',
      },
      {
        criterion: 'Theoretical Application',
        excellent: 'Theory applied with precision; key concepts mapped to specific features of the case; demonstrates understanding beyond textbook definitions',
        proficient: 'Theory applied correctly at a general level; some concepts mapped to the case but connections could be more specific',
        developing: 'Theory summarized but application is superficial — the case and the theory exist side by side without genuine integration',
        insufficient: 'Theory misunderstood or not applied to the case in any meaningful way',
      },
      {
        criterion: 'Critical Assessment of Theoretical Fit',
        excellent: 'Honestly identifies where the theory explains the case well and where it fails; proposes modifications or complementary frameworks; shows intellectual independence',
        proficient: 'Notes some limitations of the theoretical fit but does not explore them in depth',
        developing: 'Treats the theory as perfectly fitting the case without critical interrogation',
        insufficient: 'No critical assessment; analysis is purely descriptive rather than evaluative',
      },
      {
        criterion: 'Theory vs. Analysis Boundary',
        excellent: 'Clearly marks which theoretical summaries drew on AI assistance; documents verification steps (e.g., cross-checking AI\'s account of Durkheim against the primary text)',
        proficient: 'Documents AI use for theory summary but does not explain how AI output was verified or modified',
        developing: 'Vague mention of AI use; impossible to tell where theoretical summary ends and original analysis begins',
        insufficient: 'No documentation or evidence of undisclosed AI use in analysis sections',
      },
    ],
    implementationNotes:
      'Students often struggle to choose a case — provide 5-6 example prompts (e.g., "a local business that closed," "a neighborhood change you witnessed") to spark ideas. The personal stake requirement is the key authenticity guard; if the case could have been written by anyone, the assignment is not working. Works well up to 50 students.',
    documentationTemplate:
      '## AI Use Documentation — Case Study\n\n**AI Tool(s) Used:** [list tools]\n\n**Theory Summary Assistance:**\n- Did you use AI to help understand or summarize the theory? [Yes/No]\n- If yes, describe what you asked and how you used the output: [details]\n- How did you verify the AI\'s summary was accurate? [your verification steps]\n\n**Literature Search:**\n- AI-suggested sources: [list]\n- Sources you verified and included: [list]\n\n**Original Content Declaration:**\n- Case description: [Confirm this is based on your direct knowledge]\n- Theoretical application: [Confirm this is your own analysis]\n- Critical assessment: [Confirm these are your own evaluative judgments]\n\n**Statement:** The case description, analysis, and critical assessment in this paper are my own work informed by my personal knowledge of the community context described.',
    tags: ['case-study', 'theory-application', 'community-research', 'cautious-ai', 'personal-analysis'],
  },

  // ─────────────────────────────────────────────────────────────
  // PARTNERSHIP tier (3) — aiLevel: 'GUIDED'
  // ─────────────────────────────────────────────────────────────
  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'Staged Research Project',
    description:
      'Complete a semester-long research project through 5 checkpoints: proposal, source audit, methods section, full draft, and oral defense. Use AI tools at any stage with documentation, but the oral defense ensures you can explain and defend every choice you made.',
    assignmentType: 'PROJECT',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Five sequential checkpoints — proposal, source audit, methods, draft, oral defense — each requiring AI documentation via the provided template. AI tools are permitted at every stage; your oral defense will probe whether you can explain decisions that appear in your documentation log. Checkpoint weights: proposal 10%, source audit 15%, methods 20%, draft 25%, defense 30%. Late checkpoints lose one letter grade per day; skipping ahead is not permitted.',
    rubricRows: [
      {
        criterion: 'Methodological Rigor',
        excellent: 'Research design is coherent from question through method to analysis plan; sampling strategy justified; threats to validity identified and addressed at each checkpoint',
        proficient: 'Design is sound with minor gaps; methods section is adequate but could be more specific about implementation details',
        developing: 'Disconnect between research question and chosen method; sampling or validity concerns not addressed',
        insufficient: 'No coherent research design; checkpoints do not build on each other logically',
      },
      {
        criterion: 'Progressive Development Across Checkpoints',
        excellent: 'Clear intellectual growth visible from proposal to defense; each checkpoint shows genuine revision and deepening, not just addition of content',
        proficient: 'Reasonable progression with some evidence of revision between stages',
        developing: 'Checkpoints feel disconnected or show minimal revision; final draft does not reflect feedback from earlier stages',
        insufficient: 'Checkpoints appear to have been completed simultaneously rather than sequentially',
      },
      {
        criterion: 'Oral Defense Performance',
        excellent: 'Defends all methodological choices with specificity; explains AI use decisions credibly; handles challenging questions with composure and depth',
        proficient: 'Can explain most decisions when questioned; some AI use explanations lack specificity',
        developing: 'Struggles to explain key design choices or cannot articulate how AI was used at specific checkpoints',
        insufficient: 'Cannot defend the research design or is unable to explain content in their own submission',
      },
      {
        criterion: 'Documentation of AI Use Across Stages',
        excellent: 'Complete, specific logs at every checkpoint; clear narrative of how AI role evolved across the project; honest about both helpful and unhelpful AI interactions',
        proficient: 'Documentation present at each stage but varies in specificity; general narrative of AI use is coherent',
        developing: 'Documentation missing from one or more checkpoints or is too vague to be meaningful',
        insufficient: 'No documentation despite obvious AI-assisted content, or documentation is fabricated',
      },
    ],
    implementationNotes:
      'The checkpoint structure is the pedagogical core — do not let students skip ahead. Schedule oral defenses during the final two weeks; 10 minutes per student requires careful calendar planning for sections over 25. The most common failure mode is students who use AI heavily early but cannot explain their work in the defense.',
    documentationTemplate:
      '## AI Use Documentation — Staged Research Project\n\n### Checkpoint: [1-Proposal / 2-Source Audit / 3-Methods / 4-Draft / 5-Defense Prep]\n\n**AI Tool(s) Used:** [list, or "None for this checkpoint"]\n\n**How AI Was Used:**\n- Task: [what you asked AI to do]\n- Prompt: [exact or paraphrased prompt]\n- Output summary: [what AI produced]\n- What you kept/modified/rejected: [your decision and rationale]\n\n**Reflection:**\n- What did AI do well at this stage? [assessment]\n- What did AI get wrong or miss? [assessment]\n- How did AI use at this checkpoint differ from the previous one? [reflection on evolving relationship]\n\n**Statement:** I can explain and defend every element of this checkpoint submission in an oral examination.',
    tags: ['staged-project', 'research-methods', 'oral-defense', 'guided-ai', 'process-based', 'validity-threats'],
  },

  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'Data Interpretation with AI Comparison',
    description:
      'Analyze a provided census or survey dataset by hand in class (Phase 1), then prompt AI to analyze the same data at home (Phase 2). Submit a comparative evaluation: where did your interpretation and AI\'s diverge, what did each miss, and what does this reveal about AI in social science research?',
    assignmentType: 'LAB',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'This assignment has two phases. Phase 1 (in-class, no devices): You will analyze a provided dataset by hand, producing summary statistics, identifying patterns, and writing an interpretive narrative. Phase 2 (take-home): Prompt an AI tool to analyze the same dataset. Then write a 1,000-word comparative evaluation that addresses: Where did your analysis and AI\'s analysis agree? Where did they diverge? What did AI catch that you missed? What did you catch that AI missed? What are the implications for using AI in social science data analysis? Submit all three components: your in-class analysis, the AI\'s analysis (with your prompts), and your comparative evaluation. Grading: in-class analysis quality (30%), AI prompting strategy (20%), comparative evaluation depth (50%).',
    rubricRows: [
      {
        criterion: 'In-Class Analysis Quality',
        excellent: 'Accurate calculations; identifies key patterns and outliers; interpretive narrative is evidence-based and specific to the dataset',
        proficient: 'Mostly accurate with minor errors; identifies major patterns; narrative is competent but could be more specific',
        developing: 'Significant calculation errors or missed patterns; narrative is generic rather than data-specific',
        insufficient: 'Analysis is incomplete or fundamentally inaccurate',
      },
      {
        criterion: 'AI Prompting Strategy',
        excellent: 'Uses multiple, iterative prompts that guide AI toward deeper analysis; asks AI to explain its reasoning; tests AI with follow-up questions',
        proficient: 'Prompts are clear and produce useful output but lack iteration or depth-probing follow-ups',
        developing: 'Single generic prompt (e.g., "analyze this data") with no iteration or refinement',
        insufficient: 'No prompts documented, or prompts are so vague that AI output is unhelpful',
      },
      {
        criterion: 'Comparative Evaluation Depth',
        excellent: 'Specific, substantive comparison identifying concrete points of agreement and divergence; explains WHY differences exist; draws implications for AI use in social science research methodology',
        proficient: 'Notes key similarities and differences but explanation of causes or implications is underdeveloped',
        developing: 'Comparison is superficial — lists differences without explaining their significance or cause',
        insufficient: 'No meaningful comparison, or evaluation simply declares one analysis "better" without reasoning',
      },
      {
        criterion: 'Critical Evaluation of AI in Social Science',
        excellent: 'Draws thoughtful conclusions about AI\'s strengths and blind spots specific to social science data (e.g., contextual knowledge, cultural nuance, ecological validity)',
        proficient: 'Makes some relevant observations about AI limitations in social science contexts',
        developing: 'Observations about AI are generic and could apply to any discipline',
        insufficient: 'No reflection on what AI use means for social science methodology',
      },
    ],
    implementationNotes:
      'Use the same dataset for Phase 1 and Phase 2 — provide it as a printed handout in class and as a digital file for the take-home phase. The comparative evaluation is where the learning happens; weight it accordingly. For sections above 40, consider allowing paired in-class analysis but requiring individual comparative evaluations.',
    documentationTemplate:
      '## AI Use Documentation — Data Interpretation Comparison\n\n**AI Tool Used:** [tool name and version]\n\n**Prompting Log:**\n| Prompt # | Exact Prompt | AI Response Summary | Your Follow-Up |\n|----------|-------------|--------------------|-----------------|\n| 1 | [text] | [summary] | [what you asked next and why] |\n| 2 | [text] | [summary] | [what you asked next and why] |\n| ... | | | |\n\n**Reflection on Prompting Process:**\n- What prompting strategies worked best? [assessment]\n- What did you have to explain or re-explain to the AI? [details]\n- How many iterations did it take to get useful output? [count and reflection]',
    tags: ['data-analysis', 'ai-comparison', 'critical-evaluation', 'guided-ai', 'mixed-methods'],
  },

  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'Policy Brief with AI-Generated Alternatives',
    description:
      'Write an original policy brief on a social issue (e.g., housing insecurity among college students), then use AI to generate three structurally different alternatives — market-based, regulatory, and community-led. Evaluate each alternative on feasibility, equity, and political viability, then explain whether they changed your recommendation.',
    assignmentType: 'ESSAY',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'This assignment proceeds in three stages. First, write a 1,500-word policy brief recommending a specific course of action on a social issue of your choice. Second, use AI to generate three substantively different alternative policy positions on the same issue — your prompts should push AI toward genuinely distinct approaches, not minor variations. Third, write a 1,000-word evaluation that assesses each AI-generated alternative on feasibility, equity implications, and political viability, then explains whether and how the alternatives changed your original recommendation. Submit all components: original brief, AI interaction log with prompts and outputs, three alternatives, and your evaluation. Grading: original brief quality (25%), AI prompting sophistication (15%), evaluation of alternatives (40%), final position clarity (20%).',
    rubricRows: [
      {
        criterion: 'Original Policy Brief Quality',
        excellent: 'Clear problem statement grounded in evidence; specific, actionable recommendation; addresses implementation challenges and stakeholder concerns',
        proficient: 'Competent brief with a clear recommendation but thin on implementation details or stakeholder analysis',
        developing: 'Vague recommendation or weak evidentiary base; reads more like an opinion essay than a policy brief',
        insufficient: 'No clear policy recommendation or brief is off-topic',
      },
      {
        criterion: 'AI Prompting for Genuine Alternatives',
        excellent: 'Prompts push AI toward structurally different approaches (e.g., market-based vs. regulatory vs. community-led); alternatives are genuinely distinct, not cosmetic variations',
        proficient: 'Alternatives differ meaningfully but share underlying assumptions; prompts could have pushed further',
        developing: 'Alternatives are minor variations of the same approach; prompting was too narrow',
        insufficient: 'Single generic prompt produced three nearly identical alternatives',
      },
      {
        criterion: 'Evaluation of AI-Generated Alternatives',
        excellent: 'Each alternative assessed on stated criteria with specific evidence; evaluation demonstrates understanding of trade-offs, equity impacts, and political constraints; honest about where alternatives are stronger than the original',
        proficient: 'Evaluations are substantive but apply criteria inconsistently across alternatives',
        developing: 'Evaluations are superficial or dismissive of alternatives without genuine engagement',
        insufficient: 'No evaluation provided, or evaluation is simply "my original position was better"',
      },
      {
        criterion: 'Intellectual Honesty and Position Evolution',
        excellent: 'Final position shows genuine engagement with alternatives — either a revised recommendation with clear rationale or a strengthened original with new supporting arguments drawn from the comparison process',
        proficient: 'Some evidence that alternatives influenced thinking, but final position does not fully integrate insights',
        developing: 'Final position is identical to original with no evidence of intellectual movement',
        insufficient: 'No reflection on how the process affected the student\'s thinking',
      },
    ],
    implementationNotes:
      'Model the process in class with a live example before assigning — students need to see what "genuinely different alternatives" looks like versus cosmetic variation. The evaluation section is where critical thinking lives; students who dismiss all alternatives without engaging are missing the point. Effective for sections of any size since grading focuses on the evaluation, not the AI output.',
    documentationTemplate:
      '## AI Use Documentation — Policy Brief with Alternatives\n\n**AI Tool Used:** [tool name]\n\n**Alternative Generation:**\n| Alternative # | Prompt Used | Key Difference from Original | AI Output Summary |\n|--------------|------------|-----------------------------|-----------------|\n| 1 | [exact prompt] | [structural difference] | [summary] |\n| 2 | [exact prompt] | [structural difference] | [summary] |\n| 3 | [exact prompt] | [structural difference] | [summary] |\n\n**Prompting Iteration Notes:**\n- Did you need multiple attempts to get genuinely different alternatives? [Yes/No]\n- What prompting strategies produced the most distinct alternatives? [reflection]\n\n**Impact on Your Thinking:**\n- Which alternative challenged your original position most? [identify and explain]\n- Did you revise your original recommendation? [Yes/No, with rationale]',
    tags: ['policy-analysis', 'ai-alternatives', 'critical-evaluation', 'guided-ai', 'argumentation'],
  },

  // ─────────────────────────────────────────────────────────────
  // FLUENCY tier (2) — aiLevel: 'REQUIRE'
  // ─────────────────────────────────────────────────────────────
  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'AI-Powered Mixed Methods Analysis',
    description:
      'Use AI to conduct a mixed methods analysis of a provided dataset containing both survey responses and open-ended interview excerpts. Deliver a 2,500-word mixed methods report integrating qualitative and quantitative findings, plus a methodological reflection on where AI excels and where it fails in social science research.',
    assignmentType: 'PROJECT',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'Use AI for at least three distinct analytical tasks on the provided mixed dataset: qualitative coding, cross-code pattern identification, and statistical analysis. Submit a 2,500-word integrated report, a complete AI interaction log, and a 1,000-word methodological reflection on AI\'s strengths and failure modes in social science research. AI use is required and must be documented per task. Grading: report quality 30%, AI use sophistication 25%, methodological reflection 30%, documentation completeness 15%.',
    rubricRows: [
      {
        criterion: 'Sophistication of AI Use',
        excellent: 'Uses AI for multiple distinct analytical tasks with iterative refinement; challenges AI outputs; combines AI quantitative and qualitative capabilities strategically; demonstrates awareness of when AI adds value vs. noise',
        proficient: 'Uses AI for required tasks with some iteration; generally appropriate task selection but limited experimentation',
        developing: 'Minimal AI use — single prompts without iteration; uses AI as a black box without evaluating outputs',
        insufficient: 'AI use is perfunctory or absent despite the requirement; no evidence of analytical engagement with AI tools',
      },
      {
        criterion: 'Mixed Methods Integration',
        excellent: 'Qualitative and quantitative findings genuinely integrated — one illuminates the other; convergences and divergences between methods are analyzed',
        proficient: 'Both methods present and competently executed but treated as parallel tracks rather than integrated',
        developing: 'One method dominates; the other is perfunctory or disconnected from the overall argument',
        insufficient: 'Only one method used, or no integration between qualitative and quantitative components',
      },
      {
        criterion: 'Methodological Reflection on AI',
        excellent: 'Specific, evidence-based assessment of AI strengths and limitations grounded in the actual analysis performed; addresses contextual understanding, cultural nuance, reflexivity, and ecological validity; proposes concrete guidelines for AI use in social science',
        proficient: 'Thoughtful reflection with some specific examples but could probe deeper into discipline-specific implications',
        developing: 'Generic reflection that could apply to any field; does not engage with the specific challenges of social science research',
        insufficient: 'No reflection, or reflection is purely positive/negative without nuance',
      },
      {
        criterion: 'Documentation and Transparency',
        excellent: 'Complete interaction log with prompts, outputs, evaluative decisions, and rejected approaches; reader could replicate the AI-assisted analysis process',
        proficient: 'Log covers major interactions but omits some detail on evaluative reasoning or rejected approaches',
        developing: 'Incomplete log; major analytical steps undocumented',
        insufficient: 'No documentation of AI interactions',
      },
      {
        criterion: 'Critical Evaluation of AI Outputs',
        excellent: 'Identifies specific instances where AI produced incorrect, biased, or decontextualized outputs; explains how these were caught and corrected; discusses what would happen if they were not caught',
        proficient: 'Notes some AI errors or limitations with examples but does not fully explore implications',
        developing: 'Accepts AI outputs uncritically or mentions limitations only in abstract terms',
        insufficient: 'No evidence of evaluating AI outputs for accuracy, bias, or contextual appropriateness',
      },
    ],
    implementationNotes:
      'Provide the dataset pre-cleaned to keep the focus on analysis rather than data wrangling. Include at least 20 interview excerpts and 100+ survey responses so AI has enough material to work with. The methodological reflection is where students demonstrate real learning — allocate class time for a peer discussion of AI failure modes before the reflection is due.',
    documentationTemplate:
      '## AI Use Documentation — Mixed Methods Analysis\n\n### Qualitative Coding\n**AI Tool:** [name]\n**Prompts Used:**\n1. Initial coding prompt: [exact text]\n2. Code refinement prompt(s): [exact text]\n3. Pattern identification prompt: [exact text]\n\n**AI-Generated Codes:** [list codes AI produced]\n**Codes You Modified:** [list with rationale for changes]\n**Codes You Added That AI Missed:** [list with explanation of why AI missed them]\n**Codes You Rejected:** [list with explanation]\n\n### Quantitative Analysis\n**AI Tool:** [name]\n**Analysis Requested:** [describe]\n**Prompts Used:** [exact text]\n**AI Output:** [summary of results]\n**Your Verification Steps:** [how you checked accuracy]\n**Errors or Concerns Identified:** [specific issues]\n\n### Integration\n**How did you use AI to connect qualitative and quantitative findings?** [description]\n**Where did AI struggle with integration?** [specific examples]\n\n### Methodological Reflection Prep\n**Top 3 things AI did well:** [list]\n**Top 3 things AI got wrong or missed:** [list with specific evidence]\n**What would you do differently next time?** [reflection]',
    tags: ['mixed-methods', 'ai-required', 'qualitative-coding', 'quantitative-analysis', 'methodological-reflection', 'fluency'],
  },

  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    title: 'Simulated Policy Roundtable',
    description:
      'Use AI to simulate a policy roundtable with 4-5 stakeholders on a contentious issue (e.g., campus policing reform or Medicaid expansion). Prepare position papers through iterative prompting, moderate a cross-stakeholder "discussion," and write a synthesis memo evaluating where AI-generated perspectives succeed and where they flatten lived experience.',
    assignmentType: 'SIMULATION',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'Use AI to model a policy roundtable with 4-5 stakeholders on a contentious social issue. Deliverables: stakeholder map, iteratively prompted position papers, a moderated cross-stakeholder discussion, and a 2,000-word synthesis memo evaluating where AI-generated positions succeed and where they flatten lived experience. AI use is required and must be fully documented. Grading: stakeholder map 10%, position papers and prompting 20%, moderation quality 20%, synthesis memo 50%.',
    rubricRows: [
      {
        criterion: 'Stakeholder Mapping and Selection',
        excellent: 'Identifies non-obvious stakeholders beyond the usual suspects; maps power dynamics, interdependencies, and potential coalitions; includes marginalized voices that AI might overlook',
        proficient: 'Reasonable stakeholder selection covering major perspectives; power mapping is present but could include less visible actors',
        developing: 'Stakeholders are the most obvious choices; no power analysis or consideration of marginalized perspectives',
        insufficient: 'Fewer than 4 stakeholders or selection reflects only one side of the issue',
      },
      {
        criterion: 'Quality of AI-Prompted Position Papers',
        excellent: 'Prompting produces nuanced, internally consistent positions that reflect real-world complexity; student iterates to correct stereotyping, oversimplification, or false balance',
        proficient: 'Positions are reasonable but occasionally stereotypical or oversimplified; some evidence of iterative refinement',
        developing: 'Positions are generic or one-dimensional; minimal iteration — student accepted first AI output',
        insufficient: 'Positions are caricatures or internally contradictory with no refinement attempted',
      },
      {
        criterion: 'Moderation and Discussion Quality',
        excellent: 'Student guides AI stakeholders into genuine engagement with each other\'s arguments; surfaces trade-offs and points of potential agreement; introduces complications and real-world constraints',
        proficient: 'Discussion covers key disagreements but stays at the surface; limited cross-stakeholder engagement',
        developing: 'Discussion is a series of monologues rather than a dialogue; student does not push stakeholders to engage',
        insufficient: 'No moderated discussion, or discussion is a single prompt with no interactive engagement',
      },
      {
        criterion: 'Critical Evaluation of AI-Generated Positions',
        excellent: 'Identifies specific ways AI stereotyped, flattened, or missed perspectives; explains what lived experience or local knowledge AI cannot simulate; proposes how AI-generated positions could mislead a policymaker',
        proficient: 'Notes some limitations of AI positions with examples but does not fully explore implications for policy analysis',
        developing: 'Accepts AI positions as adequate representations with only token critique',
        insufficient: 'No critical evaluation of AI outputs, or treats AI-generated perspectives as authoritative',
      },
      {
        criterion: 'Synthesis and Policy Recommendation',
        excellent: 'Synthesis genuinely integrates insights from the simulation; recommendation accounts for power dynamics and feasibility; student identifies what the AI simulation revealed vs. what it obscured',
        proficient: 'Reasonable synthesis with a clear recommendation but limited reflection on simulation limitations',
        developing: 'Recommendation does not follow from the simulation or ignores key stakeholder concerns',
        insufficient: 'No synthesis or recommendation; paper ends with the simulation without interpretive work',
      },
    ],
    implementationNotes:
      'Walk through one example roundtable in class before assigning — students need to see what "iterative prompting for authentic perspectives" looks like versus accepting the first AI output. The biggest pitfall is students who let AI produce caricatures of stakeholder positions; emphasize in your rubric walkthrough that prompting sophistication matters. This assignment works well for any class size since each student runs their own simulation independently.',
    documentationTemplate:
      '## AI Use Documentation — Simulated Policy Roundtable\n\n**AI Tool Used:** [name]\n**Policy Issue:** [describe]\n\n### Stakeholder Position Generation\n| Stakeholder | Initial Prompt | AI Limitations Noticed | Refinement Prompts | Final Assessment of Authenticity |\n|------------|---------------|----------------------|-------------------|--------------------------------|\n| [Name/Role] | [text] | [what was wrong or missing] | [how you pushed AI to improve] | [your evaluation: realistic? stereotyped? missing what?] |\n| ... | | | | |\n\n### Moderation Log\n| Exchange # | Your Moderation Prompt | What Happened | What You Noticed |\n|-----------|----------------------|--------------|------------------|\n| 1 | [text] | [AI response summary] | [observations about realism, depth, stereotyping] |\n| ... | | | |\n\n### Perspectives AI Could Not Represent\n- [Stakeholder or viewpoint AI failed to capture authentically]\n- Why AI struggled: [your analysis]\n- What would be needed to represent this perspective: [lived experience, local knowledge, etc.]\n\n### Overall Reflection\n- Total AI interactions: [count]\n- Most surprising AI output: [describe]\n- Most concerning AI failure: [describe]\n- What this simulation taught you about AI in policy analysis: [reflection]',
    tags: ['policy-simulation', 'stakeholder-analysis', 'ai-required', 'deliberative-democracy', 'power-mapping', 'fluency'],
  },
]
