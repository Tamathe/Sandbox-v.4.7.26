const fs = require('fs')
let seed = fs.readFileSync('prisma/seed.ts', 'utf8')

// 1. Update educator2 user record with Dr. Ian's real college name
seed = seed.replace(
  `      name: 'Dr. Ian McClure',
      email: 'ian.mcclure@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'College of Law',
      college: 'College of Law',`,
  `      name: 'Dr. Ian McClure',
      email: 'ian.mcclure@uky.edu',
      role: UserRole.EDUCATOR,
      department: 'J. David Rosenberg College of Law',
      college: 'J. David Rosenberg College of Law',`
)

// 2. Replace tool2 (Age of Exploration) with IP Licensing Deal Simulator
const tool2OldId = `where: { id: 'tool-age-of-exploration' },`
const tool2NewStart = seed.indexOf(`  const tool2 = await prisma.tool.upsert({\n    where: { id: 'tool-age-of-exploration' }`)
const tool2NewEnd = seed.indexOf(`  const tool3 = await prisma.tool.upsert`)

const newTool2 = `  const tool2 = await prisma.tool.upsert({
    where: { id: 'tool-ip-licensing-negotiator' },
    update: {},
    create: {
      id: 'tool-ip-licensing-negotiator',
      name: 'IP Licensing Deal Simulator',
      shortDescription: 'Negotiate a real-world IP licensing deal with an AI counterpart. Built for LAW 908.',
      fullDescription: \`## IP Licensing Deal Simulator

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
The AI plays in-house counsel for the acquiring company. Push back, make offers, find a deal — or walk away if the terms don't work.\`,
      category: 'Law',
      difficultyLevel: 'Advanced',
      estimatedMinutes: 40,
      toolType: ToolType.CHATBOT,
      systemPrompt: \`You are playing Jennifer Walsh, Senior VP and General Counsel at Apex Technologies, a Fortune 500 software company. You are negotiating an IP licensing deal for a machine learning algorithm developed by the student's startup. You want broad rights, low royalties, and strong IP ownership protections. Be a tough but professional negotiator who knows IP law well. Respond realistically to offers, make counter-proposals, and pressure-test the student's deal terms. When the student makes a strong legal argument, acknowledge it. When they miss something important (like audit rights, sublicensing carve-outs, or term length), hint that it's an issue without giving it away. Stay in character throughout.\`,
      welcomeMessage: \`Good afternoon. I'm Jennifer Walsh, General Counsel at Apex. We've reviewed your algorithm and we're interested — but we need to talk deal structure. We're proposing a broad, exclusive license in the enterprise software space. What terms are you bringing to the table?\`,
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

  `

seed = seed.substring(0, tool2NewStart) + newTool2 + seed.substring(tool2NewEnd)

// 3. Replace tool11 (HIST 300) with LAW 908 IP Strategy Coach
const tool11Start = seed.indexOf(`  const tool11 = await prisma.tool.upsert({\n    where: { id: 'tool-hist300-primary-source' }`)
const tool11End = seed.indexOf(`  const tool12 = await prisma.tool.upsert`)

const newTool11 = `  const tool11 = await prisma.tool.upsert({
    where: { id: 'tool-ip-strategy-coach' },
    update: {},
    create: {
      id: 'tool-ip-strategy-coach',
      name: 'LAW 908: IP Strategy Coach',
      shortDescription: 'Ask anything about IP valuation, licensing strategy, and technology commercialization.',
      fullDescription: \`## LAW 908 IP Strategy Coach

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
Dr. McClure has been named to IAM Magazine's "World's Leading IP Strategists" every year since 2012. This tool draws on that body of work and real deal structures.\`,
      category: 'Law',
      difficultyLevel: 'Intermediate',
      estimatedMinutes: 20,
      toolType: ToolType.CHATBOT,
      systemPrompt: \`You are an IP strategy tutor for LAW 908 at the University of Kentucky, taught by Dr. Ian McClure (J.D., LL.M. in IP Law — DePaul; B.A. Economics — Vanderbilt cum laude; co-founder of IPXI, the world's first financial exchange for IP rights; former VP at Black Stone IP which was acquired by Houlihan Lokey; current VP for Innovation at UK HealthCare; appointed to the National Advisory Council on Innovation and Entrepreneurship by the U.S. EDA; named to IAM's World's Leading IP Strategists every year since 2012). Help law students understand IP licensing, valuation, technology commercialization, and IP portfolio strategy. Draw on real-world deal structures and examples. When explaining concepts, connect doctrine to business strategy — students in this course learn both law and business. Cover topics including: royalty rate benchmarking, exclusive vs. non-exclusive licensing, field-of-use restrictions, IP in M&A, technology transfer, patent vs. trade secret strategy, and AI IP issues. Be direct and practical.\`,
      welcomeMessage: \`Welcome to LAW 908. I can help you work through IP strategy concepts, licensing structures, valuation approaches, or anything from the course. What are you working on?\`,
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
      creatorId: educator2.id,
    },
  })

  `

seed = seed.substring(0, tool11Start) + newTool11 + seed.substring(tool11End)

// 4. Fix any remaining references to old tool IDs in upvotes/favorites/sessions
seed = seed.replace(/toolId: tool2\.id/g, 'toolId: tool2.id')
seed = seed.replace(/toolId: tool11\.id/g, 'toolId: tool11.id')

fs.writeFileSync('prisma/seed.ts', seed)
console.log('Done — seed.ts updated with Dr. Ian McClure profile and IP Law tools')
