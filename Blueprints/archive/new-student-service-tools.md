# Blueprint: New Student Service Tools
## Financial Aid & Course Catalog Assistants

---

## 1. Context

This blueprint details the creation of two new university-wide service chatbots to be added to The Sandbox's tool catalog. These tools are designed to answer common student questions and reduce the burden on administrative staff.

1.  **Financial Aid Advisor ("Finley"):** An AI assistant trained on UK financial aid information to answer questions about FAFSA, scholarships, and deadlines.
2.  **Course Catalog Navigator ("Catalyst"):** An AI academic advisor that helps students explore majors, discover courses, and understand prerequisites.

Both tools will be created as `CHATBOT` types with custom personas and system prompts. They will be seeded as `APPROVED` and `featured` so they are immediately visible and prominent in the marketplace.

---

## 2. Tool Definitions

To implement these tools, add the following `prisma.tool.upsert` blocks to the `prisma/seed.ts` file. It's recommended to place them within the "General Education Tools" section, using `admin.id` as the `creatorId`.

### 2a. Financial Aid Advisor — Finley

```ts
await prisma.tool.upsert({
  where: { id: 'tool-financial-aid-advisor' },
  update: {},
  create: {
    id: 'tool-financial-aid-advisor',
    name: 'Financial Aid Advisor',
    shortDescription: 'Get instant answers to your UK financial aid questions — FAFSA, scholarships, deadlines, and more.',
    fullDescription: 'Finley is an AI assistant trained on University of Kentucky financial aid information. Ask questions about the FAFSA process, KEES scholarships, work-study opportunities, and important deadlines instead of waiting on hold or searching the website. Finley provides quick information and directs you to official resources for applications and final decisions.',
    category: 'University',
    toolType: 'CHATBOT',
    difficultyLevel: 'Introductory',
    estimatedMinutes: 10,
    published: true,
    approvalStatus: 'APPROVED',
    featured: true,
    personaName: 'Finley',
    personaAvatar: '💰',
    welcomeMessage: "Hi, I'm Finley, your AI financial aid advisor. I can help answer questions about scholarships, loans, FAFSA, and more. What's on your mind?",
    systemPrompt: `You are Finley, a friendly and knowledgeable financial aid advisor for the University of Kentucky. Your goal is to provide students with clear, accurate information about financial aid options, processes, and deadlines. You are trained on UK's financial aid policies, scholarship opportunities (including KEES), federal aid like FAFSA, and work-study programs. You must NOT ask for or store any personally identifiable information (PII) like Social Security Numbers, student IDs, or family income details. When a student asks a question, provide a direct answer based on public information and then point them to the official UK Financial Aid Office website or contact information for any action that requires personal data. Your tone is encouraging, patient, and professional.`,
    tags: ['financial aid', 'scholarships', 'fafsa', 'university', 'student services'],
    learningObjectives: ['Understand the FAFSA application process', 'Discover relevant scholarship opportunities', 'Find key financial aid deadlines'],
    intendedAudience: 'All current and prospective UK students and their families',
    creatorId: admin.id,
  }
})
```

### 2b. Course Catalog Navigator — Catalyst

```ts
await prisma.tool.upsert({
  where: { id: 'tool-course-catalog-navigator' },
  update: {},
  create: {
    id: 'tool-course-catalog-navigator',
    name: 'Course Catalog Navigator',
    shortDescription: 'Explore majors, discover interesting courses, and understand prerequisites with an AI academic advisor.',
    fullDescription: 'Catalyst helps you navigate the vast University of Kentucky course catalog. Tell it your interests, and it can suggest relevant courses, explain how they fit into different majors or minors, and clarify prerequisite chains. It\'s the perfect tool for exploring "what if" scenarios with your academic plan.',
    category: 'University',
    toolType: 'CHATBOT',
    difficultyLevel: 'Introductory',
    estimatedMinutes: 15,
    published: true,
    approvalStatus: 'APPROVED',
    featured: true,
    personaName: 'Catalyst',
    personaAvatar: '🗺️',
    welcomeMessage: "I'm Catalyst, your guide to the UK course catalog. Are you exploring a new major, looking for an interesting elective, or trying to plan next semester? Tell me what you're trying to do!",
    systemPrompt: `You are Catalyst, an AI academic advisor for the University of Kentucky. Your expertise is the UK course catalog. Your purpose is to help students explore majors, discover courses, and understand academic requirements. You can: suggest courses based on a student's interests, explain the prerequisites for any given course, show how a course fits into a major's curriculum, and help students find interesting UK Core / general education classes. You should always use the official course codes (e.g., 'CIS 101', 'WRD 110'). When a student is ready to make a final decision or register, you MUST direct them to their assigned human academic advisor and the official university course catalog for verification. Your tone is helpful, curious, and knowledgeable.`,
    tags: ['advising', 'course catalog', 'majors', 'minors', 'registration', 'university'],
    learningObjectives: ['Discover new courses based on personal interests', 'Understand prerequisite requirements for a course', 'Explore potential major and minor combinations'],
    intendedAudience: 'All UK undergraduate students, especially those exploring majors or planning their semester.',
    creatorId: admin.id,
  }
})
```

---

## 3. Data Dependency: Datasets

You mentioned these tools should be "trained on all of our information." The most effective way to achieve this within The Sandbox architecture is to create **datasets** and link them to the tools.

The `publish` page already supports linking to a hardcoded list of datasets from `app/lib/datasets.ts`. To make these new tools truly powerful, we should create and link the following datasets:

1.  **`uk-financial-aid-docs`**: A dataset containing public information from the UK Financial Aid website, scholarship pages, and FAFSA documentation.
2.  **`uk-course-catalog-2026`**: A dataset containing the full undergraduate course catalog, including course descriptions, prerequisites, and major/minor requirements.

Once these datasets are defined in `app/lib/datasets.ts`, you can link them to the tools by adding a `referenceDocUrls` property to the `create` block in the seed file, like so:

```ts
// Example for Finley
referenceDocUrls: [
  encodeDatasetReference('uk-financial-aid-docs')
],

// Example for Catalyst
referenceDocUrls: [
  encodeDatasetReference('uk-course-catalog-2026')
],
```

The `systemPrompt` for each tool can then be updated to explicitly instruct the AI to use the provided data source for its answers.

---

## 4. Implementation Steps

1.  **Add Tool Definitions:** Copy the code blocks from section 2 into `prisma/seed.ts`.
2.  **(Optional but Recommended) Create Datasets:** Define the new datasets in `app/lib/datasets.ts` and add the `referenceDocUrls` to the tool definitions in the seed file.
3.  **Reseed the Database:** Run the seed command from your terminal in the `the-sandbox` directory:
    ```bash
    npm run db:seed
    ```
4.  **Verify:** Launch the application and navigate to the `/tools` marketplace. You should see "Financial Aid Advisor" and "Course Catalog Navigator" as featured tools. Launch them to test their custom personas and welcome messages.

---