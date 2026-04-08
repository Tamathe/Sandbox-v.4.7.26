export type ExperienceType = {
  name: string
  description: string
  toolType: 'CHATBOT' | 'QUIZ' | 'AI_INTERVIEW' | 'DEBATE' | 'STUDY_BUDDY' | 'SIMULATION'
  promptTemplate: string
}

export type ExperienceCategory = {
  id: string
  label: string
  types: ExperienceType[]
}

export const EXPERIENCE_CATEGORIES: ExperienceCategory[] = [
  {
    id: 'practice',
    label: 'Practice & Drilling',
    types: [
      {
        name: 'Flashcard Drill',
        description: 'LLM generates Q&A from a topic and quizzes the student one at a time.',
        toolType: 'QUIZ',
        promptTemplate:
          'Build a flashcard drill tool that generates questions on a topic and quizzes the student one at a time, giving instant feedback on each answer.',
      },
      {
        name: 'Short Answer Assessment',
        description: 'Student writes answers; LLM scores against criteria.',
        toolType: 'QUIZ',
        promptTemplate:
          'Build a short-answer assessment tool that presents questions, collects student answers, and evaluates them against a rubric with constructive feedback.',
      },
      {
        name: 'Rapid-Fire Concept Check',
        description: 'Fast-paced Q&A to test retention before an exam.',
        toolType: 'QUIZ',
        promptTemplate:
          'Build a rapid-fire concept check tool — fast Q&A format, one question at a time, tracks score, and gives a summary at the end.',
      },
      {
        name: 'Definition Challenge',
        description: 'Student defines terms in their own words; LLM evaluates quality.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          'Build a definition challenge tool where the student defines key terms in their own words and the AI evaluates clarity, accuracy, and completeness.',
      },
    ],
  },
  {
    id: 'roleplay',
    label: 'Role Play & Simulation',
    types: [
      {
        name: 'Client / Patient Intake',
        description: 'Student is the professional; LLM plays the patient or client.',
        toolType: 'AI_INTERVIEW',
        promptTemplate:
          "Build a patient intake simulation where the student plays the healthcare provider and the AI plays a patient with a realistic presenting complaint. The AI stays in character and evaluates the student's questioning technique at the end.",
      },
      {
        name: 'Job Interview Practice',
        description: 'LLM plays interviewer; student practices answering questions.',
        toolType: 'AI_INTERVIEW',
        promptTemplate:
          'Build a job interview practice tool where the AI plays an interviewer and the student answers questions. The AI gives feedback on clarity, confidence, and content after each answer.',
      },
      {
        name: 'Negotiation Simulation',
        description: 'Student negotiates salary, a contract, or a deal with the AI.',
        toolType: 'SIMULATION',
        promptTemplate:
          'Build a negotiation simulation where the student practices a realistic negotiation scenario (salary, contract, or deal) against an AI counterpart that pushes back and tracks how the student handles concessions and anchoring.',
      },
      {
        name: 'Historical Figure Conversation',
        description: 'Talk to Aristotle, Lincoln, or any historical figure.',
        toolType: 'CHATBOT',
        promptTemplate:
          "Build a historical figure conversation tool where the AI plays a specific historical figure and responds as that person would — in character, grounded in historical fact, and corrects any misattributions.",
      },
      {
        name: 'Difficult Conversation Practice',
        description: 'Practice giving feedback, handling conflict, or breaking bad news.',
        toolType: 'AI_INTERVIEW',
        promptTemplate:
          'Build a difficult conversation practice tool where the student practices a challenging professional or personal conversation — the AI plays the other party and gives feedback on empathy, clarity, and outcome.',
      },
    ],
  },
  {
    id: 'socratic',
    label: 'Socratic & Discussion',
    types: [
      {
        name: 'Socratic Dialogue',
        description: 'LLM challenges assumptions and keeps asking "why."',
        toolType: 'DEBATE',
        promptTemplate:
          "Build a Socratic dialogue tool that challenges the student's position through careful questioning — never lecturing, only asking follow-up questions that expose gaps or inconsistencies in the student's reasoning.",
      },
      {
        name: "Devil's Advocate",
        description: 'LLM argues the strongest version of the opposite position.',
        toolType: 'DEBATE',
        promptTemplate:
          "Build a devil's advocate tool where the student presents a position and the AI argues the strongest possible counterposition, forcing the student to strengthen their argument.",
      },
      {
        name: 'Expert Panel',
        description: 'LLM plays 2–3 experts with different perspectives on a topic.',
        toolType: 'CHATBOT',
        promptTemplate:
          'Build an expert panel simulation where the AI plays three distinct experts with different disciplinary perspectives on a topic, and the student can direct questions to any panelist.',
      },
      {
        name: 'Case Discussion (HBS-style)',
        description: 'LLM plays professor cold-calling the student on a case.',
        toolType: 'DEBATE',
        promptTemplate:
          "Build a Harvard Business School-style case discussion tool where the AI plays a professor who cold-calls the student, probes their analysis, and pushes for decisions with incomplete information.",
      },
    ],
  },
  {
    id: 'writing',
    label: 'Writing & Feedback',
    types: [
      {
        name: 'Essay Feedback Coach',
        description: 'Student pastes a draft; LLM gives structured feedback.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          "Build an essay feedback coach where students paste their draft and the AI gives structured feedback on thesis clarity, argument strength, evidence use, and writing quality — without rewriting for them.",
      },
      {
        name: 'Argument Strength Checker',
        description: 'LLM evaluates the logical structure of an argument.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          "Build an argument strength checker that evaluates the logical structure of a student's written argument — identifying unstated assumptions, weak evidence, logical fallacies, and gaps.",
      },
      {
        name: 'Thesis Statement Workshop',
        description: 'LLM helps the student develop a clear, arguable thesis.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          'Build a thesis statement workshop that helps students move from a broad topic to a clear, arguable thesis through targeted questions and iterative refinement.',
      },
      {
        name: 'Research Question Sharpener',
        description: 'LLM narrows a broad topic into a researchable question.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          'Build a research question sharpener that helps students move from a vague topic to a focused, answerable research question through a series of scoping questions.',
      },
    ],
  },
  {
    id: 'tutoring',
    label: 'Problem Solving & Tutoring',
    types: [
      {
        name: 'Hint-Based Problem Solving',
        description: "LLM gives progressive hints — never just solves it.",
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          "Build a hint-based problem solving tutor that gives students progressive hints when they're stuck — never solving the problem directly, always helping them reason through the next step.",
      },
      {
        name: 'Debugging Tutor',
        description: 'Student describes a bug; LLM asks Socratic questions.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          "Build a debugging tutor that helps students find bugs through Socratic questioning — asking them to explain the expected vs. actual behavior, trace execution, and form hypotheses, rather than just telling them the answer.",
      },
      {
        name: 'Case-Based Reasoning',
        description: 'LLM presents cases; student diagnoses or analyzes.',
        toolType: 'SIMULATION',
        promptTemplate:
          "Build a case-based reasoning tool that presents the student with realistic cases to analyze, diagnose, or solve — providing feedback on their reasoning process, not just the final answer.",
      },
      {
        name: 'Design Critique',
        description: 'Student explains a design decision; LLM pushes back.',
        toolType: 'DEBATE',
        promptTemplate:
          "Build a design critique tool where the student explains a design, engineering, or product decision and the AI plays a skeptical stakeholder who probes the rationale and surfaces unconsidered tradeoffs.",
      },
    ],
  },
  {
    id: 'reflection',
    label: 'Reflection & Metacognition',
    types: [
      {
        name: 'Learning Journal',
        description: 'Student reflects on what they learned; LLM asks probing questions.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          'Build a learning journal tool where students reflect on what they learned in a session and the AI asks probing questions to deepen the reflection and surface misconceptions.',
      },
      {
        name: 'Teach It Back',
        description: 'Student explains a concept as if teaching; LLM evaluates.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          'Build a "teach it back" tool where the student explains a concept as if teaching it to a beginner. The AI plays the student asking clarifying questions and evaluates the explanation for accuracy, clarity, and gaps.',
      },
      {
        name: 'Mistake Analysis',
        description: 'Student explains what they got wrong; LLM helps them understand why.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          "Build a mistake analysis tool where students walk through a question they got wrong. The AI helps them identify the exact point where their reasoning went astray — not just what the right answer is.",
      },
    ],
  },
  {
    id: 'analysis',
    label: 'Comprehension & Analysis',
    types: [
      {
        name: 'Reading Comprehension Check',
        description: 'Student explains what they read; LLM probes understanding.',
        toolType: 'CHATBOT',
        promptTemplate:
          'Build a reading comprehension check tool where students summarize what they read and the AI probes their understanding with increasingly deep questions about themes, evidence, and implications.',
      },
      {
        name: 'Logical Fallacy Spotter',
        description: 'LLM generates arguments with fallacies; student identifies them.',
        toolType: 'QUIZ',
        promptTemplate:
          'Build a logical fallacy spotter tool that presents arguments containing one or more logical fallacies and asks the student to identify and explain them.',
      },
      {
        name: 'Source Analysis',
        description: 'Student analyzes a document; LLM asks follow-up questions.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          "Build a primary source analysis tool where the student describes or pastes a document and the AI guides them through a structured analysis — historical context, author's purpose, bias, and significance.",
      },
    ],
  },
  {
    id: 'domain',
    label: 'Domain-Specific',
    types: [
      {
        name: 'Legal Reasoning (IRAC)',
        description: 'Practice structuring legal arguments using Issue-Rule-Analysis-Conclusion.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          'Build a legal reasoning practice tool that presents fact patterns and guides students through IRAC analysis — coaching them on identifying the legal issue, stating the rule, applying it, and reaching a conclusion.',
      },
      {
        name: 'Medical Differential Diagnosis',
        description: 'Student works through differentials from symptom presentation.',
        toolType: 'SIMULATION',
        promptTemplate:
          'Build a differential diagnosis practice tool where the AI presents a patient with symptoms and the student works through the differential diagnosis — the AI responds to questions about history, exam, and labs.',
      },
      {
        name: 'Ethical Dilemma Workshop',
        description: "LLM presents dilemmas and probes the student's ethical reasoning.",
        toolType: 'DEBATE',
        promptTemplate:
          'Build an ethical dilemma workshop that presents realistic moral dilemmas and guides the student through multiple ethical frameworks — deontological, utilitarian, virtue ethics — to reason through the best course of action.',
      },
      {
        name: 'Grant Writing Coach',
        description: 'LLM guides students through NSF/NIH proposal structure.',
        toolType: 'STUDY_BUDDY',
        promptTemplate:
          'Build a grant writing coach that guides students through the structure of a research grant proposal — helping them write a compelling problem statement, specific aims, and methodology section.',
      },
    ],
  },
]
