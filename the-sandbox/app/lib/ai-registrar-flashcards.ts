export type AIRegistrarFlashcard = {
  category: string
  question: string
  answer: string
}

export const AI_REGISTRAR_CATEGORY_ORDER = [
  'Core Architecture',
  'Document Processing',
  'Course Scheduling',
  'Systems Integration',
  'Compliance & Privacy',
  'Governance & Ethics',
  'Implementation Roadmap',
] as const

export const AI_REGISTRAR_CATEGORY_COLORS: Record<string, { bg: string; light: string }> = {
  'Core Architecture': { bg: '#0033A0', light: '#e8eef8' },
  'Document Processing': { bg: '#1d6b44', light: '#e8f5ee' },
  'Course Scheduling': { bg: '#8a3b12', light: '#fdf0e7' },
  'Systems Integration': { bg: '#7b2d8b', light: '#f5ebf8' },
  'Compliance & Privacy': { bg: '#c41e3a', light: '#fde8ec' },
  'Governance & Ethics': { bg: '#1e5f8b', light: '#e8f2f8' },
  'Implementation Roadmap': { bg: '#2d6a2d', light: '#eaf5ea' },
}

export const AI_REGISTRAR_FLASHCARDS: AIRegistrarFlashcard[] = [
  { category: 'Core Architecture', question: 'What foundational AI paradigm is required to replace a university registrar, and why?', answer: 'Neuro-symbolic AI. It combines neural systems for language and perception with symbolic logic for deterministic policy enforcement, which is essential when academic decisions must be exact.' },
  { category: 'Core Architecture', question: "What is the 'Perception and Reasoning Dichotomy' in a neuro-symbolic registrar?", answer: 'The neural layer interprets unstructured inputs like student questions or documents, while the symbolic layer applies fixed academic rules and returns a verifiable decision.' },
  { category: 'Core Architecture', question: 'Why is pure generative AI insufficient for degree auditing?', answer: 'LLMs are probabilistic and can hallucinate. A registrar system cannot guess about graduation clearance, prerequisite completion, or policy compliance.' },
  { category: 'Core Architecture', question: 'What is the Aurora Framework?', answer: 'A modular neuro-symbolic advising architecture that combines a normalized course catalog database, a logic engine for policy enforcement, and an instruction-tuned LLM for natural-language interaction.' },
  { category: 'Core Architecture', question: 'What normalization standard does the Aurora-style architecture require, and why?', answer: 'Boyce-Codd Normal Form. It preserves referential integrity, reduces redundancy, and supports the deterministic joins needed for reliable academic decision-making.' },
  { category: 'Document Processing', question: 'What is Intelligent Document Processing, and how does it differ from simple OCR?', answer: 'IDP goes beyond text recognition. It interprets structured and unstructured academic documents, extracts meaning, and can connect transcript and syllabus content to downstream decisions.' },
  { category: 'Document Processing', question: 'What are the five stages of the automated transfer credit articulation pipeline?', answer: 'Document ingestion and classification, entity extraction, RAG-based syllabus analysis, symbolic confidence scoring, and either auto-routing or human review based on confidence.' },
  { category: 'Document Processing', question: 'What confidence bands govern automatic approval versus human review in the design?', answer: 'Very high similarity can be auto-approved in theory, while middle-band matches are routed to a human subject matter expert with the supporting evidence highlighted.' },
  { category: 'Document Processing', question: 'Which real-world systems were cited as examples of transcript-processing IDP?', answer: "Examples included SmartPanda's Raptor at Indiana University and Quantiphi's QDox at Illinois Institute of Technology." },
  { category: 'Document Processing', question: 'How does automated IDP change transfer credit turnaround time?', answer: 'It can reduce review cycles from multiple weeks to a matter of days, improving student onboarding and reducing administrative overhead.' },
  { category: 'Course Scheduling', question: 'What is the University Course Scheduling Problem mathematically?', answer: 'It is an NP-hard combinatorial optimization problem that must balance faculty constraints, room capacity, prerequisite sequencing, equipment needs, and student demand.' },
  { category: 'Course Scheduling', question: 'How does the AI forecast demand before building the schedule?', answer: 'By combining historical enrollment, demographic signals, and live degree-planning intent to estimate how many seats each course will need.' },
  { category: 'Course Scheduling', question: 'What hybrid algorithmic approach does the registrar use to generate a master timetable?', answer: 'It combines genetic algorithms for evolutionary search with dynamic programming and mixed-integer optimization for hard constraints.' },
  { category: 'Course Scheduling', question: 'What do crossover and mutation mean in the scheduling genetic algorithm?', answer: 'Crossover combines useful parts of high-performing schedules, and mutation changes selected placements to escape local optima and keep the search flexible.' },
  { category: 'Course Scheduling', question: 'What is TRACE-cs and why does it matter?', answer: 'TRACE-cs is a symbolic reasoning approach that explains schedule decisions in natural language, making automated scheduling understandable to human stakeholders.' },
  { category: 'Course Scheduling', question: 'What performance gains were cited for the POGA-DP hybrid scheduling approach?', answer: 'The design cited roughly 47 percent better scheduling quality and about a 30 percent reduction in classroom usage compared with traditional methods.' },
  { category: 'Systems Integration', question: 'What is the Strangler Fig Pattern in SIS modernization?', answer: 'Instead of ripping out the SIS, the AI wraps around it as the new orchestration layer, gradually replacing legacy interfaces while the old platform remains the system of record.' },
  { category: 'Systems Integration', question: 'How does the AI connect to Ellucian Banner in real time?', answer: 'Through Ethos integration, REST connectors, OAuth-based authentication, and event publishing so downstream registrar actions can react to live changes.' },
  { category: 'Systems Integration', question: 'Why does PeopleSoft integration often require middleware?', answer: 'Because its data structures and interfaces are complex, middleware is needed to normalize records into cleaner context objects for the AI layer.' },
  { category: 'Systems Integration', question: "What does a 'headless SIS' mean in this architecture?", answer: 'The legacy SIS still stores authoritative data, but its user-facing workflows are deprecated and replaced by the AI-driven interaction layer.' },
  { category: 'Compliance & Privacy', question: "What is FERPA's School Official Exception?", answer: 'It allows institutions to share protected student information with authorized vendors when the use is tied to legitimate educational interests and remains under institutional control.' },
  { category: 'Compliance & Privacy', question: 'What three governance controls must the AI enforce for FERPA compliance?', answer: 'Strong encryption, role-based access control under least privilege, and zero-retention policies that prevent student PII from training external models.' },
  { category: 'Compliance & Privacy', question: 'What is federated learning, and why is it valuable in the registrar context?', answer: 'It allows institutions to improve shared models by exchanging learned parameters instead of raw student data, reducing the need to centralize protected records.' },
  { category: 'Compliance & Privacy', question: "What does 'Policy-as-Code' mean for registrar operations?", answer: 'It means translating legal and institutional policies into machine-executable rules so every AI action is checked against compliance logic before execution.' },
  { category: 'Compliance & Privacy', question: 'What is the core privacy risk of sending student data to external LLMs?', answer: 'Student records could be exposed or reused in ways that violate FERPA, especially if those records are retained or used to improve commercial models.' },
  { category: 'Governance & Ethics', question: "What is the 'MABA-MABA trap' and why should the system avoid it?", answer: 'It is the false assumption that humans and machines can be cleanly separated by task forever. Real registrar work always produces edge cases that require intentional human-in-the-loop design.' },
  { category: 'Governance & Ethics', question: 'How does confidence-based routing work in the human-in-the-loop model?', answer: 'Routine and high-confidence requests can be resolved autonomously, while ambiguous or sensitive cases are prepared by the AI and escalated to humans for final judgment.' },
  { category: 'Governance & Ethics', question: 'What is Dynamic Epistemic Fallback?', answer: 'It is a defensive behavior in which the AI detects suspicious or contradictory requests, refuses unsafe execution, falls back to safer knowledge, and routes the case for review.' },
  { category: 'Governance & Ethics', question: 'How can bias arise in student success models, and what mitigates it?', answer: 'Historical training data can encode systemic inequities, so institutions need continuous fairness testing and active monitoring for problematic proxy variables.' },
  { category: 'Governance & Ethics', question: 'What is the system’s overall philosophy regarding human staff?', answer: 'The goal is not to remove people entirely, but to move them away from repetitive processing and toward high-empathy advising, exception handling, and strategic policy work.' },
  { category: 'Implementation Roadmap', question: 'What are the four implementation phases for the AI registrar?', answer: 'Assessment and data preparation, shadow mode testing, supervised co-pilot execution, and then scaled autonomy with continuous optimization.' },
  { category: 'Implementation Roadmap', question: 'What accuracy benchmark should the system hit in shadow mode before advancing?', answer: 'The target is at least 95 percent consistency with human outputs across core registrar workflows before increasing autonomy.' },
  { category: 'Implementation Roadmap', question: "What is 'Shadow Mode' in this roadmap?", answer: 'The AI processes live registrar tasks in parallel without writing to production systems, allowing direct comparison between AI outputs and human decisions.' },
  { category: 'Implementation Roadmap', question: 'How does Phase 3 co-pilot mode differ from full autonomy?', answer: 'In co-pilot mode, the AI prepares actions but a human must explicitly approve them before any official communication or database update occurs.' },
  { category: 'Implementation Roadmap', question: 'What ongoing work continues after autonomous deployment?', answer: 'Institutions still need drift monitoring, latency checks, integration stability reviews, and continuous updates to policy engines as rules and regulations evolve.' },
]

export function cloneAIRegistrarFlashcards() {
  return AI_REGISTRAR_FLASHCARDS.map((card) => ({ ...card }))
}
