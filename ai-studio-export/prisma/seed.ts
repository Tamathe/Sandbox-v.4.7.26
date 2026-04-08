import { PrismaClient, ToolType, UserRole, BountyStatus, PlatformQuestType, QuestCadence } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
import { encodeDatasetReference } from '../app/lib/datasets'
import { CATALOG_TOOLS } from './tool-catalog'
dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create demo users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@uky.edu' },
    update: {
      name: 'Alex Thompson',
      role: UserRole.ADMIN,
      department: 'Center for AI and Academics Innovation',
      college: 'CATS-AI',
    },
    create: {
      name: 'Alex Thompson',
      email: 'admin@uky.edu',
      role: UserRole.ADMIN,
      department: 'Center for AI and Academics Innovation',
      college: 'CATS-AI',
    },
  })

  const dipaola = await prisma.user.upsert({
    where: { email: 'bob.dipaola@uky.edu' },
    update: {},
    create: {
      name: 'Dr. Robert DiPaola',
      email: 'bob.dipaola@uky.edu',
      role: UserRole.ADMIN,
      department: 'Office of the Provost',
      college: 'University of Kentucky',
    },
  })

  const monday = await prisma.user.upsert({
    where: { email: 'eric.monday@uky.edu' },
    update: {},
    create: {
      name: 'Eric Monday',
      email: 'eric.monday@uky.edu',
      role: UserRole.ADMIN,
      department: 'Finance and Administration',
      college: 'University of Kentucky',
    },
  })

  const price = await prisma.user.upsert({
    where: { email: 'heath.price@uky.edu' },
    update: {},
    create: {
      name: 'Heath Price',
      email: 'heath.price@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'College of Engineering',
      college: 'College of Engineering',
    },
  })

  const mcclureStudent = await prisma.user.upsert({
    where: { email: 'ian.mcclure.student@uky.edu' },
    update: {},
    create: {
      name: 'Ian McClure',
      email: 'ian.mcclure.student@uky.edu',
      role: UserRole.STUDENT,
      department: 'J. David Rosenberg College of Law',
      college: 'J. David Rosenberg College of Law',
    },
  })

  const tianaThe = await prisma.user.upsert({
    where: { email: 'tiana.the@uky.edu' },
    update: {},
    create: {
      name: 'Tiana The',
      email: 'tiana.the@uky.edu',
      role: UserRole.STUDENT,
      department: 'Department of English',
      college: 'College of Arts & Sciences',
    },
  })

  const educator1 = await prisma.user.upsert({
    where: { email: 'sarah.mitchell@uky.edu' },
    update: {
      name: 'Prof. Sarah Mitchell',
      role: UserRole.EDUCATOR,
      department: 'College of Law',
      college: 'College of Law',
      bio: 'Professor of Law specializing in litigation and professional responsibility.',
    },
    create: {
      name: 'Prof. Sarah Mitchell',
      email: 'sarah.mitchell@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'College of Law',
      college: 'College of Law',
      bio: 'Professor of Law specializing in litigation and professional responsibility.',
    },
  })

  const educator2 = await prisma.user.upsert({
    where: { email: 'ian.mcclure@uky.edu' },
    update: {},
    create: {
      name: 'Dr. Ian McClure',
      email: 'ian.mcclure@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'J. David Rosenberg College of Law',
      college: 'J. David Rosenberg College of Law',
    },
  })

  const educator3 = await prisma.user.upsert({
    where: { email: 'priya.patel@uky.edu' },
    update: {},
    create: {
      name: 'Dr. Priya Patel',
      email: 'priya.patel@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'Dept. of Chemistry',
      college: 'College of Arts & Sciences',
    },
  })

  const educator4 = await prisma.user.upsert({
    where: { email: 'marcus.chen@uky.edu' },
    update: {},
    create: {
      name: 'Dr. Marcus Chen',
      email: 'marcus.chen@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'College of Medicine',
      college: 'College of Medicine',
    },
  })

  const student1 = await prisma.user.upsert({
    where: { email: 'ian.mcclure.jr@uky.edu' },
    update: {},
    create: {
      name: 'Ian McClure Jr.',
      email: 'ian.mcclure.jr@uky.edu',
      role: UserRole.STUDENT,
      department: 'Finance',
      college: 'Gatton College of Business and Economics',
    },
  })

  const mayaBennett = await prisma.user.upsert({
    where: { email: 'maya.bennett@uky.edu' },
    update: {},
    create: {
      name: 'Maya Bennett',
      email: 'maya.bennett@uky.edu',
      role: UserRole.STUDENT,
      department: 'Lewis Honors College',
      college: 'Lewis Honors College',
    },
  })

  const noahCarter = await prisma.user.upsert({
    where: { email: 'noah.carter@uky.edu' },
    update: {},
    create: {
      name: 'Noah Carter',
      email: 'noah.carter@uky.edu',
      role: UserRole.STUDENT,
      department: 'College of Engineering',
      college: 'College of Engineering',
    },
  })

  const zoeKim = await prisma.user.upsert({
    where: { email: 'zoe.kim@uky.edu' },
    update: {},
    create: {
      name: 'Zoe Kim',
      email: 'zoe.kim@uky.edu',
      role: UserRole.STUDENT,
      department: 'College of Health Sciences',
      college: 'College of Health Sciences',
    },
  })

  const leoAlvarez = await prisma.user.upsert({
    where: { email: 'leo.alvarez@uky.edu' },
    update: {},
    create: {
      name: 'Leo Alvarez',
      email: 'leo.alvarez@uky.edu',
      role: UserRole.STUDENT,
      department: 'College of Arts & Sciences',
      college: 'College of Arts & Sciences',
    },
  })

  const sofiaNguyen = await prisma.user.upsert({
    where: { email: 'sofia.nguyen@uky.edu' },
    update: {},
    create: {
      name: 'Sofia Nguyen',
      email: 'sofia.nguyen@uky.edu',
      role: UserRole.STUDENT,
      department: 'College of Engineering',
      college: 'College of Engineering',
    },
  })

  const educator5 = await prisma.user.upsert({
    where: { email: 'diana.brooks@uky.edu' },
    update: {},
    create: {
      name: 'Prof. Diana Brooks',
      email: 'diana.brooks@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'Gatton College of Business',
      college: 'Gatton College of Business and Economics',
    },
  })

  const educator6 = await prisma.user.upsert({
    where: { email: 'elena.vargas@uky.edu' },
    update: {
      name: 'Dr. Elena Vargas',
      role: UserRole.EDUCATOR,
      department: 'English',
      college: 'College of Arts & Sciences',
      bio: 'Associate Professor of English, specializing in composition and rhetoric.',
    },
    create: {
      name: 'Dr. Elena Vargas',
      email: 'elena.vargas@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'English',
      college: 'College of Arts & Sciences',
      bio: 'Associate Professor of English, specializing in composition and rhetoric.',
    },
  })

  const educator7 = await prisma.user.upsert({
    where: { email: 'marcus.webb@uky.edu' },
    update: {
      name: 'Dr. Marcus Webb',
      role: UserRole.EDUCATOR,
      department: 'History',
      college: 'College of Arts & Sciences',
      bio: 'Assistant Professor of History with a focus on primary source methodology.',
    },
    create: {
      name: 'Dr. Marcus Webb',
      email: 'marcus.webb@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'History',
      college: 'College of Arts & Sciences',
      bio: 'Assistant Professor of History with a focus on primary source methodology.',
    },
  })

  const educator8 = await prisma.user.upsert({
    where: { email: 'james.wilder@uky.edu' },
    update: {
      name: 'Prof. James Wilder',
      role: UserRole.EDUCATOR,
      department: 'Engineering',
      college: 'College of Engineering',
      bio: 'TEK 100 instructor, College of Engineering. Passionate about first-year student success.',
    },
    create: {
      name: 'Prof. James Wilder',
      email: 'james.wilder@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'Engineering',
      college: 'College of Engineering',
      bio: 'TEK 100 instructor, College of Engineering. Passionate about first-year student success.',
    },
  })

  const sandboxAdmin = await prisma.user.upsert({
    where: { email: 'sandbox.admin@uky.edu' },
    update: {},
    create: {
      name: 'UK Libraries / Dean\'s Office',
      email: 'sandbox.admin@uky.edu',
      role: UserRole.ADMIN,
      department: 'UK Libraries and Dean\'s Office',
      college: 'University of Kentucky',
    },
  })

  const toolCreatorIdsByEmail: Record<string, string> = {
    'sarah.mitchell@uky.edu': educator1.id,
    'elena.vargas@uky.edu': educator6.id,
    'marcus.webb@uky.edu': educator7.id,
    'james.wilder@uky.edu': educator8.id,
    'sandbox.admin@uky.edu': admin.id,
  }

  // Seed tools
  const tool1 = await prisma.tool.upsert({
    where: { id: 'tool-cross-examination' },
    update: { published: false, featured: false },
    create: {
      id: 'tool-cross-examination',
      name: 'Cross-Examination Simulator',
      shortDescription: 'Practice cross-examination skills with an AI witness in realistic legal scenarios.',
      fullDescription: `## Cross-Examination Simulator

Practice your cross-examination skills with an AI-powered witness that adapts to your questioning technique.

### What You'll Do
- Choose from criminal, civil, or family law scenarios
- Question an AI witness that responds realistically
- Receive feedback on your technique

### How It Works
The simulator uses advanced AI to model witness behavior, including evasive answers, emotional responses, and factual inconsistencies. Your goal is to establish key facts through effective questioning.

### Scenarios Available
- **Criminal Law**: DUI case, assault charge, burglary
- **Civil Law**: Contract dispute, personal injury, property damage
- **Family Law**: Custody hearing, divorce proceedings`,
      category: 'Law',
      difficultyLevel: 'Advanced',
      estimatedMinutes: 30,
      toolType: ToolType.EXTERNAL,
      externalUrl: 'https://example.com/cross-examination-simulator',
      learningObjectives: [
        'Develop effective cross-examination questioning techniques',
        'Learn to expose inconsistencies in witness testimony',
        'Practice controlling witness narratives through leading questions',
        'Build confidence in a courtroom simulation environment',
      ],
      intendedAudience: 'Law students in their 2nd or 3rd year, particularly those in Trial Advocacy courses',
      published: false,
      featured: false,
      approvalStatus: 'APPROVED',
      creatorId: educator1.id,
      customMetrics: {
        create: [
          { name: 'questions_asked', type: 'COUNTER', description: 'Total questions posed to the witness' },
          { name: 'score', type: 'RATING', description: 'Performance score out of 100' },
          { name: 'completed', type: 'BOOLEAN', description: 'Whether the simulation was completed' },
        ],
      },
    },
  })

  const tool2 = await prisma.tool.upsert({
    where: { id: 'tool-ip-licensing-negotiator' },
    update: {},
    create: {
      id: 'tool-ip-licensing-negotiator',
      name: 'IP Licensing Deal Simulator',
      shortDescription: 'Negotiate a real-world IP licensing deal with an AI counterpart. Built for LAW 908.',
      fullDescription: `## IP Licensing Deal Simulator

Designed for **LAW 908: The Law and Business of Intellectual Property Management** at UK College of Law, taught by Dr. Ian McClure, J.D., LL.M.

### The Scenario
You represent a tech startup that has developed a breakthrough machine learning algorithm. A Fortune 500 company wants a license. Negotiate the terms.

### What You'll Practice
- Structuring exclusive vs. non-exclusive licensing arrangements
- Negotiating royalty rates, milestone payments, and sublicensing rights
- Identifying key risk clauses: indemnification, IP ownership, audit rights
- Applying real-world valuation principles to intangible assets

### Why This Matters
Dr. McClure co-founded IPXI — the world's first financial exchange for IP rights — and spent years at Black Stone IP valuing and trading IP assets. The scenarios are drawn from real deal structures.

### How It Works
The AI plays in-house counsel for the acquiring company. Push back, make offers, find a deal — or walk away if the terms don't work.`,
      category: 'Law',
      difficultyLevel: 'Advanced',
      estimatedMinutes: 40,
      toolType: ToolType.CHATBOT,
      systemPrompt: `You are playing Jennifer Walsh, Senior VP and General Counsel at Apex Technologies, a Fortune 500 software company. You are negotiating an IP licensing deal for a machine learning algorithm developed by the student's startup. You want broad rights, low royalties, and strong IP ownership protections. Be a tough but professional negotiator who knows IP law well. Respond realistically to offers, make counter-proposals, and pressure-test the student's deal terms. When the student makes a strong legal argument, acknowledge it. When they miss something important (like audit rights, sublicensing carve-outs, or term length), hint that it's an issue without giving it away. Stay in character throughout.`,
      welcomeMessage: `Good afternoon. I'm Jennifer Walsh, General Counsel at Apex. We've reviewed your algorithm and we're interested — but we need to talk deal structure. We're proposing a broad, exclusive license in the enterprise software space. What terms are you bringing to the table?`,
      starterQuestions: [
        'What royalty structure are you proposing?',
        'We want exclusive rights — what does that mean for our competitors?',
        'Walk me through your IP ownership position',
        'What audit rights are you willing to grant?',
      ],
      learningObjectives: [
        'Structure and negotiate IP licensing deals including royalty rates and exclusivity terms',
        'Identify and analyze key risk clauses in IP agreements',
        'Apply IP valuation principles to real licensing negotiations',
        'Understand the difference between exclusive, non-exclusive, and field-of-use licenses',
      ],
      intendedAudience: 'Students enrolled in LAW 908 at UK J. David Rosenberg College of Law',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      creatorId: educator2.id,
      customMetrics: {
        create: [
          { name: 'deal_reached', type: 'BOOLEAN', description: 'Whether the student successfully closed a deal' },
          { name: 'negotiation_score', type: 'RATING', description: 'Quality of deal terms secured (1-10)' },
          { name: 'rounds', type: 'COUNTER', description: 'Number of negotiation exchanges' },
        ],
      },
    },
  })

  await prisma.tool.upsert({
    where: { id: 'transfer-credit-articulator' },
    update: {
      name: 'Transfer Credit Articulator',
      shortDescription: 'AI-powered transfer credit evaluation with confidence scoring and human review workflow.',
      fullDescription: `## Transfer Credit Articulator

Evaluate an external course against a University of Kentucky equivalent with an advisory AI similarity score, human-readable reasoning, and a documented review workflow.

### What it does
- Compares pasted syllabus text against an internal course description
- Produces a 0-100 similarity score plus a recommendation band
- Saves every evaluation for follow-up review
- Keeps final approval with human reviewers, not the model

### Why it matters
Transfer credit review is time-consuming, inconsistent, and often buried in email threads. This tool gives registrars and academic units a structured starting point while preserving human decision authority.`,
      category: 'Registrar Tools',
      difficultyLevel: 'Intermediate',
      estimatedMinutes: 12,
      toolType: ToolType.SIMULATION,
      starterQuestions: [],
      referenceDocUrls: [],
      learningObjectives: [
        'Compare external learning objectives to internal course outcomes',
        'Surface likely equivalency decisions with transparent confidence bands',
        'Document human review decisions for transfer-credit workflows',
      ],
      intendedAudience: 'Registrars, transfer credit evaluators, department chairs, and academic advisors',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      isOfficialService: true,
      creatorId: admin.id,
    },
    create: {
      id: 'transfer-credit-articulator',
      name: 'Transfer Credit Articulator',
      shortDescription: 'AI-powered transfer credit evaluation with confidence scoring and human review workflow.',
      fullDescription: `## Transfer Credit Articulator

Evaluate an external course against a University of Kentucky equivalent with an advisory AI similarity score, human-readable reasoning, and a documented review workflow.

### What it does
- Compares pasted syllabus text against an internal course description
- Produces a 0-100 similarity score plus a recommendation band
- Saves every evaluation for follow-up review
- Keeps final approval with human reviewers, not the model

### Why it matters
Transfer credit review is time-consuming, inconsistent, and often buried in email threads. This tool gives registrars and academic units a structured starting point while preserving human decision authority.`,
      category: 'Registrar Tools',
      difficultyLevel: 'Intermediate',
      estimatedMinutes: 12,
      toolType: ToolType.SIMULATION,
      starterQuestions: [],
      referenceDocUrls: [],
      learningObjectives: [
        'Compare external learning objectives to internal course outcomes',
        'Surface likely equivalency decisions with transparent confidence bands',
        'Document human review decisions for transfer-credit workflows',
      ],
      intendedAudience: 'Registrars, transfer credit evaluators, department chairs, and academic advisors',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      isOfficialService: true,
      creatorId: admin.id,
    },
  })

  await prisma.tool.upsert({
    where: { id: 'ai-registrar-flashcards' },
    update: {
      name: 'AI Registrar Flashcard Quiz',
      shortDescription: 'Study the autonomous registrar architecture with a live 30-card flashcard deck drawn from the AI Registrar system design.',
      fullDescription: `## AI Registrar Flashcard Quiz

Study the architecture behind an autonomous AI registrar through a hands-on flashcard deck built directly from the system design document.

### What is inside
- 30 flashcards across 7 topic categories
- Category filters for focused study
- Flip-card review with "Got It" and "Still Learning" tracking
- A results screen with category-by-category breakdowns
- An editor for adding, removing, or rewriting cards in-place

### Why this exists
The Sandbox should not only ship registrar tools. It should also help teams understand the architecture and policy logic behind them.`,
      category: 'Registrar Tools',
      difficultyLevel: 'Intermediate',
      estimatedMinutes: 10,
      toolType: ToolType.QUIZ,
      starterQuestions: [],
      referenceDocUrls: [],
      learningObjectives: [
        'Recall the core concepts behind a neuro-symbolic registrar',
        'Understand the document, scheduling, integration, and compliance layers',
        'Reinforce the implementation roadmap for an AI registrar rollout',
      ],
      intendedAudience: 'Registrar teams, campus innovation leaders, and students exploring the AI Registrar architecture',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      isOfficialService: true,
      creatorId: admin.id,
    },
    create: {
      id: 'ai-registrar-flashcards',
      name: 'AI Registrar Flashcard Quiz',
      shortDescription: 'Study the autonomous registrar architecture with a live 30-card flashcard deck drawn from the AI Registrar system design.',
      fullDescription: `## AI Registrar Flashcard Quiz

Study the architecture behind an autonomous AI registrar through a hands-on flashcard deck built directly from the system design document.

### What is inside
- 30 flashcards across 7 topic categories
- Category filters for focused study
- Flip-card review with "Got It" and "Still Learning" tracking
- A results screen with category-by-category breakdowns
- An editor for adding, removing, or rewriting cards in-place

### Why this exists
The Sandbox should not only ship registrar tools. It should also help teams understand the architecture and policy logic behind them.`,
      category: 'Registrar Tools',
      difficultyLevel: 'Intermediate',
      estimatedMinutes: 10,
      toolType: ToolType.QUIZ,
      starterQuestions: [],
      referenceDocUrls: [],
      learningObjectives: [
        'Recall the core concepts behind a neuro-symbolic registrar',
        'Understand the document, scheduling, integration, and compliance layers',
        'Reinforce the implementation roadmap for an AI registrar rollout',
      ],
      intendedAudience: 'Registrar teams, campus innovation leaders, and students exploring the AI Registrar architecture',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      isOfficialService: true,
      creatorId: admin.id,
    },
  })

  const tool4 = await prisma.tool.upsert({
    where: { id: 'tool-patient-interview' },
    update: {},
    create: {
      id: 'tool-patient-interview',
      name: 'Patient Interview Practice',
      shortDescription: 'Practice patient history-taking with a realistic AI patient simulation.',
      fullDescription: `## Patient Interview Practice

Sharpen your clinical interview skills with a realistic AI patient who presents with real symptoms.

### The Scenario
You're a medical student seeing Pat, a 45-year-old presenting with intermittent chest pain. Practice taking a full patient history, exploring symptoms, past medical history, medications, and social history.

### Learning Goals
This simulation is designed to help you:
- Practice the structured patient interview format
- Learn to ask open-ended vs. closed-ended questions
- Develop differential diagnosis thinking
- Get comfortable with sensitive questioning

### Tips
- Don't rush to diagnosis — explore the story first
- Ask about medication, family history, and lifestyle
- The patient will only tell you what you ask about!`,
      category: 'Medicine',
      difficultyLevel: 'Intermediate',
      estimatedMinutes: 25,
      toolType: ToolType.CHATBOT,
      systemPrompt: `You are simulating a patient visiting a doctor's office. You are a 45-year-old named Pat who has been experiencing intermittent chest pain for the past 2 weeks, especially during physical activity. You also have mild shortness of breath. Your medical history includes Type 2 diabetes (diagnosed 5 years ago) and hypertension. You take metformin and lisinopril. You're a former smoker (quit 3 years ago, smoked for 15 years). You're anxious about your symptoms but cooperative. Answer the medical student's questions naturally — don't volunteer all information at once. Only share details when specifically asked. If asked something you wouldn't know as a patient, say so naturally.`,
      welcomeMessage: `Hi, I'm Pat. I've been having some chest pain lately and my doctor told me to come in... I'm a little worried about it, honestly. What would you like to know?`,
      starterQuestions: [
        'Can you describe the chest pain for me?',
        'When did you first notice it?',
        'Does anything make it better or worse?',
        'Tell me about your medical history',
      ],
      learningObjectives: [
        'Practice the structured clinical interview format',
        'Develop skill in eliciting a complete patient history',
        'Apply differential diagnosis thinking to a realistic case',
      ],
      intendedAudience: 'Medical students in their 2nd year clinical skills courses',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      creatorId: educator4.id,
    },
  })

  const tool5 = await prisma.tool.upsert({
    where: { id: 'tool-socratic-debate' },
    update: {},
    create: {
      id: 'tool-socratic-debate',
      name: 'Socratic Philosophy Debate Partner',
      shortDescription: 'Engage in Socratic dialogue on ethics, epistemology, or metaphysics.',
      fullDescription: `## Socratic Philosophy Debate Partner

Practice philosophical reasoning through the time-honored Socratic method.

### What to Expect
The AI won't lecture you — it will question you. Make a claim, and it will ask you to define your terms. Provide an example, and it will present a counterexample. This is how Socrates taught, and it's how you'll sharpen your thinking.

### Topics to Explore
- **Ethics**: What makes an action right or wrong? Is morality objective?
- **Epistemology**: What can we really know? Is perception reliable?
- **Metaphysics**: What is the nature of reality? Do we have free will?
- **Political Philosophy**: What makes a just society?

### How To Use
Start with a claim or a question. The more specific, the better. Don't worry about being "wrong" — the goal is to think more clearly, not to win.`,
      category: 'Arts',
      difficultyLevel: 'Introductory',
      estimatedMinutes: 20,
      toolType: ToolType.CHATBOT,
      systemPrompt: `You are a Socratic dialogue partner. Your role is to engage the student in philosophical inquiry using the Socratic method. Ask probing questions rather than giving answers. Challenge assumptions. Help the student discover contradictions in their reasoning. Be respectful but intellectually rigorous. Focus on ethics, epistemology, and metaphysics. When the student makes a claim, ask them to define their terms, provide examples, and consider counterexamples. Never lecture — always question.`,
      welcomeMessage: `Welcome. I'm here to think with you, not for you. What philosophical question or claim would you like to explore today? The more bold your starting position, the more interesting our dialogue will be.`,
      starterQuestions: [
        'Is morality objective or subjective?',
        'Do we have free will?',
        'Can we ever truly know anything?',
        'What makes a life worth living?',
      ],
      learningObjectives: [
        'Practice articulating and defending philosophical positions',
        'Develop skill in recognizing logical fallacies and unstated assumptions',
        'Experience the Socratic method as a mode of inquiry',
      ],
      intendedAudience: 'Any student interested in philosophy or critical thinking',
      published: true,
      featured: false,
      approvalStatus: 'APPROVED',
      creatorId: student1.id,
    },
  })

  // SEED IMPROVEMENT: Create a DRAFT tool to solve "Blank Canvas Paralysis"
  // When Prof. Mitchell logs in, she sees a work-in-progress, prompting immediate action.
  await prisma.tool.upsert({
    where: { id: 'tool-draft-ethics-bot' },
    update: {},
    create: {
      id: 'tool-draft-ethics-bot',
      name: 'Legal Ethics Scenarios (DRAFT)',
      shortDescription: 'Simulation for client confidentiality breaches.',
      fullDescription: 'Draft in progress...',
      category: 'Law',
      difficultyLevel: 'Introductory',
      estimatedMinutes: 15,
      toolType: ToolType.CHATBOT,
      // A system prompt that "needs work" invites the user to fix it
      systemPrompt: 'You are a client who is upset about...', 
      published: false, // Key: It shows up in "My Drafts"
      featured: false,
      approvalStatus: 'PENDING',
      creatorId: educator1.id,
    }
  })

  // Course-code specific tools
  const tool7 = await prisma.tool.upsert({
    where: { id: 'tool-phi110-argument-coach' },
    update: {},
    create: {
      id: 'tool-phi110-argument-coach',
      name: 'PHI 110: Argument Analysis Coach',
      shortDescription: 'Practice identifying fallacies, structuring arguments, and evaluating evidence for PHI 110.',
      fullDescription: `## PHI 110 Argument Analysis Coach

Built specifically for **PHI 110: Critical Thinking** at UK, this tool helps you practice the core skills assessed on exams and papers.

### What You Can Practice
- Identifying logical fallacies (ad hominem, straw man, false dichotomy, etc.)
- Diagramming argument structure (premises → conclusion)
- Evaluating the strength of evidence in real-world claims
- Writing clear, valid deductive arguments

### How It Works
Paste any argument — from a news article, a political speech, or your own paper draft — and the AI will break it down, flag weaknesses, and help you strengthen it.

### Aligned to Course Objectives
This tool covers material from Units 2–4 of PHI 110 and is particularly useful for Essay Assignment 2 and the midterm.`,
      category: 'Arts',
      difficultyLevel: 'Introductory',
      estimatedMinutes: 20,
      toolType: ToolType.CHATBOT,
      systemPrompt: `You are a critical thinking tutor for PHI 110 (Introduction to Critical Thinking) at the University of Kentucky. Help students identify logical fallacies, analyze argument structure, and improve their reasoning. When a student submits an argument, break it down into premises and conclusion, identify any fallacies or weaknesses, and suggest improvements. Use Socratic questioning to guide discovery rather than just giving answers. Be encouraging but rigorous.`,
      welcomeMessage: `Welcome to the PHI 110 Argument Coach! Paste an argument you'd like to analyze — it can be from a news article, a political speech, a classmate's paper, or something you wrote yourself. We'll break it down together.`,
      starterQuestions: [
        'Here\'s an argument I want to analyze: "Everyone I know supports this policy, so it must be correct."',
        'What\'s the difference between a valid and a sound argument?',
        'Can you help me strengthen my thesis for Essay 2?',
        'What logical fallacy is this: "If you\'re not with us, you\'re against us"?',
      ],
      learningObjectives: [
        'Identify common logical fallacies in real-world arguments',
        'Diagram argument structure using standard notation',
        'Evaluate the quality of evidence supporting a claim',
        'Construct valid deductive arguments in writing',
      ],
      intendedAudience: 'Students enrolled in PHI 110: Critical Thinking at UK',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      creatorId: student1.id,
    },
  })

  const tool8 = await prisma.tool.upsert({
    where: { id: 'tool-law756-evidence-quiz' },
    update: {},
    create: {
      id: 'tool-law756-evidence-quiz',
      name: 'LAW 756: Evidence Rules Simulator',
      shortDescription: 'Interactive FRE objection practice with realistic courtroom scenarios for LAW 756.',
      fullDescription: `## LAW 756 Evidence Rules Simulator

Designed for **LAW 756: Evidence** at UK College of Law. Practice applying the Federal Rules of Evidence in realistic courtroom exchanges.

### Scenarios Covered
- Hearsay and its exceptions (FRE 801–807)
- Character evidence (FRE 404–405)
- Relevance and unfair prejudice (FRE 401–403)
- Authentication and best evidence (FRE 901–1002)
- Privilege (attorney-client, spousal, physician-patient)

### Format
The AI plays opposing counsel and the judge. You must raise timely objections, state the correct rule, and argue the ruling. The judge will respond realistically — sometimes sustaining, sometimes overruling with an explanation.

### Bar Exam Relevance
Evidence is consistently one of the highest-weighted MEE subjects. This tool mirrors the fact-pattern format used on the bar.`,
      category: 'Law',
      difficultyLevel: 'Advanced',
      estimatedMinutes: 35,
      toolType: ToolType.CHATBOT,
      systemPrompt: `You are running a Federal Rules of Evidence courtroom simulation for 3L law students at the University of Kentucky. Play both opposing counsel and the judge alternately. Present realistic trial scenarios involving evidentiary disputes. When the student raises an objection, evaluate whether it is timely, correctly stated, and legally sound under the FRE. Have the judge rule with a brief explanation. Cover hearsay and exceptions, character evidence, relevance, authentication, and privilege. Keep scenarios grounded in realistic civil or criminal trial contexts.`,
      welcomeMessage: `Court is in session. I'll play opposing counsel and the judge. Ready to begin? Tell me whether you'd like a civil or criminal scenario, or I'll choose one for you.`,
      starterQuestions: [
        'Give me a hearsay objection scenario',
        'Let\'s practice FRE 404(b) — prior bad acts',
        'I want to work on attorney-client privilege',
        'Run me through an authentication dispute',
      ],
      learningObjectives: [
        'Apply Federal Rules of Evidence in realistic trial contexts',
        'Raise timely and properly stated objections',
        'Distinguish hearsay from non-hearsay and identify applicable exceptions',
        'Prepare for the Evidence portion of the Multistate Essay Examination',
      ],
      intendedAudience: 'Students enrolled in LAW 756: Evidence at UK College of Law',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      creatorId: educator1.id,
    },
  })

  const tool9 = await prisma.tool.upsert({
    where: { id: 'tool-cs215-debug-tutor' },
    update: {},
    create: {
      id: 'tool-cs215-debug-tutor',
      name: 'CS 215: Python Debugging Tutor',
      shortDescription: 'Paste your broken Python code and get guided debugging help without just getting the answer.',
      fullDescription: `## CS 215 Python Debugging Tutor

Built for **CS 215: Introduction to Python Programming** at UK. This is NOT a "write my code" tool — it's a Socratic debugging partner that helps you find your own bugs.

### How It Works
1. Paste your code and describe what it's supposed to do
2. Describe the error or unexpected output you're getting
3. The tutor asks targeted questions to guide you to the bug
4. You fix it, it checks your reasoning

### Why This Approach?
Research shows students who work through bugs themselves retain understanding far longer than those who copy fixes. The tutor is calibrated to the CS 215 curriculum and won't give answers directly.

### Topics Covered
- Syntax errors, runtime errors, logic errors
- Loops, conditionals, functions, lists, dictionaries
- File I/O and basic data structures`,
      category: 'STEM',
      difficultyLevel: 'Introductory',
      estimatedMinutes: 25,
      toolType: ToolType.CHATBOT,
      systemPrompt: `You are a Python debugging tutor for CS 215 (Introduction to Python Programming) at the University of Kentucky. When students paste code with errors, do NOT fix it for them. Instead, use the Socratic method: ask questions that guide them to identify the bug themselves. Ask things like "What do you expect this line to do?" or "What does Python actually do when it sees this?" Keep your language simple and encouraging. Only cover concepts appropriate to an introductory Python course (variables, conditionals, loops, functions, lists, dictionaries, basic file I/O). If a student is completely stuck, give a targeted hint — not the full answer.`,
      welcomeMessage: `Hey! Paste your code, tell me what it's supposed to do, and describe the error or wrong output you're getting. We'll figure it out together — I won't just hand you the answer, but I'll get you there.`,
      starterQuestions: [
        'My loop runs forever and I don\'t know why',
        'I\'m getting an IndexError but I don\'t understand it',
        'My function returns None instead of a value',
        'I think my if/else logic is wrong but I can\'t see it',
      ],
      learningObjectives: [
        'Independently identify and fix syntax, runtime, and logic errors',
        'Read Python error messages and tracebacks effectively',
        'Develop debugging strategies applicable beyond the classroom',
      ],
      intendedAudience: 'Students enrolled in CS 215: Introduction to Python Programming at UK',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      creatorId: educator3.id,
    },
  })

  const tool10 = await prisma.tool.upsert({
    where: { id: 'tool-nonprofit-donor-prospector' },
    update: {},
    create: {
      id: 'tool-nonprofit-donor-prospector',
      name: 'Nonprofit Donor Prospector',
      shortDescription: 'Identify and qualify businesses likely to donate to philanthropic causes using AI-assisted research and scoring.',
      fullDescription: `## Nonprofit Donor Prospector

A practical AI tool for nonprofit development officers, philanthropy students, and community organizations. Helps you research, qualify, and prioritize potential corporate donors.

### What It Does
- **Profile Analysis**: Describe a business and get a giving-likelihood score based on industry, size, local presence, and stated values
- **Pitch Framing**: Get customized messaging that aligns your cause with the donor's brand interests
- **Objection Handling**: Practice responses to common donor hesitations
- **Portfolio Building**: Work through a list of prospects and build a prioritized outreach pipeline

### Real-World Use Cases
- Community nonprofits researching local business donors
- University fundraising offices building corporate partnership pipelines
- Philanthropy & Nonprofit Management students (PHL 350) doing practicum work
- Grant writers identifying in-kind donation prospects

### How To Use
Describe your organization and cause, then describe a business you're considering approaching. The AI will assess fit, suggest framing, and help you prepare for the conversation.`,
      category: 'Business',
      difficultyLevel: 'Intermediate',
      estimatedMinutes: 30,
      toolType: ToolType.CHATBOT,
      systemPrompt: `You are an expert nonprofit fundraising strategist helping development officers and students identify and approach corporate donors. When the user describes their nonprofit and a target business, assess the likelihood of a successful donation ask based on: industry alignment, company size and profitability signals, community involvement history, stated ESG commitments, and geographic proximity. Provide a giving-likelihood assessment (High/Medium/Low) with reasoning. Then help craft a tailored pitch that connects the business's interests to the nonprofit's mission. Help users anticipate and handle donor objections. Be practical, direct, and grounded in real fundraising strategy.`,
      welcomeMessage: `Let's find you some donors. Tell me about your organization — what's your mission, your cause area, and your funding goal? Then describe a business you're considering approaching and we'll assess the fit together.`,
      starterQuestions: [
        'We\'re a food bank looking for corporate donors — where do we start?',
        'How do I approach a local car dealership about sponsoring our gala?',
        'What industries are most likely to give to environmental causes?',
        'Help me handle a donor who says "we already give to other charities"',
      ],
      learningObjectives: [
        'Qualify corporate donor prospects using structured criteria',
        'Align nonprofit messaging with donor brand interests and values',
        'Build a prioritized donor outreach pipeline',
        'Prepare for and handle common donor objections professionally',
      ],
      intendedAudience: 'Nonprofit development professionals, philanthropy students (PHL 350), and community organizers',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      creatorId: educator5.id,
    },
  })

  const tool11 = await prisma.tool.upsert({
    where: { id: 'tool-ip-strategy-coach' },
    update: {},
    create: {
      id: 'tool-ip-strategy-coach',
      name: 'LAW 908: IP Strategy Coach',
      shortDescription: 'Ask anything about IP valuation, licensing strategy, and technology commercialization.',
      fullDescription: `## LAW 908 IP Strategy Coach

Your on-demand tutor for **LAW 908: The Law and Business of Intellectual Property Management** at UK College of Law, taught by Dr. Ian McClure, J.D., LL.M.

### What It Covers
Built around Dr. McClure's curriculum and his real-world experience co-founding IPXI, serving on the National Advisory Council on Innovation and Entrepreneurship (NACIE), and directing UK Innovate.

**Core Topics:**
- IP valuation methodologies (cost, market, income approaches)
- Patent licensing strategies and royalty structures
- Technology transfer and university commercialization
- IP in M&A transactions
- Building and managing IP portfolios
- AI and IP ownership — who owns what a machine creates?
- Startup IP strategy: what to patent vs. keep as trade secret

### Built On Real Experience
Dr. McClure has been named to IAM Magazine's "World's Leading IP Strategists" every year since 2012. This tool draws on that body of work and real deal structures.`,
      category: 'Law',
      difficultyLevel: 'Intermediate',
      estimatedMinutes: 20,
      toolType: ToolType.CHATBOT,
      systemPrompt: `You are an IP strategy tutor for LAW 908 at the University of Kentucky, taught by Dr. Ian McClure (J.D., LL.M. in IP Law — DePaul; B.A. Economics — Vanderbilt cum laude; co-founder of IPXI, the world's first financial exchange for IP rights; former VP at Black Stone IP which was acquired by Houlihan Lokey; current VP for Innovation at UK HealthCare; appointed to the National Advisory Council on Innovation and Entrepreneurship by the U.S. EDA; named to IAM's World's Leading IP Strategists every year since 2012). Help law students understand IP licensing, valuation, technology commercialization, and IP portfolio strategy. Draw on real-world deal structures and examples. When explaining concepts, connect doctrine to business strategy — students in this course learn both law and business. Cover topics including: royalty rate benchmarking, exclusive vs. non-exclusive licensing, field-of-use restrictions, IP in M&A, technology transfer, patent vs. trade secret strategy, and AI IP issues. Be direct and practical.`,
      welcomeMessage: `Welcome to LAW 908. I can help you work through IP strategy concepts, licensing structures, valuation approaches, or anything from the course. What are you working on?`,
      starterQuestions: [
        'What are the three main approaches to IP valuation?',
        'When should a startup patent vs. keep something a trade secret?',
        'How does a university technology transfer office work?',
        'What makes an IP license exclusive vs. non-exclusive?',
      ],
      learningObjectives: [
        'Apply IP valuation methodologies to real licensing scenarios',
        'Distinguish between patent, trade secret, and licensing strategies for different business contexts',
        'Understand how technology commercialization works in university and corporate settings',
        'Analyze IP portfolio strategy from both legal and business perspectives',
      ],
      intendedAudience: 'Students enrolled in LAW 908 at UK J. David Rosenberg College of Law',
      published: true,
      featured: false,
      approvalStatus: 'APPROVED',
      creatorId: educator2.id,
    },
  })

  const tool12 = await prisma.tool.upsert({
    where: { id: 'tool-mba640-strategy-coach' },
    update: {},
    create: {
      id: 'tool-mba640-strategy-coach',
      name: 'MBA 640: Competitive Strategy Coach',
      shortDescription: 'Work through live business cases using Porter, Blue Ocean, and resource-based frameworks for MBA 640.',
      fullDescription: `## MBA 640 Competitive Strategy Coach

Built for **MBA 640: Competitive Strategy** in the Gatton College of Business. Practice applying strategic frameworks to real companies before class discussion.

### Frameworks Covered
- **Porter's Five Forces** — industry attractiveness analysis
- **Value Chain Analysis** — where does competitive advantage live?
- **Blue Ocean Strategy** — identify uncontested market space
- **Resource-Based View** — VRIN analysis of competitive resources
- **BCG Matrix** — portfolio strategy for multi-business firms
- **Ansoff Matrix** — growth strategy options

### How To Use
Name a company or industry, choose a framework, and work through it interactively. The coach asks questions, challenges your assumptions, and pushes you to defend your analysis — just like a cold call in class.

### Case Prep Mode
Paste a case synopsis and tell the coach which class session it's for. It'll help you prepare your analysis, anticipate professor questions, and structure your in-class contribution.`,
      category: 'Business',
      difficultyLevel: 'Advanced',
      estimatedMinutes: 40,
      toolType: ToolType.CHATBOT,
      systemPrompt: `You are a competitive strategy coach for MBA 640 at the Gatton College of Business and Economics, University of Kentucky. Help MBA students apply strategic management frameworks to real companies and case studies. Cover Porter's Five Forces, value chain analysis, Blue Ocean Strategy, the resource-based view (VRIN), BCG Matrix, and Ansoff Matrix. When a student selects a framework and company, guide them through the analysis with probing questions — don't just do it for them. Push back on weak analysis. Help them prepare compelling in-class contributions. Speak at the level of an MBA student with basic business knowledge.`,
      welcomeMessage: `Ready to get your strategy reps in? Tell me the company or industry you want to analyze, or paste a case synopsis and I'll help you prep. Which framework do you want to work with?`,
      starterQuestions: [
        'Let\'s run a Five Forces analysis on Netflix',
        'Help me prep for the Southwest Airlines case',
        'What\'s the difference between Blue Ocean and differentiation strategy?',
        'I need to do a VRIN analysis on Apple\'s supply chain',
      ],
      learningObjectives: [
        'Apply Porter\'s Five Forces and other frameworks to real industry contexts',
        'Identify sources of sustainable competitive advantage using the resource-based view',
        'Develop and defend strategic recommendations under pressure',
        'Prepare rigorous analyses for MBA case discussions',
      ],
      intendedAudience: 'MBA students enrolled in MBA 640: Competitive Strategy at Gatton College',
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      creatorId: educator5.id,
    },
  })

  const financialAidAdvisorData = {
    id: 'tool-financial-aid-advisor',
    name: 'Financial Aid Advisor',
    shortDescription: 'Walk through your myUK financial aid status step by step — FAFSA, documents, offers, loans, SAP, and more.',
    fullDescription: `## Financial Aid Advisor — Powered by UK OSFAS

Finley is trained on the full UK Financial Aid & Scholarships knowledge base, including official portal documentation, loan and grant policies, SAP standards, and all content from studentsuccess.uky.edu.

### What Finley Does
- **Portal Status Check**: walks you through your myUK financial aid checklist — FAFSA received, required documents, offer accepted, MPN/Entrance Counseling, SAP status, enrollment status, and FERPA designee
- **Plain-English Translation**: converts confusing ProSAM codes and portal terminology into clear language
- **Action Steps**: tells you exactly what to do next and where to go (myUK portal, studentaid.gov, OSFAS office)
- **Full Aid Knowledge**: FAFSA deadlines, loan limits and interest rates, grant eligibility, scholarship programs, cost of attendance, verification, withdrawal rules, state waivers

### What Finley Does Not Do
Finley does not access your student records or make eligibility decisions. For account-specific actions, Finley points you to myUK or OSFAS at 127 Funkhouser (859-257-3172).`,
    category: 'University',
    difficultyLevel: 'Introductory',
    estimatedMinutes: 10,
    toolType: ToolType.CHATBOT,
    personaName: 'Finley',
    audioEnabled: true,
    audioPersonaName: 'Finley Audio Guide',
    audioEngine: 'openai',
    audioVoiceName: 'nova',
    audioSpeed: 0.98,
    audioSystemSuffix:
      'You are in audio mode. Keep responses under 3 sentences. Use no markdown, no bullet lists, and no headers. Speak conversationally, translate financial aid jargon into simple action steps, and close with one clear next move.',
    audioBackgroundTrack: null,
    personaAvatar: '💰',
    welcomeMessage: `Hi, I'm **Finley** — your AI guide to UK financial aid. 💰

I can help you in two ways:

**1. Walk through your myUK status** — I'll ask you a few questions about what you're seeing in your portal and tell you exactly what each item means and what to do next. *(FAFSA status, required documents, offer acceptance, MPN/Entrance Counseling, SAP, enrollment status, FERPA)*

**2. Answer any financial aid question** — FAFSA deadlines, loan limits, scholarship info, cost of attendance, verification, SAP appeals — ask me anything.

What would you like to do?`,
    systemPrompt: `You are Finley, the official AI financial aid advisor for the University of Kentucky Student Financial Aid and Scholarships Office (OSFAS). You are warm, patient, and plain-spoken — you translate confusing financial aid jargon into clear steps students can act on today.

## YOUR PRIMARY ROLE: myUK Portal Status Check

When a student says they want to check their financial aid status or are confused about what to do next, walk them through this structured checklist one item at a time. Ask only ONE question at a time and wait for the answer before moving on:

**1. FAFSA Received**
Ask: "Has UK received your FAFSA? In your myUK portal, go to Student Services → Financials → Financial Aid → View & Accept Offers. Do you see a financial aid offer listed, or does it say 'No Award'?"
- If yes (offer exists): proceed to step 2
- If no: guide them to file at studentaid.gov using UK school code 001989. Deadlines: March 1 (incoming freshmen), April 15 (current/transfer/graduate students).

**2. File Complete / Documents Requested**
Ask: "In your myUK portal under Financial Aid, do you see any 'Required Documents' or 'To Do' items listed?"
- If yes: explain that these must be completed before aid disburses. Common items include:
  • Verification documents (submit via StudentForms — you'll get an email)
  • Entrance Counseling (for first-time loan borrowers): complete at https://studentaid.gov/entrance-counseling/
  • Master Promissory Note (MPN): complete at https://studentaid.gov/mpn/
  • Terms & Conditions for Federal Aid
  • Terms & Conditions for Scholarships
- If no outstanding items: proceed to step 3

**3. Financial Aid Offer Accepted**
Ask: "Have you accepted your financial aid offer? In myUK: Student Services → Financials → Financial Aid → View & Accept Offers → Sign the Consent & Obligation Form and accept/decline each award."
- Freshmen accept scholarships by May 1. Other students: August 1.
- Explain they can accept partial loans — they don't have to take everything offered.

**4. Loans: MPN and Entrance Counseling**
If student has accepted federal student loans (Subsidized, Unsubsidized, or Grad PLUS), ask: "For first-time borrowers, have you completed both Entrance Counseling AND your Master Promissory Note at studentaid.gov? These appear as 'To Do' items in your portal."
- Entrance Counseling: https://studentaid.gov/entrance-counseling/
- MPN: https://studentaid.gov/mpn/
- Note: required even if completed at another school.
- Until these are done, loans cannot disburse.

**5. SAP — Satisfactory Academic Progress**
Ask: "Does your myUK portal show your Academic Progress status? Does it say anything other than 'Satisfactory' or 'FA Warning'?"
Translate SAP codes in plain English:
- Satisfactory / No UK History → ✅ Good standing
- FA Warning → ⚠️ Eligible now but at risk — must improve
- Financial Aid Probation (P or Q) → ⚠️ Appeal approved — must follow academic plan
- Unsatisfactory (U, A, B, C, D, E, F, H, M) → ❌ Not eligible; must appeal
- Appeal Denied (Z) → ❌ Not eligible at this time
SAP appeal deadlines: Summer 2025: June 30 | Fall 2025: August 29 | Spring 2026: January 16

**6. Enrollment Status**
Ask: "How many credit hours are you enrolled in this semester?"
Translate enrollment status:
- Full-Time (F): 12+ hours undergrad
- Three-Quarter Time (T): 9–11 hours
- Half-Time (H): 6–8 hours (minimum for most federal aid)
- Less Than Half-Time (L): under 6 hours — very limited aid eligibility
- Pell Grant and loans require at least half-time (6 credit hours for undergrad)
- PharmD: 6 credit hours; Graduate/Professional/Law: 5 credit hours

**7. FERPA Designee**
Ask: "Have you added a FERPA designee in myUK? This lets you authorize a parent or other person to discuss your financial aid on your behalf."
- Without it, the financial aid office legally cannot share your information with family members.
- To add: myUK → Personal Information → FERPA Designee.

---

## COMPREHENSIVE UK FINANCIAL AID KNOWLEDGE

### Office Contact
- Phone: 859-257-3172 | Email: OSFAS@uky.edu
- Location: 127 Funkhouser Building
- Hours: Monday–Friday, 8:30 a.m.–4:30 p.m. ET
- School code (FAFSA): 001989

### Aid Types
**Grants (free money, no repayment):**
- Federal Pell Grant: need-based via FAFSA; max varies by year; baccalaureate holders ineligible
- FSEOG: ~$500/yr; Student Aid Index of zero, Pell recipient
- Kentucky CAP Grant: KY residents; cannot exceed demonstrated need
- TEACH Grant: requires 4 years teaching at low-income school; converts to loan if not fulfilled
- Children of Fallen Heroes: parent/guardian died in line of duty as public safety officer

**Loans (must be repaid):**
- Direct Subsidized: government pays interest while enrolled half-time+; undergrad only
- Direct Unsubsidized: interest accrues immediately
- 2025–26 rates: 6.39% (undergrad) / 7.94% (graduate); origination fee 1.057%
- Annual limits: Freshman dependent $5,500 | Sophomore $6,500 | Junior/Senior $7,500 | Graduate $20,500
- Parent PLUS: parents of dependent undergrads; rate 8.94%; requires separate application
- Grad PLUS: graduate students; rate 8.94%
- Short-Term Emergency Loans: for unexpected expenses; requires upcoming financial aid on file

**Work-Study:**
- Need-based; part-time campus jobs
- Starting pay: $12/hour; America Reads tutoring: $15/hour
- Apply via ukjobs.uky.edu; earnings paid bi-weekly (do NOT automatically apply to tuition bill)
- Contact: FWS@uky.edu

**Scholarships:**
- Academic scholarships: no FAFSA required but strongly encouraged
- Incoming freshmen: must apply to UK by December 1 Early Action for best scholarship consideration
- Transfer students: accept by August 1
- ScholarshipUniverse: online platform matching students to scholarships
- External scholarships: notify externalschol@uky.edu; submit DARF form; allow 3 weeks

### Cost of Attendance 2025–2026 (estimates)
Undergraduate in-state: ~$34,000–$37,600 | Out-of-state: ~$55,300–$59,800
Law in-state: ~$50,700–$55,700 | Out-of-state: ~$75,900–$80,800
Graduate: $37,600–$65,300 depending on program
Full details at: studentsuccess.uky.edu/financial-aid-and-scholarships/cost-attendance

### Key Deadlines
- Incoming freshmen FAFSA priority: March 1
- Current/transfer/graduate FAFSA: April 15
- Verification documents: July 1 (for fall disbursement)
- Scholarship acceptance — freshmen: May 1 | others: August 1
- Fall bill due: August 22 | Spring bill due: January 22
- SAP appeal deadlines: Summer June 30, Fall August 29, Spring January 16

### Verification
If selected, you'll receive an email to submit documents via StudentForms portal. All docs must be submitted and processed before aid disburses. Pell Grant verification deadline: 120 days after last day of prior academic term.

### State Tuition Waivers
- Foster/adopted children (from KY foster care): covers tuition and fees up to 150 credit hours or age 28
- Children/spouses of officers killed/disabled in duty: free tuition
- ATC employees: up to 6 credit hours/semester
- Cannot be combined with other waivers or scholarships

### Special Situations
- International students: not eligible for federal aid; may use private loans, scholarships, ScholarshipUniverse
- Withdrawal: students who withdraw before 60% of semester may owe funds back (Return to Title IV)
- Summer aid: must have FAFSA on file by June 30; Pell Grant may have remaining eligibility
- Winter aid: combines with fall enrollment hours for half-time determination
- Study abroad: COA budget adjustment available via appeal
- Consortium agreement: if taking courses at another school while enrolled at UK

---

## IMPORTANT BOUNDARIES
- You do NOT access or look up individual student records
- You do NOT make eligibility decisions or guarantee specific aid amounts
- For any action requiring account access, redirect to: myUK portal, OSFAS (859-257-3172), or 127 Funkhouser Building
- Never ask for SSN, student ID numbers, FSA ID passwords, or account credentials
- Always encourage students to verify current information at studentsuccess.uky.edu/financial-aid-and-scholarships

When unsure, say so honestly and direct to the appropriate office rather than guessing.`,
    starterQuestions: [
      'Can you walk me through my financial aid status step by step?',
      'I see Required Documents in my portal — what does that mean?',
      'What\'s the difference between Entrance Counseling and the MPN?',
      'My portal shows "Unsatisfactory" SAP — what do I do?',
      'When is my financial aid disbursed and applied to my bill?',
      'I got an outside scholarship — do I need to report it?',
    ],
    referenceDocUrls: [
      encodeDatasetReference('uk-financial-aid-docs'),
    ],
    learningObjectives: [
      'Understand the FAFSA application process',
      'Discover relevant scholarship opportunities',
      'Find key financial aid deadlines',
    ],
    intendedAudience: 'All current and prospective UK students and their families',
    published: true,
    featured: true,
    isOfficialService: true,
    serviceProtocol: 'informational',
    approvalStatus: 'APPROVED' as const,
    creatorId: admin.id,
  }

  await prisma.tool.upsert({
    where: { id: financialAidAdvisorData.id },
    update: financialAidAdvisorData,
    create: financialAidAdvisorData,
  })

  const courseCatalogNavigatorData = {
    id: 'tool-course-catalog-navigator',
    name: 'Course Catalog Navigator',
    shortDescription: 'Explore majors, discover interesting courses, and understand prerequisites with an AI academic advisor.',
    fullDescription: `## Course Catalog Navigator

Catalyst helps students navigate the University of Kentucky course catalog with more confidence.

### What Catalyst Helps With
- Exploring majors and minors
- Discovering courses that fit an interest area
- Understanding prerequisite chains
- Finding UK Core and general education options

### What Catalyst Does Not Do
Catalyst does not register students or replace an academic advisor. When a student is ready to make a final decision, Catalyst directs them to their assigned advisor and the official course catalog for verification.`,
    category: 'University',
    difficultyLevel: 'Introductory',
    estimatedMinutes: 15,
    toolType: ToolType.CHATBOT,
    personaName: 'Catalyst',
    personaAvatar: '🗺️',
    welcomeMessage: `I'm Catalyst, your guide to the UK course catalog. Are you exploring a new major, looking for an interesting elective, or trying to plan next semester? Tell me what you're trying to do!`,
    systemPrompt: `You are Catalyst, an AI academic advisor for the University of Kentucky. Your expertise is the UK course catalog. Use the linked UK course catalog dataset context as your primary reference when relevant. Your purpose is to help students explore majors, discover courses, and understand academic requirements. You can suggest courses based on a student's interests, explain the prerequisites for a given course, show how a course may fit into a major's curriculum, and help students find interesting UK Core or general education classes. Use official course codes when you know them. If you are not sure about a specific requirement, say that it should be verified in the official catalog. When a student is ready to make a final decision or register, you MUST direct them to their assigned human academic advisor and the official university course catalog for verification. Your tone is helpful, curious, and knowledgeable.`,
    starterQuestions: [
      'I want to explore majors that combine technology and creativity.',
      'How can I find a good UK Core elective?',
      'What should I check before taking a course with prerequisites?',
      'How can a minor fit with my major plan?',
    ],
    referenceDocUrls: [
      encodeDatasetReference('uk-course-catalog-2026'),
    ],
    learningObjectives: [
      'Discover new courses based on personal interests',
      'Understand prerequisite requirements for a course',
      'Explore potential major and minor combinations',
    ],
    intendedAudience: 'All UK undergraduate students, especially those exploring majors or planning their semester.',
    published: true,
    featured: true,
    isOfficialService: true,
    serviceProtocol: 'informational',
    approvalStatus: 'APPROVED' as const,
    creatorId: admin.id,
  }

  await prisma.tool.upsert({
    where: { id: courseCatalogNavigatorData.id },
    update: courseCatalogNavigatorData,
    create: courseCatalogNavigatorData,
  })

  const itHelpDeskAssistantData = {
    id: 'tool-it-help-desk',
    name: 'IT Help Desk Assistant',
    shortDescription: 'Your go-to AI for quick fixes with Wi-Fi, email, printing, and other campus tech issues.',
    fullDescription: `## IT Help Desk Assistant

Techie is a front-line support bot for common University of Kentucky technology questions.

### What Techie Helps With
- Connecting to eduroam
- Setting up UK email on phones and laptops
- Understanding VPN and software access basics
- Getting started with campus printing

### What Techie Does Not Do
Techie does not reset passwords, access accounts, or handle sensitive account changes. For those issues, Techie routes users to the official UK account and ITS support channels.`,
    category: 'University',
    difficultyLevel: 'Introductory',
    estimatedMinutes: 5,
    toolType: ToolType.CHATBOT,
    personaName: 'Techie',
    personaAvatar: '💻',
    welcomeMessage: `Hey, I'm Techie, your friendly IT support bot. Wi-Fi issues, email setup, software questions... what's the problem?`,
    systemPrompt: `You are Techie, a helpful and patient IT Help Desk assistant for the University of Kentucky. Use the linked UK ITS dataset context as your primary public-information reference when relevant. Your knowledge base includes common student technology issues such as connecting to the eduroam Wi-Fi network, setting up UK email on mobile devices, using the campus VPN, printing services such as PrintWise, and accessing common software like Microsoft 365 and Adobe Creative Cloud. You must NOT ask for a user's password. For any issue requiring a password reset, account access, or account-specific troubleshooting, direct them to the official UK Account Manager or ITS support channels. Your goal is to solve common Tier 1 problems with clear, step-by-step instructions and point users to official guidance for anything beyond that. Your tone is friendly, tech-savvy, and reassuring.`,
    starterQuestions: [
      'How do I connect to eduroam?',
      'Can you help me set up my UK email on my phone?',
      'What should I do if I need the campus VPN?',
      'How does campus printing work?',
    ],
    referenceDocUrls: [
      encodeDatasetReference('uk-its-kb'),
    ],
    learningObjectives: [
      'Connect to campus Wi-Fi',
      'Set up UK email on a phone',
      'Understand how to print on campus',
    ],
    intendedAudience: 'All UK students, faculty, and staff',
    published: true,
    featured: true,
    isOfficialService: true,
    serviceProtocol: 'transactional',
    approvalStatus: 'APPROVED' as const,
    creatorId: admin.id,
  }

  await prisma.tool.upsert({
    where: { id: itHelpDeskAssistantData.id },
    update: itHelpDeskAssistantData,
    create: itHelpDeskAssistantData,
  })

  const admissionsAdvisorData = {
    id: 'tool-admissions-advisor',
    name: 'Admissions Advisor',
    shortDescription: 'Your AI guide for applying to the University of Kentucky. Ask about deadlines, requirements, and campus life.',
    fullDescription: `## Admissions Advisor

Blue is an admissions guide built for future Wildcats and their families.

### What Blue Helps With
- General application questions
- Important admissions timelines
- Campus visits and next-step planning
- Big-picture questions about housing, dining, and student life

### What Blue Does Not Do
Blue does not review applications, discuss an applicant's status, or evaluate individual chances of admission. For applicant-specific questions, Blue directs users to the official portal and admissions team.`,
    category: 'University',
    difficultyLevel: 'Introductory',
    estimatedMinutes: 10,
    toolType: ToolType.CHATBOT,
    personaName: 'Blue',
    personaAvatar: '🐾',
    welcomeMessage: `Hi there, future Wildcat! I'm Blue, your AI guide to applying to the University of Kentucky. Ask me anything about applications, deadlines, campus life, or what it's like to be a part of the Big Blue Nation!`,
    systemPrompt: `You are Blue, an enthusiastic and welcoming admissions advisor for the University of Kentucky. Use the linked admissions dataset context as your primary public-information reference when relevant. Your audience is prospective high school students, transfer students, and their families. Your knowledge base includes application requirements, important deadlines, campus tour information, housing options, meal plans, and general facts about student life at UK. You should be encouraging and positive while staying accurate. You must NOT ask for or discuss private applicant data such as GPAs, test scores, or application status. For status-specific questions, direct users to the official applicant portal or admissions office. Your goal is to answer general questions and help prospective students feel informed and excited about applying. Your tone is spirited, friendly, and informative.`,
    starterQuestions: [
      'When should I apply to UK?',
      'What should I expect on a campus visit?',
      'Can you explain housing and meal plan basics?',
      'Where should I go for my application status?',
    ],
    referenceDocUrls: [
      encodeDatasetReference('uk-admissions-faq'),
    ],
    learningObjectives: [
      'Understand UK application requirements',
      'Find key admission deadlines',
      'Learn about campus life and housing',
    ],
    intendedAudience: 'Prospective UK students and their families',
    published: true,
    featured: true,
    isOfficialService: true,
    serviceProtocol: 'informational',
    approvalStatus: 'APPROVED' as const,
    creatorId: admin.id,
  }

  await prisma.tool.upsert({
    where: { id: admissionsAdvisorData.id },
    update: admissionsAdvisorData,
    create: admissionsAdvisorData,
  })

  const libraryResearchAssistantData = {
    id: 'tool-library-research-assistant',
    name: 'Library Research Assistant',
    shortDescription: 'An AI librarian to help you find databases, cite sources, and get started on your research papers.',
    fullDescription: `## Library Research Assistant

Lex is an AI librarian designed to help students get momentum on research assignments.

### What Lex Helps With
- Picking a database based on your topic or discipline
- Understanding citation basics in APA, MLA, and Chicago
- Narrowing and refining a research topic
- Distinguishing scholarly and popular sources

### What Lex Does Not Do
Lex does not retrieve full-text articles or replace a human librarian for in-depth consultations. When needed, Lex routes students to the right library service, including meeting with a librarian.`,
    category: 'University',
    difficultyLevel: 'Introductory',
    estimatedMinutes: 15,
    toolType: ToolType.CHATBOT,
    personaName: 'Lex',
    personaAvatar: '📚',
    welcomeMessage: `Hello! I'm Lex, your AI research assistant from UK Libraries. I can help you find databases, cite sources, or get started on a research paper. What are you working on?`,
    systemPrompt: `You are Lex, a knowledgeable and helpful research librarian for the University of Kentucky Libraries. Use the linked library guides dataset context as your primary reference when relevant. Your expertise is in information discovery and citation. You can help students find relevant databases for their subject, explain the difference between scholarly and popular sources, provide examples of citations in common styles such as APA, MLA, and Chicago, and suggest strategies for narrowing a research topic. You do NOT have access to the full text of articles, but you can point students to the correct database or the library's interlibrary loan and librarian-support services. When a student needs in-depth, one-on-one help, refer them to the Meet with a Librarian service on the UK Libraries website. Your tone is academic, helpful, and precise.`,
    starterQuestions: [
      'What database should I use for a humanities topic?',
      'Can you show me an APA citation example?',
      'How can I narrow my research topic?',
      'What is the difference between scholarly and popular sources?',
    ],
    referenceDocUrls: [
      encodeDatasetReference('uk-library-guides'),
    ],
    learningObjectives: [
      'Find a relevant library database for a specific subject',
      'Learn how to format a citation in APA or MLA style',
      'Develop a strategy for starting a research paper',
    ],
    intendedAudience: 'All UK students and faculty conducting research',
    published: true,
    featured: true,
    isOfficialService: true,
    serviceProtocol: 'informational',
    approvalStatus: 'APPROVED' as const,
    creatorId: admin.id,
  }

  await prisma.tool.upsert({
    where: { id: libraryResearchAssistantData.id },
    update: libraryResearchAssistantData,
    create: libraryResearchAssistantData,
  })

  // ── Registrar's Office Bot ────────────────────────────────────────────────
  const registrarBotData = {
    id: 'tool-registrar-bot',
    name: "Registrar's Office Assistant",
    shortDescription: "Get instant answers about registration, transcripts, deadlines, FERPA, and more from UK's Registrar's Office.",
    fullDescription: `## Registrar's Office Assistant

Rex is the official AI assistant for the University of Kentucky Office of the Registrar. Ask about registration windows, add/drop deadlines, transcript requests, FERPA rights, withdrawal procedures, and more.

### What Rex Helps With
- Registration windows, priority order, and holds
- Add, drop, and withdrawal deadlines by term
- Transcript requests (official and unofficial)
- FERPA rights and directory information opt-out
- Attendance verification
- Available forms and where to submit them
- Refund schedules and grade type changes
- Waitlist procedures and course overrides

### What Rex Does Not Do
Rex cannot access student accounts, process requests, or make eligibility decisions. For anything requiring account access or official action, Rex will direct you to the appropriate contact.

**Contact:** 10 W.D. Funkhouser Building | 859-257-7157 | registrar.uky.edu`,
    category: 'University',
    toolType: ToolType.CHATBOT,
    difficultyLevel: 'Introductory',
    estimatedMinutes: 10,
    personaName: 'Rex',
    personaAvatar: '🎓',
    welcomeMessage: `Hi, I'm Rex — the AI assistant for the UK Office of the Registrar. I can answer questions about registration, transcripts, deadlines, FERPA, forms, and more. What can I help you with today?`,
    systemPrompt: `You are Rex, the official AI assistant for the University of Kentucky Office of the Registrar. You are a regulatory-protocol service bot: you explain university policies and procedures accurately, but you do NOT interpret rules for individual circumstances or tell students what they specifically qualify for. If asked about a specific personal case, say: "I cannot determine that for your specific situation — please contact the Registrar's Office directly."

CRITICAL SAFETY RULE: If a student shares personally identifiable information such as a Social Security Number, student ID, financial account number, or other sensitive data, immediately tell them: "Please don't share that information here. This is a general information assistant — contact our office directly for account-specific help." Do not store, repeat, or process any PII.

If you cannot resolve a question, direct students to:
- Phone: 859-257-7157
- Location: 10 W.D. Funkhouser Building, Lexington, KY
- Website: registrar.uky.edu
- Registration questions: registration@uky.edu | 859-257-7173
- Transcript questions: transcripts@uky.edu

You are friendly, professional, and accurate. Never speculate or make up policy details. Use simple, direct language.

---

## KNOWLEDGE BASE: UK Office of the Registrar

### Registration

**How to Register**
Students register through myUK (the university's online portal). Before registering, students should:
1. Meet with their academic advisor (recommended; some departments require it to remove advising holds)
2. Check myUK > myInfo for any account holds that could block registration
3. Know their registration window time (based on degree completion percentage for undergrads)

**Priority / Registration Windows**
- Undergraduate students register based on their degree completion percentage (viewed in myUK GPS)
- Higher completion percentage = earlier window
- Fall 2026 windows for continuing undergrads: April 6–17, 2026 (96–100% completion gets April 6 at 10:00 AM; 0–10% gets April 17 at 1:00 PM; all windows close April 21 at 11:59 PM)
- Graduate and specialist students register based on earned hours; Fall 2026 windows: March 30–31, 2026
- New freshmen, transfer, and readmit students register during orientation
- Open registration: April 22 – June 14, 2026 and July 11 – August 23, 2026
- Late registration (Fall 2026): August 24–28, 2026 via myUK; $40 late fee applies

**Registration FAQ**
- Restricted courses: limit enrollment by college, major, minor, or classification. Students not meeting requirements need departmental override. An override does NOT automatically register you — you must still register yourself.
- Time conflict registration: email documentation to registration@uky.edu. Gatton College students must visit the Undergraduate Resource Center (144 B&E Building).
- Cancelled courses: students receive email to UK address; contact advisor for alternatives.
- Part-of-term courses have different add/drop/withdraw deadlines than full-semester courses. Check myUK Course Catalog for specific deadlines.
- Registration Coordinator: Krissa Stiger | registration@uky.edu | 859-257-7173

**Waitlisting**
- Students may join a waitlist when a section is full
- When a student drops, the first person on the waitlist is automatically enrolled and others move up
- Must meet all prerequisites and restrictions to be on a waitlist
- Cannot waitlist if there is a time conflict with enrolled courses
- Cannot waitlist multiple sections of the same course (limit: one waitlist per course)
- Waitlisted hours do NOT count toward full-time enrollment status
- Total enrolled + waitlisted hours cannot exceed credit load limits
- Self-remove before first day of classes via myUK; after that email registration@uky.edu
- Students are responsible for monitoring their own waitlist status in myUK

**Grade Type Changes**
- Students may change grade type (letter grade, pass/fail, or audit) in myUK within approximately 3 weeks of the start of the term
- Discuss with academic advisor first — changes can affect program progression
- Freshmen and graduate students cannot take courses pass/fail

**Drops and Withdrawals**
- Drop a class: use the DROP function in myUK within the drop deadline
- Withdraw from a class: available after drop deadline through the withdrawal deadline (typically 60+ days into term)
- Full semester withdrawal: use the UK Authorization to Withdrawal form (Qualtrics)
- Withdrawal processes vary by semester and number of courses — visit registrar.uky.edu for specifics

---

### Course Deadlines and Refund Schedules

**Terms and Dates**
- Fall 2025 (16 weeks): August 25 – December 19 (full term + 1st/2nd 8-week options)
- Winter 2025 (3 weeks): December 22 – January 9
- Spring 2026 (16 weeks): January 12 – May 8 (full term + 1st/2nd 8-week options)
- Summer 2026 (12 weeks): May 18 – August 12 (multiple formats: 12-week, two 8-week, two 6-week, three 4-week)

**Standard Deadline Pattern (per term)**
- Add Class: within first few days of term
- Change Grade Type / Drop Class: approximately 1–2 weeks in
- Withdraw from Class: extended window (typically 60+ days into term)
- Non-standard start/end date courses have unique deadlines not shown in the standard table — check myUK Course Catalog for that specific course

**Refund Schedule**
- 100% refund: day of / immediately after term start
- 80% refund: several days in
- 50% refund: 1–2 weeks in
- 0% refund: after grade type change deadline through the withdrawal period
- Exact dates vary by term length and format — see registrar.uky.edu/calendars/course-deadlines-and-refund-schedules

---

### Transcripts

**Official Transcripts**
- UK partners with the National Student Clearinghouse for official transcript processing
- Requests can be submitted electronically or by mail
- Financial holds on your account will prevent processing until the hold is released
- College of Dentistry and College of Medicine students must request transcripts directly from their college

**Unofficial Transcripts**
- Current students: myUK > Student Services > myRecords > Unofficial Transcript (download/print PDF)
- Former students (1988–present): University of Kentucky Document Portal at mydocs.uky.edu (need 8-digit UK ID, date of birth, last 4 SSN digits)
- Former students (pre-1988): email transcripts@uky.edu with government-issued photo ID

**Special Cases**
- Northern Kentucky Community College records through 1972: contact that institution
- Fort Knox records through 1988: contact that institution
- Contact: transcripts@uky.edu | 859-257-7157

---

### FERPA (Family Educational Rights and Privacy Act)

**What is FERPA?**
FERPA is a federal law (1974) that protects the privacy of student education records. It applies to all institutions receiving U.S. Department of Education funding.

**Student Rights Under FERPA**
1. Consent: Written permission is required before the university discloses personally identifiable information (with limited exceptions)
2. Access: Right to inspect and review education records within 45 days of a written request
3. Amendment: Students may challenge records they believe are inaccurate or violate privacy
4. Complaint: Students may report alleged FERPA violations to the U.S. Department of Education

**What Are Education Records?**
Any university-maintained information personally identifiable to a student, regardless of format. Exclusions: sole possession records, law enforcement files, employment records (unless tied to student status), medical/psychological records, alumni records.

**Directory Information**
UK may release designated directory information without student consent unless the student opts out. This includes: address, phone, email, major, attendance dates, enrollment status, degrees/awards, and athletic participation.
- Important: Opting out prevents third-party verification and excludes students from publications like dean's lists
- Students manage FERPA preferences in myUK > Student Services

---

### Attendance Verification

**Why It Exists**
UK must comply with Title IV of the Higher Education Act: federal funds may only be disbursed to students actively attending classes.

**Timeline**
- Full-term courses: 1-week monitoring period followed by 1-week reporting period (shorter for part-of-term courses)
- Students have approximately 2 days to respond after a non-attendance notification

**For Students**
- Regular class engagement prevents drops
- If notified of non-attendance, contact your instructor immediately to request reinstatement
- Attendance-related drops result in a 50% refund and may affect financial aid

**For Instructors**
- Verify attendance through "Class Roll" in myUK
- Acceptable documentation: assignment/homework/quiz submission, discussion board posts, email correspondence, lab work

---

### Forms Available from the Registrar

| Form | Purpose |
|------|---------|
| Application for Special Exam | Undergraduate requesting a special examination |
| Chosen Name Form | Indicate preferred/chosen name (Qualtrics) |
| Extension of Incomplete ('I') Grade | Instructor requests extension beyond 12-month incomplete period |
| Legal Name Change Form | Change legal name with government-issued ID (Qualtrics) |
| Medical Documentation Form | Required for tuition appeals |
| Readmission for Degree | Previous students who have enough credit hours for a bachelor's degree |
| Release for Letter of Recommendation | Written consent for confidential reference letters |
| Repeat Option Form | Undergrads repeating up to 3 completed courses (Qualtrics) |
| Request for Replacement Diploma | Damaged, lost, or name-change diploma replacement (Qualtrics) |
| Request for Schedule Change | Department submits to change courses in printed schedule |
| Request to Remove AP/IB Credit | Remove Advanced Placement or International Baccalaureate credit (Qualtrics) |
| Transient or Visiting Student Form | UK students taking courses at another institution |
| Tuition Appeal Form | Appeal unwarranted tuition charges for hardship (Qualtrics) |
| UK Authorization to Withdrawal | Withdraw from all classes in a semester (Qualtrics, semester-specific) |

All forms available at: registrar.uky.edu/forms

---

### Student Records & Other Services

**Degree Application (Graduation)**
Students apply for their degree through myUK GPS. Check myUK GPS for your degree audit and application deadlines.

**GPA Calculator**
Available as a tool on the Registrar website for students to estimate their GPA.

**Repeat Course Policy**
Undergraduates may repeat up to 3 completed courses using the Repeat Option Form. Discuss implications with your advisor.

**Personal Information Updates**
Students update addresses, phone numbers, and chosen names through myUK or via Registrar forms.

**Academic Common Market**
Eligibility information available through the Registrar for students seeking out-of-state programs at in-state tuition rates.

**Credit by Examination**
Options available for earning credit through exam; details on the Registrar website.

**Verifications and Apostille Documents**
Enrollment and degree verifications, apostille documents, and certified electronic credentials available — see registrar.uky.edu/students.

---

### Contact Directory

| Contact | Info |
|---------|------|
| Main Office | 859-257-7157 | 10 W.D. Funkhouser Building |
| Fax | 859-257-7160 |
| Registration | registration@uky.edu | 859-257-7173 |
| Transcripts | transcripts@uky.edu |
| Website | registrar.uky.edu |

---

## IMPORTANT BOUNDARIES
- You do NOT access or look up individual student records
- You do NOT make eligibility decisions or guarantee specific outcomes
- For anything requiring account access, direct students to myUK, the Registrar's Office (859-257-7157), or 10 W.D. Funkhouser Building
- Never ask for SSN, student ID numbers, or account credentials
- Always encourage students to verify current deadlines at registrar.uky.edu as dates change each semester

When unsure, say so honestly and direct to the appropriate contact rather than guessing.`,
    starterQuestions: [
      'When is my registration window for Fall 2026?',
      'How do I request an official transcript?',
      'What are the add/drop deadlines this semester?',
      'What are my rights under FERPA?',
      'How do I withdraw from a class without academic penalty?',
      'I\'m on a waitlist — how does that work?',
    ],
    learningObjectives: [
      'Navigate registration windows and priority scheduling',
      'Understand transcript request processes and timelines',
      'Know your FERPA rights and how to manage your records',
    ],
    intendedAudience: 'All current UK students, prospective students, and families',
    published: true,
    featured: true,
    isOfficialService: true,
    serviceProtocol: 'regulatory',
    escalationEmail: 'registration@uky.edu',
    approvalStatus: 'APPROVED' as const,
    creatorId: admin.id,
  }

  await prisma.tool.upsert({
    where: { id: registrarBotData.id },
    update: registrarBotData,
    create: registrarBotData,
  })

  const catalogToolRecords: Array<{ id: string; name: string }> = []
  for (const tool of CATALOG_TOOLS) {
    const creatorId = toolCreatorIdsByEmail[tool.creatorEmail]
    if (!creatorId) {
      throw new Error(`Missing creator for catalog tool: ${tool.id}`)
    }

    const data = {
      id: tool.id,
      name: tool.name,
      shortDescription: tool.shortDescription,
      fullDescription: tool.fullDescription,
      category: tool.category,
      difficultyLevel: tool.difficultyLevel,
      estimatedMinutes: tool.estimatedMinutes,
      toolType: ToolType.CHATBOT,
      systemPrompt: tool.systemPrompt,
      personaName: tool.personaName,
      personaAvatar: tool.personaAvatar,
      welcomeMessage: tool.welcomeMessage,
      starterQuestions: tool.starterQuestions,
      learningObjectives: tool.learningObjectives,
      intendedAudience: tool.intendedAudience,
      published: true,
      featured: false,
      approvalStatus: 'APPROVED' as const,
      creatorId,
    }

    const seededTool = await prisma.tool.upsert({
      where: { id: tool.id },
      update: data,
      create: data,
    })

    catalogToolRecords.push({ id: seededTool.id, name: seededTool.name })
  }

  // Add some upvotes, favorites, comments
  await prisma.upvote.createMany({
    skipDuplicates: true,
    data: [
      { userId: student1.id, toolId: tool1.id },
      { userId: student1.id, toolId: tool2.id },
      { userId: student1.id, toolId: tool4.id },
      { userId: student1.id, toolId: tool7.id },
      { userId: student1.id, toolId: tool9.id },
      { userId: student1.id, toolId: tool10.id },
      { userId: educator2.id, toolId: tool1.id },
      { userId: educator2.id, toolId: tool11.id },
      { userId: educator3.id, toolId: tool4.id },
      { userId: educator3.id, toolId: tool9.id },
      { userId: educator4.id, toolId: tool5.id },
      { userId: educator5.id, toolId: tool10.id },
      { userId: educator5.id, toolId: tool12.id },
      { userId: admin.id, toolId: tool1.id },
      { userId: admin.id, toolId: tool4.id },
      { userId: admin.id, toolId: tool10.id },
    ],
  })

  await prisma.favorite.createMany({
    skipDuplicates: true,
    data: [
      { userId: student1.id, toolId: tool1.id },
      { userId: student1.id, toolId: tool4.id },
      { userId: student1.id, toolId: tool7.id },
      { userId: student1.id, toolId: tool10.id },
      { userId: educator2.id, toolId: tool4.id },
      { userId: educator2.id, toolId: tool11.id },
      { userId: educator5.id, toolId: tool10.id },
      { userId: admin.id, toolId: tool2.id },
      { userId: admin.id, toolId: tool10.id },
    ],
  })

  await prisma.comment.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'comment-1',
        content: 'This tool is incredible for 2L trial advocacy prep. The witness AI is surprisingly convincing — it actually evades when you ask leading questions poorly.',
        userId: student1.id,
        toolId: tool1.id,
        pinned: true,
      },
      {
        id: 'comment-2',
        content: 'I used this before moot court and felt so much more prepared. Highly recommend pairing it with the Trial Advocacy readings.',
        userId: educator2.id,
        toolId: tool1.id,
      },
      {
        id: 'comment-3',
        content: 'My students love this. It corrects so many Columbus myths they\'ve absorbed from pop culture.',
        userId: educator4.id,
        toolId: tool2.id,
        pinned: true,
      },
      {
        id: 'comment-4',
        content: 'Fantastic for OSCE prep. The patient feels very realistic — I forgot I was talking to an AI halfway through.',
        userId: student1.id,
        toolId: tool4.id,
      },
      {
        id: 'comment-5',
        content: 'Used this to prep for our nonprofit practicum and it completely changed how I think about donor research. The pitch framing feature is gold.',
        userId: student1.id,
        toolId: tool10.id,
        pinned: true,
      },
      {
        id: 'comment-6',
        content: 'I\'ve integrated this into my PHL 350 course. Students who use it before their practicum presentations are noticeably more confident.',
        userId: educator5.id,
        toolId: tool10.id,
      },
      {
        id: 'comment-7',
        content: 'Finally a debugging tool that doesn\'t just solve the problem for you. My office hours load dropped noticeably after I assigned this.',
        userId: educator3.id,
        toolId: tool9.id,
        pinned: true,
      },
      {
        id: 'comment-8',
        content: 'The LAW 756 evidence simulator is brutal — in a good way. Got cold-called on a hearsay exception in class and I was actually ready.',
        userId: student1.id,
        toolId: tool8.id,
      },
    ],
  })

  // Add some sessions and metric events for analytics demo
  await prisma.toolSession.createMany({
    skipDuplicates: true,
    data: [
      { id: 'session-1', toolId: tool1.id, userId: student1.id, endedAt: new Date(), messageCount: 0 },
      { id: 'session-2', toolId: tool1.id, userId: educator2.id, endedAt: new Date(), messageCount: 0 },
      { id: 'session-3', toolId: tool2.id, userId: student1.id, messageCount: 8 },
      { id: 'session-4', toolId: tool4.id, userId: student1.id, messageCount: 14 },
      { id: 'session-5', toolId: tool4.id, userId: educator2.id, messageCount: 9 },
    ],
  })

  await prisma.metricEvent.createMany({
    skipDuplicates: true,
    data: [
      { id: 'me-1', toolId: tool1.id, sessionId: 'session-1', metricName: 'questions_asked', metricValue: '12' },
      { id: 'me-2', toolId: tool1.id, sessionId: 'session-1', metricName: 'score', metricValue: '78' },
      { id: 'me-3', toolId: tool1.id, sessionId: 'session-1', metricName: 'completed', metricValue: 'true' },
      { id: 'me-4', toolId: tool1.id, sessionId: 'session-2', metricName: 'questions_asked', metricValue: '18' },
      { id: 'me-5', toolId: tool1.id, sessionId: 'session-2', metricName: 'score', metricValue: '91' },
      { id: 'me-6', toolId: tool1.id, sessionId: 'session-2', metricName: 'completed', metricValue: 'true' },
    ],
  })

  // Seed bounties
  await prisma.bounty.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'bounty-dante',
        title: "Interactive Dante's Inferno — Virgil speaks, student reads Dante's lines aloud",
        description: `I want a dramatic read-along experience for my ENGL 342 (Medieval Literature) course.\n\nVirgil (the AI) guides the student through the circles of Hell, speaking his lines from the Divine Comedy in character — poetic, grave, occasionally sardonic. The student is cast as Dante and must read Dante's actual lines from the poem in response before the scene continues.\n\nThe tool should:\n- Progress through the 9 circles with key scenes (not every canto, but the memorable ones: Paolo & Francesca, Farinata, Ulysses, Ugolino, Lucifer)\n- Have Virgil provide light historical/literary context after each exchange\n- Keep a "You are in Circle X" indicator\n- Allow the student to ask Virgil questions out of character if they don't understand a line\n\nThis would be used as a pre-class activity before our Inferno discussion sessions.`,
        category: 'Arts',
        difficulty: 'Intermediate',
        estimatedHours: 12,
        status: BountyStatus.OPEN,
        postedById: educator2.id,
      },
      {
        id: 'bounty-mcat-biochem',
        title: 'MCAT Biochemistry Adaptive Drill — focuses on weak areas automatically',
        description: `We need a practice tool for pre-med students preparing for the MCAT biochemistry section.\n\nThe tool should:\n- Ask biochemistry questions at MCAT difficulty (enzyme kinetics, metabolic pathways, protein structure, DNA replication, cell signaling)\n- Track which topic areas the student answers incorrectly\n- Automatically weight future questions toward those weak areas\n- At the end of a session, generate a "focus report" showing which pathways to review\n\nThis would supplement BIOL 350 and CHEM 440 review. Ideally students could use it for 20-30 minute sessions in the week before the exam.`,
        category: 'Medicine',
        difficulty: 'Advanced',
        estimatedHours: 20,
        status: BountyStatus.OPEN,
        postedById: educator4.id,
      },
      {
        id: 'bounty-kentucky-legislature',
        title: 'Kentucky Legislative Bill Simulator — students draft and debate real bills',
        description: `For my Political Science 301 (State & Local Government) course, I want a simulation where students experience the Kentucky legislative process.\n\nStudents should be able to:\n- Draft a bill on a topic of their choice\n- Have the AI play committee members with different political leanings who question and challenge the bill\n- Go through a simulated floor debate\n- Receive a "passed / failed / amended" outcome with reasoning\n\nIdeally this would expose students to how real Kentucky statutes are structured and what concerns legislators from different districts raise.`,
        category: 'General',
        difficulty: 'Intermediate',
        estimatedHours: 16,
        status: BountyStatus.CLAIMED,
        postedById: educator2.id,
        claimedById: educator5.id,
        claimedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'bounty-grant-writing',
        title: 'NSF Grant Proposal Coach for graduate students',
        description: `Graduate students in our college consistently struggle with NSF grant writing — specifically the Broader Impacts section and the two-page project summary.\n\nI need a tool that:\n- Walks students through the NSF proposal structure section by section\n- Reviews their draft text and gives specific, actionable feedback aligned with NSF review criteria\n- Helps them articulate Broader Impacts that are genuine and compelling (not boilerplate)\n- Has examples of strong and weak NSF summaries for comparison\n\nThis would be used in our grant writing workshop series for PhD students in science and engineering programs.`,
        category: 'STEM',
        difficulty: 'Advanced',
        estimatedHours: 10,
        status: BountyStatus.OPEN,
        postedById: educator3.id,
      },
      {
        id: 'bounty-negotiation-sim',
        title: 'Salary Negotiation Simulator for graduating seniors',
        description: `Career services has been asking for this for two years. Students are leaving money on the table because they don't practice negotiating.\n\nThe tool should:\n- Let the student pick a job type and salary range\n- Play the role of a hiring manager or HR rep who starts with a below-market offer\n- Respond realistically to negotiation tactics — pushback on aggressive asks, respond to well-reasoned arguments\n- After the session, give feedback on what worked, what didn't, and what they left on the table\n\nThis would be broadly useful across all colleges — not course-specific.`,
        category: 'Business',
        difficulty: 'Introductory',
        estimatedHours: 8,
        status: BountyStatus.FULFILLED,
        postedById: educator5.id,
        claimedById: educator2.id,
        claimedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    ],
  })

  // ── Gamification: Badge catalog ──────────────────────────────────────────
  const BADGES = [
    { slug: 'first_session',    name: 'First Steps',        icon: '🌱', description: 'Complete your first chat session', xpReward: 10 },
    { slug: 'chat_10',          name: 'Chatterbox',         icon: '💬', description: 'Send 10 messages', xpReward: 15 },
    { slug: 'chat_50',          name: 'Conversationalist',  icon: '🗣️', description: 'Send 50 messages', xpReward: 25 },
    { slug: 'sessions_5',       name: 'On a Roll',          icon: '🔥', description: 'Complete 5 sessions', xpReward: 30 },
    { slug: 'sessions_15',      name: 'Dedicated Learner',  icon: '📖', description: 'Complete 15 sessions', xpReward: 75 },
    { slug: 'grade_90',         name: 'Sharp Shooter',      icon: '🎯', description: 'Score 90%+ on an AI assessment', xpReward: 40 },
    { slug: 'grade_100',        name: 'Perfect Score',      icon: '🏆', description: 'Score 100% on an AI assessment', xpReward: 100 },
    { slug: 'tools_5',          name: 'Tool Explorer',      icon: '🗺️', description: 'Use 5 different tools', xpReward: 35 },
    { slug: 'tools_10',         name: 'Adventurer',         icon: '🚀', description: 'Use 10 different tools', xpReward: 75 },
    { slug: 'quest_1',          name: 'Quest Taker',        icon: '⚔️', description: 'Complete your first quest', xpReward: 20 },
    { slug: 'quest_5',          name: 'Quest Master',       icon: '🏅', description: 'Complete 5 quests', xpReward: 100 },
    { slug: 'level_3',          name: 'Rising Scholar',     icon: '🌟', description: 'Reach Level 3 (Scholar)', xpReward: 0 },
    { slug: 'level_5',          name: 'Expert',             icon: '💎', description: 'Reach Level 5 (Expert)', xpReward: 0 },
    { slug: 'bounty_claim',     name: 'Bounty Hunter',      icon: '🎁', description: 'Claim your first bounty', xpReward: 25 },
    { slug: 'tool_builder',     name: 'Tool Builder',       icon: '🔧', description: 'Publish your first tool', xpReward: 50 },
  ]

  for (const b of BADGES) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: {},
      create: b,
    })
  }

  // Platform-wide quests
  const QUESTS = [
    {
      title: 'Curious Mind',
      description: 'Complete 3 chat sessions with any tools',
      xpReward: 50,
      condition: JSON.stringify({ type: 'sessions', count: 3 }),
    },
    {
      title: 'Deep Dive',
      description: 'Send at least 5 messages in a single session',
      xpReward: 30,
      condition: JSON.stringify({ type: 'messages_in_session', count: 5 }),
    },
    {
      title: 'Breadth First',
      description: 'Try tools from 3 different categories',
      xpReward: 75,
      condition: JSON.stringify({ type: 'categories', count: 3 }),
    },
    {
      title: 'High Achiever',
      description: 'Score 85% or higher on any AI assessment',
      xpReward: 60,
      condition: JSON.stringify({ type: 'grade', threshold: 85 }),
    },
  ]

  for (const q of QUESTS) {
    await prisma.quest.upsert({
      where: { id: `quest-seed-${q.title.replace(/\s+/g, '-').toLowerCase()}` },
      update: {},
      create: { id: `quest-seed-${q.title.replace(/\s+/g, '-').toLowerCase()}`, ...q },
    }).catch(() => {})
  }

  const PLATFORM_QUESTS = [
    {
      id: 'platform-quest-daily-explorer',
      title: 'Daily Explorer',
      description: 'Complete any tool session today',
      cadence: QuestCadence.DAILY,
      condition: PlatformQuestType.COMPLETE_ANY_SESSION,
      targetValue: 1,
      xpReward: 25,
      sandReward: 10,
    },
    {
      id: 'platform-quest-comment-contributor',
      title: 'Comment Contributor',
      description: 'Leave one thoughtful comment today',
      cadence: QuestCadence.DAILY,
      condition: PlatformQuestType.LEAVE_COMMENT,
      targetValue: 1,
      xpReward: 15,
      sandReward: 5,
    },
    {
      id: 'platform-quest-weekly-achiever',
      title: 'Weekly Achiever',
      description: 'Complete five sessions this week',
      cadence: QuestCadence.WEEKLY,
      condition: PlatformQuestType.COMPLETE_SESSIONS_N,
      targetValue: 5,
      xpReward: 100,
      sandReward: 50,
    },
    {
      id: 'platform-quest-high-scorer',
      title: 'High Scorer',
      description: 'Earn a 90%+ score on three different tools this week',
      cadence: QuestCadence.WEEKLY,
      condition: PlatformQuestType.HIGH_SCORE_N_TOOLS,
      targetValue: 3,
      xpReward: 150,
      sandReward: 75,
    },
    {
      id: 'platform-quest-course-learner',
      title: 'Course Learner',
      description: 'Launch three course-linked tools this week',
      cadence: QuestCadence.WEEKLY,
      condition: PlatformQuestType.COMPLETE_COURSE_TOOL,
      targetValue: 3,
      xpReward: 75,
      sandReward: 35,
    },
  ]

  for (const quest of PLATFORM_QUESTS) {
    await prisma.platformQuest.upsert({
      where: { id: quest.id },
      update: quest,
      create: quest,
    })
  }

  // XP events for Maya (student1) — creates a compelling demo state
  const xpSeed = [
    { reason: 'first_session',     amount: 5,  toolId: tool1.id },
    { reason: 'session_complete',  amount: 15, toolId: tool1.id },
    { reason: 'session_complete',  amount: 15, toolId: tool2.id },
    { reason: 'session_complete',  amount: 15, toolId: tool4.id },
    { reason: 'session_complete',  amount: 15, toolId: tool7.id },
    { reason: 'session_complete',  amount: 15, toolId: tool9.id },
    { reason: 'messages_sent',     amount: 20, toolId: null },
    { reason: 'quest_complete',    amount: 50, toolId: null },
    { reason: 'grade_high',        amount: 40, toolId: tool4.id },
    { reason: 'badge_earned',      amount: 10, toolId: null },
    { reason: 'badge_earned',      amount: 30, toolId: null },
  ]

  for (const evt of xpSeed) {
    await prisma.xPEvent.create({
      data: { userId: student1.id, ...evt },
    })
  }

  const mayaTotalXP = xpSeed.reduce((s, e) => s + e.amount, 0)
  await prisma.user.update({ where: { id: student1.id }, data: { totalXP: mayaTotalXP } })

  // Award starter badges to Maya
  const badgeSlugs = ['first_session', 'sessions_5', 'tools_5', 'quest_1']
  for (const slug of badgeSlugs) {
    const badge = await prisma.badge.findUnique({ where: { slug } })
    if (badge) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: student1.id, badgeId: badge.id } },
        update: {},
        create: { userId: student1.id, badgeId: badge.id },
      })
    }
  }

  // Award educator badge to educator2 (James Rivera)
  const toolBuilderBadge = await prisma.badge.findUnique({ where: { slug: 'tool_builder' } })
  if (toolBuilderBadge) {
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: educator2.id, badgeId: toolBuilderBadge.id } },
      update: {},
      create: { userId: educator2.id, badgeId: toolBuilderBadge.id },
    }).catch(() => {})
    await prisma.user.update({ where: { id: educator2.id }, data: { totalXP: 150 } })
  }

  // ── TEK-100 Course & Materials ────────────────────────────────────────────
  const seedCourseMaterialsByTitle = async (
    courseId: string,
    materials: Array<{
      title: string
      content: string
      materialType: string
      moduleNumber: number | null
      isVisible?: boolean
    }>
  ) => {
    for (const material of materials) {
      const existingMaterial = await prisma.courseMaterial.findFirst({
        where: {
          courseId,
          title: material.title,
        },
      })

      if (!existingMaterial) {
        await prisma.courseMaterial.create({
          data: {
            courseId,
            isVisible: material.isVisible ?? true,
            ...material,
          },
        })
      }
    }
  }

  const seedCourseDiscussionThreads = async (
    courseId: string,
    threads: Array<{
      title: string
      content: string
      authorId: string
      isPinned?: boolean
      isLocked?: boolean
      posts?: Array<{
        content: string
        authorId: string
        replies?: Array<{
          content: string
          authorId: string
        }>
      }>
    }>
  ) => {
    for (const thread of threads) {
      const existingThread = await prisma.discussionThread.findFirst({
        where: {
          courseId,
          title: thread.title,
        },
        select: { id: true },
      })

      const seededThread = existingThread
        ? await prisma.discussionThread.update({
            where: { id: existingThread.id },
            data: {
              content: thread.content,
              authorId: thread.authorId,
              isPinned: thread.isPinned ?? false,
              isLocked: thread.isLocked ?? false,
            },
            select: { id: true },
          })
        : await prisma.discussionThread.create({
            data: {
              courseId,
              title: thread.title,
              content: thread.content,
              authorId: thread.authorId,
              isPinned: thread.isPinned ?? false,
              isLocked: thread.isLocked ?? false,
            },
            select: { id: true },
          })

      for (const post of thread.posts ?? []) {
        const existingRootPost = await prisma.discussionPost.findFirst({
          where: {
            threadId: seededThread.id,
            parentId: null,
            content: post.content,
          },
          select: { id: true },
        })

        const rootPost = existingRootPost
          ? await prisma.discussionPost.update({
              where: { id: existingRootPost.id },
              data: {
                authorId: post.authorId,
              },
              select: { id: true },
            })
          : await prisma.discussionPost.create({
              data: {
                threadId: seededThread.id,
                content: post.content,
                authorId: post.authorId,
              },
              select: { id: true },
            })

        for (const reply of post.replies ?? []) {
          const existingReply = await prisma.discussionPost.findFirst({
            where: {
              threadId: seededThread.id,
              parentId: rootPost.id,
              content: reply.content,
            },
            select: { id: true },
          })

          if (existingReply) {
            await prisma.discussionPost.update({
              where: { id: existingReply.id },
              data: {
                authorId: reply.authorId,
              },
            })
            continue
          }

          await prisma.discussionPost.create({
            data: {
              threadId: seededThread.id,
              parentId: rootPost.id,
              content: reply.content,
              authorId: reply.authorId,
            },
          })
        }
      }
    }
  }

  const tek100 = await prisma.course.upsert({
    where: { courseCode: 'TEK-100' },
    update: {},
    create: {
      courseCode: 'TEK-100',
      title: 'Collaborative Intelligence: Understanding and Using Modern AI',
      description: 'A 10-module foundational course on AI literacy, ethical use, and collaborative AI workflows. Students learn to spot, prompt, evaluate, and ethically deploy AI tools in academic and professional contexts.',
      instructorId: price.id,
      isPublic: true,
    },
  })

  const TEK_MODULES = [
    {
      moduleNumber: 1,
      title: 'Module 1: AI in Your World — Seeing the Invisible',
      materialType: 'lecture',
      content: `Core Skill: Foundational AI awareness and observation.

Key Topics & Concepts:
- What counts as "AI" in daily life — recommendation algorithms, voice assistants, smart devices
- Dispelling myths about AI vs. reality (AI's limits and capabilities)
- Basic AI terminology: model, training data, algorithmic bias, neural networks
- AI systems that often go unnoticed (content moderation, search ranking, GPS routing)

Learning Objectives:
1. Define AI in simple terms and explain how it differs from traditional computer programs
2. Identify examples of AI in daily life
3. Describe the role of training data in how AI learns ("garbage in, garbage out")
4. Recognize common myths and misconceptions about AI consciousness and capability

Assignment: AI Observation Journal — Document 5 AI systems you encounter in one day, describing what data they might use and what decisions they make.`,
    },
    {
      moduleNumber: 2,
      title: 'Module 2: The AI Co-Pilot — Communicating with AI',
      materialType: 'lecture',
      content: `Core Skill: Foundational prompting and iterative refinement of AI outputs.

Key Topics & Concepts:
- The Four Pillars of Prompting: Role, Task, Context, Format
- AI as a creative partner — not a shortcut, not a replacement
- Iteration: improving results step by step through follow-up prompts
- Staying the "human-in-the-loop" — directing and improving AI output
- Effective prompt construction: clear instructions, context, desired format

Learning Objectives:
1. Construct effective prompts using Role, Task, Context, and Format
2. Demonstrate iterative refinement by improving an AI output through at least 3 follow-up prompts
3. Distinguish between "vibe prompting" and structured, intentional prompting
4. Explain the concept of "human-in-the-loop" and why it matters

Assignment: Prompt Engineering Challenge — Take a vague prompt and refine it over 5 iterations to produce a dramatically improved output. Document your changes and explain why each iteration improved the result.`,
    },
    {
      moduleNumber: 3,
      title: 'Module 3: The Expert Adversary — Stress Testing Your Ideas',
      materialType: 'lecture',
      content: `Core Skill: AI-powered critical inquiry, argumentation, and co-creation.

Key Topics & Concepts:
- Using AI as a "debate partner," "devil's advocate," or "Red Team"
- Identifying key personas and stakeholders to simulate diverse perspectives
- Anticipating counterarguments and identifying "Unknown Unknowns" — blind spots around privacy, security, equity
- Mastering the "iterative, back-and-forth" dialogue for co-creation
- Moving from a "prompter" to a "partner" or "director" in AI collaboration
- Applying collaborative intelligence to build complex documents (project proposals, business cases)

Learning Objectives:
1. Use AI as a devil's advocate to identify weaknesses in your own arguments
2. Simulate 3 different stakeholder perspectives on a proposed idea
3. Identify at least 2 "unknown unknowns" that AI surface about your idea
4. Build a structured proposal document using iterative AI co-creation

Assignment: Red Team Your Own Idea — Propose a solution to a campus problem, then use AI to stress-test it from 3 stakeholder perspectives. Revise based on the critique.`,
    },
    {
      moduleNumber: 4,
      title: 'Module 4: The Hallucination Detective — Critical Evaluation & Fact-Checking',
      materialType: 'lecture',
      content: `Core Skill: Critical evaluation and AI fact-checking.

Key Topics & Concepts:
- AI "hallucinations" — fabricated facts, invented sources, confident errors
- Why hallucinations happen: non-determinism, probabilistic text prediction, training data gaps
- Prompting strategies that reduce hallucination (ask for sources, ask AI to express uncertainty)
- Credibility checks: lateral reading, reverse image search, triangulation
- The "trust but verify" framework for AI outputs
- Domain areas where hallucination risk is highest (legal, medical, historical, scientific)

Learning Objectives:
1. Explain why AI systems generate hallucinations and what makes them convincing
2. Apply lateral reading techniques to verify AI-generated claims
3. Design prompts that explicitly ask AI to flag uncertainty
4. Categorize AI outputs by hallucination risk level

Assignment: Fact-Check the AI — Get an AI to write a short research summary on a topic you know well. Identify every claim that is wrong, unverifiable, or misleading. Propose better prompting strategies.`,
    },
    {
      moduleNumber: 5,
      title: 'Module 5: Ethics I — Personal Responsibility with AI',
      materialType: 'lecture',
      content: `Core Skill: Ethical reasoning and personal responsibility in AI use.

Key Topics & Concepts:
- Shifting from "Can I use AI for this?" to "Should I, and how do I do it responsibly?"
- Academic integrity and disclosure — when and how to acknowledge AI assistance
- Authenticity: understanding the difference between AI-assisted and AI-generated work
- Building genuine skills vs. outsourcing thinking to AI
- Personal data and privacy — what you share with AI tools and who can see it
- The "meaningful human contribution" standard for AI collaboration

Learning Objectives:
1. Apply a personal ethics framework to decide when/how to use AI on academic work
2. Write an appropriate AI disclosure statement for a class assignment
3. Distinguish between AI as a thinking partner vs. AI as a ghost-writer
4. Identify personal data risks when using consumer AI tools

Assignment: Your AI Ethics Statement — Write a 500-word personal policy for AI use in your academic career. Address: when you will use it, when you won't, and how you will disclose it.`,
    },
    {
      moduleNumber: 6,
      title: 'Module 6: AI Ethics II — The System, Society, and Algorithmic Power',
      materialType: 'lecture',
      content: `Core Skill: Applied ethical analysis with focus on systemic issues and societal consequences.

Key Topics & Concepts:
- Algorithmic Bias and Fairness: how and why bias occurs (hiring algorithms, criminal justice, healthcare)
- The feedback loop problem: biased data → biased model → biased decisions → more biased data
- Environmental and energy costs of large AI models
- Labor displacement and economic equity in the age of AI
- Surveillance capitalism and data monetization
- Who builds AI — and who it's built for
- Emerging governance frameworks: EU AI Act, White House Executive Orders

Learning Objectives:
1. Analyze a real-world case of algorithmic bias and explain its root causes
2. Evaluate the stakeholder impacts of deploying an AI system in a community you care about
3. Apply the "Who benefits, who bears risk?" framework to an AI product
4. Propose one policy or design change that would make a given AI system more equitable

Assignment: AI Equity Audit — Choose one AI system used in a public context (hiring, healthcare, education, criminal justice). Conduct a mock equity audit using the frameworks from this module.`,
    },
    {
      moduleNumber: 7,
      title: 'Module 7: The Infinite Creativity Well — Multi-Modal AI',
      materialType: 'lecture',
      content: `Core Skill: Multi-modal AI creation — images, video, audio, and visual prompting.

Key Topics & Concepts:
- Multimodal AI tools: image generation (DALL-E, Midjourney, Firefly), video (Runway, Sora), audio (ElevenLabs, Suno)
- Structured visual prompting: style, subject, setting, mood, medium, composition
- Real-world creative applications: marketing, education, research visualization, accessibility
- Copyright and intellectual property: who owns AI-generated content?
- Deepfakes, synthetic media, and the ethics of likeness
- Responsible use in academic and professional contexts

Learning Objectives:
1. Generate an image using at least 5 structured prompt parameters
2. Explain the copyright status of AI-generated creative work
3. Identify two contexts where deepfake or synthetic media poses genuine harm
4. Create an AI-assisted multimedia artifact for an academic or personal project

Assignment: Visual Story — Create an AI-generated image series (4-6 images) that tells a story related to your major or a community issue. Document your prompting process and reflect on the creative decisions you made.`,
    },
    {
      moduleNumber: 8,
      title: 'Module 8: The AI Agent Director — From Prompt to Action',
      materialType: 'lecture',
      content: `Core Skill: Directing agentic AI and strategic goal decomposition.

Key Topics & Concepts:
- Agentic vs. Generative AI: AI that creates vs. AI that acts
- Autonomy levels: from single-shot prompts to multi-step goal execution
- Real-world agentic examples: trip planning agents, research agents, coding agents, document automation
- Goal decomposition: breaking a complex objective into sub-tasks an agent can execute
- Tool use and function calling: how agents interact with external services
- Risks of agentic AI: runaway tasks, unintended side effects, over-automation
- Human oversight patterns: approval gates, sandboxing, audit trails

Learning Objectives:
1. Distinguish between generative and agentic AI with concrete examples
2. Decompose a complex goal into a structured agent task list
3. Identify at least 2 risk scenarios where an agentic AI could cause unintended harm
4. Design a simple agentic workflow for a task in your field

Assignment: Agent Blueprint — Choose a repetitive, multi-step task in your academic or professional life. Design an AI agent workflow to automate it, including: goals, sub-tasks, tools needed, approval gates, and failure modes.`,
    },
    {
      moduleNumber: 9,
      title: 'Module 9: The Proposal Prototyper — Blueprint for Innovation',
      materialType: 'lecture',
      content: `Core Skill: Using AI to develop, structure, and refine innovation proposals.

Key Topics & Concepts:
- What makes a strong innovation proposal: problem definition, solution fit, stakeholder analysis, feasibility
- Using AI as a proposal development partner: generating structure, filling gaps, strengthening arguments
- Expert panel framework: using AI to simulate expert critique (technical feasibility, ethics, market, user)
- The "proposal stress test" — systematically finding weaknesses before submission
- Watching student spotlight interviews: peer proposal examples
- Expert perspectives: Judy Goldsmith on "The Project I Would Do", Joe Brewer on "Go Fast and Break Stuff"

Learning Objectives:
1. Draft a structured innovation proposal outline with AI assistance
2. Identify and address weaknesses using AI-simulated expert critique
3. Apply lessons from student and expert examples to strengthen your proposal
4. Present a coherent problem + solution narrative suitable for a non-expert audience

Assignment: Proposal Draft — Submit your first full draft of the AI Innovation Proposal. Must include: Problem Statement, Proposed Solution, Target Users, Potential Risks, and Implementation Plan.`,
    },
    {
      moduleNumber: 10,
      title: 'Module 10: Capstone — The AI Innovation Proposal',
      materialType: 'lecture',
      content: `Core Skill: Synthesizing all course competencies into a publishable AI innovation proposal.

Overview: The culmination of TEK-100. Over the past nine modules, students have learned to observe AI, collaborate with generative tools, critique and fact-check outputs, consider both personal and systemic ethics, create multimodal artifacts, design agentic workflows, and develop project proposals.

Module 10 brings everything together. Students submit their AI Innovation Proposal — proposing an AI-driven solution to a real-world problem affecting a community they care about.

Final Deliverables:
1. Written AI Innovation Proposal (1500-2000 words)
   - Problem Statement: What problem are you solving, for whom, and why now?
   - Solution Description: What AI approach will you use? Why is this the right tool?
   - Stakeholder Analysis: Who benefits, who bears risk, who is excluded?
   - Ethical Considerations: What are the bias, privacy, and fairness risks?
   - Implementation Roadmap: What would it take to actually build this?
   - Appendix: Prompt log (show your AI collaboration process)
2. Video Presentation (3-5 minutes)
   - Clearly explain your idea to a non-expert audience
   - AI-assisted slides or visuals encouraged

Grading Rubric:
- Problem clarity and significance (20%)
- Solution feasibility and AI appropriateness (20%)
- Stakeholder and equity analysis (20%)
- Ethical reasoning (20%)
- Presentation quality and communication (20%)`,
    },
  ]

  for (const mod of TEK_MODULES) {
    const existingMod = await prisma.courseMaterial.findFirst({
      where: { courseId: tek100.id, moduleNumber: mod.moduleNumber },
    })
    if (!existingMod) {
      await prisma.courseMaterial.create({
        data: { courseId: tek100.id, ...mod },
      })
    }
  }

  const tek100SupplementalMaterials = [
    {
      moduleNumber: null,
      title: 'TEK-100 Syllabus and Build Path',
      materialType: 'syllabus',
      content: `Course Format:
- 10 modules across AI literacy, prompting, evaluation, ethics, multimodal creation, and innovation design
- Weekly rhythm: one lecture module, one short applied exercise, one discussion checkpoint, and one tool-based practice activity
- Synthetic grading mix: Observation Journal (10%), Prompt Lab (10%), Red Team Memo (15%), Ethics Statement (10%), Equity Audit (15%), Proposal Milestones (20%), Final Innovation Proposal + Presentation (20%)

Participation Expectations:
- Students should document their AI collaboration process in a prompt log
- Major deliverables require a short disclosure note describing how AI was used
- Peer discussion emphasizes critique, revision, and responsible experimentation

Instructor Note:
This synthetic syllabus is designed for MVP demos. It gives students enough structure to explore the course workspace, linked tools, and study supports in a realistic way without relying on any real student data.`,
    },
    {
      moduleNumber: 2,
      title: 'Reading: Co-Intelligence and Human-in-the-Loop Workflows',
      materialType: 'reading',
      content: `Reading focus:
- Why AI works best as a collaborator instead of an autopilot
- The difference between asking for output and directing a workflow
- How professionals use iterative prompting to improve first drafts

Guiding questions:
1. What does a "human-in-the-loop" actually do during a real project?
2. Which of the Four Pillars of Prompting is hardest to provide well, and why?
3. What kinds of judgment should remain human even when AI is fast?`,
    },
    {
      moduleNumber: 6,
      title: 'Case Study: Bias in Student Success Prediction',
      materialType: 'case',
      content: `Scenario:
A university deploys an AI dashboard to identify students "at risk" of failing a course. Advisors use the score to prioritize outreach, but students quickly notice patterns: transfer students and first-generation students are flagged more often, even when their grades match peers.

Case task:
- Identify what data might be producing the skew
- Describe who benefits from the system and who bears the risk
- Recommend one policy change and one design change before the system is used at scale`,
    },
    {
      moduleNumber: 1,
      title: 'Assignment 1: AI Observation Journal',
      materialType: 'assignment',
      content: `Deliverable:
- 700-900 words plus a table of 5 AI systems you encountered in one day

Requirements:
- Name each system, what signal or data it likely uses, and what decision it appears to make
- Classify each example as recommendation, prediction, generation, automation, or surveillance
- End with a reflection on which system surprised you most and why

Success criteria:
- Concrete observations
- Correct use of basic AI vocabulary
- Clear distinction between what you know and what you infer`,
    },
    {
      moduleNumber: 2,
      title: 'Assignment 2: Prompt Iteration Lab',
      materialType: 'assignment',
      content: `Deliverable:
- One weak prompt, five revisions, and a final reflection

Workflow:
1. Start with a vague prompt related to your major
2. Revise it five times using Role, Task, Context, and Format
3. Save the output from each round
4. Explain what changed and why the later responses were more useful

Reflection prompt:
What did you learn about directing AI rather than just asking it for something?`,
    },
    {
      moduleNumber: 3,
      title: 'Assignment 3: Red Team Proposal Memo',
      materialType: 'assignment',
      content: `Deliverable:
- 2-page memo proposing a campus or community solution and then stress-testing it

Required sections:
- Problem statement
- Proposed AI-enabled solution
- Three stakeholder critiques generated through AI-assisted roleplay
- Revised recommendation after critique

Demo-friendly note:
This assignment pairs well with the course's linked debate and proposal tools.`,
    },
    {
      moduleNumber: 4,
      title: 'Quiz Check: Hallucination Detective',
      materialType: 'quiz',
      content: `Sample checks:
1. Define an AI hallucination in one sentence.
2. Name two verification moves you would use before trusting an AI-generated citation.
3. Which prompt is more likely to reduce hallucination risk, and why?
4. When should an AI answer explicitly say "I am not sure"?`,
    },
    {
      moduleNumber: 9,
      title: 'Assignment 4: Innovation Proposal Milestone',
      materialType: 'assignment',
      content: `Deliverable:
- A milestone packet preparing students for the capstone

Include:
- One-sentence problem framing
- Target user profile
- AI approach you plan to use
- One paragraph on benefits
- One paragraph on risks
- Three questions you still need to answer before the final proposal

Feedback focus:
Students should receive coaching on scope, feasibility, and stakeholder clarity.`,
    },
    {
      moduleNumber: 10,
      title: 'Capstone Innovation Proposal Rubric',
      materialType: 'rubric',
      content: `Rubric bands:
- Problem significance and clarity: 20 points
- Appropriateness of the AI solution: 20 points
- Stakeholder and equity analysis: 20 points
- Ethical reasoning and risk mitigation: 20 points
- Communication quality and prompt-log transparency: 20 points

Strong submissions:
- Make a specific claim about who the proposal helps
- Explain why AI is actually the right tool
- Show awareness of harms, trade-offs, and implementation realities`,
    },
  ]

  await seedCourseMaterialsByTitle(tek100.id, tek100SupplementalMaterials)

  const cs215 = await prisma.course.upsert({
    where: { courseCode: 'CS-215' },
    update: {},
    create: {
      courseCode: 'CS-215',
      title: 'Introduction to Programming',
      description: 'Foundational programming concepts using Python. Students learn variables, loops, functions, and object-oriented design through hands-on projects.',
      instructorId: price.id,
      isPublic: true,
    },
  })

  const cs215Materials = [
    {
      moduleNumber: 1,
      title: 'Module 1: Variables and Loops',
      materialType: 'lecture',
      content: `Variables store data that your program needs to remember. Practice declaring strings, integers, and floats, then use conditionals and loops to repeat work efficiently.

Key topics:
- Variables and assignment
- Basic input/output
- if/else logic
- for and while loops

Lab prompt: Write a Python program that tracks a student's quiz scores and prints a running average after each score is entered.`,
    },
    {
      moduleNumber: 2,
      title: 'Module 2: Functions and Object-Oriented Design',
      materialType: 'lecture',
      content: `Functions help you organize code into reusable blocks. Classes and objects let you model real-world entities with state and behavior.

Key topics:
- Defining and calling functions
- Parameters and return values
- Class syntax and instance variables
- Using methods to keep code organized

Lab prompt: Build a simple GradeTracker class with methods to add scores, compute an average, and display course progress.`,
    },
    {
      moduleNumber: 3,
      title: 'Module 3: Lists, Dictionaries, and File Input',
      materialType: 'lecture',
      content: `Real programs need collections of data. This module introduces Python lists and dictionaries, then shows how file input lets your program persist information between runs.

Key topics:
- Indexing and slicing lists
- Updating dictionaries by key
- Reading and writing simple text files
- Choosing the right structure for a small program

Lab prompt: Read a roster of student names and quiz scores from a file, then print a summary report with the highest score, lowest score, and class average.`,
    },
    {
      moduleNumber: 4,
      title: 'Module 4: Testing and Debugging Strategies',
      materialType: 'lecture',
      content: `Debugging is a thinking process, not just a reaction to red text. Students practice tracing code, designing small tests, and isolating logic errors before asking for help.

Key topics:
- Reading tracebacks line by line
- Writing targeted print statements
- Using small test cases to isolate a bug
- Explaining expected vs. actual behavior

Lab prompt: Diagnose a broken grade calculator, document the bug, and explain the fix in plain language before changing the code.`,
    },
  ]

  for (const material of cs215Materials) {
    const existingMaterial = await prisma.courseMaterial.findFirst({
      where: { courseId: cs215.id, moduleNumber: material.moduleNumber },
    })
    if (!existingMaterial) {
      await prisma.courseMaterial.create({
        data: { courseId: cs215.id, ...material },
      })
    }
  }

  const cs215SupplementalMaterials = [
    {
      moduleNumber: null,
      title: 'CS-215 Syllabus Snapshot',
      materialType: 'syllabus',
      content: `Synthetic course structure:
- Module 1: Variables, conditionals, and loops
- Module 2: Functions and class design
- Module 3: Data structures and files
- Module 4: Testing and debugging

Major assessments:
- Assignment 1: Quiz Tracker CLI
- Assignment 2: GradeTracker class
- Assignment 3: Debugging clinic
- Weekly low-stakes quiz checks

Course norm:
Students are expected to explain their reasoning, not just paste working code.`,
    },
    {
      moduleNumber: 1,
      title: 'Reading: Trace Tables and Predicting Program Flow',
      materialType: 'reading',
      content: `Reading goals:
- Slow down execution one line at a time
- Predict variable values after each branch or loop iteration
- Use trace tables before trying random edits

Discussion prompt:
Why do novice programmers often change code too early instead of explaining what it currently does?`,
    },
    {
      moduleNumber: 1,
      title: 'Assignment 1: Quiz Tracker CLI',
      materialType: 'assignment',
      content: `Build a command-line program that accepts quiz scores until the user types "done".

Required features:
- Store each score in a list
- Print a running average after every new score
- Report the highest and lowest score at the end
- Reject invalid input without crashing

Submission includes:
- Python file
- Short reflection on one bug you encountered and how you fixed it`,
    },
    {
      moduleNumber: 2,
      title: 'Assignment 2: GradeTracker Class',
      materialType: 'assignment',
      content: `Create a GradeTracker class with:
- An initializer that stores a course name and an empty score list
- An add_score method
- An average method
- A summary method that prints course progress in a readable format

Stretch goal:
Add letter-grade feedback without duplicating logic across methods.`,
    },
    {
      moduleNumber: 2,
      title: 'Mini-Project Rubric: Readability and Design',
      materialType: 'rubric',
      content: `Rubric categories:
- Correct behavior on sample inputs
- Meaningful function and method names
- Clean separation of concerns
- Helpful inline comments only where needed
- Clear explanation of debugging choices in the reflection`,
    },
    {
      moduleNumber: 3,
      title: 'Quiz Check: Lists, Dictionaries, and Files',
      materialType: 'quiz',
      content: `Quick check:
1. When would you choose a dictionary instead of a list?
2. What is the difference between append and assignment by index?
3. Why should file input be tested with a very small sample first?
4. What kind of bug appears when a dictionary key is misspelled?`,
    },
    {
      moduleNumber: 4,
      title: 'Reading: A Beginner Debugging Checklist',
      materialType: 'reading',
      content: `Checklist:
- Reproduce the bug with the smallest input possible
- State what you expected to happen
- State what actually happened
- Read the traceback from the bottom up
- Add one diagnostic print at a time
- Re-run after every change

Reflection:
Which checklist step do you usually skip, and what does that cost you?`,
    },
    {
      moduleNumber: 4,
      title: 'Assignment 3: Debugging Clinic Reflection',
      materialType: 'assignment',
      content: `Students receive a broken program that computes final grades incorrectly.

Deliverables:
- A corrected version of the program
- A one-page debugging log documenting the bug, the evidence, and the final fix
- A short note explaining which question they would ask a peer tutor if still stuck`,
    },
  ]

  await seedCourseMaterialsByTitle(cs215.id, cs215SupplementalMaterials)

  await prisma.courseToolLink.upsert({
    where: {
      courseId_toolId: {
        courseId: cs215.id,
        toolId: tool9.id,
      },
    },
    update: {
      weekLabel: 'Week 4: Debugging Strategies and Test Cases',
      syllabusContext:
        'Use this tool as a Socratic debugging coach. Students should explain expected versus actual behavior, trace small test cases, and describe what they already tried before they ask for a hint.',
    },
    create: {
      courseId: cs215.id,
      toolId: tool9.id,
      weekLabel: 'Week 4: Debugging Strategies and Test Cases',
      syllabusContext:
        'Use this tool as a Socratic debugging coach. Students should explain expected versus actual behavior, trace small test cases, and describe what they already tried before they ask for a hint.',
    },
  })

  const bio201 = await prisma.course.upsert({
    where: { courseCode: 'BIO-201' },
    update: {},
    create: {
      courseCode: 'BIO-201',
      title: 'Human Anatomy and Physiology',
      description: 'Survey of human body systems including musculoskeletal, cardiovascular, and nervous systems. Emphasis on clinical application and patient communication.',
      instructorId: price.id,
      isPublic: true,
    },
  })

  const bio201Materials = [
    {
      moduleNumber: 1,
      title: 'Module 1: Body Systems Overview',
      materialType: 'lecture',
      content: `Human anatomy and physiology examine how structure supports function across major body systems.

Key topics:
- Anatomical position and directional terms
- Musculoskeletal and cardiovascular system basics
- Homeostasis and feedback loops
- Linking normal physiology to common symptoms

Clinical focus: Explain how chest pain, swelling, and fatigue can reflect dysfunction in multiple body systems.`,
    },
    {
      moduleNumber: 2,
      title: 'Module 2: Clinical Communication and Patient Interaction',
      materialType: 'lecture',
      content: `Patient communication is a core clinical skill. Strong interview technique helps you gather accurate information and build trust.

Key topics:
- Open-ended vs. closed-ended questions
- Sequencing a patient history
- Reflective listening and empathy
- Translating medical language into patient-friendly explanations

Clinical focus: Practice interviewing a patient with chest discomfort while gathering symptom history, risk factors, and relevant past medical information.`,
    },
    {
      moduleNumber: 3,
      title: 'Module 3: Cardiovascular Function and Perfusion',
      materialType: 'lecture',
      content: `The cardiovascular system distributes oxygen, nutrients, hormones, and heat. Students connect heart structure to blood flow and then relate perfusion problems to real symptoms.

Key topics:
- Chambers, valves, and one-way blood flow
- Blood pressure and cardiac output basics
- Perfusion, edema, and shortness of breath
- Linking chest pain complaints to cardiovascular reasoning

Clinical focus: Compare the symptom pattern of stable exertional chest pain with non-cardiac discomfort.`,
    },
    {
      moduleNumber: 4,
      title: 'Module 4: Nervous System Signaling and Symptom Assessment',
      materialType: 'lecture',
      content: `The nervous system coordinates sensation, response, and regulation. Students practice turning vague symptom descriptions into more precise neurological questions.

Key topics:
- Central vs. peripheral nervous system
- Motor and sensory pathways
- Reflexes, weakness, numbness, and dizziness
- Interview prompts that clarify onset, duration, and severity

Clinical focus: Build a symptom history for a patient who reports dizziness, tingling, and one-sided weakness.`,
    },
  ]

  for (const material of bio201Materials) {
    const existingMaterial = await prisma.courseMaterial.findFirst({
      where: { courseId: bio201.id, moduleNumber: material.moduleNumber },
    })
    if (!existingMaterial) {
      await prisma.courseMaterial.create({
        data: { courseId: bio201.id, ...material },
      })
    }
  }

  const bio201SupplementalMaterials = [
    {
      moduleNumber: null,
      title: 'BIO-201 Syllabus Snapshot',
      materialType: 'syllabus',
      content: `Synthetic course sequence:
- Module 1: Structure, function, and homeostasis
- Module 2: Patient communication fundamentals
- Module 3: Cardiovascular function
- Module 4: Nervous system symptom assessment

Major coursework:
- Body systems concept map
- Short patient interview reflection
- Cardiovascular case response
- Weekly quiz checks

Clinical skill emphasis:
Students should practice translating anatomy and physiology into patient-friendly explanations.`,
    },
    {
      moduleNumber: 1,
      title: 'Reading: Homeostasis and Feedback Loops',
      materialType: 'reading',
      content: `Reading focus:
- Negative versus positive feedback
- How body systems cooperate to keep variables in range
- Why symptoms often reflect compensation before failure

Study question:
How can one symptom point to dysfunction in multiple systems at once?`,
    },
    {
      moduleNumber: 1,
      title: 'Assignment 1: Body Systems Concept Map',
      materialType: 'assignment',
      content: `Create a one-page concept map showing how the cardiovascular, respiratory, musculoskeletal, and nervous systems support normal function.

Requirements:
- Include at least 10 labeled relationships
- Use arrows to show cause-and-effect links
- Add a brief note on what happens when one system begins to fail`,
    },
    {
      moduleNumber: 2,
      title: 'Reading: Interviewing for Symptom History',
      materialType: 'reading',
      content: `Reading focus:
- Open-ended entry questions
- Sequencing symptom, timing, severity, and risk-factor questions
- Avoiding leading language
- When to summarize and reflect emotion

Practice prompt:
Rewrite three closed questions as open-ended questions a patient could answer in their own words.`,
    },
    {
      moduleNumber: 2,
      title: 'Assignment 2: Patient Interview Reflection',
      materialType: 'assignment',
      content: `After a short simulated interview, write a 500-word reflection addressing:
- Which question opened the conversation best
- What information you almost missed
- Where the patient seemed anxious or confused
- One way you would improve your phrasing next time`,
    },
    {
      moduleNumber: 2,
      title: 'Clinical Communication Rubric',
      materialType: 'rubric',
      content: `Rubric categories:
- Establishes rapport and professional tone
- Uses open-ended questions before narrowing
- Organizes the history logically
- Checks understanding and summarizes key points
- Avoids unnecessary jargon when speaking to the patient`,
    },
    {
      moduleNumber: 3,
      title: 'Case: Chest Pain at the Campus Rec Center',
      materialType: 'case',
      content: `Scenario:
A 46-year-old staff member develops pressure-like chest discomfort and shortness of breath after climbing stairs at the campus recreation center. The pain eases slightly with rest but returns when they walk to the parking lot.

Case task:
- Identify the first five history questions you would ask
- Name two body systems that could be involved
- Explain why exertion matters in this symptom story`,
    },
    {
      moduleNumber: 3,
      title: 'Quiz Check: Cardiovascular Physiology',
      materialType: 'quiz',
      content: `Quick check:
1. What is perfusion?
2. Why can edema point to cardiovascular dysfunction?
3. Which symptom makes exertional chest pain more concerning?
4. How does shortness of breath relate to circulation as well as respiration?`,
    },
  ]

  await seedCourseMaterialsByTitle(bio201.id, bio201SupplementalMaterials)

  await prisma.courseToolLink.upsert({
    where: {
      courseId_toolId: {
        courseId: bio201.id,
        toolId: tool4.id,
      },
    },
    update: {
      weekLabel: 'Week 2: Patient History and Communication',
      syllabusContext:
        'Frame this tool as clinical interview practice for early anatomy and physiology students. Emphasize structured history-taking, empathy, and translating physiology into patient-friendly questions rather than jumping to diagnosis.',
    },
    create: {
      courseId: bio201.id,
      toolId: tool4.id,
      weekLabel: 'Week 2: Patient History and Communication',
      syllabusContext:
        'Frame this tool as clinical interview practice for early anatomy and physiology students. Emphasize structured history-taking, empathy, and translating physiology into patient-friendly questions rather than jumping to diagnosis.',
    },
  })

  await prisma.gamificationConfig.upsert({
    where: { toolId: tool1.id },
    update: {
      totalSteps: 5,
      stepLabel: 'Round',
    },
    create: {
      toolId: tool1.id,
      totalSteps: 5,
      stepLabel: 'Round',
    },
  })

  const promptEngineeringTool = await prisma.tool.findUnique({
    where: { id: 'tool-prompt-engineering' },
    select: { id: true },
  })

  if (promptEngineeringTool) {
    await prisma.courseToolLink.upsert({
      where: {
        courseId_toolId: {
          courseId: tek100.id,
          toolId: promptEngineeringTool.id,
        },
      },
      update: {
        weekLabel: 'Week 2: Prompting for Better Outputs',
        syllabusContext:
          'Students should use this tool to practice the Role, Task, Context, and Format framework from Module 2. Emphasize iterative refinement, ask them to justify why each revision is stronger, and redirect them back to the module language when their prompts stay vague.',
      },
      create: {
        courseId: tek100.id,
        toolId: promptEngineeringTool.id,
        weekLabel: 'Week 2: Prompting for Better Outputs',
        syllabusContext:
          'Students should use this tool to practice the Role, Task, Context, and Format framework from Module 2. Emphasize iterative refinement, ask them to justify why each revision is stronger, and redirect them back to the module language when their prompts stay vague.',
      },
    })
  }

  await seedCourseDiscussionThreads(tek100.id, [
    {
      title: 'Prompt Iteration Lab: what strong revision notes look like',
      content:
        'Use this thread for questions about the Prompt Iteration Lab. A strong submission should show how your prompt changed, why you changed it, and what evidence convinced you the revision was better.',
      authorId: price.id,
      isPinned: true,
      posts: [
        {
          content:
            'Can we submit screenshots of the conversation if we also include a short reflection, or do you want the full prompt transcript pasted into one document?',
          authorId: mayaBennett.id,
          replies: [
            {
              content:
                'Screenshots are fine if they are readable, but add a short written note between iterations so I can see your decision-making process clearly.',
              authorId: price.id,
            },
          ],
        },
        {
          content:
            'If I keep the same task but change audience, tone, and output format across iterations, does that count as enough revision depth?',
          authorId: noahCarter.id,
          replies: [
            {
              content:
                'That should count if you explain what each change improved. The strongest examples show a clear before-and-after effect rather than surface edits.',
              authorId: zoeKim.id,
            },
          ],
        },
      ],
    },
    {
      title: 'How detailed should our AI disclosure be?',
      content:
        'I know we need to explain where AI helped, but I am unsure whether a short note is enough or if we need to document every step in the workflow.',
      authorId: mayaBennett.id,
      posts: [
        {
          content:
            'Right now mine says AI helped with brainstorming and revising, but that still feels vague. Are people listing the exact prompts they used?',
          authorId: zoeKim.id,
          replies: [
            {
              content:
                'I listed the stages instead of every single prompt. For example: idea generation, counterargument testing, and outline cleanup.',
              authorId: leoAlvarez.id,
            },
            {
              content:
                'That is the right direction. The goal is transparency about the role AI played, not a giant transcript unless the assignment specifically asks for it.',
              authorId: price.id,
            },
          ],
        },
      ],
    },
    {
      title: 'Narrowing my innovation proposal scope',
      content:
        'My proposal idea keeps expanding into three different problems. I can describe the big issue, but I am struggling to define a small enough first version.',
      authorId: noahCarter.id,
      posts: [
        {
          content:
            'Try writing one sentence that starts with "students currently lose time because..." and force yourself to name only one user group.',
          authorId: sofiaNguyen.id,
          replies: [
            {
              content:
                'That helps. I was trying to solve onboarding, advising, and financial literacy all at once. I am going to focus just on first-year time management.',
              authorId: noahCarter.id,
            },
          ],
        },
        {
          content:
            'If your first draft solves three things, that usually means your problem statement is still too broad. Bring one narrowed sentence to class and we can pressure-test it together.',
          authorId: price.id,
        },
      ],
    },
  ])

  await seedCourseDiscussionThreads(cs215.id, [
    {
      title: 'Debugging clinic: how to ask for help without pasting the final code',
      content:
        'For the debugging clinic, focus your question on expected behavior, actual behavior, and the smallest input that reproduces the bug. The goal is to practice reasoning, not code dumping.',
      authorId: price.id,
      isPinned: true,
      posts: [
        {
          content:
            'Would it help if we include a trace table with the question, or is a short description of the test case enough?',
          authorId: sofiaNguyen.id,
          replies: [
            {
              content:
                'A tiny trace table is excellent because it shows what you already observed before asking for help.',
              authorId: price.id,
            },
          ],
        },
      ],
    },
    {
      title: 'Why does my running average reset inside the loop?',
      content:
        'My quiz tracker looks correct at first, but the average becomes wrong after the second input. I think I am accidentally reinitializing something, but I cannot see it.',
      authorId: mayaBennett.id,
      posts: [
        {
          content:
            'Check whether the total or count variable is being set back to zero every time the loop repeats. That bug is easy to miss when you move code around while testing.',
          authorId: tianaThe.id,
          replies: [
            {
              content:
                'That was it. I had the accumulator inside the loop while I was trying to handle invalid input. Moving it out fixed the average.',
              authorId: mayaBennett.id,
            },
          ],
        },
        {
          content:
            'Before editing more, print the total and count on each iteration with a three-score test case. The trace usually makes the reset obvious.',
          authorId: price.id,
        },
      ],
    },
    {
      title: 'Instance variables vs local variables in GradeTracker',
      content:
        'I understand the syntax difference, but I keep choosing the wrong place to store data. When should a value live on self versus only inside one method?',
      authorId: leoAlvarez.id,
      posts: [
        {
          content:
            'I started asking whether another method will need the value later. If yes, it probably belongs on self. If it only helps with one calculation, local is cleaner.',
          authorId: zoeKim.id,
          replies: [
            {
              content:
                'That rule of thumb makes way more sense than memorizing definitions. I was storing temporary counters on self for no reason.',
              authorId: leoAlvarez.id,
            },
          ],
        },
      ],
    },
  ])

  await seedCourseDiscussionThreads(bio201.id, [
    {
      title: 'Patient interview reflection expectations',
      content:
        'Use this thread for questions about the patient interview reflection. Strong work should name a specific question choice, explain what information it unlocked, and reflect on tone as well as content.',
      authorId: price.id,
      isPinned: true,
      posts: [
        {
          content:
            'Do you want us to quote our exact interview question in the reflection, or can we paraphrase the moment we are analyzing?',
          authorId: zoeKim.id,
          replies: [
            {
              content:
                'Either is fine. Exact wording helps if you are analyzing phrasing, but paraphrase is fine when you are focusing on sequencing or empathy.',
              authorId: price.id,
            },
          ],
        },
      ],
    },
    {
      title: 'Open-ended vs closed-ended follow-up questions',
      content:
        'I know we should start open-ended, but I still end up asking yes-or-no questions too early when I get nervous about missing details.',
      authorId: noahCarter.id,
      posts: [
        {
          content:
            'One thing that helped me was writing a neutral stem first, like "Tell me more about..." before I decide what detail I actually need.',
          authorId: mayaBennett.id,
          replies: [
            {
              content:
                'That is a great scaffold. Open-ended first, then narrow only after the patient has had room to tell the story in their own words.',
              authorId: price.id,
            },
          ],
        },
      ],
    },
    {
      title: 'Why does exertional chest pain change the story?',
      content:
        'In the rec-center case, the pain improves with rest and returns when the patient walks again. I know that matters, but I want to explain the physiology more clearly.',
      authorId: sofiaNguyen.id,
      posts: [
        {
          content:
            'Exertion raises oxygen demand, so symptoms that appear with activity can hint that supply is not keeping up. That makes cardiovascular causes feel more plausible.',
          authorId: mcclureStudent.id,
          replies: [
            {
              content:
                'Exactly. The symptom pattern matters because it links the complaint to workload and perfusion rather than just the location of the pain.',
              authorId: price.id,
            },
          ],
        },
      ],
    },
  ])

  await prisma.toolSession.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'session-tek100-maya-prompt-lab',
        toolId: 'tool-prompt-engineering',
        courseId: tek100.id,
        userId: mayaBennett.id,
        startedAt: new Date('2026-03-14T18:10:00.000Z'),
        endedAt: new Date('2026-03-14T18:31:00.000Z'),
        messageCount: 16,
        status: 'completed',
        notes: 'Revised audience, context, and output format across five iterations for the prompt lab.',
      },
      {
        id: 'session-tek100-noah-red-team',
        toolId: 'tool-prompt-engineering',
        courseId: tek100.id,
        userId: noahCarter.id,
        startedAt: new Date('2026-03-15T19:02:00.000Z'),
        endedAt: new Date('2026-03-15T19:19:00.000Z'),
        messageCount: 11,
        status: 'completed',
        notes: 'Used the tool to pressure-test a student-services proposal and rewrite the risk section.',
      },
      {
        id: 'session-tek100-zoe-proposal',
        toolId: 'tool-prompt-engineering',
        courseId: tek100.id,
        userId: zoeKim.id,
        startedAt: new Date('2026-03-15T21:08:00.000Z'),
        endedAt: new Date('2026-03-15T21:29:00.000Z'),
        messageCount: 14,
        status: 'completed',
        notes: 'Compared vague versus structured prompts before drafting an innovation proposal milestone.',
      },
      {
        id: 'session-cs215-sofia-debug',
        toolId: tool9.id,
        courseId: cs215.id,
        userId: sofiaNguyen.id,
        startedAt: new Date('2026-03-14T20:05:00.000Z'),
        endedAt: new Date('2026-03-14T20:24:00.000Z'),
        messageCount: 13,
        status: 'completed',
        notes: 'Walked through a loop bug in the quiz tracker using a three-score test case.',
      },
      {
        id: 'session-cs215-tiana-debug',
        toolId: tool9.id,
        courseId: cs215.id,
        userId: tianaThe.id,
        startedAt: new Date('2026-03-15T17:42:00.000Z'),
        endedAt: new Date('2026-03-15T18:01:00.000Z'),
        messageCount: 10,
        status: 'completed',
        notes: 'Practiced explaining expected versus actual behavior before asking for a hint.',
      },
      {
        id: 'session-cs215-leo-debug',
        toolId: tool9.id,
        courseId: cs215.id,
        userId: leoAlvarez.id,
        startedAt: new Date('2026-03-15T22:11:00.000Z'),
        endedAt: new Date('2026-03-15T22:27:00.000Z'),
        messageCount: 9,
        status: 'completed',
        notes: 'Used the debugging tutor to sort out instance variables versus local variables in GradeTracker.',
      },
      {
        id: 'session-bio201-ian-interview',
        toolId: tool4.id,
        courseId: bio201.id,
        userId: mcclureStudent.id,
        startedAt: new Date('2026-03-14T16:32:00.000Z'),
        endedAt: new Date('2026-03-14T16:49:00.000Z'),
        messageCount: 12,
        status: 'completed',
        notes: 'Practiced opening a patient interview with symptom-history questions before narrowing the differential.',
      },
      {
        id: 'session-bio201-zoe-interview',
        toolId: tool4.id,
        courseId: bio201.id,
        userId: zoeKim.id,
        startedAt: new Date('2026-03-15T18:55:00.000Z'),
        endedAt: new Date('2026-03-15T19:14:00.000Z'),
        messageCount: 15,
        status: 'completed',
        notes: 'Focused on patient-friendly phrasing and better open-ended follow-up questions.',
      },
      {
        id: 'session-bio201-noah-interview',
        toolId: tool4.id,
        courseId: bio201.id,
        userId: noahCarter.id,
        startedAt: new Date('2026-03-15T20:18:00.000Z'),
        endedAt: new Date('2026-03-15T20:34:00.000Z'),
        messageCount: 11,
        status: 'completed',
        notes: 'Used the interview simulator to practice summarizing symptoms and checking patient understanding.',
      },
    ],
  })

  await prisma.leaderboardEntry.deleteMany({
    where: {
      toolId: { in: ['tool-law756-evidence-quiz', 'tool-cs215-debug-tutor'] },
      metricKey: 'score',
    },
  })

  await prisma.leaderboardEntry.createMany({
    data: [
      {
        userId: student1.id,
        toolId: 'tool-law756-evidence-quiz',
        score: 94,
        metricKey: 'score',
      },
      {
        userId: mcclureStudent.id,
        toolId: 'tool-law756-evidence-quiz',
        score: 88,
        metricKey: 'score',
      },
      {
        userId: tianaThe.id,
        toolId: 'tool-cs215-debug-tutor',
        score: 91,
        metricKey: 'score',
      },
    ],
  })

  await prisma.leaderboardEntry.deleteMany({
    where: {
      metricKey: 'score',
      OR: [
        {
          toolId: 'tool-prompt-engineering',
          courseId: tek100.id,
        },
        {
          toolId: 'tool-cs215-debug-tutor',
          courseId: cs215.id,
        },
        {
          toolId: 'tool-patient-interview',
          courseId: bio201.id,
        },
      ],
    },
  })

  await prisma.leaderboardEntry.createMany({
    data: [
      {
        userId: mayaBennett.id,
        toolId: 'tool-prompt-engineering',
        courseId: tek100.id,
        sessionId: 'session-tek100-maya-prompt-lab',
        score: 94,
        metricKey: 'score',
      },
      {
        userId: zoeKim.id,
        toolId: 'tool-prompt-engineering',
        courseId: tek100.id,
        sessionId: 'session-tek100-zoe-proposal',
        score: 89,
        metricKey: 'score',
      },
      {
        userId: noahCarter.id,
        toolId: 'tool-prompt-engineering',
        courseId: tek100.id,
        sessionId: 'session-tek100-noah-red-team',
        score: 86,
        metricKey: 'score',
      },
      {
        userId: sofiaNguyen.id,
        toolId: 'tool-cs215-debug-tutor',
        courseId: cs215.id,
        sessionId: 'session-cs215-sofia-debug',
        score: 93,
        metricKey: 'score',
      },
      {
        userId: tianaThe.id,
        toolId: 'tool-cs215-debug-tutor',
        courseId: cs215.id,
        sessionId: 'session-cs215-tiana-debug',
        score: 91,
        metricKey: 'score',
      },
      {
        userId: leoAlvarez.id,
        toolId: 'tool-cs215-debug-tutor',
        courseId: cs215.id,
        sessionId: 'session-cs215-leo-debug',
        score: 84,
        metricKey: 'score',
      },
      {
        userId: mcclureStudent.id,
        toolId: 'tool-patient-interview',
        courseId: bio201.id,
        sessionId: 'session-bio201-ian-interview',
        score: 92,
        metricKey: 'score',
      },
      {
        userId: zoeKim.id,
        toolId: 'tool-patient-interview',
        courseId: bio201.id,
        sessionId: 'session-bio201-zoe-interview',
        score: 88,
        metricKey: 'score',
      },
      {
        userId: noahCarter.id,
        toolId: 'tool-patient-interview',
        courseId: bio201.id,
        sessionId: 'session-bio201-noah-interview',
        score: 83,
        metricKey: 'score',
      },
    ],
  })

  await prisma.portfolioItem.upsert({
    where: { id: 'portfolio-ian-jd-candidate' },
    update: {
      userId: mcclureStudent.id,
      type: 'EDUCATION',
      title: 'Juris Doctor (J.D.) Candidate',
      organization: 'University of Kentucky J. David Rosenberg College of Law',
      startDate: new Date('2023-08-01T00:00:00.000Z'),
      endDate: new Date('2026-05-01T00:00:00.000Z'),
      description: 'Focused on legal writing, advocacy, and evidence with an emphasis on practical courtroom skills.',
      skills: ['Legal research', 'Case analysis', 'Oral advocacy'],
      isVerified: true,
    },
    create: {
      id: 'portfolio-ian-jd-candidate',
      userId: mcclureStudent.id,
      type: 'EDUCATION',
      title: 'Juris Doctor (J.D.) Candidate',
      organization: 'University of Kentucky J. David Rosenberg College of Law',
      startDate: new Date('2023-08-01T00:00:00.000Z'),
      endDate: new Date('2026-05-01T00:00:00.000Z'),
      description: 'Focused on legal writing, advocacy, and evidence with an emphasis on practical courtroom skills.',
      skills: ['Legal research', 'Case analysis', 'Oral advocacy'],
      isVerified: true,
    },
  })

  await prisma.portfolioItem.upsert({
    where: { id: 'portfolio-ian-legal-intern' },
    update: {
      userId: mcclureStudent.id,
      type: 'EXPERIENCE',
      title: 'Legal Intern',
      organization: 'Legal Aid of the Bluegrass',
      startDate: new Date('2024-05-01T00:00:00.000Z'),
      endDate: new Date('2024-08-01T00:00:00.000Z'),
      description: 'Supported client intake, conducted legal research, and drafted internal memos for supervising attorneys.',
      skills: ['Client intake', 'Legal writing', 'Research'],
      isVerified: false,
    },
    create: {
      id: 'portfolio-ian-legal-intern',
      userId: mcclureStudent.id,
      type: 'EXPERIENCE',
      title: 'Legal Intern',
      organization: 'Legal Aid of the Bluegrass',
      startDate: new Date('2024-05-01T00:00:00.000Z'),
      endDate: new Date('2024-08-01T00:00:00.000Z'),
      description: 'Supported client intake, conducted legal research, and drafted internal memos for supervising attorneys.',
      skills: ['Client intake', 'Legal writing', 'Research'],
      isVerified: false,
    },
  })

  await prisma.portfolioItem.upsert({
    where: { id: 'portfolio-ian-evidence-simulator' },
    update: {
      userId: mcclureStudent.id,
      type: 'PROJECT',
      title: 'Evidence Rules Simulator',
      organization: 'The Sandbox',
      startDate: new Date('2024-10-01T00:00:00.000Z'),
      endDate: null,
      description: 'Built an AI study tool that helps law students practice Federal Rules of Evidence through scenario-based questions.',
      skills: ['Prompt design', 'Learning design', 'Evidence'],
      isVerified: true,
      metadata: { toolId: tool8.id, category: 'Law', source: 'seed' },
    },
    create: {
      id: 'portfolio-ian-evidence-simulator',
      userId: mcclureStudent.id,
      type: 'PROJECT',
      title: 'Evidence Rules Simulator',
      organization: 'The Sandbox',
      startDate: new Date('2024-10-01T00:00:00.000Z'),
      endDate: null,
      description: 'Built an AI study tool that helps law students practice Federal Rules of Evidence through scenario-based questions.',
      skills: ['Prompt design', 'Learning design', 'Evidence'],
      isVerified: true,
      metadata: { toolId: tool8.id, category: 'Law', source: 'seed' },
    },
  })

  await prisma.portfolioItem.upsert({
    where: { id: 'portfolio-heath-phd' },
    update: {
      userId: price.id,
      type: 'EDUCATION',
      title: 'Ph.D. in Electrical Engineering',
      organization: 'University of Kentucky',
      startDate: new Date('2005-08-01T00:00:00.000Z'),
      endDate: new Date('2010-05-01T00:00:00.000Z'),
      description: 'Doctoral work focused on electrical systems, signal processing, and engineering education.',
      skills: ['Electrical engineering', 'Research', 'Systems design'],
      isVerified: true,
    },
    create: {
      id: 'portfolio-heath-phd',
      userId: price.id,
      type: 'EDUCATION',
      title: 'Ph.D. in Electrical Engineering',
      organization: 'University of Kentucky',
      startDate: new Date('2005-08-01T00:00:00.000Z'),
      endDate: new Date('2010-05-01T00:00:00.000Z'),
      description: 'Doctoral work focused on electrical systems, signal processing, and engineering education.',
      skills: ['Electrical engineering', 'Research', 'Systems design'],
      isVerified: true,
    },
  })

  await prisma.portfolioItem.upsert({
    where: { id: 'portfolio-heath-assistant-professor' },
    update: {
      userId: price.id,
      type: 'EXPERIENCE',
      title: 'Assistant Professor',
      organization: 'College of Engineering, University of Kentucky',
      startDate: new Date('2015-08-01T00:00:00.000Z'),
      endDate: null,
      description: 'Teaches engineering fundamentals, mentors first-year students, and designs applied AI learning experiences for TEK 100.',
      skills: ['Teaching', 'Curriculum design', 'Mentoring'],
      isVerified: true,
    },
    create: {
      id: 'portfolio-heath-assistant-professor',
      userId: price.id,
      type: 'EXPERIENCE',
      title: 'Assistant Professor',
      organization: 'College of Engineering, University of Kentucky',
      startDate: new Date('2015-08-01T00:00:00.000Z'),
      endDate: null,
      description: 'Teaches engineering fundamentals, mentors first-year students, and designs applied AI learning experiences for TEK 100.',
      skills: ['Teaching', 'Curriculum design', 'Mentoring'],
      isVerified: true,
    },
  })

  const heathIanConversationId = 'conversation-heath-ian-evidence'
  const heathTianaConversationId = 'conversation-heath-tiana-socratic'
  const heathIanLastMessageAt = new Date('2026-03-10T23:15:00.000Z')
  const heathTianaLastMessageAt = new Date('2026-03-11T15:30:00.000Z')

  await prisma.conversation.upsert({
    where: { id: heathIanConversationId },
    update: {
      title: null,
      isGroup: false,
      lastMessageAt: heathIanLastMessageAt,
    },
    create: {
      id: heathIanConversationId,
      title: null,
      isGroup: false,
      lastMessageAt: heathIanLastMessageAt,
    },
  })

  await prisma.conversationParticipant.upsert({
    where: {
      userId_conversationId: {
        userId: price.id,
        conversationId: heathIanConversationId,
      },
    },
    update: {
      role: 'MEMBER',
      lastReadAt: heathIanLastMessageAt,
    },
    create: {
      userId: price.id,
      conversationId: heathIanConversationId,
      role: 'MEMBER',
      lastReadAt: heathIanLastMessageAt,
    },
  })

  await prisma.conversationParticipant.upsert({
    where: {
      userId_conversationId: {
        userId: mcclureStudent.id,
        conversationId: heathIanConversationId,
      },
    },
    update: {
      role: 'MEMBER',
      lastReadAt: heathIanLastMessageAt,
    },
    create: {
      userId: mcclureStudent.id,
      conversationId: heathIanConversationId,
      role: 'MEMBER',
      lastReadAt: heathIanLastMessageAt,
    },
  })

  await prisma.message.upsert({
    where: { id: 'message-heath-ian-1' },
    update: {
      content: "Ian, the LAW 756 Evidence Simulator now has a new module on Hearsay Exceptions. Try it before the exam next week - it's the most common area where 1Ls lose points.",
      senderId: price.id,
      conversationId: heathIanConversationId,
      createdAt: new Date('2026-03-10T22:45:00.000Z'),
    },
    create: {
      id: 'message-heath-ian-1',
      content: "Ian, the LAW 756 Evidence Simulator now has a new module on Hearsay Exceptions. Try it before the exam next week - it's the most common area where 1Ls lose points.",
      senderId: price.id,
      conversationId: heathIanConversationId,
      createdAt: new Date('2026-03-10T22:45:00.000Z'),
    },
  })

  await prisma.message.upsert({
    where: { id: 'message-heath-ian-2' },
    update: {
      content: "Thanks Prof. Price! I've been struggling with FRE 803. Will use it tonight.",
      senderId: mcclureStudent.id,
      conversationId: heathIanConversationId,
      createdAt: heathIanLastMessageAt,
    },
    create: {
      id: 'message-heath-ian-2',
      content: "Thanks Prof. Price! I've been struggling with FRE 803. Will use it tonight.",
      senderId: mcclureStudent.id,
      conversationId: heathIanConversationId,
      createdAt: heathIanLastMessageAt,
    },
  })

  await prisma.conversation.upsert({
    where: { id: heathTianaConversationId },
    update: {
      title: null,
      isGroup: false,
      lastMessageAt: heathTianaLastMessageAt,
    },
    create: {
      id: heathTianaConversationId,
      title: null,
      isGroup: false,
      lastMessageAt: heathTianaLastMessageAt,
    },
  })

  await prisma.conversationParticipant.upsert({
    where: {
      userId_conversationId: {
        userId: price.id,
        conversationId: heathTianaConversationId,
      },
    },
    update: {
      role: 'MEMBER',
      lastReadAt: heathTianaLastMessageAt,
    },
    create: {
      userId: price.id,
      conversationId: heathTianaConversationId,
      role: 'MEMBER',
      lastReadAt: heathTianaLastMessageAt,
    },
  })

  await prisma.conversationParticipant.upsert({
    where: {
      userId_conversationId: {
        userId: tianaThe.id,
        conversationId: heathTianaConversationId,
      },
    },
    update: {
      role: 'MEMBER',
      lastReadAt: heathTianaLastMessageAt,
    },
    create: {
      userId: tianaThe.id,
      conversationId: heathTianaConversationId,
      role: 'MEMBER',
      lastReadAt: heathTianaLastMessageAt,
    },
  })

  await prisma.message.upsert({
    where: { id: 'message-heath-tiana-1' },
    update: {
      content: "Tiana, I added a new Socratic Debate session focused on poststructuralist theory - it should connect well with your ENG 420 paper.",
      senderId: price.id,
      conversationId: heathTianaConversationId,
      createdAt: new Date('2026-03-11T15:00:00.000Z'),
    },
    create: {
      id: 'message-heath-tiana-1',
      content: "Tiana, I added a new Socratic Debate session focused on poststructuralist theory - it should connect well with your ENG 420 paper.",
      senderId: price.id,
      conversationId: heathTianaConversationId,
      createdAt: new Date('2026-03-11T15:00:00.000Z'),
    },
  })

  await prisma.message.upsert({
    where: { id: 'message-heath-tiana-2' },
    update: {
      content: "Perfect timing. I've been trying to articulate the difference between Derrida and Foucault's approach. Will give it a try.",
      senderId: tianaThe.id,
      conversationId: heathTianaConversationId,
      createdAt: heathTianaLastMessageAt,
    },
    create: {
      id: 'message-heath-tiana-2',
      content: "Perfect timing. I've been trying to articulate the difference between Derrida and Foucault's approach. Will give it a try.",
      senderId: tianaThe.id,
      conversationId: heathTianaConversationId,
      createdAt: heathTianaLastMessageAt,
    },
  })

  // ─── Book Recommender: seed profiles + liked books + pre-generated recommendations ─────────

  const bookUsers = [
    {
      user: mcclureStudent,
      profileId: 'book-profile-ian',
      books: [
        { id: 'book-ian-1', title: 'Just Mercy', author: 'Bryan Stevenson', likedReason: 'Moved me — real cases showing how broken the justice system can be', disliked: false },
        { id: 'book-ian-2', title: 'To Kill a Mockingbird', author: 'Harper Lee', likedReason: 'The gold standard of moral courage in a courtroom', disliked: false },
        { id: 'book-ian-3', title: 'The Lincoln Lawyer', author: 'Michael Connelly', likedReason: 'Fast and realistic — loved the procedural detail', disliked: false },
        { id: 'book-ian-4', title: "Gideon's Trumpet", author: 'Anthony Lewis', likedReason: 'Required reading — a single case that changed constitutional law', disliked: false },
        { id: 'book-ian-5', title: 'The Pelican Brief', author: 'John Grisham', likedReason: null, disliked: true },
      ],
      recs: [
        { id: 'rec-ian-1', title: 'Presumed Innocent', author: 'Scott Turow', year: '1987', reason: "A landmark legal thriller that reads like a genuine trial — Turow was a practicing attorney and it shows. If you loved the procedural authenticity in The Lincoln Lawyer, this is the next step up.", status: 'WANT' },
        { id: 'rec-ian-2', title: 'The Innocent Man', author: 'John Grisham', year: '2006', reason: "Grisham's only non-fiction work, and his most powerful. A wrongful death-row conviction in small-town Oklahoma — directly in the vein of Just Mercy but grittier and more personal.", status: 'WANT' },
        { id: 'rec-ian-3', title: 'Devil in the Grove', author: 'Gilbert King', year: '2012', reason: 'Pulitzer Prize-winning account of Thurgood Marshall defending Black men falsely accused in 1949 Florida. Essential civil rights legal history that connects directly to the Bryan Stevenson tradition.', status: 'WANT' },
        { id: 'rec-ian-4', title: 'A Civil Action', author: 'Jonathan Harr', year: '1995', reason: 'True story of a massive environmental lawsuit — captures the grinding reality of civil litigation, client relationships, and the human cost of a case consuming your life. A 1L must-read.', status: 'READ' },
        { id: 'rec-ian-5', title: 'The Exonerated', author: 'Jessica Blank & Erik Jensen', year: '2004', reason: 'Six verbatim accounts from death-row exonerees. Slim but devastating — pairs perfectly with Just Mercy and will reshape how you think about evidence and witness testimony.', status: 'WANT' },
      ],
    },
    {
      user: tianaThe,
      profileId: 'book-profile-tiana',
      books: [
        { id: 'book-tiana-1', title: 'Beloved', author: 'Toni Morrison', likedReason: 'Haunting and precise — every sentence earns its place', disliked: false },
        { id: 'book-tiana-2', title: 'The Bell Jar', author: 'Sylvia Plath', likedReason: 'Read it twice — the voice is unforgettable', disliked: false },
        { id: 'book-tiana-3', title: 'Normal People', author: 'Sally Rooney', likedReason: 'Love how she writes intimacy and class without sentimentalizing either', disliked: false },
        { id: 'book-tiana-4', title: "Giovanni's Room", author: 'James Baldwin', likedReason: 'The prose is devastating. Baldwin at his most controlled', disliked: false },
        { id: 'book-tiana-5', title: 'Twilight', author: 'Stephenie Meyer', likedReason: null, disliked: true },
      ],
      recs: [
        { id: 'rec-tiana-1', title: 'Pachinko', author: 'Min Jin Lee', year: '2017', reason: 'A multigenerational saga about Korean immigrants in Japan — the scope of Morrison with the emotional precision of Baldwin. Four generations of women navigating identity, sacrifice, and belonging.', status: 'WANT' },
        { id: 'rec-tiana-2', title: 'A Little Life', author: 'Hanya Yanagihara', year: '2015', reason: "You'll emerge wrecked in the best way. The friendship, the trauma, the beauty of chosen family — written with the same unflinching intimacy you love in Rooney but turned up to eleven.", status: 'WANT' },
        { id: 'rec-tiana-3', title: 'The Remains of the Day', author: 'Kazuo Ishiguro', year: '1989', reason: "A masterclass in unreliable narration and repression — everything the narrator can't say matters more than what he does. Directly in conversation with the emotional restraint in Giovanni's Room.", status: 'READ' },
        { id: 'rec-tiana-4', title: 'Bluets', author: 'Maggie Nelson', year: '2009', reason: 'Prose poem / philosophical meditation on grief, color, and desire. Short and completely singular — if you studied Plath for the confessional register, Nelson is doing something adjacent but wilder.', status: 'WANT' },
        { id: 'rec-tiana-5', title: 'Outline', author: 'Rachel Cusk', year: '2014', reason: "A novel that dissolves the narrator into everyone she talks to — Rooney's ambiguity about selfhood pushed further. First of a brilliant trilogy; impossible to put down once you're in.", status: 'WANT' },
      ],
    },
    {
      user: price,
      profileId: 'book-profile-heath',
      books: [
        { id: 'book-heath-1', title: 'The Innovators', author: 'Walter Isaacson', likedReason: 'The best history of how computing actually got built — collaborative and full of overlooked contributors', disliked: false },
        { id: 'book-heath-2', title: 'Zero to One', author: 'Peter Thiel', likedReason: 'Contrarian and sharp — changed how I think about what counts as progress', disliked: false },
        { id: 'book-heath-3', title: 'The Martian', author: 'Andy Weir', likedReason: 'Love that Weir just trusts readers to follow the engineering', disliked: false },
        { id: 'book-heath-4', title: "Surely You're Joking, Mr. Feynman!", author: 'Richard P. Feynman', likedReason: 'Essential reading for anyone who loves science and hates pretension', disliked: false },
      ],
      recs: [
        { id: 'rec-heath-1', title: 'The Code Book', author: 'Simon Singh', year: '1999', reason: 'Riveting history of cryptography from Caesar ciphers to public-key encryption — Singh has the same gift as Isaacson for making technical history feel like a thriller. Every engineer should read it.', status: 'WANT' },
        { id: 'rec-heath-2', title: "Structures: Or Why Things Don't Fall Down", author: 'J.E. Gordon', year: '1978', reason: 'The Feynman Lectures equivalent for structural mechanics — witty, clear, and full of genuine insight. Gordon explains why bridges hold and why they fail with the joy of someone who actually loves materials.', status: 'WANT' },
        { id: 'rec-heath-3', title: 'The Dream Machine', author: 'M. Mitchell Waldrop', year: '2001', reason: "The definitive biography of J.C.R. Licklider, the visionary who funded the internet before anyone knew what it was. A perfect companion to The Innovators — deeper on the funding and culture side.", status: 'WANT' },
        { id: 'rec-heath-4', title: 'Skunk Works', author: 'Ben Rich', year: '1994', reason: "Lockheed's secret advanced development team — how the U-2, SR-71, and stealth fighter were built under impossible constraints. A case study in engineering leadership and creative problem-solving.", status: 'READ' },
        { id: 'rec-heath-5', title: 'Hackers: Heroes of the Computer Revolution', author: 'Steven Levy', year: '1984', reason: 'The original hacker ethic, before the word was co-opted. Levy was in the room — this is the lived history of MIT, Stanford, and Homebrew Computer Club that Zero to One glosses over.', status: 'WANT' },
      ],
    },
    {
      user: admin,
      profileId: 'book-profile-alex',
      books: [
        { id: 'book-alex-1', title: 'The Alignment Problem', author: 'Brian Christian', likedReason: 'Best accessible treatment of what AI safety actually means in practice', disliked: false },
        { id: 'book-alex-2', title: 'Human Compatible', author: 'Stuart Russell', likedReason: 'Russell makes the technical case without hype — essential for anyone building with AI', disliked: false },
        { id: 'book-alex-3', title: 'Weapons of Math Destruction', author: "Cathy O'Neil", likedReason: 'Sobering — the chapter on predictive policing alone should be required reading in every CS program', disliked: false },
        { id: 'book-alex-4', title: "The Innovator's Dilemma", author: 'Clayton Christensen', likedReason: 'Changed how I think about institutional resistance to new technology', disliked: false },
      ],
      recs: [
        { id: 'rec-alex-1', title: 'The Coming Wave', author: 'Mustafa Suleyman', year: '2023', reason: "The most balanced and honest take on AI risk from someone who has actually built frontier systems. Suleyman co-founded DeepMind — this isn't punditry, it's a warning from the inside. Required reading for anyone running an AI program.", status: 'WANT' },
        { id: 'rec-alex-2', title: 'Atlas of AI', author: 'Kate Crawford', year: '2021', reason: 'Follows the physical supply chains of AI — mines, data centers, warehouses — to show what the technology actually costs. The most grounding counterweight to AI optimism you can find, and directly relevant to questions of AI in public education.', status: 'WANT' },
        { id: 'rec-alex-3', title: 'Power and Progress', author: 'Daron Acemoglu & Simon Johnson', year: '2023', reason: 'Two MIT economists argue that technology only benefits society when power is distributed — a direct challenge to techno-optimism. Pairs perfectly with The Alignment Problem for anyone thinking about AI governance.', status: 'READ' },
        { id: 'rec-alex-4', title: 'Superintelligence', author: 'Nick Bostrom', year: '2014', reason: 'The foundational text for AI existential risk — dense but essential for understanding the intellectual tradition that produced RLHF and Constitutional AI. Read alongside Russell for the full picture.', status: 'WANT' },
        { id: 'rec-alex-5', title: 'Co-Intelligence', author: 'Ethan Mollick', year: '2024', reason: "Wharton professor's practical guide to working with AI — specifically focused on education and knowledge work. The most actionable book for thinking about how AI tools change teaching and learning.", status: 'WANT' },
      ],
    },
    {
      user: dipaola,
      profileId: 'book-profile-dipaola',
      books: [
        { id: 'book-dipaola-1', title: 'The Art of Possibility', author: 'Rosamund Stone Zander & Benjamin Zander', likedReason: 'Reframing leadership as creating conditions for possibility — use it in faculty retreats', disliked: false },
        { id: 'book-dipaola-2', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', likedReason: 'Essential framework for understanding how decisions actually get made in institutions', disliked: false },
        { id: 'book-dipaola-3', title: 'Good to Great', author: 'Jim Collins', likedReason: 'The Level 5 leadership concept reshaped how I approach my own role', disliked: false },
      ],
      recs: [
        { id: 'rec-dipaola-1', title: 'Range', author: 'David Epstein', year: '2019', reason: 'Argues that the most effective leaders and innovators are generalists, not specialists — a direct challenge to the hyperspecialization model in academic research. Deeply relevant for a provost navigating cross-disciplinary strategy.', status: 'WANT' },
        { id: 'rec-dipaola-2', title: 'The Fearless Organization', author: 'Amy Edmondson', year: '2018', reason: "Edmondson's research on psychological safety is the most robust framework for understanding why smart people in institutions fail to speak up. Directly applicable to faculty culture, shared governance, and innovation programs.", status: 'WANT' },
        { id: 'rec-dipaola-3', title: 'University of Disaster', author: 'Paul Virilio', year: '2010', reason: "A provocation rather than a prescription — Virilio argues that every new technology invents a new accident. Worth reading for anyone stewarding a university's response to AI disruption.", status: 'WANT' },
        { id: 'rec-dipaola-4', title: 'Excellent Sheep', author: 'William Deresiewicz', year: '2014', reason: "A sharp critique of elite education's failure to produce genuine thinkers — controversial in academia but useful provocation for rethinking what a university education should accomplish.", status: 'READ' },
      ],
    },
    {
      user: monday,
      profileId: 'book-profile-monday',
      books: [
        { id: 'book-monday-1', title: 'Principles', author: 'Ray Dalio', likedReason: 'The systematic approach to decision-making under uncertainty maps well to budget cycles', disliked: false },
        { id: 'book-monday-2', title: 'Good to Great', author: 'Jim Collins', likedReason: 'The financial discipline chapter alone is worth the book', disliked: false },
        { id: 'book-monday-3', title: 'The Lean Startup', author: 'Eric Ries', likedReason: 'Brought a copy to every new initiative meeting for three years', disliked: false },
      ],
      recs: [
        { id: 'rec-monday-1', title: 'Measure What Matters', author: 'John Doerr', year: '2018', reason: 'The definitive guide to OKRs — Doerr was in the room when Intel and Google built their goal systems. Directly applicable to aligning financial administration goals with institutional mission, especially in a period of AI investment.', status: 'WANT' },
        { id: 'rec-monday-2', title: 'The Intelligent Investor', author: 'Benjamin Graham', year: '1949', reason: 'The foundational text on value investing and margin of safety — the mental models here apply far beyond stock markets to any resource allocation decision under uncertainty.', status: 'WANT' },
        { id: 'rec-monday-3', title: 'Thinking in Systems', author: 'Donella Meadows', year: '2008', reason: "Meadows builds a vocabulary for understanding why complex institutions behave the way they do — feedback loops, delays, and leverage points. The most useful mental model for anyone managing a large university's finances.", status: 'READ' },
        { id: 'rec-monday-4', title: 'The Checklist Manifesto', author: 'Atul Gawande', year: '2009', reason: "A surgeon's case for why simple checklists outperform expert intuition in high-stakes environments — directly applicable to compliance, audit, and financial controls in higher ed administration.", status: 'WANT' },
      ],
    },
  ]

  for (const { user, profileId, books, recs } of bookUsers) {
    const profile = await prisma.bookProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { id: profileId, userId: user.id },
    })

    for (const book of books) {
      await prisma.bookEntry.upsert({
        where: { id: book.id },
        update: {},
        create: {
          id: book.id,
          profileId: profile.id,
          title: book.title,
          author: book.author,
          likedReason: book.likedReason,
          disliked: book.disliked,
        },
      })
    }

    for (const rec of recs) {
      await prisma.bookRecommendation.upsert({
        where: { id: rec.id },
        update: {},
        create: {
          id: rec.id,
          profileId: profile.id,
          title: rec.title,
          author: rec.author,
          year: rec.year,
          reason: rec.reason,
          status: rec.status,
        },
      })
    }
  }

  console.log('Seeded book recommender profiles for 6 demo users')

  console.log('Seed completed successfully!')
  console.log(`Created users: ${admin.name}, ${educator1.name}, ${educator2.name}, ${educator3.name}, ${educator4.name}, ${student1.name}, ${educator5.name}, ${educator6.name}, ${educator7.name}, ${educator8.name}, ${sandboxAdmin.name}`)
  console.log(`Created ${12 + catalogToolRecords.length} tools`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
