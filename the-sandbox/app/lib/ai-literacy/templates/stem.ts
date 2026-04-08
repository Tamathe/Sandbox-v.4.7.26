import type { AssignmentTemplateData } from './types'

export const STEM_ASSIGNMENTS: AssignmentTemplateData[] = [
  // ─── FOUNDATION tier (aiLevel: PROHIBIT) ────────────────────────────

  {
    disciplineFamily: 'STEM',
    title: 'In-Class Derivation Challenge',
    description:
      'Solve multi-step derivations by hand during class — for example, deriving the Navier-Stokes simplification for pipe flow or integrating the equations of motion for a damped oscillator. Problems escalate in complexity, and you must show all intermediate steps. This establishes a clear benchmark of independent analytical ability before AI tools are introduced later in the course.',
    assignmentType: 'PROBLEM_SET',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'No electronic devices, notes, or AI tools may be used during this exercise. All work must be completed in your own handwriting and submitted before the end of the class period. Any evidence of device use or pre-prepared solutions results in a zero and referral to the academic integrity office.',
    rubricRows: [
      {
        criterion: 'Mathematical Accuracy',
        excellent: 'All derivation steps are correct with no algebraic or conceptual errors.',
        proficient: 'Minor algebraic errors that do not compromise the logical flow of the derivation.',
        developing: 'Multiple errors in calculation or sign conventions; correct final form reached inconsistently.',
        insufficient: 'Fundamental errors in approach; derivation does not reach a valid conclusion.',
      },
      {
        criterion: 'Logical Reasoning & Step Progression',
        excellent: 'Each step follows clearly from the previous one; assumptions are stated and justified.',
        proficient: 'Logical flow is sound but one or two intermediate steps are skipped without justification.',
        developing: 'Significant gaps in reasoning; several jumps are unexplained.',
        insufficient: 'No coherent logical progression; steps appear disconnected.',
      },
      {
        criterion: 'Completeness of Work Shown',
        excellent: 'All intermediate steps, substitutions, and simplifications are explicitly shown.',
        proficient: 'Most work is shown; minor omissions do not obscure the solution path.',
        developing: 'Key steps are missing, making it difficult to follow the solution.',
        insufficient: 'Only a final answer is given with little or no supporting work.',
      },
    ],
    implementationNotes:
      'Prepare 3-4 derivation problems of escalating difficulty so faster students stay engaged. For classes over 60 students, consider having 2-3 problem variants to reduce copying. Allow 50 minutes for a 75-minute class period to give buffer time for collection.',
    documentationTemplate: null,
    tags: ['mathematics', 'physics', 'derivation', 'in-class', 'no-device'],
  },

  {
    disciplineFamily: 'STEM',
    title: 'Closed-Book Lab Practical',
    description:
      'Rotate through lab stations: identify unknown mineral or chemical samples, perform titrations or spectrophotometer readings, execute calculations, and draw conclusions from raw data — all within a timed window. No notes, devices, or AI assistance permitted. This reveals whether you can apply procedural knowledge and scientific reasoning under authentic laboratory conditions.',
    assignmentType: 'EXAM',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'No personal notes, electronic devices, textbooks, or AI tools may be used during the practical; essential reference materials are provided at each station. Record all observations, calculations, and conclusions on the answer sheets within the time limit. Partial credit is available for correct methodology even if the final answer is incorrect.',
    rubricRows: [
      {
        criterion: 'Identification & Observation',
        excellent: 'Unknowns correctly identified with clear, specific observations supporting each determination.',
        proficient: 'Most unknowns correctly identified; observations are generally accurate with minor omissions.',
        developing: 'Some correct identifications but observations lack specificity or contain errors.',
        insufficient: 'Unknowns not correctly identified; observations are vague or missing.',
      },
      {
        criterion: 'Calculation Accuracy & Method',
        excellent: 'All calculations are correct, properly set up with units, significant figures, and clear methodology.',
        proficient: 'Calculations are mostly correct; minor unit or significant figure errors.',
        developing: 'Correct approach but multiple numerical errors; inconsistent use of units.',
        insufficient: 'Incorrect approach to calculations or calculations not attempted.',
      },
      {
        criterion: 'Data Interpretation & Conclusions',
        excellent: 'Conclusions logically follow from data; limitations and sources of error are acknowledged.',
        proficient: 'Conclusions are reasonable and supported by data; error analysis is present but shallow.',
        developing: 'Conclusions partially supported; significant gaps in reasoning from data to claims.',
        insufficient: 'Conclusions are unsupported or contradicted by the data presented.',
      },
      {
        criterion: 'Time Management & Completeness',
        excellent: 'All stations completed within the allotted time with thorough responses.',
        proficient: 'All stations attempted; most completed fully within time limits.',
        developing: 'One or more stations incomplete; evidence of rushed work.',
        insufficient: 'Multiple stations unattempted or largely incomplete.',
      },
    ],
    implementationNotes:
      'Plan 5-7 stations with 8-10 minutes each for a 75-minute period. Have TAs pre-test the rotation to calibrate timing—students consistently need more time than you expect. For classes over 40, run two sessions or use parallel station sets to prevent bottlenecks.',
    documentationTemplate: null,
    tags: ['laboratory', 'practical-exam', 'identification', 'timed', 'no-device'],
  },

  {
    disciplineFamily: 'STEM',
    title: 'Concept Mapping from Memory',
    description:
      'Create a hand-drawn concept map from memory connecting key principles, equations, and phenomena from the designated unit — e.g., linking thermodynamic laws, entropy, and enthalpy in a physical chemistry module. Then defend your map in small-group discussion, explaining why you drew specific connections. This surfaces misconceptions and tests relational understanding rather than isolated recall.',
    assignmentType: 'DISCUSSION',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'No notes, textbooks, or devices are permitted during the 20-minute drawing phase; your map must include at least 15 concepts with labeled connections. After small-group discussion, submit your original map and a written reflection noting which connections you revised. Grading is based on connection density, accuracy of labels, and discussion engagement.',
    rubricRows: [
      {
        criterion: 'Concept Coverage & Density',
        excellent: 'Map includes 15+ relevant concepts with rich, cross-linked connections showing deep structural understanding.',
        proficient: 'Map includes 12-15 concepts with mostly accurate connections; some cross-links present.',
        developing: 'Map includes 8-12 concepts arranged mostly linearly with few cross-links.',
        insufficient: 'Fewer than 8 concepts; connections are sparse or missing.',
      },
      {
        criterion: 'Accuracy of Connections',
        excellent: 'All labeled connections are scientifically accurate and clearly describe the relationship between concepts.',
        proficient: 'Most connections are accurate; one or two labels are vague or slightly imprecise.',
        developing: 'Several connections contain misconceptions or are unlabeled.',
        insufficient: 'Connections are predominantly incorrect or reflect fundamental misunderstandings.',
      },
      {
        criterion: 'Discussion Engagement & Revision',
        excellent: 'Actively defended map choices with clear reasoning; reflection identifies specific revisions made based on peer feedback.',
        proficient: 'Participated meaningfully in discussion; reflection notes revisions but lacks specificity.',
        developing: 'Minimal participation in discussion; reflection is generic.',
        insufficient: 'Did not participate in discussion or submit a reflection.',
      },
    ],
    implementationNotes:
      'Provide a list of 20-25 key terms for the unit on the board so students are not penalized for forgetting terminology—the goal is mapping relationships, not recall of vocabulary. Groups of 3 work best for the discussion phase; groups of 4+ let students disengage. Collect maps before discussion and return them so you can see what changed.',
    documentationTemplate: null,
    tags: ['concept-mapping', 'discussion', 'metacognition', 'peer-review', 'no-device'],
  },

  // ─── AWARENESS tier (aiLevel: CAUTIOUS) ─────────────────────────────

  {
    disciplineFamily: 'STEM',
    title: 'AI-Checked Problem Set',
    description:
      'Solve a problem set independently — e.g., multivariable integrals, reaction equilibrium calculations, or circuit analysis — and submit your handwritten or typed solutions. Then use an AI tool (ChatGPT, Wolfram Alpha) to check your answers, documenting every discrepancy and analyzing whether the AI or your own work was correct. The primary deliverable is your original solution; the AI interaction log is a secondary reflection artifact.',
    assignmentType: 'PROBLEM_SET',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Complete all problems independently first — this initial solution carries 70% of the grade, and copying AI-generated solutions is an academic integrity violation. Then use an AI tool to verify your answers and submit a discrepancy report documenting each divergence with your reasoning on which answer is correct. Your report must include the exact AI tool used, prompts entered, and outputs received.',
    rubricRows: [
      {
        criterion: 'Independent Solution Quality',
        excellent: 'All problems solved correctly with clear, complete work shown; demonstrates strong independent reasoning.',
        proficient: 'Most problems solved correctly; work is shown and approach is sound despite minor errors.',
        developing: 'Several errors in independent work; some problems lack sufficient work shown.',
        insufficient: 'Independent solutions are largely incorrect or appear to have been generated after seeing AI output.',
      },
      {
        criterion: 'Discrepancy Analysis',
        excellent: 'Every discrepancy identified with precise explanation of which solution is correct and why; demonstrates deep understanding of where AI tools fail.',
        proficient: 'Most discrepancies identified and analyzed; explanations are generally accurate.',
        developing: 'Some discrepancies identified but analysis is shallow or partially incorrect.',
        insufficient: 'Discrepancies not identified or analysis simply defers to AI without critical evaluation.',
      },
      {
        criterion: 'AI Interaction Documentation',
        excellent: 'Complete log of prompts and outputs; tool identified; documentation is thorough and well-organized.',
        proficient: 'Prompts and outputs documented for most problems; minor gaps in documentation.',
        developing: 'Partial documentation; some prompts or outputs missing.',
        insufficient: 'Documentation is missing or too incomplete to verify the AI interaction process.',
      },
    ],
    implementationNotes:
      'Include at least 2-3 problems where typical AI tools give incorrect or incomplete answers (e.g., multi-step integration, problems requiring domain-specific constraints). This makes the discrepancy analysis meaningful rather than a formality. Budget one extra day beyond your normal deadline to account for the documentation step.',
    documentationTemplate:
      'Problem #: ___\nMy original answer: ___\nAI tool used: ___\nPrompt entered: ___\nAI output: ___\nDiscrepancy found (yes/no): ___\nWhich answer is correct and why: ___',
    tags: ['problem-set', 'verification', 'discrepancy-analysis', 'mathematics'],
  },

  {
    disciplineFamily: 'STEM',
    title: 'Literature Review with AI Search Comparison',
    description:
      'Conduct a manual literature search using PubMed, Web of Science, or Google Scholar to find 5 relevant sources on your topic (e.g., CRISPR off-target effects, lithium-ion battery degradation). Then ask an AI tool to suggest 5 additional sources. Compare both sets for quality, relevance, recency, and hallucination, and write a short essay analyzing what AI search missed or fabricated.',
    assignmentType: 'ESSAY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Locate 5 peer-reviewed sources through traditional databases, then prompt an AI to suggest 5 more on the same topic — recording exact prompts and outputs verbatim. Your 1,500-word essay must verify whether AI-suggested sources actually exist and analyze patterns in what AI fabricates or misses. All AI interactions must be appended as a documentation log; unverifiable AI sources should be discussed as findings, not hidden.',
    rubricRows: [
      {
        criterion: 'Quality of Manual Literature Search',
        excellent: 'All 5 sources are peer-reviewed, highly relevant, and represent current research; annotations clearly explain relevance.',
        proficient: '4-5 sources are appropriate and relevant; annotations are adequate.',
        developing: '3-4 sources are relevant but may lack recency or direct applicability; annotations are thin.',
        insufficient: 'Fewer than 3 relevant sources found; annotations are missing or superficial.',
      },
      {
        criterion: 'AI Source Verification & Hallucination Detection',
        excellent: 'Every AI-suggested source verified for existence; hallucinated sources clearly identified with explanation of how verification was performed.',
        proficient: 'Most sources verified; hallucinated sources identified though verification method could be more rigorous.',
        developing: 'Some verification attempted but incomplete; hallucinated sources may be accepted as real.',
        insufficient: 'No verification performed; AI outputs taken at face value.',
      },
      {
        criterion: 'Comparative Analysis',
        excellent: 'Insightful comparison of both sets covering quality, relevance, recency, and coverage gaps; identifies specific patterns in AI search limitations.',
        proficient: 'Solid comparison across most dimensions; some patterns identified.',
        developing: 'Surface-level comparison; fails to identify meaningful patterns.',
        insufficient: 'No meaningful comparison; essay merely lists sources without analysis.',
      },
      {
        criterion: 'Search Strategy & Prompt Transparency',
        excellent: 'AI search prompts are specific and varied; documentation traces the full verification workflow from AI suggestion to confirmed existence or confirmed hallucination.',
        proficient: 'Prompts and verification steps documented for most sources; minor gaps in tracing.',
        developing: 'Documentation present but verification steps incomplete; hard to trace how conclusions were reached.',
        insufficient: 'No evidence of systematic verification; AI outputs taken at face value.',
      },
    ],
    implementationNotes:
      'Choose a narrowly scoped research question so the manual search is feasible in one sitting. AI tools frequently hallucinate STEM citations—this is a feature for this assignment, not a bug. Warn students that verification is the point, not finding real sources from AI. Works well as a lead-in to a larger literature review assignment.',
    documentationTemplate:
      'Research question: ___\n\nManual Search:\nDatabase used: ___\nSearch terms: ___\nSource #: ___\nFull citation: ___\nRelevance summary (2-3 sentences): ___\n\nAI Search:\nAI tool used: ___\nPrompt: ___\nAI-suggested source #: ___\nAI-provided citation: ___\nVerification result (exists / does not exist / partially correct): ___\nVerification method: ___',
    tags: ['literature-review', 'information-literacy', 'hallucination-detection', 'research', 'citation-verification'],
  },

  {
    disciplineFamily: 'STEM',
    title: 'Lab Data Visualization',
    description:
      'Collect real experimental data in the lab — e.g., absorbance spectra, growth curves, or tensile stress-strain measurements — then use AI-powered tools (ChatGPT Code Interpreter, Copilot) to generate publication-quality visualizations. Write all analysis and interpretation yourself; AI handles the plotting, you own the science.',
    assignmentType: 'LAB',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'AI may be used only for generating visualizations and basic statistical computation — not for writing analysis, drawing conclusions, or interpreting results. Submit your raw data, AI-generated visualizations, and an 800-word analysis you compose entirely without AI. Your documentation log must include every prompt used and any modifications you made to AI output; submitting AI-generated text in the analysis section is an academic integrity violation.',
    rubricRows: [
      {
        criterion: 'Data Collection & Quality',
        excellent: 'Raw data is complete, properly recorded with units and uncertainties, and reflects careful laboratory technique.',
        proficient: 'Data is complete and properly recorded; minor issues with uncertainty reporting.',
        developing: 'Data is incomplete or contains recording errors; uncertainties missing.',
        insufficient: 'Data appears fabricated, is largely incomplete, or lacks proper recording.',
      },
      {
        criterion: 'Visualization Quality & AI Tool Use',
        excellent: 'Visualizations are publication-quality with proper labels, scales, legends, and error bars; AI prompts show iterative refinement.',
        proficient: 'Visualizations are clear and properly formatted; AI prompts are documented.',
        developing: 'Visualizations are functional but lack formatting details; AI documentation is thin.',
        insufficient: 'Visualizations are misleading, improperly formatted, or AI use is undocumented.',
      },
      {
        criterion: 'Written Analysis (Human-Authored)',
        excellent: 'Analysis demonstrates deep understanding of results; connects findings to theory; error analysis is thoughtful and specific to the experiment.',
        proficient: 'Analysis is sound and connects to theory; error analysis is present but could be more specific.',
        developing: 'Analysis is superficial or partially disconnected from the data; error analysis is generic.',
        insufficient: 'Analysis is missing, appears AI-generated, or does not address the actual data.',
      },
    ],
    implementationNotes:
      'Provide a brief in-class demo of prompting AI for data visualization so all students start from a common baseline—many will not have tried this before. Spot-check analysis sections with AI detection tools, but more importantly, ask students specific questions about their data in lab follow-up. If their analysis is AI-generated, they will not be able to answer data-specific questions.',
    documentationTemplate:
      'Visualization #: ___\nAI tool used: ___\nPrompt: ___\nAI output description: ___\nModifications I made to the AI output: ___\nWhy I made these modifications: ___',
    tags: ['laboratory', 'data-visualization', 'statistics', 'analysis', 'coding'],
  },

  // ─── PARTNERSHIP tier (aiLevel: GUIDED) ──────────────────────────────

  {
    disciplineFamily: 'STEM',
    title: 'Lab Report with AI Comparison',
    description:
      'Write your own Discussion section for a lab report, then prompt an AI to generate one from the same data. Submit both versions plus a comparative analysis: what did the AI get right, what did it get wrong, and what did it miss about your specific experimental context (e.g., anomalous pH readings, unexpected precipitate formation)? Your own data is the ground truth.',
    assignmentType: 'LAB',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Write your Discussion section independently before generating an AI version from the same data — submit both plus a 600-800 word comparative analysis referencing your actual experimental data. Document the exact prompts and data you gave the AI; generic comparisons that ignore your specific results will not receive full credit. Grading: original Discussion 40%, comparative analysis 40%, documentation 20%.',
    rubricRows: [
      {
        criterion: 'Quality of Original Discussion',
        excellent: 'Discussion thoroughly interprets results, connects to theory, addresses error sources, and is clearly written before seeing AI output.',
        proficient: 'Discussion addresses key findings and connects to theory; error analysis present.',
        developing: 'Discussion is thin or overly descriptive rather than analytical.',
        insufficient: 'Discussion is missing, superficial, or appears written after seeing AI output.',
      },
      {
        criterion: 'Critical Evaluation of AI Output',
        excellent: 'Identifies specific factual errors, missed context, and generic statements in AI output; references actual experimental data as evidence.',
        proficient: 'Identifies most issues in AI output with some data-specific references.',
        developing: 'Comparison is vague or generic; does not reference specific data points.',
        insufficient: 'No meaningful evaluation; accepts AI output uncritically or comparison not attempted.',
      },
      {
        criterion: 'Quality of AI Prompt Design',
        excellent: 'Prompt provides sufficient data and context for AI to generate a meaningful comparison; demonstrates understanding of what AI needs to produce useful output.',
        proficient: 'Prompt includes relevant data and context; output is comparable.',
        developing: 'Prompt is vague or omits key data, making comparison less meaningful.',
        insufficient: 'Prompt is too generic to produce a useful AI Discussion.',
      },
      {
        criterion: 'Data Context Provided to AI',
        excellent: 'Documentation shows exactly what experimental data, methods, and constraints were shared with the AI — another researcher could replicate the AI interaction from the log.',
        proficient: 'Key data inputs and prompts documented; minor gaps in what context was shared.',
        developing: 'Unclear what data the AI received; hard to judge whether AI output was a fair comparison.',
        insufficient: 'No documentation of what data or context was provided to the AI.',
      },
    ],
    implementationNotes:
      'Require students to submit their original Discussion before the AI comparison step (use a two-stage submission with a 24-hour gap, or a Canvas/LMS timestamp check). Without this, some students will write the AI version first and "humanize" it. This assignment works especially well when lab results are messy or unexpected—AI struggles most with anomalous data.',
    documentationTemplate:
      'AI tool used: ___\nData provided to AI (describe what you shared): ___\nExact prompt: ___\nAI-generated Discussion (paste in full): ___\n\nComparative Analysis:\nWhat AI got right: ___\nWhat AI got wrong (cite specific data): ___\nWhat AI missed about my specific experiment: ___\nWhat my original Discussion could improve based on seeing the AI version: ___',
    tags: ['laboratory', 'comparative-analysis', 'scientific-writing', 'critical-evaluation', 'lab-report', 'discussion-section'],
  },

  {
    disciplineFamily: 'STEM',
    title: 'Hybrid Problem Set',
    description:
      'Complete a two-part problem set that separates routine computation from conceptual understanding. Part A (30%, take-home): use AI freely for standard calculations like eigenvalue decomposition or stoichiometric balancing. Part B (70%, in-class, no devices): explain reasoning, estimate quantities, and answer "what would happen if..." questions that require flexible understanding AI cannot fake.',
    assignmentType: 'PROBLEM_SET',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Part A (30%, take-home): any AI tool permitted for calculations; document which tools you used and how. Part B (70%, in-class): no devices, notes, or AI — questions require you to explain reasoning, estimate quantities, and predict outcomes of modified scenarios. Both parts must be submitted; submitting only Part A results in a zero.',
    rubricRows: [
      {
        criterion: 'Computational Accuracy (Part A)',
        excellent: 'All computations correct with clear documentation of AI tool usage and verification of AI outputs.',
        proficient: 'Most computations correct; AI tool use documented.',
        developing: 'Some errors in computation; AI documentation is incomplete.',
        insufficient: 'Multiple errors or no documentation of AI use.',
      },
      {
        criterion: 'Conceptual Understanding (Part B)',
        excellent: 'Explanations demonstrate deep understanding; predictions are correct with clear reasoning; errors in given solutions are identified and explained.',
        proficient: 'Explanations are mostly correct; reasoning is sound but may lack depth.',
        developing: 'Partial understanding shown; explanations are vague or partially incorrect.',
        insufficient: 'Fundamental misconceptions evident; unable to explain reasoning behind calculations.',
      },
      {
        criterion: 'Integration of AI and Human Work',
        excellent: 'Part A documentation shows thoughtful use of AI as a computational tool; student verified and understood AI outputs rather than blindly copying.',
        proficient: 'AI used appropriately for computation; some evidence of verification.',
        developing: 'AI outputs accepted without verification; documentation suggests passive copying.',
        insufficient: 'No evidence of understanding AI outputs; work appears to be unexamined AI generation.',
      },
    ],
    implementationNotes:
      'Design Part B questions that reference Part A results but require novel reasoning—e.g., "In Problem A3, you calculated X. What would happen to X if we doubled parameter Y? Explain without calculating." This rewards students who understood their Part A work. Print Part B fresh each semester to prevent circulation of answers.',
    documentationTemplate:
      'Part A Documentation:\nProblem #: ___\nAI tool used: ___\nPrompt or input: ___\nAI output: ___\nDid I verify the output? (yes/no): ___\nVerification method: ___\n\nReflection (after completing Part B):\nWhich Part A concepts did I genuinely understand vs. just compute? ___\nWhere did AI speed help, and where did it mask gaps in my understanding? ___\nWhat would I do differently next time when using AI for computation? ___',
    tags: ['problem-set', 'computation', 'conceptual-understanding', 'hybrid', 'mathematics', 'in-class-exam'],
  },

  {
    disciplineFamily: 'STEM',
    title: 'AI-Assisted Code Review',
    description:
      'Write a working program to solve the assigned problem — e.g., implement a linked-list merge sort or build a REST API endpoint — then use an AI tool to review your code for bugs, efficiency, and readability. Submit your original code, the AI review output, and a decision log explaining which suggestions you accepted, rejected, or modified and why. This mirrors real-world software engineering workflows.',
    assignmentType: 'PROJECT',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Commit your original working code before the AI review step — timestamps will be checked. Then use an AI tool to review for bugs, efficiency, and readability, and submit a decision log for every suggestion with technical justification for accepting, rejecting, or modifying it. Grading: original code quality 40%, decision thoughtfulness 40%, documentation 20%; accepting all AI suggestions uncritically will not receive full marks.',
    rubricRows: [
      {
        criterion: 'Original Code Quality',
        excellent: 'Code is functional, well-structured, properly documented, and handles edge cases; demonstrates strong independent programming skills.',
        proficient: 'Code is functional and reasonably structured; handles main cases; documentation adequate.',
        developing: 'Code runs but has structural issues, poor naming, or misses edge cases.',
        insufficient: 'Code does not function correctly or appears to have been AI-generated initially.',
      },
      {
        criterion: 'Critical Evaluation of AI Suggestions',
        excellent: 'Each suggestion evaluated with specific technical reasoning; correctly identifies both valuable improvements and inappropriate suggestions.',
        proficient: 'Most suggestions evaluated with reasoning; generally sound technical judgment.',
        developing: 'Evaluation is superficial; accepts or rejects suggestions without clear reasoning.',
        insufficient: 'All suggestions accepted or rejected wholesale without evaluation.',
      },
      {
        criterion: 'Decision Documentation Quality',
        excellent: 'Decision log is thorough, technically precise, and demonstrates understanding of trade-offs (performance, readability, maintainability).',
        proficient: 'Decisions documented with adequate reasoning for most suggestions.',
        developing: 'Documentation is sparse; reasoning is vague or missing for several decisions.',
        insufficient: 'Decision log missing or does not address individual suggestions.',
      },
      {
        criterion: 'Quality of AI Prompt Design',
        excellent: 'Prompts are specific, provide context about requirements and constraints, and elicit targeted feedback rather than generic review.',
        proficient: 'Prompts include relevant context; feedback received is useful.',
        developing: 'Prompts are vague; AI feedback is generic as a result.',
        insufficient: 'No evidence of thoughtful prompting; interaction appears minimal.',
      },
    ],
    implementationNotes:
      'Require a Git commit (or timestamped submission) of the original code before the review phase so you can verify the sequence. Students will often discover that AI suggests "improvements" that break their specific requirements—this is a valuable learning moment. For large classes, the decision log is faster to grade than the code itself; focus your grading time there.',
    documentationTemplate:
      'AI tool used: ___\nPrompt for code review: ___\n\nSuggestion #: ___\nAI suggestion (quote or summarize): ___\nDecision (accepted / rejected / modified): ___\nTechnical justification: ___\nIf modified, what I changed and why: ___',
    tags: ['programming', 'code-review', 'software-engineering', 'decision-making', 'computer-science'],
  },

  // ─── FLUENCY tier (aiLevel: REQUIRE) ─────────────────────────────────

  {
    disciplineFamily: 'STEM',
    title: 'AI as Lab Partner',
    description:
      'Collaborate with AI throughout an entire experimental design process — for example, designing a biodegradation assay or optimizing PCR conditions. Use AI to generate hypotheses, refine methods, predict outcomes, and analyze error sources. Document every interaction with your evaluation of whether you adopted, modified, or rejected the AI suggestion. Deliver a complete experimental design document with an integrated AI interaction journal, then defend it in a 5-minute oral exam.',
    assignmentType: 'LAB',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'Use AI for at least four phases — hypothesis generation, method optimization, outcome prediction, and error analysis — documenting prompts, outputs, and your critical evaluation at each phase. Submit a complete experimental design, an AI interaction journal, and a 500-word reflection on where AI helped and where human judgment was essential. You must defend every design choice in a 5-minute oral exam; choices you cannot explain will not count toward your grade.',
    rubricRows: [
      {
        criterion: 'Experimental Design Quality',
        excellent: 'Design is scientifically rigorous, feasible, well-controlled, and demonstrates sophisticated understanding of the research question.',
        proficient: 'Design is sound and feasible with appropriate controls; minor gaps in rigor.',
        developing: 'Design has significant methodological gaps or feasibility concerns.',
        insufficient: 'Design is not scientifically viable or reflects uncritical adoption of AI suggestions.',
      },
      {
        criterion: 'Critical Evaluation of AI Suggestions',
        excellent: 'Every AI suggestion evaluated against scientific principles and practical constraints; clear pattern of adopting, modifying, and rejecting suggestions with specific justification.',
        proficient: 'Most suggestions evaluated with reasoning; demonstrates ability to push back on AI.',
        developing: 'Some evaluation present but inconsistent; tendency to accept AI suggestions without scrutiny.',
        insufficient: 'AI suggestions adopted wholesale without critical evaluation.',
      },
      {
        criterion: 'Iterative Prompt Refinement Across Phases',
        excellent: 'Prompts evolve across the four phases — each builds on prior AI output, incorporates experimental constraints, and shows deliberate refinement strategy.',
        proficient: 'Prompts are contextually appropriate and show some iteration between phases.',
        developing: 'Prompts are generic and similar across phases; limited evidence of refinement.',
        insufficient: 'Single-shot prompts with no iteration; does not leverage prior AI outputs.',
      },
      {
        criterion: 'Integration of AI and Human Expertise',
        excellent: 'Seamless integration where AI contributions enhance but do not replace human scientific reasoning; reflection demonstrates nuanced understanding of AI\'s role.',
        proficient: 'AI and human contributions are distinguishable and well-integrated; reflection is thoughtful.',
        developing: 'AI and human contributions are not well-integrated; reflection is generic.',
        insufficient: 'Design is essentially AI-generated with minimal human intellectual contribution.',
      },
      {
        criterion: 'Oral Defense Performance',
        excellent: 'Can explain and justify every design choice fluently; demonstrates deep understanding of both AI-suggested and self-generated elements.',
        proficient: 'Explains most design choices clearly; occasional hesitation on details.',
        developing: 'Unable to explain several design elements; suggests incomplete understanding of AI contributions.',
        insufficient: 'Cannot defend design choices; responses indicate lack of ownership over the design.',
      },
    ],
    implementationNotes:
      'The oral defense is essential—without it, this assignment incentivizes outsourcing thinking to AI. Keep defenses to 5 minutes with 2-3 targeted questions; you can assess a class of 30 in a single lab period. Ask "why did you choose X over Y?" questions rather than factual recall. Students who genuinely collaborated with AI will answer differently than those who copied AI outputs.',
    documentationTemplate:
      'Phase: [Hypothesis Generation / Method Optimization / Outcome Prediction / Error Analysis]\nAI tool used: ___\nPrompt: ___\nAI output (summarize key suggestions): ___\nMy evaluation: ___\nDecision (adopted / modified / rejected): ___\nJustification: ___\nHow this shaped my final design: ___',
    tags: ['laboratory', 'experimental-design', 'hypothesis', 'oral-defense', 'ai-collaboration'],
  },

  {
    disciplineFamily: 'STEM',
    title: 'Computational Research Poster',
    description:
      'Use AI tools throughout a research mini-project on a provided dataset (e.g., gene expression profiles, climate sensor readings, materials fatigue data): discover literature, run analyses, generate visualizations, and construct a research narrative. Present findings in a professional poster and deliver a 5-minute oral defense. Grading focuses on your ability to explain, critique, and extend beyond AI outputs — not the outputs themselves.',
    assignmentType: 'PRESENTATION',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'Use AI tools at every research stage — literature synthesis, data analysis, visualization, and narrative construction — and submit a professional poster, a comprehensive AI interaction log, and a 5-minute oral defense. Your log must document tools, prompts, and outputs with your annotations at each stage. Grading: scientific rigor 30%, poster quality 20%, critical evaluation of AI outputs 25%, oral defense 25%; assembling AI outputs without understanding will not earn a passing grade.',
    rubricRows: [
      {
        criterion: 'Scientific Rigor & Analysis',
        excellent: 'Analysis is methodologically sound; conclusions are supported by evidence; limitations acknowledged; goes beyond surface-level AI outputs to derive original insight.',
        proficient: 'Analysis is appropriate and conclusions supported; limitations mentioned.',
        developing: 'Analysis has methodological gaps; conclusions overstate what the data supports.',
        insufficient: 'Analysis is superficial or incorrect; appears to be unexamined AI output.',
      },
      {
        criterion: 'Poster Design & Communication',
        excellent: 'Poster is visually professional, logically organized, and communicates complex findings clearly to a broad STEM audience; visualizations are well-chosen and properly labeled.',
        proficient: 'Poster is well-organized and communicates key findings; visualizations are appropriate.',
        developing: 'Poster is cluttered or poorly organized; some visualizations are confusing.',
        insufficient: 'Poster fails to communicate findings effectively; appears hastily assembled.',
      },
      {
        criterion: 'Critical Evaluation of AI Outputs',
        excellent: 'AI interaction log shows sophisticated, iterative use of AI tools; student identifies specific errors, biases, and limitations in AI outputs and adjusts accordingly.',
        proficient: 'AI log shows competent use with some critical evaluation; errors identified in key areas.',
        developing: 'AI log is present but evaluation is shallow; errors not consistently identified.',
        insufficient: 'AI outputs used without critical evaluation; log is missing or perfunctory.',
      },
      {
        criterion: 'Oral Defense & Depth of Understanding',
        excellent: 'Explains all analytical choices with confidence; critiques AI limitations unprompted; proposes meaningful extensions; handles unexpected questions well.',
        proficient: 'Explains most choices clearly; identifies some AI limitations when prompted; answers questions adequately.',
        developing: 'Struggles to explain several choices; limited awareness of AI limitations; difficulty with follow-up questions.',
        insufficient: 'Cannot explain analytical choices or distinguish personal contribution from AI outputs.',
      },
      {
        criterion: 'AI Workflow Documentation',
        excellent: 'Comprehensive log covering all research stages; prompts show iterative refinement; outputs are annotated with student commentary.',
        proficient: 'Log covers most stages with adequate detail; some annotation present.',
        developing: 'Log is incomplete; missing stages or lacking student commentary.',
        insufficient: 'Log is absent or too sparse to evaluate the AI workflow.',
      },
    ],
    implementationNotes:
      'Provide the same dataset to all students to make grading consistent and to enable interesting comparisons in how different students and AI tools approach the same data. Schedule poster sessions in a gallery format—students can learn from seeing how peers used AI differently. The oral defense is where grades differentiate: students who truly engaged with AI will sound different from those who assembled outputs without understanding.',
    documentationTemplate:
      'Research Stage: [Literature Search / Data Analysis / Visualization / Narrative]\nAI tool used: ___\nPrompt (include iteration history — what did you change after the first attempt?): ___\nAI output summary: ___\nErrors or limitations I identified: ___\nHow I modified or built upon the output: ___\n\nOverall Collaboration Narrative (500 words, submit once at end):\nHow did your research question evolve through AI interaction? ___\nAt which stage was AI most/least useful, and why? ___\nWhat original insight emerged that neither you nor the AI would have reached alone? ___\nHow would you structure AI collaboration differently for a longer project? ___',
    tags: ['research', 'poster-presentation', 'data-analysis', 'visualization', 'oral-defense', 'ai-workflow'],
  },
]
