import type { AssignmentTemplateData } from './types'

export const HUMANITIES_ASSIGNMENTS: AssignmentTemplateData[] = [
  // ─────────────────────────────────────────────
  // FOUNDATION tier (3) — aiLevel: 'PROHIBIT'
  // ─────────────────────────────────────────────
  {
    disciplineFamily: 'HUMANITIES',
    title: 'Close Reading with Textual Evidence',
    description:
      'Select a 3-5 page passage — such as the opening of Toni Morrison\'s Beloved or a chapter from W.E.B. Du Bois\'s The Souls of Black Folk — and construct an analytical argument grounded in specific textual evidence. Anchor every interpretive claim with at least one page number or line reference, then bring your draft to an in-class partner discussion to compare readings and identify points of divergence.',
    assignmentType: 'ESSAY',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'No AI tools permitted, including grammar checkers beyond standard spell-check. All interpretive claims must cite direct quotations or paraphrases with page/line references. You will bring your draft to a mandatory in-class partner discussion; attendance factors into your grade. Submissions lacking textual evidence or showing signs of AI-generated prose will receive a failing grade and may be referred for academic integrity review.',
    rubricRows: [
      {
        criterion: 'Originality of Interpretation',
        excellent: 'Presents a genuinely surprising or nuanced reading that goes beyond surface-level summary, demonstrating independent critical thought.',
        proficient: 'Offers a coherent interpretive claim that moves beyond summary, though the reading may be somewhat predictable.',
        developing: 'Attempts an interpretation but relies heavily on paraphrase or common observations without a distinct analytical angle.',
        insufficient: 'Summarizes the passage without offering any interpretive claim or analytical framework.',
      },
      {
        criterion: 'Textual Evidence and Citation',
        excellent: 'Every claim is anchored by precise, well-chosen quotations with accurate page/line citations; evidence and argument are seamlessly integrated.',
        proficient: 'Most claims are supported by relevant textual evidence with citations, though some quotations may be imprecise or under-analyzed.',
        developing: 'Some textual evidence is present but citations are inconsistent, and connections between evidence and argument are unclear.',
        insufficient: 'Little or no textual evidence cited; claims float without support from the text.',
      },
      {
        criterion: 'Prose Quality and Structure',
        excellent: 'Writing is clear, precise, and well-organized with logical paragraph transitions and a strong throughline from introduction to conclusion.',
        proficient: 'Writing is generally clear and organized, with minor issues in transitions or paragraph cohesion.',
        developing: 'Writing is understandable but disorganized or vague in places, weakening the overall argument.',
        insufficient: 'Writing is unclear, disorganized, or riddled with errors that impede comprehension.',
      },
      {
        criterion: 'In-Class Discussion Engagement',
        excellent: 'Actively engages partner with substantive questions, responds thoughtfully to alternative readings, and refines own interpretation through dialogue.',
        proficient: 'Participates meaningfully in discussion, sharing own reading and responding to partner, though engagement may be uneven.',
        developing: 'Participates minimally or struggles to articulate connections between own reading and partner\'s interpretation.',
        insufficient: 'Absent, unprepared, or does not engage with partner during the discussion.',
      },
    ],
    implementationNotes:
      'Select passages that are rich enough to sustain multiple interpretations but short enough (3-5 pages) that students can cite specific lines. Pair students with different initial reactions during the discussion phase to maximize productive disagreement. A common pitfall is students who quote extensively but never analyze the quotation — model the difference between "evidence dropping" and "evidence analysis" before the assignment.',
    documentationTemplate: null,
    tags: ['literature', 'close-reading', 'in-class', 'textual-analysis', 'writing'],
  },
  {
    disciplineFamily: 'HUMANITIES',
    title: 'Timed Argumentative Essay',
    description:
      'Write a complete argumentative essay during a single class period in response to a prompt and 2-3 provided source texts. Construct a thesis, marshal evidence, and write persuasively under time constraints — no AI tools, no devices, no outside materials.',
    assignmentType: 'EXAM',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'No electronic devices, AI tools, or outside materials permitted — write using only the provided prompt and source texts during a single class session. Your grade reflects thesis quality, use of provided sources as evidence, and argument coherence under time pressure. This format ensures the essay represents your authentic analytical abilities and writing voice.',
    rubricRows: [
      {
        criterion: 'Thesis and Argument Structure',
        excellent: 'Presents a clear, debatable thesis and sustains a logical argument throughout, with each paragraph advancing the central claim.',
        proficient: 'States a clear thesis and organizes an argument around it, though some paragraphs may drift from the central claim.',
        developing: 'Thesis is vague or buried; argument lacks consistent direction or logical progression.',
        insufficient: 'No identifiable thesis; response reads as summary or disconnected observations.',
      },
      {
        criterion: 'Use of Provided Sources',
        excellent: 'Integrates source material strategically to support, complicate, or contextualize the argument; demonstrates genuine engagement with the texts.',
        proficient: 'References source material to support claims, though integration may be mechanical or limited to agreement.',
        developing: 'Mentions sources but does not effectively connect them to the argument or misrepresents their content.',
        insufficient: 'Ignores provided sources or uses them inaccurately.',
      },
      {
        criterion: 'Persuasive Writing Under Constraint',
        excellent: 'Writing is fluid, purposeful, and persuasive despite time constraints; reads as a polished draft with clear voice.',
        proficient: 'Writing communicates ideas effectively with minor rough spots attributable to time pressure.',
        developing: 'Writing is understandable but choppy, repetitive, or unfocused in places.',
        insufficient: 'Writing is incoherent, incomplete, or too brief to constitute a meaningful response.',
      },
    ],
    implementationNotes:
      'Provide the source texts at the start of the period, not in advance, to prevent pre-written essays. Allow 5-10 minutes of reading time before writing begins. Students accustomed to AI-assisted drafting often struggle with timed writing — consider offering a low-stakes practice session earlier in the semester so the format itself is not a barrier to demonstrating knowledge.',
    documentationTemplate: null,
    tags: ['argumentation', 'timed-writing', 'in-class', 'exam', 'critical-thinking'],
  },
  {
    disciplineFamily: 'HUMANITIES',
    title: 'Socratic Seminar Participation',
    description:
      'Prepare at least three open-ended discussion questions and annotate assigned readings before a structured Socratic Seminar. During the seminar, cite specific passages to support claims, engage constructively with peers\' interpretations, and demonstrate willingness to revise your position in real time.',
    assignmentType: 'DISCUSSION',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'AI tools may not be used to generate questions or prepare notes — arrive with at least three handwritten discussion questions and annotated copies of the readings. You will be graded on question originality, textual evidence specificity, peer engagement, and willingness to revise your thinking in real time. Seminar grades cannot be made up; absence earns a zero for that session.',
    rubricRows: [
      {
        criterion: 'Quality of Prepared Questions',
        excellent: 'Questions are genuinely open-ended, rooted in the text, and generative — they open new lines of inquiry rather than seeking factual recall.',
        proficient: 'Questions engage the text meaningfully and invite discussion, though some may be answerable with simple recall.',
        developing: 'Questions are generic or only loosely connected to the assigned reading.',
        insufficient: 'No prepared questions, or questions are factual/yes-no in nature.',
      },
      {
        criterion: 'Textual Evidence in Discussion',
        excellent: 'Consistently references specific passages, quotes, or details from the text to ground claims and respond to peers.',
        proficient: 'References the text several times during discussion, though citations may sometimes be vague or imprecise.',
        developing: 'Occasionally references the text but relies mostly on general impressions or personal opinion.',
        insufficient: 'Makes no reference to the text during discussion.',
      },
      {
        criterion: 'Engagement with Peers\' Ideas',
        excellent: 'Builds on, challenges, or synthesizes peers\' contributions with genuine curiosity; demonstrates active listening and intellectual generosity.',
        proficient: 'Responds to peers\' ideas and makes connections, though may sometimes redirect to own prepared points.',
        developing: 'Acknowledges peers\' contributions but does not substantively engage with or build on them.',
        insufficient: 'Ignores peers\' contributions or dominates discussion without listening.',
      },
      {
        criterion: 'Intellectual Risk-Taking',
        excellent: 'Willing to revise initial position, explore uncertainty, and entertain interpretations that challenge own assumptions.',
        proficient: 'Shows some openness to alternative interpretations and adjusts thinking when presented with strong evidence.',
        developing: 'Tends to defend initial position without seriously considering alternatives.',
        insufficient: 'Rigid or disengaged; does not participate in the collective interpretive process.',
      },
    ],
    implementationNotes:
      'Arrange seating in a circle or fishbowl format to signal that this is a peer-driven discussion, not a lecture. Establish norms explicitly: no devices, direct address to peers (not the instructor), and a requirement to cite the text before making a claim. A common failure mode is students preparing AI-generated questions and reading them verbatim — requiring handwritten preparation notes and follow-up questions during the seminar helps surface authentic engagement.',
    documentationTemplate: null,
    tags: ['seminar', 'close-reading', 'in-class', 'oral-communication', 'interpretation'],
  },

  // ─────────────────────────────────────────────
  // AWARENESS tier (3) — aiLevel: 'CAUTIOUS'
  // ─────────────────────────────────────────────
  {
    disciplineFamily: 'HUMANITIES',
    title: 'Process Portfolio Essay',
    description:
      'Build a 4-stage writing portfolio — brainstorm, outline, peer-reviewed draft, and polished final essay with a change log documenting every revision. Use AI only for grammar checking and initial brainstorming; all substantive argumentation, analysis, and interpretation must be your own work.',
    assignmentType: 'PORTFOLIO',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'AI may be used for grammar/spell-checking and brainstorming prompts only — not for drafting, revising, or restructuring thesis statements, analytical paragraphs, or interpretive claims. Your change log must document every significant revision, including any AI-assisted changes. Portfolios that skip stages, lack a change log, or show AI-generated substantive content will be graded accordingly; process is weighted equally with product.',
    rubricRows: [
      {
        criterion: 'Evidence of Authentic Process',
        excellent: 'Portfolio shows clear intellectual evolution across all four stages; brainstorm and outline contain ideas that visibly develop into the final argument.',
        proficient: 'All four stages are present and show meaningful development, though some transitions between stages feel abrupt.',
        developing: 'Portfolio stages are present but feel disconnected or retroactively assembled; limited evidence of genuine revision.',
        insufficient: 'Missing stages, or stages appear to have been generated simultaneously rather than sequentially.',
      },
      {
        criterion: 'Appropriate AI Boundary Awareness',
        excellent: 'AI use is limited to grammar/brainstorming as specified; change log clearly distinguishes human revision from AI-assisted edits.',
        proficient: 'AI use appears to follow guidelines; change log documents AI-assisted changes, though documentation could be more specific.',
        developing: 'AI use may exceed guidelines in places; change log is incomplete or vague about which changes involved AI.',
        insufficient: 'Substantive content appears AI-generated, or no documentation of AI use despite clear signs of AI assistance.',
      },
      {
        criterion: 'Quality of Final Argument',
        excellent: 'Final essay presents a compelling, well-evidenced argument with a clear interpretive voice and sophisticated engagement with the text.',
        proficient: 'Final essay presents a clear argument supported by evidence, though analysis may lack depth in places.',
        developing: 'Final essay has an identifiable argument but evidence is thin or analysis is superficial.',
        insufficient: 'Final essay lacks a coherent argument or reads as summary without interpretation.',
      },
      {
        criterion: 'Peer Review Engagement',
        excellent: 'Peer review comments are substantive and specific; final essay demonstrates thoughtful response to peer feedback in the change log.',
        proficient: 'Peer review comments address content and structure; some peer suggestions are incorporated in the final draft.',
        developing: 'Peer review comments are superficial (e.g., "good job") or the final draft shows little response to feedback.',
        insufficient: 'No peer review evidence, or peer comments are absent/fabricated.',
      },
    ],
    implementationNotes:
      'Stagger portfolio deadlines across the semester rather than collecting everything at once — this makes retroactive fabrication of early stages much harder. The most common pitfall is students using AI to generate the brainstorm after writing the essay, producing an unconvincingly neat "process." Require handwritten or timestamped brainstorming to mitigate this. Pair students for peer review early so they have accountability partners throughout.',
    documentationTemplate:
      '## AI Usage Documentation — Process Portfolio Essay\n\n**Student Name:**\n**Date:**\n\n### Stage 1: Brainstorm\n- Did you use AI during brainstorming? (Yes/No)\n- If yes, what tool and what prompt did you use?\n- What ideas came from AI vs. your own thinking?\n\n### Stage 2: Outline\n- Did you use AI to structure your outline? (Yes/No)\n- If yes, describe what you asked and what you kept vs. discarded.\n\n### Stage 3: Draft → Final Revision\n- List each AI-assisted change (grammar, word choice, etc.):\n  1. [Original sentence] → [Revised sentence] — Tool used: ___\n  2. ...\n- Confirm: No AI was used for thesis development, argument structure, or interpretive claims. (Yes/No)\n\n### Reflection (2-3 sentences)\nHow did limiting AI to grammar/brainstorming affect your writing process?',
    tags: ['writing-process', 'portfolio', 'peer-review', 'revision', 'close-reading'],
  },
  {
    disciplineFamily: 'HUMANITIES',
    title: 'Translation Comparison Analysis',
    description:
      'Compare two published translations of a passage — for example, the King James and Robert Alter renderings of Genesis 1, or Fagles vs. Lattimore on Iliad Book 1 — then generate an AI translation of the same passage. Write an analytical essay examining what each translation prioritizes, what is lost or transformed, and what the differences reveal about the act of interpretation itself.',
    assignmentType: 'ESSAY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'AI may be used only to generate the translation for analysis — not to draft or revise the analytical essay itself. Document which AI tool you used, the exact prompt, and the unedited output; include the original-language passage and all translations as an appendix. Essays that use AI for the analysis will be graded as incomplete.',
    rubricRows: [
      {
        criterion: 'Depth of Comparative Analysis',
        excellent: 'Identifies subtle, meaningful differences across translations and connects them to larger questions about language, culture, or interpretation.',
        proficient: 'Identifies clear differences between translations and offers reasonable explanations for the translators\' choices.',
        developing: 'Notes surface-level differences (word choice) without analyzing their interpretive significance.',
        insufficient: 'Merely lists differences without analysis, or fails to compare translations substantively.',
      },
      {
        criterion: 'Critical Engagement with AI Translation',
        excellent: 'Treats the AI translation as a revealing object of study — analyzes what its patterns, errors, or flatness expose about machine interpretation and humanistic meaning-making.',
        proficient: 'Compares the AI translation meaningfully to human translations and identifies key differences in approach or quality.',
        developing: 'Mentions the AI translation but does not analyze it with the same rigor applied to human translations.',
        insufficient: 'Ignores the AI translation or treats it as simply "wrong" without analysis.',
      },
      {
        criterion: 'Argument and Thesis',
        excellent: 'Builds a cohesive argument about what translation comparison reveals — about the text, about language, or about AI\'s role in humanistic work.',
        proficient: 'Presents a clear thesis connecting the comparison to a broader point about translation or interpretation.',
        developing: 'Thesis is present but thin; essay reads more as a comparison than an argument.',
        insufficient: 'No discernible thesis; essay is purely descriptive.',
      },
      {
        criterion: 'Documentation of AI Use',
        excellent: 'Appendix includes original passage, all translations, AI tool name, exact prompt, and unedited output — fully reproducible.',
        proficient: 'Appendix includes required materials with minor omissions (e.g., prompt phrasing is paraphrased rather than exact).',
        developing: 'Appendix is incomplete — missing the original passage, a translation, or AI documentation.',
        insufficient: 'No appendix or documentation of AI-generated translation.',
      },
    ],
    implementationNotes:
      'Choose source texts where published translations differ significantly — poetry and philosophical prose work especially well. Provide students with access to at least two translations rather than requiring them to find their own, as sourcing translations can become a barrier. The key pedagogical moment is when students discover that the AI translation is often grammatically correct but interpretively flat — guide them to articulate why that matters rather than simply declaring human translation "better."',
    documentationTemplate:
      '## AI Usage Documentation — Translation Comparison\n\n**Student Name:**\n**Date:**\n\n### AI Translation Details\n- AI tool used (e.g., ChatGPT, Claude, Google Translate):\n- Exact prompt given to the AI:\n- Date of AI interaction:\n- Did you modify the AI output in any way? (Yes/No)\n  - If yes, describe modifications:\n\n### Appendix Checklist\n- [ ] Original-language passage included\n- [ ] Published Translation 1 included (translator name: ___)\n- [ ] Published Translation 2 included (translator name: ___)\n- [ ] Unedited AI translation included\n\n### Reflection (2-3 sentences)\nWhat did the AI translation reveal about the limits of machine interpretation for this particular passage?',
    tags: ['translation', 'comparative-analysis', 'language', 'ai-literacy', 'literature'],
  },
  {
    disciplineFamily: 'HUMANITIES',
    title: 'Annotated Bibliography with AI Audit',
    description:
      'Compile an annotated bibliography of 8 scholarly sources found through library databases and citation chaining. Then prompt an AI tool to generate 8 sources on the same topic and systematically audit each one — verify existence, assess relevance, and document every hallucinated or fabricated citation.',
    assignmentType: 'ESSAY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'AI may be used only for the source-generation portion of Part 2 — your annotations and comparative analysis must be written without AI assistance. Document your verification method for every AI-suggested source (library catalog, Google Scholar, DOI lookup, etc.). Papers submitted without the audit table or comparative analysis will lose a full letter grade.',
    rubricRows: [
      {
        criterion: 'Quality of Human-Sourced Bibliography',
        excellent: 'All 8 sources are scholarly, relevant, and diverse in perspective; annotations demonstrate genuine engagement with each source\'s argument and methodology.',
        proficient: 'Sources are relevant and mostly scholarly; annotations summarize content and relevance clearly, though engagement depth varies.',
        developing: 'Some sources are marginal in relevance or quality; annotations are superficial or formulaic.',
        insufficient: 'Fewer than 8 sources, sources are inappropriate for academic research, or annotations are missing/copied.',
      },
      {
        criterion: 'Rigor of AI Source Audit',
        excellent: 'Every AI-suggested source is systematically verified — existence confirmed/denied with evidence, relevance assessed, and hallucination patterns identified and analyzed.',
        proficient: 'Most AI sources are verified with clear documentation of which exist and which are fabricated; analysis notes patterns.',
        developing: 'Some verification attempted but inconsistent; hallucinated sources may be accepted without verification.',
        insufficient: 'No meaningful verification of AI sources, or AI sources presented as legitimate without checking.',
      },
      {
        criterion: 'Comparative Analysis',
        excellent: 'Analysis draws insightful conclusions about AI\'s strengths and limitations as a research tool, grounded in specific evidence from both bibliographies.',
        proficient: 'Analysis identifies key differences between human and AI research approaches with supporting examples.',
        developing: 'Analysis is general or superficial — states that AI makes errors without analyzing patterns or implications.',
        insufficient: 'No comparative analysis, or analysis does not engage with the actual results of the audit.',
      },
    ],
    implementationNotes:
      'Run this assignment early in the semester so students encounter AI hallucination firsthand before they are tempted to use AI for research in later papers. Require students to document their verification method for each AI source (e.g., "searched Google Scholar," "checked library catalog") so you can assess their research skills alongside their AI literacy. The most common pitfall is students who verify only the first 2-3 AI sources and assume the rest are similarly reliable or unreliable — require verification of all 8.',
    documentationTemplate:
      '## AI Usage Documentation — Annotated Bibliography Audit\n\n**Student Name:**\n**Date:**\n**Research Topic:**\n\n### AI Source Generation\n- AI tool used:\n- Exact prompt:\n- Date of interaction:\n\n### AI Source Audit Table\n| # | AI-Suggested Citation | Exists? (Y/N) | Verification Method | Relevant? | Quality Notes |\n|---|----------------------|----------------|--------------------|-----------|--------------|\n| 1 |                      |                |                    |           |              |\n| 2 |                      |                |                    |           |              |\n| 3 |                      |                |                    |           |              |\n| 4 |                      |                |                    |           |              |\n| 5 |                      |                |                    |           |              |\n| 6 |                      |                |                    |           |              |\n| 7 |                      |                |                    |           |              |\n| 8 |                      |                |                    |           |              |\n\n### Summary\n- Total AI sources verified as real: ___/8\n- Total hallucinated/fabricated: ___/8\n- Patterns noticed in AI errors:',
    tags: ['research-methods', 'bibliography', 'ai-hallucination', 'source-evaluation', 'information-literacy'],
  },

  // ─────────────────────────────────────────────
  // PARTNERSHIP tier (3) — aiLevel: 'GUIDED'
  // ─────────────────────────────────────────────
  {
    disciplineFamily: 'HUMANITIES',
    title: 'Dialectical Journal with AI Interlocutor',
    description:
      'Write a 300-400 word dialectical journal entry for each assigned reading — your interpretation, questions, and connections — then engage an AI as interlocutor for at least 3 turns, prompting it to challenge or complicate your reading. Submit the journal entries, complete AI dialogue transcripts, and a 600-word synthesis reflection on how the exchange shaped your thinking.',
    assignmentType: 'PORTFOLIO',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Use AI as a genuine intellectual interlocutor — not a source of "correct" answers. Submit original journal entries (written before the AI dialogue), complete AI transcripts, and a 600-word synthesis reflection. Document every AI exchange with exact prompts and unedited responses. Submitting AI dialogues without substantive original entries will result in a failing grade.',
    rubricRows: [
      {
        criterion: 'Quality of Original Journal Entries',
        excellent: 'Entries demonstrate genuine, independent engagement with the text — raising substantive questions, making unexpected connections, and venturing interpretive risks.',
        proficient: 'Entries show thoughtful reading and raise relevant questions, though interpretations may stay within conventional bounds.',
        developing: 'Entries summarize more than interpret, or raise questions without attempting to work through them.',
        insufficient: 'Entries are superficial, formulaic, or appear written after the AI dialogue rather than before.',
      },
      {
        criterion: 'Sophistication of AI Prompting',
        excellent: 'Prompts are specific, intellectually demanding, and build on previous AI responses — treating the AI as a genuine interlocutor whose claims must be interrogated.',
        proficient: 'Prompts engage the AI in meaningful exchange, though some prompts are generic or accept AI responses without pushback.',
        developing: 'Prompts are vague or deferential — asking the AI "what do you think?" rather than challenging it with specific interpretive questions.',
        insufficient: 'Prompts are minimal, off-topic, or designed to extract answers rather than generate dialogue.',
      },
      {
        criterion: 'Synthesis Reflection',
        excellent: 'Reflection demonstrates genuine intellectual growth — articulating specifically how the AI dialogue confirmed, complicated, or transformed the original interpretation, with concrete examples.',
        proficient: 'Reflection identifies how the AI exchange influenced thinking, with some specific references to the dialogue.',
        developing: 'Reflection is general — states that the AI was "helpful" or "interesting" without specifics.',
        insufficient: 'Reflection is missing, perfunctory, or does not engage with the actual content of the AI dialogue.',
      },
      {
        criterion: 'Critical Distance from AI Output',
        excellent: 'Student consistently evaluates AI responses — noting where the AI is insightful, where it is generic, and where it misses the point of the text.',
        proficient: 'Student shows awareness that AI responses require evaluation and pushes back on at least some claims.',
        developing: 'Student mostly accepts AI responses at face value, with limited critical evaluation.',
        insufficient: 'Student treats AI output as authoritative; no evidence of critical evaluation.',
      },
    ],
    implementationNotes:
      'Model effective AI prompting in class before assigning — show students the difference between asking "What does this poem mean?" and "I think the speaker\'s tone shifts in line 12 from resignation to defiance. Push back on that reading." The biggest pitfall is students who write their journal entries after reading the AI dialogue, which defeats the purpose. Require journal entries to be submitted or timestamped before the AI dialogue begins. Consider having students share particularly productive AI exchanges in class discussion.',
    documentationTemplate:
      '## AI Usage Documentation — Dialectical Journal\n\n**Student Name:**\n**Date:**\n**Reading:**\n\n### Original Journal Entry\n[Paste your 300-400 word entry written BEFORE the AI dialogue]\n\n### AI Dialogue\n- AI tool used:\n- Date of interaction:\n\n**Turn 1 — Your prompt:**\n[Paste exact prompt]\n\n**Turn 1 — AI response:**\n[Paste full response]\n\n**Turn 2 — Your follow-up:**\n[Paste exact prompt]\n\n**Turn 2 — AI response:**\n[Paste full response]\n\n**Turn 3 — Your follow-up:**\n[Paste exact prompt]\n\n**Turn 3 — AI response:**\n[Paste full response]\n\n[Add additional turns as needed]\n\n### Synthesis Reflection (600 words)\nHow did this dialogue change, deepen, or fail to change your interpretation?',
    tags: ['dialectical-journal', 'ai-dialogue', 'close-reading', 'interpretation', 'reflection'],
  },
  {
    disciplineFamily: 'HUMANITIES',
    title: 'Historical Argument with AI Counter-Argument',
    description:
      'Write a 1,000-word historical argument — for example, arguing that Reconstruction\'s failure was primarily economic rather than political — supported by primary and secondary sources. Then prompt AI to generate the strongest possible counter-argument to your thesis, and write a 500-word rebuttal addressing the challenge with additional evidence.',
    assignmentType: 'ESSAY',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'AI may be used only to generate the counter-argument — share your full thesis and key evidence so the AI can construct a meaningful challenge. Submit all three sections plus a transcript of your AI interaction documenting exact prompts and unedited responses. Any portion of the original argument or rebuttal that is AI-generated will be treated as a violation of the assignment\'s terms.',
    rubricRows: [
      {
        criterion: 'Strength of Original Argument',
        excellent: 'Argument is historically grounded, clearly structured, and supported by well-chosen primary and secondary sources with proper citations.',
        proficient: 'Argument is clear and supported by relevant sources, though evidence could be more varied or analysis deeper.',
        developing: 'Argument is present but under-supported or relies on assertion more than evidence.',
        insufficient: 'No clear argument, or claims are unsupported by historical evidence.',
      },
      {
        criterion: 'Quality of AI Prompting for Counter-Argument',
        excellent: 'Prompt provides the AI with full thesis, key evidence, and specific instructions to challenge the weakest points — producing a substantive, targeted counter-argument.',
        proficient: 'Prompt shares the thesis and asks for a counter-argument, producing a relevant if somewhat generic challenge.',
        developing: 'Prompt is vague, producing a counter-argument that does not meaningfully engage with the specific thesis.',
        insufficient: 'No meaningful AI interaction, or prompt is so generic that the counter-argument is irrelevant.',
      },
      {
        criterion: 'Rigor of Rebuttal',
        excellent: 'Rebuttal directly addresses the AI counter-argument\'s strongest points with new evidence or refined reasoning, demonstrating genuine intellectual engagement with the challenge.',
        proficient: 'Rebuttal addresses the counter-argument with additional evidence, though some points are conceded without full engagement.',
        developing: 'Rebuttal dismisses the counter-argument without substantive engagement or new evidence.',
        insufficient: 'Rebuttal is missing, perfunctory, or simply restates the original argument.',
      },
      {
        criterion: 'Historical Reasoning',
        excellent: 'Demonstrates sophisticated historical thinking — contextualizes claims, acknowledges complexity, and avoids presentism throughout all three sections.',
        proficient: 'Shows competent historical reasoning with appropriate contextualization in most sections.',
        developing: 'Historical reasoning is inconsistent — some claims lack context or fall into presentist thinking.',
        insufficient: 'Little evidence of historical thinking; claims are anachronistic or decontextualized.',
      },
    ],
    implementationNotes:
      'Teach students to prompt effectively by modeling the difference between "argue against my thesis" and "here is my thesis with three supporting points — identify the weakest point and construct a counter-argument using evidence from [time period/region]." The most common pitfall is students who prompt lazily and then dismiss a weak AI counter-argument, learning nothing. Require the AI interaction transcript so you can evaluate prompting quality. Consider assigning this after a debate or discussion unit so students are already thinking adversarially.',
    documentationTemplate:
      '## AI Usage Documentation — Historical Argument with AI Counter-Argument\n\n**Student Name:**\n**Date:**\n**Thesis Statement:**\n\n### AI Interaction\n- AI tool used:\n- Date of interaction:\n\n**Your prompt to the AI:**\n[Paste your exact prompt — include the thesis and evidence you shared]\n\n**AI-generated counter-argument:**\n[Paste the full, unedited AI response]\n\n**Did you refine your prompt? (Yes/No)**\n- If yes, paste the refined prompt and second AI response:\n\n### Self-Assessment\n- What was the strongest point in the AI counter-argument?\n- How did you address it in your rebuttal?\n- Did the AI raise anything you had not considered? (Yes/No)\n  - If yes, how did it change your thinking?',
    tags: ['history', 'argumentation', 'counter-argument', 'ai-partnership', 'critical-thinking'],
  },
  {
    disciplineFamily: 'HUMANITIES',
    title: 'Digital Humanities Data Analysis',
    description:
      'Use AI-powered tools (e.g., Voyant Tools, topic modeling, sentiment analysis) to perform computational analysis of an assigned text corpus — such as word frequency across Shakespeare\'s comedies vs. tragedies, or sentiment patterns in 19th-century slave narratives. Write a 1,500-2,000 word interpretive essay connecting computational findings to a humanistic research question about meaning, authorship, or cultural context.',
    assignmentType: 'PROJECT',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'AI tools may be used for text analysis and to help interpret initial patterns, but your research question, argument, and interpretive framework must be your own. Submit computational results, a complete log of all tools and prompts used, and the interpretive essay. Computational results without interpretation — or interpretation disconnected from data — will not receive a passing grade.',
    rubricRows: [
      {
        criterion: 'Quality of Humanistic Research Question',
        excellent: 'Research question is specific, interesting, and genuinely illuminated by computational analysis — the question could not be answered as effectively without the data.',
        proficient: 'Research question is clear and connects meaningfully to computational analysis, though the connection could be tighter.',
        developing: 'Research question is generic or only loosely connected to the computational findings.',
        insufficient: 'No clear research question, or the question has no meaningful relationship to the computational analysis.',
      },
      {
        criterion: 'Effective Use of AI/Computational Tools',
        excellent: 'Tools are used purposefully and appropriately; student demonstrates understanding of what the tools measure and their limitations.',
        proficient: 'Tools are used appropriately and results are accurately reported, though the student may not fully interrogate tool limitations.',
        developing: 'Tools are used but results are misinterpreted or presented without understanding of methodology.',
        insufficient: 'Tools are used minimally or incorrectly; results are unreliable or fabricated.',
      },
      {
        criterion: 'Interpretive Argument',
        excellent: 'Essay builds a compelling argument that moves between computational evidence and humanistic interpretation, demonstrating why the data matters for understanding the text(s).',
        proficient: 'Essay connects data to interpretation clearly, though the argument may be more descriptive than analytical in places.',
        developing: 'Essay presents data and offers some interpretation, but the two feel disconnected or the interpretation is thin.',
        insufficient: 'Essay merely reports computational results without humanistic interpretation, or ignores the data entirely.',
      },
      {
        criterion: 'Documentation and Reproducibility',
        excellent: 'All tools, prompts, settings, and outputs are documented clearly enough that another student could reproduce the analysis.',
        proficient: 'Most tools and prompts are documented, with minor gaps in reproducibility.',
        developing: 'Documentation is incomplete — tools are named but prompts or settings are missing.',
        insufficient: 'No meaningful documentation of computational methods.',
      },
    ],
    implementationNotes:
      'Provide a pre-selected text corpus rather than asking students to assemble one — corpus assembly is a separate skill and can derail the assignment. Demonstrate at least one tool (e.g., Voyant Tools, AI-powered sentiment analysis) in class so students see the workflow before attempting it independently. The most common pitfall in digital humanities assignments is students who run a tool, get results, and describe those results without asking "so what?" — the interpretive essay must answer a question that matters to someone who studies these texts.',
    documentationTemplate:
      '## AI Usage Documentation — Digital Humanities Data Analysis\n\n**Student Name:**\n**Date:**\n**Text Corpus Analyzed:**\n**Research Question:**\n\n### Tools and Methods\n| Tool/AI Used | Purpose | Specific Prompt or Settings | Output Type |\n|-------------|---------|---------------------------|-------------|\n|             |         |                           |             |\n|             |         |                           |             |\n\n### AI Interaction Log\nFor each AI interaction beyond basic tool use:\n- **Prompt:**\n- **AI Response (summary or full paste):**\n- **How you used this in your essay:**\n\n### Computational Results\n[Attach or embed visualizations, tables, or output logs]\n\n### Reflection (3-4 sentences)\nWhat did computational analysis reveal that close reading alone might have missed? What did it miss that only human interpretation could provide?',
    tags: ['digital-humanities', 'text-analysis', 'data', 'computational', 'interdisciplinary'],
  },

  // ─────────────────────────────────────────────
  // FLUENCY tier (2) — aiLevel: 'REQUIRE'
  // ─────────────────────────────────────────────
  {
    disciplineFamily: 'HUMANITIES',
    title: 'AI-Augmented Research Paper',
    description:
      'Use AI as a research assistant at every stage of a 2,500-3,000 word research paper — source discovery, outline generation, draft feedback, and revision. Submit the final paper, a complete AI interaction log organized by stage, and a 500-word reflection analyzing what AI contributed versus what required irreducibly human interpretation and judgment.',
    assignmentType: 'ESSAY',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'AI use is required at every stage — source discovery, outlining, draft feedback, and revision — and must be documented in a complete interaction log organized by stage. Papers submitted without the log will lose a full letter grade. Use AI critically: accept useful suggestions, reject poor ones, and document your reasoning. A polished paper with a superficial reflection will score lower than a good paper with a genuinely insightful reflection.',
    rubricRows: [
      {
        criterion: 'Quality of Final Research Paper',
        excellent: 'Paper presents an original, well-argued thesis supported by diverse, credible sources; writing is polished, analytical, and demonstrates a clear authorial voice.',
        proficient: 'Paper presents a clear thesis with solid evidence and competent analysis; writing is effective though voice may be uneven.',
        developing: 'Paper has an identifiable thesis but evidence is thin, analysis is superficial, or writing feels generic and voiceless.',
        insufficient: 'Paper lacks a clear thesis, relies on inadequate sources, or reads as AI-generated text without human shaping.',
      },
      {
        criterion: 'Sophistication of AI Collaboration',
        excellent: 'AI is used strategically across all stages; student demonstrates the ability to prompt effectively, evaluate AI output critically, and integrate AI contributions while maintaining intellectual ownership.',
        proficient: 'AI is used at multiple stages with evidence of critical evaluation; some interactions are more productive than others.',
        developing: 'AI use is superficial or uncritical — accepting outputs at face value or using AI only for grammar checking despite the assignment requiring deeper engagement.',
        insufficient: 'Minimal AI use despite the requirement, or AI is used without any evidence of critical evaluation.',
      },
      {
        criterion: 'Quality of AI Interaction Log',
        excellent: 'Log is comprehensive, organized by stage, and includes exact prompts, full AI responses, and annotations explaining what was accepted, rejected, or modified and why.',
        proficient: 'Log documents AI interactions across stages with prompts and responses, though annotations on decision-making could be more detailed.',
        developing: 'Log is incomplete — covers only some stages, omits prompts, or lacks annotations explaining the student\'s choices.',
        insufficient: 'Log is missing, fabricated, or too sparse to demonstrate meaningful AI engagement.',
      },
      {
        criterion: 'Depth of Reflection',
        excellent: 'Reflection offers specific, honest analysis of what AI did well (and why), what it could not do (and why), and how the collaboration changed the student\'s understanding of research and writing.',
        proficient: 'Reflection identifies key contributions and limitations of AI with some specific examples from the interaction log.',
        developing: 'Reflection is generic — praises or criticizes AI without connecting observations to specific interactions or the student\'s own learning.',
        insufficient: 'Reflection is missing, perfunctory, or does not engage with the actual AI collaboration.',
      },
      {
        criterion: 'Authorial Voice and Intellectual Ownership',
        excellent: 'Despite extensive AI collaboration, the paper has a distinctive voice and perspective; the student clearly made interpretive choices that shaped the final product.',
        proficient: 'Authorial voice is present; the paper reads as student-directed even when incorporating AI suggestions.',
        developing: 'Voice is inconsistent — some sections feel distinctly authored, others feel like lightly edited AI output.',
        insufficient: 'Paper lacks authorial voice; reads as compiled AI output without human shaping or interpretive direction.',
      },
    ],
    implementationNotes:
      'Structure the interaction log template carefully — without it, students will either over-document (pasting entire conversations) or under-document (vague summaries). Require logs organized by stage (source finding, outlining, drafting, revising) with annotations at each stage. The most critical pitfall is students who use AI extensively but reflect superficially. Weight the reflection heavily (20-25% of the grade) to incentivize genuine meta-cognition. Consider a peer workshop where students read each other\'s reflections and identify the most insightful observations about human-AI collaboration.',
    documentationTemplate:
      '## AI Interaction Log — AI-Augmented Research Paper\n\n**Student Name:**\n**Date:**\n**Paper Topic:**\n**AI Tool(s) Used:**\n\n---\n\n### Stage 1: Source Discovery\n**Prompt(s):**\n[Paste each prompt]\n\n**AI Response(s):**\n[Paste or summarize each response]\n\n**Your Decision:**\n[What did you keep, reject, or modify? Why?]\n\n---\n\n### Stage 2: Outline Generation\n**Prompt(s):**\n\n**AI Response(s):**\n\n**Your Decision:**\n\n---\n\n### Stage 3: Draft Feedback\n**Prompt(s):**\n[What section(s) did you share? What feedback did you request?]\n\n**AI Response(s):**\n\n**Your Decision:**\n[Which suggestions did you accept/reject? Why?]\n\n---\n\n### Stage 4: Revision\n**Prompt(s):**\n\n**AI Response(s):**\n\n**Your Decision:**\n\n---\n\n### Reflection (500 words)\n1. What did AI contribute that genuinely improved your paper?\n2. What did AI suggest that you rejected, and why?\n3. What aspects of this paper required irreducibly human judgment?\n4. How has this process changed your view of AI as a research tool?',
    tags: ['research-paper', 'ai-collaboration', 'full-process', 'interpretive-voice', 'ai-fluency'],
  },
  {
    disciplineFamily: 'HUMANITIES',
    title: 'Comparative Critical Theory Application',
    description:
      'Apply three critical theory lenses (e.g., Marxist, feminist, postcolonial) to a single assigned text — such as reading Kafka\'s The Metamorphosis through psychoanalytic, Marxist, and disability studies frameworks. Use AI to help summarize and initially apply each theory, then evaluate, refine, and extend those readings through your own close reading. Present your findings in a 12-15 minute presentation arguing which lens is most illuminating and why.',
    assignmentType: 'PRESENTATION',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'AI use is required to summarize each theoretical framework and generate initial applications — your task is to evaluate, refine, and extend those readings through close reading and critical judgment. Submit AI interaction transcripts alongside your presentation slides, clearly marking what AI contributed and what you added or corrected. A presentation that uncritically accepts all three AI-generated readings will score poorly.',
    rubricRows: [
      {
        criterion: 'Critical Judgment Across Frameworks',
        excellent: 'Demonstrates sophisticated ability to evaluate the strengths and blind spots of each theoretical lens and each AI-generated application; argues persuasively for one lens with nuanced reasoning.',
        proficient: 'Evaluates each framework and AI application competently; makes a reasonable argument for one lens with supporting evidence.',
        developing: 'Presents all three lenses but evaluation is superficial; conclusion about the "best" lens lacks support.',
        insufficient: 'Presents AI-generated applications without meaningful evaluation or comparison.',
      },
      {
        criterion: 'Quality of AI Interaction and Refinement',
        excellent: 'Prompts are specific and theory-literate; student identifies where AI oversimplifies, hallucinates theoretical claims, or misses textual nuance, and corrects these in the presentation.',
        proficient: 'AI interactions are purposeful; student refines AI output and notes some limitations or errors.',
        developing: 'AI output is used with minimal refinement; student accepts most AI-generated interpretations at face value.',
        insufficient: 'AI output is presented verbatim without refinement or critical engagement.',
      },
      {
        criterion: 'Textual Analysis and Close Reading',
        excellent: 'Presentation is grounded in specific passages and details from the text; theoretical applications are illustrated with precise textual evidence.',
        proficient: 'Presentation references the text regularly and connects theoretical claims to specific passages.',
        developing: 'Presentation discusses the text in general terms without sustained close reading or specific evidence.',
        insufficient: 'Presentation is almost entirely theoretical with little engagement with the actual text.',
      },
      {
        criterion: 'Presentation Clarity and Argumentation',
        excellent: 'Presentation is well-organized, clearly spoken, and builds to a compelling conclusion; audience can follow the comparative logic throughout.',
        proficient: 'Presentation is organized and clear, with a discernible argument, though transitions between lenses may be abrupt.',
        developing: 'Presentation communicates ideas but is disorganized, rushed, or lacks a clear argumentative throughline.',
        insufficient: 'Presentation is incoherent, incomplete, or relies on reading slides/AI output verbatim.',
      },
      {
        criterion: 'Honest Documentation of AI Role',
        excellent: 'Transcripts and slides make clear exactly what AI contributed and what the student added, refined, or rejected — demonstrating transparency and intellectual honesty.',
        proficient: 'Documentation shows AI contributions and student refinements, though the boundary could be more precisely drawn.',
        developing: 'Documentation is present but vague about where AI output ends and student analysis begins.',
        insufficient: 'No documentation, or documentation obscures the extent of AI contribution.',
      },
    ],
    implementationNotes:
      'Assign the three critical frameworks rather than letting students choose — otherwise students gravitate toward frameworks AI handles best, which defeats the purpose of comparative evaluation. Include at least one framework the AI is likely to oversimplify (e.g., ecocriticism, disability studies) so students have genuine material for critical engagement. The most common pitfall is presentations that become "AI said X, AI said Y, AI said Z" without the student ever taking an interpretive stand. Require the conclusion to be the longest section and grade it most heavily.',
    documentationTemplate:
      '## AI Usage Documentation — Comparative Critical Theory Application\n\n**Student Name:**\n**Date:**\n**Text Analyzed:**\n**Three Frameworks Applied:**\n1.\n2.\n3.\n\n---\n\n### Framework 1: _______________\n**AI Prompt:**\n[Paste exact prompt asking AI to summarize and apply this framework]\n\n**AI Response:**\n[Paste full response]\n\n**Your Refinements:**\n- What did the AI get right?\n- What did it oversimplify or miss?\n- What did you add, correct, or reframe for your presentation?\n\n---\n\n### Framework 2: _______________\n**AI Prompt:**\n\n**AI Response:**\n\n**Your Refinements:**\n\n---\n\n### Framework 3: _______________\n**AI Prompt:**\n\n**AI Response:**\n\n**Your Refinements:**\n\n---\n\n### Comparative Conclusion\nWhich lens did you argue is most illuminating, and why?\nWhere was the gap between AI analysis and your own judgment widest?',
    tags: ['critical-theory', 'presentation', 'comparative-analysis', 'ai-fluency', 'literary-criticism'],
  },
]
