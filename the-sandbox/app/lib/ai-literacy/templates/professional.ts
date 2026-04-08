import type { AssignmentTemplateData } from './types'

export const PROFESSIONAL_ASSIGNMENTS: AssignmentTemplateData[] = [
  // ─── FOUNDATION tier (3) — aiLevel: 'PROHIBIT' ───────────────────────────

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'In-Class Case Analysis Under Time Pressure',
    description:
      'Receive a business, legal, education, or healthcare case and produce a structured written analysis in 50 minutes. Example: a mid-size accounting firm discovers its largest client failed to disclose a material liability — identify the issues, apply a relevant professional framework, and recommend a defensible course of action under time pressure.',
    assignmentType: 'CASE_STUDY',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'Complete an in-class case analysis under timed conditions (50 minutes). No AI tools, electronic devices, or outside materials permitted. Identify core issues, apply at least one professional framework, and recommend a defensible course of action. This exercise is graded on reasoning quality and writing clarity, not length.',
    rubricRows: [
      {
        criterion: 'Issue Identification',
        excellent: 'Identifies all major issues and distinguishes root causes from symptoms with precision',
        proficient: 'Identifies most major issues with reasonable cause-effect reasoning',
        developing: 'Identifies obvious issues but misses underlying dynamics or conflates causes',
        insufficient: 'Fails to identify core issues or mischaracterizes the situation',
      },
      {
        criterion: 'Framework Application',
        excellent: 'Applies a relevant framework with clear, logical steps and connects every element back to the case facts',
        proficient: 'Applies a framework correctly but with some gaps in connecting to specific case details',
        developing: 'Names a framework but applies it superficially or inconsistently',
        insufficient: 'No framework applied or framework is irrelevant to the case',
      },
      {
        criterion: 'Professional Judgment',
        excellent: 'Recommendation is realistic, accounts for stakeholder impact, and anticipates implementation challenges',
        proficient: 'Recommendation is sound but does not fully consider feasibility or stakeholder concerns',
        developing: 'Recommendation is vague or ignores obvious practical constraints',
        insufficient: 'No clear recommendation or recommendation contradicts the analysis',
      },
      {
        criterion: 'Writing Clarity Under Pressure',
        excellent: 'Organized, concise, and professional tone maintained throughout despite time constraint',
        proficient: 'Generally clear writing with minor organizational issues',
        developing: 'Disorganized or verbose; key points are buried',
        insufficient: 'Incoherent or incomplete; analysis trails off before reaching conclusion',
      },
    ],
    implementationNotes:
      'Distribute the case at the start of the session and collect all work at 50 minutes. Consider providing a one-page framework reference sheet so students focus on application rather than recall. Rotate case topics across sections to prevent sharing.',
    documentationTemplate: null,
    tags: ['case-analysis', 'timed-assessment', 'professional-reasoning', 'client-readiness', 'risk-assessment'],
  },

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'Live Client Roleplay',
    description:
      'Pair up for a live roleplay of a realistic professional encounter. Example: roleplay a parent-teacher conference about a struggling 8th grader, a client intake meeting for a pro bono family law case, or a nurse delivering a difficult diagnosis to a patient\'s family. One person plays the professional, the other the stakeholder. No scripts — assessment is on listening, empathy, and real-time professional judgment.',
    assignmentType: 'SIMULATION',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'Participate in a 12-15 minute paired roleplay of a professional encounter, followed by a structured debrief. No AI tools or scripts permitted — role assignment and scenario brief provided 10 minutes before. Grade is split between roleplay performance and a written self-reflection due within 24 hours. Authentic interpersonal skills cannot be outsourced.',
    rubricRows: [
      {
        criterion: 'Active Listening & Responsiveness',
        excellent: 'Consistently acknowledges client concerns, asks clarifying questions, and adapts approach based on what the client reveals',
        proficient: 'Demonstrates attentive listening with occasional missed cues or delayed responses',
        developing: 'Listens passively; follows a mental script rather than responding to what the client actually says',
        insufficient: 'Talks over the client, ignores stated concerns, or appears disengaged',
      },
      {
        criterion: 'Empathy & Professional Tone',
        excellent: 'Balances warmth and professionalism; validates emotions without overstepping boundaries',
        proficient: 'Maintains appropriate tone with minor lapses in empathy or boundary management',
        developing: 'Tone is overly clinical or overly casual; struggles to find professional middle ground',
        insufficient: 'Dismissive, condescending, or inappropriately informal throughout',
      },
      {
        criterion: 'Professional Judgment in Real Time',
        excellent: 'Makes sound decisions under ambiguity; knows when to commit, when to defer, and when to seek additional information',
        proficient: 'Makes reasonable decisions but occasionally over-commits or hesitates when action is needed',
        developing: 'Avoids making decisions or makes premature commitments without sufficient information',
        insufficient: 'Makes harmful recommendations or freezes under pressure',
      },
      {
        criterion: 'Self-Reflection Quality',
        excellent: 'Reflection identifies specific moments of strength and weakness with concrete plans for improvement',
        proficient: 'Reflection is honest and identifies areas for growth but lacks specificity',
        developing: 'Reflection is generic or overly self-congratulatory without critical analysis',
        insufficient: 'No reflection submitted or reflection does not reference the actual roleplay',
      },
    ],
    implementationNotes:
      'Prepare scenario briefs with enough ambiguity to prevent scripted responses. Pair students who do not typically work together. Video recording (with consent) enables richer self-reflection but is not required.',
    documentationTemplate: null,
    tags: ['roleplay', 'client-communication', 'empathy', 'stakeholder-sensitivity', 'professional-judgment'],
  },

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'Ethics Exam: Framework Application',
    description:
      'Apply two ethical frameworks to a novel professional scenario in a closed-book, timed exam (75 minutes). Example: a social worker discovers their client\'s employer is committing wage theft — apply utilitarian and deontological frameworks, analyze where they diverge, and defend a reasoned position. All analysis must be original.',
    assignmentType: 'EXAM',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'Closed-book, timed exam (75 minutes). Apply two distinct ethical frameworks to a novel scenario, analyze convergence and conflict, and defend a reasoned position. No AI tools, notes, or electronic devices. Strong answers demonstrate nuanced reasoning with specific framework principles connected to case details, not just framework identification.',
    rubricRows: [
      {
        criterion: 'Ethical Framework Application',
        excellent: 'Both frameworks are applied with precision; specific principles are correctly identified and connected to case details',
        proficient: 'Both frameworks are applied correctly but with some generality in connecting principles to the scenario',
        developing: 'One framework is applied well but the other is superficial or contains errors',
        insufficient: 'Frameworks are named but not meaningfully applied, or one is missing entirely',
      },
      {
        criterion: 'Conflict Analysis',
        excellent: 'Clearly identifies the point of tension between frameworks and explains why they diverge on this scenario',
        proficient: 'Identifies the conflict but explanation of why it arises is incomplete',
        developing: 'Acknowledges a conflict exists but cannot articulate its nature or source',
        insufficient: 'Claims the frameworks agree when they do not, or ignores the conflict entirely',
      },
      {
        criterion: 'Reasoned Position Defense',
        excellent: 'Takes a clear position, acknowledges the strongest counterargument, and explains why the chosen path is preferable given the circumstances',
        proficient: 'Takes a clear position with supporting reasoning but does not adequately address the counterargument',
        developing: 'States a preference but does not defend it with ethical reasoning',
        insufficient: 'No position taken, or position contradicts the analysis presented',
      },
      {
        criterion: 'Professional Contextualization',
        excellent: 'Considers practical implications including stakeholder impact, regulatory constraints, and professional obligations',
        proficient: 'References professional context but does not integrate it into the ethical analysis',
        developing: 'Treats the scenario as purely abstract; ignores professional realities',
        insufficient: 'No connection between ethical analysis and professional practice',
      },
    ],
    implementationNotes:
      'Write scenarios that do not have a single correct answer so students cannot pattern-match from class examples. Provide a list of approved frameworks on the exam itself to level the playing field. Grade on quality of reasoning, not on which position students choose.',
    documentationTemplate: null,
    tags: ['ethics', 'ethical-reasoning', 'framework-application', 'professional-liability', 'moral-conflict'],
  },

  // ─── AWARENESS tier (3) — aiLevel: 'CAUTIOUS' ────────────────────────────

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'Professional Communication Drafting',
    description:
      'Draft a professional communication appropriate to your field. Example: a client engagement letter for a mid-market audit, a lesson plan for teaching fractions to English-language learners, or a discharge protocol for a post-surgical patient. AI may assist with formatting, grammar, and structural conventions only — substance, tone, and professional judgment must be your own.',
    assignmentType: 'ESSAY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Draft a professional communication for your discipline (client memo, lesson plan, care protocol, or policy brief). AI may be used for grammar and formatting only — all substantive content, recommendations, and professional judgment must be your own. Submit an AI usage statement with your document. Work that reads as AI-generated in substance receives a zero.',
    rubricRows: [
      {
        criterion: 'Professional Voice & Tone',
        excellent: 'Writing has a distinctive professional voice appropriate to the audience; tone adapts to context (e.g., empathetic for patients, precise for legal)',
        proficient: 'Tone is generally appropriate but occasionally generic or inconsistent with the intended audience',
        developing: 'Tone feels AI-generated or textbook-like; lacks the personality expected in professional practice',
        insufficient: 'Tone is inappropriate for the audience or indistinguishable from a template',
      },
      {
        criterion: 'Substantive Quality',
        excellent: 'Content demonstrates deep domain knowledge; recommendations are specific, actionable, and grounded in professional standards',
        proficient: 'Content is accurate and relevant but recommendations could be more specific or actionable',
        developing: 'Content is generally correct but shallow; relies on general knowledge rather than professional expertise',
        insufficient: 'Content contains errors, is irrelevant, or lacks any substantive professional analysis',
      },
      {
        criterion: 'Format & Convention Compliance',
        excellent: 'Follows all relevant professional formatting conventions; document could be sent to a real recipient',
        proficient: 'Follows most conventions with minor formatting issues',
        developing: 'Shows awareness of conventions but makes several format errors',
        insufficient: 'Ignores professional formatting standards entirely',
      },
      {
        criterion: 'Client-Readiness',
        excellent: 'Document could be sent to a real client, patient, or stakeholder without revision; audience-appropriate in every detail',
        proficient: 'Document is close to sendable but has minor issues a supervisor would flag',
        developing: 'Document reads as a student assignment, not a professional deliverable',
        insufficient: 'Document would damage the professional relationship if sent',
      },
    ],
    implementationNotes:
      'Provide 3-4 scenario options so students can choose one relevant to their professional interests. Share a rubric-aligned example of what "AI for formatting only" looks like versus substance generation. Collect AI usage statements as a separate submission to normalize transparency.',
    documentationTemplate:
      'AI Usage Statement\n\nTools used: [List any AI tools used]\nPurposes: [Describe specifically how each tool was used — e.g., "Grammarly for grammar check," "ChatGPT to review formatting of memo header"]\nContent generated by AI: [Describe any text or structure suggested by AI]\nContent that is entirely my own: [Confirm which substantive sections are original]\n\nI confirm that all professional analysis, recommendations, and domain-specific content in this document are my own work.',
    tags: ['professional-writing', 'client-communication', 'drafting', 'tone-management', 'documentation-standards'],
  },

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'Industry Standards Research',
    description:
      'Research current professional standards or regulations in your field and evaluate their applicability to a specific scenario. Example: compare OSHA lab safety requirements for a university chemistry department versus a pharmaceutical manufacturing floor, or trace how FERPA applies differently to a registrar\'s office versus a third-party tutoring vendor. AI may locate documents and clarify regulatory language, but all synthesis and evaluation must be your own.',
    assignmentType: 'PROJECT',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Research current professional standards or regulations and evaluate their applicability to a provided scenario. AI may locate documents and clarify regulatory language; all synthesis, comparison, and evaluation must be your own. Submit a 4-6 page brief with an AI usage log. AI-hallucinated citations are treated as academic dishonesty — verify every source.',
    rubricRows: [
      {
        criterion: 'Standards Identification & Accuracy',
        excellent: 'Identifies all relevant standards including recent updates; citations are accurate and from authoritative sources',
        proficient: 'Identifies major standards correctly but misses a recent update or secondary source',
        developing: 'Identifies some standards but relies on outdated or non-authoritative sources',
        insufficient: 'Standards cited are wrong, irrelevant, or fabricated',
      },
      {
        criterion: 'Synthesis & Comparison',
        excellent: 'Draws meaningful comparisons across contexts; identifies non-obvious tensions or complementarities between standards',
        proficient: 'Compares standards across contexts but analysis stays at surface level',
        developing: 'Lists standards side by side without genuine comparative analysis',
        insufficient: 'No comparison attempted or comparison is factually incorrect',
      },
      {
        criterion: 'Practical Applicability Assessment',
        excellent: 'Evaluates how standards apply to the specific scenario with attention to implementation challenges and gray areas',
        proficient: 'Connects standards to the scenario but underestimates practical complexity',
        developing: 'Mentions the scenario but does not meaningfully evaluate applicability',
        insufficient: 'No connection between standards and the given scenario',
      },
      {
        criterion: 'Regulatory Source Verification',
        excellent: 'Every AI-surfaced citation verified against primary regulatory databases; verification trail is documented and replicable',
        proficient: 'Most citations verified but a few rely on AI summaries without primary-source confirmation',
        developing: 'Spot-checks some sources but verification is inconsistent',
        insufficient: 'Presents AI-located sources as fact without verification',
      },
    ],
    implementationNotes:
      'Assign specific scenarios that require students to navigate real regulatory databases (e.g., OSHA, ABA, CAEP, CMS). Require at least two primary-source citations that students found independently of AI. Discuss in class how AI can hallucinate regulatory citations.',
    documentationTemplate:
      'AI Research Log\n\nDate | AI Tool Used | Query/Prompt | AI Output Summary | Verification Step | Verified? (Y/N)\n-----|-------------|--------------|-------------------|-------------------|----------------\n     |             |              |                   |                   |\n\nReflection:\n- Which AI-located sources did you verify through primary databases?\n- Did AI suggest any standards that turned out to be inaccurate or outdated?\n- What did you find through your own research that AI missed?',
    tags: ['regulatory-compliance', 'standards-research', 'source-verification', 'policy-analysis', 'accreditation'],
  },

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'Stakeholder Analysis',
    description:
      'Map the stakeholders in a complex professional scenario and analyze their interests, influence, and alliances. Example: a hospital system merging two community clinics — identify the obvious stakeholders (board, physicians, nurses) and the non-obvious ones (referring providers, local pharmacies, the city council member whose district loses a clinic). AI can brainstorm initial categories, but power dynamics and strategic recommendations must be your own.',
    assignmentType: 'CASE_STUDY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Conduct a stakeholder analysis for a provided professional scenario. AI may brainstorm initial categories; all interest analysis, power mapping, and strategic recommendations must be your own. Submit a stakeholder map and 3-4 page analysis with an AI usage statement. Your grade depends on identifying non-obvious stakeholders and power dynamics — the kind of insight that requires professional experience, not search engines.',
    rubricRows: [
      {
        criterion: 'Stakeholder Identification Depth',
        excellent: 'Identifies non-obvious stakeholders including indirect influencers; considers both formal and informal power holders',
        proficient: 'Identifies all major stakeholders but misses indirect or informal influences',
        developing: 'Identifies only the most obvious stakeholders',
        insufficient: 'Stakeholder list is incomplete or includes irrelevant parties',
      },
      {
        criterion: 'Interest & Power Analysis',
        excellent: 'Analyzes each stakeholder\'s specific interests with evidence from the scenario; maps power dynamics including alliances and conflicts',
        proficient: 'Analyzes interests and power for most stakeholders but some entries are generic',
        developing: 'States interests without connecting them to scenario specifics or analyzing power relationships',
        insufficient: 'Interests are assumed rather than analyzed; power dynamics ignored',
      },
      {
        criterion: 'Strategic Recommendations',
        excellent: 'Recommendations are specific, sequenced, and account for likely stakeholder reactions and second-order effects',
        proficient: 'Recommendations are reasonable but lack sequencing or do not anticipate stakeholder responses',
        developing: 'Recommendations are generic ("communicate more") and not tied to the analysis',
        insufficient: 'No actionable recommendations or recommendations contradict the stakeholder analysis',
      },
      {
        criterion: 'AI Boundary Awareness',
        excellent: 'Clearly delineates which categories came from AI brainstorming versus which analysis is original; explains why AI suggestions were kept or discarded',
        proficient: 'Describes AI usage but does not explain editorial decisions about AI suggestions',
        developing: 'Mentions AI was used but does not specify how',
        insufficient: 'No AI usage statement or analysis reads as entirely AI-generated',
      },
    ],
    implementationNotes:
      'Use scenarios with enough complexity that AI-generated stakeholder lists are incomplete — scenarios involving informal power, cultural dynamics, or competing institutional loyalties work well. Have students present their maps in small groups so they can see how different analysts interpret the same scenario.',
    documentationTemplate:
      'Stakeholder Analysis — AI Usage Statement\n\nAI tool(s) used: [List tools]\nHow AI was used: [Describe specific prompts and outputs]\n\nStakeholders initially suggested by AI:\n- [List AI-suggested stakeholders]\n\nStakeholders I added based on my own analysis:\n- [List stakeholders you identified independently]\n\nAI suggestions I discarded and why:\n- [List any AI suggestions that were inaccurate or irrelevant]\n\nAll interest analysis, power mapping, and strategic recommendations in this submission are my own work.',
    tags: ['stakeholder-analysis', 'power-dynamics', 'strategic-communication', 'organizational-politics', 'relationship-management'],
  },

  // ─── PARTNERSHIP tier (3) — aiLevel: 'GUIDED' ────────────────────────────

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'AI-Augmented Case Analysis',
    description:
      'Prompt AI to analyze a professional case, then identify at least 3 things AI got wrong or oversimplified. Example: feed AI a school disciplinary case and watch it miss that the student\'s parent is on the school board, or give it a malpractice scenario and see it ignore the unwritten norms of the local medical community. Add the context AI cannot access and produce a better recommendation.',
    assignmentType: 'CASE_STUDY',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Use AI to analyze a professional case, then critique and improve upon its output. Submit: AI\'s analysis with your prompts, your critique identifying at least 3 errors or blind spots, and your improved analysis adding context AI cannot access. Grade depends on critique quality and contextual depth, not on AI\'s initial output. Document all prompts used.',
    rubricRows: [
      {
        criterion: 'AI Output Critique Quality',
        excellent: 'Identifies substantive errors, not just cosmetic issues; explains why each error matters in professional practice',
        proficient: 'Identifies real errors but some critiques are minor or the professional implications are not fully explained',
        developing: 'Critiques are superficial (e.g., "AI was too general") without explaining the specific professional risk',
        insufficient: 'No meaningful critique or student accepts AI output uncritically',
      },
      {
        criterion: 'Contextual Knowledge Addition',
        excellent: 'Adds context that fundamentally changes the analysis — organizational dynamics, unwritten rules, relationship histories, or practice norms that AI cannot access',
        proficient: 'Adds relevant context but it supplements rather than transforms the analysis',
        developing: 'Added context is generic and could itself have been AI-generated',
        insufficient: 'No context added beyond what AI provided',
      },
      {
        criterion: 'Professional Recommendation Quality',
        excellent: 'Recommendation integrates AI analysis with added context; addresses implementation, timing, and stakeholder management',
        proficient: 'Recommendation is sound but relies too heavily on either AI output or added context without integrating both',
        developing: 'Recommendation is disconnected from the analytical work',
        insufficient: 'No recommendation or recommendation is a restatement of the AI output',
      },
      {
        criterion: 'Prompt Strategy Documentation',
        excellent: 'Documents iterative prompt refinement; shows how different prompts produced different analyses and explains strategic choices',
        proficient: 'Documents prompts used but does not discuss prompt strategy',
        developing: 'Includes only a single prompt without iteration',
        insufficient: 'AI interaction not documented',
      },
    ],
    implementationNotes:
      'Choose cases with significant tacit knowledge components — scenarios where "what everyone in the industry knows" matters as much as the facts on paper. Discuss in class what kinds of professional knowledge AI consistently misses. Require students to use at least two different prompts to see how AI output varies.',
    documentationTemplate:
      'AI-Augmented Case Analysis — Documentation\n\nAI Tool: [Name and version]\n\nPrompt 1: [Exact prompt text]\nAI Response 1: [Summary or paste]\n\nPrompt 2 (refined): [Exact prompt text]\nAI Response 2: [Summary or paste]\n\n[Add additional prompts as needed]\n\nThree AI Errors/Oversimplifications Identified:\n1. [Error] — Why this matters professionally: [Explanation]\n2. [Error] — Why this matters professionally: [Explanation]\n3. [Error] — Why this matters professionally: [Explanation]\n\nContext I Added That AI Could Not Know:\n- [Context 1]\n- [Context 2]\n- [Context 3]\n\nHow my final recommendation differs from the AI\'s: [Explanation]',
    tags: ['case-analysis', 'ai-critique', 'professional-judgment', 'tacit-knowledge', 'risk-assessment'],
  },

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'Client Communication Triad',
    description:
      'Three-stage exercise: (1) draft a professional communication without AI — e.g., a letter informing a long-term client their account is being restructured, or an email to parents explaining a school policy change. (2) Use AI to improve the draft and decide which suggestions to accept. (3) Roleplay delivering the communication live to a partner. Submit all three artifacts plus a reflection on what AI improved versus what required human sensitivity.',
    assignmentType: 'PROJECT',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Three-part communication exercise: draft independently, improve with AI, then deliver live in a roleplay. Submit your original draft, AI-improved version with tracked changes, roleplay summary, and a 2-page reflection. The reflection must analyze what AI improved versus what required your professional judgment. Document all AI suggestions accepted and rejected with rationale.',
    rubricRows: [
      {
        criterion: 'Original Draft Quality',
        excellent: 'First draft demonstrates strong professional communication foundations; clear structure and purpose even before AI input',
        proficient: 'First draft is competent but has identifiable areas where AI could add value',
        developing: 'First draft is rough but shows genuine effort and professional intent',
        insufficient: 'First draft appears deliberately weak to make AI improvements look more dramatic',
      },
      {
        criterion: 'AI Integration Judgment',
        excellent: 'Selectively accepts and rejects AI suggestions with clear reasoning; final version is better than either draft alone or AI output alone',
        proficient: 'Accepts most AI suggestions appropriately but does not push back on any',
        developing: 'Accepts all AI suggestions without editorial judgment',
        insufficient: 'Replaces original draft entirely with AI output',
      },
      {
        criterion: 'Roleplay Communication Effectiveness',
        excellent: 'Delivers communication naturally with appropriate emotional intelligence; adapts to partner\'s reactions in real time',
        proficient: 'Delivers communication competently but reads from the written version rather than adapting',
        developing: 'Struggles to translate written communication into live interaction',
        insufficient: 'Cannot effectively communicate the content in person',
      },
      {
        criterion: 'Reflection Depth',
        excellent: 'Reflection reveals genuine insight about the boundary between AI-improvable and human-essential communication skills',
        proficient: 'Reflection identifies some meaningful differences but stays at a general level',
        developing: 'Reflection lists what changed between drafts but does not analyze why some changes required human judgment',
        insufficient: 'Reflection is superficial or does not address the human-AI boundary question',
      },
    ],
    implementationNotes:
      'Scenarios involving bad news, sensitive negotiations, or culturally complex situations work best because they expose the limits of AI communication assistance. Schedule the roleplay in class so partners can provide genuine reactions. The reflection is the most important graded element.',
    documentationTemplate:
      'Client Communication Triad — AI Documentation\n\nStage 1 — Original Draft:\n[Paste or attach your draft written without AI]\n\nStage 2 — AI Improvement Process:\nAI Tool Used: [Name]\nPrompt(s): [What you asked AI to do]\nSuggestions Accepted: [List with brief rationale for each]\nSuggestions Rejected: [List with brief rationale for each]\n\nStage 3 — Roleplay Summary:\n[Brief summary of what happened during the roleplay — what went well, what surprised you]\n\nReflection Prompts:\n- What did AI improve that you could not have improved on your own?\n- What did AI suggest that would have been inappropriate or ineffective in the live interaction?\n- What professional communication skills cannot be replicated by AI?',
    tags: ['client-communication', 'tone-management', 'ai-partnership', 'stakeholder-sensitivity', 'emotional-intelligence'],
  },

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'Regulatory Compliance Audit',
    description:
      'Use AI to scan a policy document or business plan against relevant regulations, then verify every finding. Example: have AI audit a small firm\'s data retention policy against GDPR, then find the false positives (AI flagged compliant practices) and the false negatives (AI missed the lack of a Data Protection Officer). Produce a professional compliance memo with prioritized recommendations.',
    assignmentType: 'PROJECT',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Conduct a compliance audit using AI as your first-pass tool, then verify every finding against primary regulatory sources. Submit a professional compliance memo with AI\'s initial findings, your verification, false positives and negatives identified, and prioritized recommendations. In professional practice, signing off on unverified AI compliance advice is malpractice — this exercise trains the verification habit.',
    rubricRows: [
      {
        criterion: 'AI Output Verification Rigor',
        excellent: 'Every AI finding is verified against primary regulatory sources; verification methodology is documented and replicable',
        proficient: 'Most findings are verified but some rely on secondary sources or general knowledge',
        developing: 'Spot-checks a few findings but does not systematically verify',
        insufficient: 'Accepts AI findings without verification',
      },
      {
        criterion: 'False Positive/Negative Identification',
        excellent: 'Identifies false positives with regulatory citations proving compliance; identifies non-obvious false negatives that demonstrate deep regulatory knowledge',
        proficient: 'Identifies some false positives and negatives but misses subtler issues',
        developing: 'Identifies only obvious errors in AI output',
        insufficient: 'Does not distinguish between accurate and inaccurate AI findings',
      },
      {
        criterion: 'Professional Liability Awareness',
        excellent: 'Memo prioritizes findings by liability exposure; recommendations include risk severity, implementation timelines, and who bears responsibility for each gap',
        proficient: 'Memo is professional and recommendations are sound but not prioritized by liability risk',
        developing: 'Memo structure is informal or does not distinguish high-risk from low-risk findings',
        insufficient: 'Memo would expose the organization to additional liability if acted upon',
      },
      {
        criterion: 'Regulatory Source Quality',
        excellent: 'Cites specific regulatory sections, recent case law or enforcement actions, and official guidance documents',
        proficient: 'Cites relevant regulations but without specific section references',
        developing: 'References regulations generally without specific citations',
        insufficient: 'No regulatory citations or citations are fabricated',
      },
    ],
    implementationNotes:
      'Use real (or lightly modified) policy documents from the relevant industry. Before assigning, test the AI scan yourself to know what it gets wrong — this helps you evaluate student verification quality. Discuss in class that AI compliance tools are assistive, not authoritative, and that professional liability remains with the human reviewer.',
    documentationTemplate:
      'Regulatory Compliance Audit — AI Documentation\n\nDocument Scanned: [Title/description of the policy or plan]\nAI Tool Used: [Name and version]\nPrompt: [Exact prompt used for compliance scan]\n\nAI Findings Summary:\n| # | AI-Flagged Issue | Regulation Cited by AI | My Verification | Status (Confirmed/False Positive) |\n|---|-----------------|----------------------|-----------------|-----------------------------------|\n| 1 |                 |                      |                 |                                   |\n\nFalse Negatives (Issues AI Missed):\n| # | Compliance Issue | Applicable Regulation | Why AI Likely Missed It |\n|---|-----------------|----------------------|-------------------------|\n| 1 |                 |                      |                         |\n\nVerification Sources Used:\n- [List primary regulatory databases, guidance documents, or case law consulted]\n\nKey Learning: What types of compliance issues is AI good at catching? What types does it consistently miss?',
    tags: ['regulatory-compliance', 'professional-liability', 'audit', 'verification', 'risk-assessment'],
  },

  // ─── FLUENCY tier (2) — aiLevel: 'REQUIRE' ───────────────────────────────

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'AI-Integrated Professional Workflow',
    description:
      'Complete a realistic, multi-stage professional workflow using AI at every stage. Example: run a full consulting engagement — research the client\'s industry, draft a findings memo, build a financial model, revise based on partner feedback, and prepare client-ready deliverables. Or: develop a 4-week unit plan with assessments, rubrics, and parent communication. Document time savings, quality trade-offs, and where AI created professional liability risk.',
    assignmentType: 'PROJECT',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'Complete a multi-stage professional workflow using AI at every stage — research, drafting, analysis, revision, and delivery. AI use is required, not optional. Submit the finished work product and a 5-7 page workflow analysis documenting time savings, quality trade-offs, and a professional liability analysis. The liability section carries the heaviest grading weight.',
    rubricRows: [
      {
        criterion: 'Work Product Quality',
        excellent: 'Deliverable meets professional standards; AI is used to enhance quality, not just speed; result is better than what either human or AI could produce alone',
        proficient: 'Deliverable is competent and meets baseline professional standards',
        developing: 'Deliverable has quality issues that suggest over-reliance on unverified AI output',
        insufficient: 'Deliverable would not be acceptable in a professional setting',
      },
      {
        criterion: 'AI Integration Sophistication',
        excellent: 'Uses AI strategically at different stages with different tools or prompts; demonstrates awareness of which tasks AI does well versus where human oversight is critical',
        proficient: 'Uses AI at most stages but approach is uniform rather than strategically varied',
        developing: 'Uses AI minimally or only at one stage despite the requirement',
        insufficient: 'AI usage is superficial or appears added after the fact',
      },
      {
        criterion: 'Workflow Analysis Depth',
        excellent: 'Analysis reveals genuine insights about efficiency gains and quality trade-offs; includes specific time estimates and concrete examples',
        proficient: 'Analysis covers required elements but stays at a general level',
        developing: 'Analysis is superficial; claims time savings without evidence',
        insufficient: 'No workflow analysis or analysis does not reference actual AI usage',
      },
      {
        criterion: 'Professional Liability Awareness',
        excellent: 'Identifies specific liability risks tied to AI usage in this workflow; proposes concrete verification protocols and professional safeguards',
        proficient: 'Identifies general liability concerns but without specific mitigation strategies',
        developing: 'Mentions liability in passing but does not analyze specific risks',
        insufficient: 'No consideration of professional liability implications',
      },
      {
        criterion: 'Efficiency & Time Documentation',
        excellent: 'Provides detailed time tracking per stage with and without AI; analysis is honest about where AI slowed things down',
        proficient: 'Provides time estimates but they are approximate',
        developing: 'Claims time savings without documentation',
        insufficient: 'No time analysis included',
      },
    ],
    implementationNotes:
      'Provide 3-4 scenario options at different complexity levels so students can choose based on their professional interests. Require a mid-project check-in to prevent last-minute AI-dump submissions. The liability analysis is the most professionally valuable component — weight it accordingly in grading.',
    documentationTemplate:
      'AI-Integrated Workflow — Complete Documentation\n\nScenario Selected: [Description]\nAI Tools Used: [List all tools with versions]\n\nWorkflow Stage Log:\n| Stage | Task | AI Tool Used | Prompt/Approach | Time With AI | Est. Time Without AI | Quality Assessment |\n|-------|------|-------------|-----------------|-------------|---------------------|-------------------|\n| Research |    |             |                 |             |                     |                   |\n| Drafting |    |             |                 |             |                     |                   |\n| Analysis |    |             |                 |             |                     |                   |\n| Revision |    |             |                 |             |                     |                   |\n| Delivery |    |             |                 |             |                     |                   |\n\nTotal Time With AI: [Hours]\nEstimated Time Without AI: [Hours]\nEfficiency Gain: [Percentage]\n\nWhere AI Was Most Useful: [Specific stage and why]\nWhere AI Was Least Useful: [Specific stage and why]\nWhere AI Was Actively Harmful or Misleading: [Specific examples]\n\nProfessional Liability Analysis:\n- Risk 1: [Specific risk] — Mitigation: [Protocol]\n- Risk 2: [Specific risk] — Mitigation: [Protocol]\n- Risk 3: [Specific risk] — Mitigation: [Protocol]\n\nVerification Steps Taken: [What did you check manually and why?]',
    tags: ['workflow', 'ai-fluency', 'professional-practice', 'liability', 'efficiency', 'integration'],
  },

  {
    disciplineFamily: 'PROFESSIONAL',
    title: 'Ethical AI Deployment Proposal',
    description:
      'Develop and present a proposal for how a specific organization should adopt AI for a professional function. Example: propose how a 200-person law firm should use AI for contract review — covering capabilities, bias risks (AI trained on corporate contracts failing on tribal law), training needs, client consent, and ethical guardrails. Present to peers acting as the leadership team and defend your recommendations under 10 minutes of questioning.',
    assignmentType: 'PRESENTATION',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'Develop and present a 15-minute AI adoption proposal for an assigned organizational context, using AI throughout research and development (required). Address: capabilities, risks, bias mitigation, training needs, stakeholder impact, and ethical guardrails. Defend your recommendations under 10 minutes of peer questioning. Both the proposal and your composure under challenge are graded.',
    rubricRows: [
      {
        criterion: 'Technical Feasibility & Specificity',
        excellent: 'Proposal references specific AI tools or approaches appropriate to the use case; demonstrates understanding of what current AI can and cannot do',
        proficient: 'Proposal is technically sound but references AI capabilities in general terms',
        developing: 'Proposal overpromises what AI can deliver or is vague about implementation',
        insufficient: 'Proposal shows fundamental misunderstanding of AI capabilities',
      },
      {
        criterion: 'Risk & Bias Analysis',
        excellent: 'Identifies domain-specific risks (not just generic AI risks); bias analysis considers the specific population served and proposes measurable fairness criteria',
        proficient: 'Identifies relevant risks and biases but analysis is not specific to the domain or population',
        developing: 'Lists generic AI risks without connecting them to the specific professional context',
        insufficient: 'Dismisses or ignores risks and bias concerns',
      },
      {
        criterion: 'Ethical Guardrails Design',
        excellent: 'Proposes specific, implementable guardrails with oversight mechanisms, review cadences, and clear accountability for AI-assisted decisions',
        proficient: 'Proposes reasonable guardrails but they lack specificity or enforcement mechanisms',
        developing: 'Mentions ethics but does not propose concrete guardrails',
        insufficient: 'No ethical framework or guardrails proposed',
      },
      {
        criterion: 'Stakeholder Impact Assessment',
        excellent: 'Thoroughly analyzes impact on clients/patients/students including equity implications, consent considerations, and fallback options for those who refuse AI-mediated services',
        proficient: 'Considers stakeholder impact but does not address equity or consent in depth',
        developing: 'Mentions stakeholders but analysis is superficial',
        insufficient: 'Ignores the impact on the people the organization serves',
      },
      {
        criterion: 'Defense Under Questioning',
        excellent: 'Responds to challenging questions with evidence-based reasoning; acknowledges limitations honestly; adapts position when presented with valid counterarguments',
        proficient: 'Handles most questions competently but becomes defensive or vague when challenged',
        developing: 'Struggles to defend choices beyond restating the presentation content',
        insufficient: 'Cannot respond substantively to questions or contradicts own proposal',
      },
    ],
    implementationNotes:
      'Assign specific organizational contexts (e.g., "a 200-person law firm," "a rural school district," "a community health center") so proposals must grapple with real constraints. Brief the "leadership team" peers on their roles and give them 2-3 challenging questions to ask. The Q&A is where real learning happens — protect that time.',
    documentationTemplate:
      'Ethical AI Deployment Proposal — AI Usage & Research Log\n\nOrganization Context: [Description of the assigned organization]\nProfessional Function for AI Adoption: [Specific function]\n\nAI Tools Used in Developing This Proposal:\n| Tool | How Used | What It Contributed | What I Had to Verify or Override |\n|------|----------|--------------------|---------------------------------|\n|      |          |                    |                                 |\n\nResearch Sources (Beyond AI):\n- [List industry reports, regulatory guidance, case studies, academic papers consulted]\n\nBias Audit Process:\n- Population served: [Description]\n- Potential bias vectors identified: [List]\n- Fairness criteria proposed: [Measurable criteria]\n- Testing protocol: [How you would validate fairness]\n\nEthical Framework Applied: [Name the framework(s) guiding your guardrail design]\n\nKey Trade-offs in This Proposal:\n- [Trade-off 1: What you gain vs. what you risk]\n- [Trade-off 2: What you gain vs. what you risk]\n\nQuestions I Anticipate From Leadership: [List 3-5 tough questions and your planned responses]',
    tags: ['ai-deployment', 'ethics', 'presentation', 'organizational-change', 'bias-mitigation', 'leadership'],
  },
]
