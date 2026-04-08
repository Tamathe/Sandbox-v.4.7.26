/**
 * Seed script: Sandy AI Academic Advisor reference documents.
 *
 * Creates 4 ServiceDocument records for serviceArea: 'academic-advisor'
 * and embeds them into ServiceChunk via pgvector.
 *
 * Run with:
 *   npm run seed:advisor
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import OpenAI from 'openai'
import { chunkText } from '../app/lib/document-chunker'

// ── Prisma client ─────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// ── pg pool for raw vector writes ─────────────────────────────────────────────

const pgPool = new Pool({ connectionString, max: 5 })

// ── Embedding ─────────────────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = []
  const BATCH = 100
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: batch })
    results.push(...res.data.map((d) => d.embedding))
  }
  return results
}

// ── ServiceChunk upsert ───────────────────────────────────────────────────────

async function upsertServiceChunks(
  documentId: string,
  serviceArea: string,
  chunks: { chunkIndex: number; content: string; tokenCount: number; embedding: number[] }[],
): Promise<void> {
  if (chunks.length === 0) return
  const client = await pgPool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM "ServiceChunk" WHERE "documentId" = $1', [documentId])
    for (const chunk of chunks) {
      const vectorLiteral = `[${chunk.embedding.map((n) => n.toFixed(8)).join(',')}]`
      await client.query(
        `INSERT INTO "ServiceChunk" (id, "documentId", "serviceArea", "chunkIndex", content, "tokenCount", embedding, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, NOW())`,
        [documentId, serviceArea, chunk.chunkIndex, chunk.content, chunk.tokenCount, vectorLiteral],
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ── Document definitions ──────────────────────────────────────────────────────

const SERVICE_AREA = 'academic-advisor'

interface AdvisorDoc {
  title: string
  sourceUrl: string
  content: string
}

const ADVISOR_DOCS: AdvisorDoc[] = [
  {
    title: 'A&S Advising Handbook 2024–25',
    sourceUrl: 'https://www.as.uky.edu/advising',
    content: `College of Arts & Sciences (A&S) — Advising Handbook 2024–25

UK CORE REQUIREMENTS FOR A&S STUDENTS

The UK Core is the university-wide general education curriculum. All A&S undergraduates must complete the UK Core regardless of major. Requirements are tied to the catalog year of first enrollment.

UK Core Areas and Credit Hour Requirements:
- Written Communication (WC): 3 credit hours (typically ENG 104 or equivalent). Must earn a C or better.
- Oral Communication (OC): 3 credit hours (typically CIS 110 or equivalent).
- Quantitative Foundations (QF): 3 credit hours. Courses include MA 109, MA 113, STA 210, and others.
- Natural Sciences (NS): 6 credit hours from two different disciplines. At least one course must have a laboratory component.
- Social Inquiry (SI): 3 credit hours from an approved social science course.
- Humanities (H): 3 credit hours from an approved humanities course.
- Arts & Creativity (AC): 3 credit hours from an approved arts course.
- Community, Culture & Citizenship (CCC): 3 credit hours. Approved courses focus on civic engagement, diversity, and global perspectives.
- US Citizenship (USC): 3 credit hours. Courses covering American history, government, or civic life.
- Cross-Cultural (CC): 3 credit hours. Courses providing substantive engagement with cultures outside the US.

Total UK Core credit hours: approximately 36–39 hours, though many major courses may double-count toward UK Core.

A&S GRADUATION REQUIREMENTS

Minimum credit hours: 120 total credit hours to graduate. No more than 60 credit hours may come from community college (KCTCS) coursework.

Minimum GPA: 2.0 cumulative GPA required for graduation. Some majors require a higher GPA within the major.

In-Residence Requirement: Students must complete at least 30 of their final 36 credit hours at UK (not transferred from another institution). Summer coursework at UK counts toward the in-residence requirement.

Upper-Division Hours: At least 39 credit hours must be at the 300-level or above.

Capstone: Most A&S majors require a senior capstone experience (research project, thesis, or senior seminar). Check your specific major requirements.

A&S FOREIGN LANGUAGE REQUIREMENT

All A&S students must meet the foreign language requirement:
- Complete two semesters (typically 6 credit hours) of the SAME foreign language at the college level, OR
- Demonstrate proficiency by passing a placement exam at the 202 level or above, OR
- Native speakers may petition for a waiver through their college advisor.

Commonly offered languages at UK: Spanish, French, German, Japanese, Chinese, Arabic, Russian, Italian, Latin, Greek. Other languages may be available through the Defense Language Institute or partner institutions.

DECLARING OR CHANGING A MAJOR IN A&S

To declare a major in A&S for the first time: complete the major declaration form through myUK or visit the A&S Advising Center (Patterson Office Tower, POT 9). Your faculty advisor must sign off.

To change your major within A&S: visit the A&S Advising Center, complete a Change of Major form, and obtain advisor signature. Allow 5–7 business days for processing. Some majors have GPA prerequisites (e.g., Computer Science requires 2.5 cumulative GPA to declare).

To transfer INTO A&S from another UK college: contact the A&S Advising Center and your new department. Requirements vary; some majors require a minimum GPA or completion of introductory coursework.

ACADEMIC PROBATION AND SUSPENSION

Academic Probation: Any student whose cumulative GPA falls below 2.0 is placed on academic probation. The student must bring their GPA above 2.0 within the probationary semester to avoid suspension.

Academic Suspension: A student on academic probation who fails to raise their cumulative GPA to 2.0 or above in the probationary term is placed on academic suspension. First suspension: one semester away from UK. Second suspension: one full academic year away. Third suspension: permanent (readmission requires appeal to Academic Ombud and college dean).

Academic Recovery: Students returning from suspension should contact the A&S Advising Center immediately to develop an Academic Recovery Plan. The plan includes specific GPA targets, maximum course load, and required check-ins.

DEAN'S LIST AND HONORS

Dean's List: Awarded each semester to A&S students who complete 12+ credit hours with a semester GPA of 3.6 or above. No I (incomplete) or E (failing) grades in that semester.

Honor Roll: Students who complete 12+ credit hours with a semester GPA between 3.4 and 3.599.

Graduation with Honors: Based on cumulative GPA at time of graduation. Cum Laude: 3.5–3.699; Magna Cum Laude: 3.7–3.899; Summa Cum Laude: 3.9–4.0. Transfer credit is included in the cumulative GPA calculation.`,
  },
  {
    title: 'Psychology B.S. Degree Requirements 2024–25',
    sourceUrl: 'https://psychology.as.uky.edu/undergraduate-programs',
    content: `Department of Psychology — B.S. Degree Requirements 2024–25
College of Arts & Sciences, University of Kentucky

OVERVIEW

The Bachelor of Science in Psychology requires a minimum of 120 total credit hours, with at least 36 credit hours in Psychology coursework. The major emphasizes scientific methodology, research design, and statistical reasoning.

REQUIRED CORE COURSES

All Psychology B.S. students must complete the following core courses, in sequence:

1. PSY 100 — Introduction to Psychology (3 credits)
   Prerequisite: None. Survey of major psychological theories and findings. Required for all subsequent PSY courses.

2. PSY 215 — Research Methods in Psychology I (3 credits)
   Prerequisite: PSY 100. Introduces experimental design, hypothesis testing, APA writing style, and IRB procedures.
   Grade requirement: Must earn a C or better. Students who earn below a C must retake before proceeding to PSY 216.

3. PSY 216 — Research Methods in Psychology II (3 credits)
   Prerequisite: PSY 215 with a grade of C or better. Advanced research design, between-subjects and within-subjects designs, mixed methods.
   Grade requirement: Must earn a C or better.

4. PSY 312 — Statistical Methods in Psychology (3 credits)
   Prerequisite: PSY 215; MA 109 or MA 113 recommended (not required). Covers descriptive statistics, t-tests, ANOVA, correlation, regression, using SPSS or R.
   Grade requirement: Must earn a C or better.

UPPER-DIVISION BREADTH REQUIREMENTS

Students must complete at least 12 credit hours from upper-division (300+) Psychology courses, distributed across four breadth areas. At least one course from each area is required:

1. Biological Psychology
   Courses include: PSY 340 (Biopsychology), PSY 440 (Behavioral Neuroscience), PSY 345 (Health Psychology), PSY 448 (Psychopharmacology)

2. Clinical and Abnormal Psychology
   Courses include: PSY 330 (Abnormal Psychology), PSY 430 (Clinical Psychology), PSY 435 (Community Psychology), PSY 437 (Child Psychopathology)

3. Cognitive Psychology and Perception
   Courses include: PSY 350 (Cognitive Psychology), PSY 360 (Sensation & Perception), PSY 450 (Human Factors), PSY 455 (Language & Cognition)

4. Social and Developmental Psychology
   Courses include: PSY 370 (Social Psychology), PSY 380 (Developmental Psychology), PSY 470 (Advanced Social Psychology), PSY 482 (Adolescent Development)

ELECTIVE HOURS WITHIN THE MAJOR

In addition to the core and breadth requirements, students must complete additional PSY elective hours to meet the 36-credit-hour minimum within the department. Any 100–400 level PSY course not already used for core or breadth may be used here.

TOTAL HOURS IN DEPARTMENT

Minimum 36 credit hours in PSY prefix courses. No more than 6 credit hours of PSY 395 (Special Topics) or PSY 493 (Independent Study) may count toward the 36-hour requirement.

CAPSTONE OPTIONS

Students must complete one of the following capstone experiences:
- PSY 499 — Research in Psychology (3 credits): Faculty-mentored empirical research project, culminating in a written research report in APA format. Requires advisor approval and a GPA of 3.0 or above in the major.
- PSY 490 — Psychology Internship (3 credits): Applied internship placement in a psychology-adjacent setting (clinical, educational, organizational). Requires department approval and a field supervisor.

GRADE REQUIREMENTS WITHIN THE MAJOR

Students must earn a C or better in PSY 215, PSY 216, and PSY 312. Courses failed with a D or F may be retaken once; if failed again, the student must petition the department to continue in the major.

ADVISING NOTE

The research methods sequence (PSY 215 → PSY 216 → PSY 312) is the critical path for the Psychology B.S. Students who delay this sequence often find it difficult to complete all upper-division requirements within four years. Advisors recommend beginning PSY 215 no later than the second semester of sophomore year.

Graduate school preparation: Students intending to apply to PhD programs in Psychology should aim for research experience (PSY 499 or a faculty lab), a GPA of 3.5+ overall and in the major, and strong letters from research mentors. The GRE is no longer required by most programs but may still be recommended for some.`,
  },
  {
    title: 'UK Academic Policies — Withdrawals, Incomplete Grades & Academic Renewal',
    sourceUrl: 'https://www.uky.edu/registrar/content/academic-policies',
    content: `University of Kentucky — Academic Policies
Withdrawals, Incomplete Grades, and Academic Renewal
Office of the University Registrar, 2024–25

COURSE DROP AND WITHDRAWAL OVERVIEW

Free Drop/Add Period:
- Full semester (16 weeks): first two weeks of the semester. No academic record of dropped courses.
- 8-week term: first week of the term. No academic record of dropped courses.
- Summer sessions: typically first 3 business days.

After the free drop/add period, students who leave a course receive one of three grades: W, WP, or WF.

W (Withdrew): Assigned when a student withdraws from a course during the standard withdrawal period (approximately weeks 3–10 of a full semester). No GPA impact. Appears on transcript.

WP (Withdrew Passing): Assigned when a student withdraws from a course after the standard withdrawal deadline but before the late withdrawal deadline, and was passing at the time of withdrawal. No GPA impact. Appears on transcript.

WF (Withdrew Failing): Assigned when a student withdraws from a course after the standard withdrawal deadline and was failing at the time of withdrawal, OR when a student is administratively withdrawn while failing. Counts as an F for GPA calculation. Appears on transcript.

Note: The late withdrawal deadline (after which WP/WF can no longer be assigned without dean's approval) is typically the end of Week 12 for a full semester. Exact dates are published each semester in the Academic Calendar.

RETROACTIVE (HARDSHIP) WITHDRAWAL

Eligibility: A retroactive withdrawal allows a student to petition to have a prior semester's grades changed to W after the semester has ended. The policy is intended for documented emergencies or extenuating circumstances that occurred during the semester.

Qualifying circumstances include: serious illness (student or immediate family), documented mental health crisis, death of an immediate family member, natural disaster, military deployment, or other unforeseeable events. Financial hardship alone typically does not qualify.

Documentation required: Medical documentation (physician or mental health provider letterhead), death certificate or obituary, official military orders, or other primary-source documentation specific to the circumstances.

Deadline to petition: Within 2 years of the end of the semester in which the courses were taken. Petitions submitted after 2 years will not be considered.

Process: Submit petition and documentation to the Dean of Students Office. Petitions are reviewed by a committee; decisions are typically issued within 30 business days.

INCOMPLETE GRADES

I (Incomplete) Grade Policy:
- An I grade may be assigned only when a student has completed the majority of a course's requirements (typically 70% or more of graded work) but is unable to complete the remainder due to a documented, unforeseeable circumstance near the end of the term.
- The I grade requires a written agreement between the student and instructor specifying: remaining work to be completed, deadline for completion, and the grade the instructor will assign if work is not completed.
- Standard deadline: I grades automatically convert to the "default grade" (typically E, which counts as a failing grade in the GPA) after one calendar year from the end of the semester in which the I was assigned, unless extended by the instructor and department chair.
- I grades may affect financial aid, scholarships (some require no I grades), and Dean's List eligibility.

ACADEMIC RENEWAL POLICY

Purpose: Academic Renewal allows eligible returning students to petition to have prior failing grades (E/F) excluded from their cumulative GPA calculation. It is designed for students who left UK in poor academic standing, improved themselves, and returned to complete a degree.

Eligibility requirements:
1. The student must have been away from UK (not enrolled) for at least 5 consecutive years.
2. The student must have re-enrolled at UK and successfully completed at least 12 credit hours with a GPA of 2.5 or above after returning.
3. The petition must be submitted before completing 30 hours after re-enrollment.

What Academic Renewal does: The failing grades (E/F/WF) from the prior enrollment period are excluded from the cumulative GPA calculation. They remain on the transcript as a historical record but are marked "Academic Renewal Exclusion" and not factored into the GPA.

Important limitations:
- Academic Renewal is a one-time, irrevocable petition. It cannot be reversed.
- Coursework excluded under Academic Renewal cannot be used to satisfy degree requirements for the current program.
- Courses with passing grades (even from the same prior period) are NOT excluded — only courses where the student earned a failing or withdrawal-failing grade.
- Academic Renewal does not apply to graduate coursework.

Contact: Office of the University Registrar, 10 Funkhouser Building, registrar@uky.edu.

DEAN'S LIST AND HONOR ROLL

Dean's List: Awarded each semester to undergraduates who:
- Complete 12 or more graded credit hours in the semester
- Earn a semester GPA of 3.6 or above
- Have no I (incomplete) or E (failing) grades posted for the semester

Honor Roll: Same criteria as Dean's List but semester GPA between 3.4 and 3.599.

Note: P/F (Pass/Fail) credit hours do not count toward the 12-credit-hour minimum for Dean's List purposes.`,
  },
  {
    title: 'DegreeWorks Degree Audit Guide for Students',
    sourceUrl: 'https://www.uky.edu/registrar/content/degreeworks',
    content: `DegreeWorks Degree Audit — Student Guide
University of Kentucky Office of the Registrar, 2024–25

WHAT IS DEGREEWORKS?

DegreeWorks is an online degree audit system that tracks your progress toward degree completion. It maps your completed and in-progress coursework against your program's graduation requirements and helps you and your advisor identify what remains to be done.

Important: DegreeWorks is a planning and advising tool, NOT a graduation certification. The official graduation audit is performed by the Registrar's office during the semester you apply to graduate. A "met" status in DegreeWorks does not guarantee graduation approval.

HOW TO ACCESS DEGREEWORKS

1. Log in to myUK (myuk.uky.edu)
2. Navigate to: Student Services → Student Records → Degree Audit (DegreeWorks)
3. Your most recent audit will load automatically. Select a specific program from the dropdown if you have multiple majors or a double degree.

UNDERSTANDING BLOCK COLORS

DegreeWorks displays requirement blocks with color-coded status indicators:

Green checkmark (✓): This requirement is COMPLETE. All courses have been taken and all credit hours have been earned with passing grades.

Amber/Yellow (partially filled): This requirement is IN PROGRESS. You have completed some requirements but not all. In-progress courses (currently enrolled) are shown with an orange or gold tint.

Red X (✗) or unfilled: This requirement is NOT COMPLETE and no in-progress courses are filling it.

Blue or teal highlight: An advisor has manually overridden or flagged this requirement (see Substitutes and Waivers below).

SUBSTITUTE AND WAIVER NOTATIONS

Substitute: Appears when an advisor has approved one course to satisfy a requirement normally fulfilled by a different course. Example: A transfer course substituting for a required major course. Substitutes are entered by advisors and approved by department chairs.

Waiver: Appears when a graduation requirement has been waived entirely. Example: A language waiver for a native speaker. Waivers require formal petition and are rarer than substitutes.

Note: Substitutes and waivers appear in DegreeWorks but may take 5–10 business days to appear after advisor entry. If your advisor approves a substitute in your meeting, ask when it will appear and follow up if it doesn't.

HOW IN-PROGRESS COURSES DISPLAY

Courses you are currently enrolled in appear in DegreeWorks with an "IP" notation. They are counted toward requirements they will satisfy IF passed. If you drop a course after it appears as "IP" in DegreeWorks, you may see requirements go from partially met back to unmet — this is expected behavior.

GPA BLOCKS IN DEGREEWORKS

DegreeWorks displays multiple GPA blocks:
- Cumulative GPA: Overall GPA across all UK coursework
- Major GPA: GPA calculated only from courses in your declared major prefix
- In-Progress GPA: Projection if all current courses are passed with the grade needed

Some programs have GPA minimums for the major (e.g., Psychology requires C or better in core courses). DegreeWorks does not enforce these grade minimums automatically — it only tracks credit hours. Your advisor reviews grade requirements during graduation checks.

CREDITS APPLIED VS. CREDITS EARNED

Credits Earned: Total credit hours posted to your transcript with a passing grade (D or above for most courses; C or above for some major requirements).

Credits Applied: Credit hours that DegreeWorks is using to satisfy a specific graduation requirement. Not all earned credits may be "applied" — elective overflow credits may be earned but not applied to a specific block.

When you have more credits earned than applied, the difference typically sits in the "Free Electives" or "Additional Coursework" block.

WHAT-IF AUDIT

The "What-If" feature lets you run a simulated degree audit under a different major, catalog year, or concentration without officially changing your record.

How to run a What-If audit:
1. In DegreeWorks, click the "What-If" tab
2. Select the hypothetical program, catalog year, and concentration
3. Click "Process What-If"
4. Review the resulting audit to see how your completed and in-progress courses would apply

What-If audits are for planning only. They do not change your official record. Use them to explore a major change before meeting with an advisor.

WHEN TO TRUST DEGREEWORKS VS. SEE YOUR ADVISOR

Trust DegreeWorks for:
- Tracking which courses you have completed
- Seeing which requirements are "met" based on your transcript
- Planning which courses to register for next semester

See your advisor when:
- You believe a course should satisfy a requirement but DegreeWorks shows it as unmet
- A substitute or waiver has been verbally approved but hasn't appeared
- You are within 30 credit hours of graduation (advisor review required)
- DegreeWorks shows conflicting information after a major change
- You have transfer credit that was evaluated but isn't mapping correctly

COMMON DEGREEWORKS ISSUES

Issue: A course I transferred shows as "Unassigned Credit" and isn't satisfying a requirement.
Solution: Submit a Transfer Credit Equivalency Petition through the Registrar. Include the course syllabus from the sending institution. Allow 4–6 weeks for review.

Issue: I completed a course that should meet a requirement but DegreeWorks still shows it as unmet.
Solution: Check if the grade has been posted (final grades take 48–72 hours after submission). If the grade is posted and the course still doesn't count, contact your advisor — there may be a catalog year mismatch or a substitute needed.

Issue: DegreeWorks shows a different catalog year than I expected.
Solution: Your catalog year is based on your first enrollment at UK (or re-enrollment if you left and returned). Contact the Registrar to verify or appeal a catalog year assignment.`,
  },
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[seed-advisor-docs] Starting...')

  if (!process.env.OPENAI_API_KEY) {
    console.error('[seed-advisor-docs] OPENAI_API_KEY is required for embeddings')
    process.exit(1)
  }

  for (const doc of ADVISOR_DOCS) {
    console.log(`[seed-advisor-docs] Processing: ${doc.title}`)

    // Create the ServiceDocument record
    const serviceDoc = await prisma.serviceDocument.create({
      data: {
        serviceArea: SERVICE_AREA,
        title: doc.title,
        content: doc.content,
        sourceUrl: doc.sourceUrl,
        fileType: 'text/plain',
      },
    })

    // Chunk the content
    const textChunks = chunkText(doc.content)
    if (textChunks.length === 0) {
      console.warn(`[seed-advisor-docs] No chunks generated for: ${doc.title}`)
      continue
    }

    // Embed all chunks
    const embeddings = await embedBatch(textChunks.map((c) => c.content))

    const chunksToUpsert = textChunks.map((c, i) => ({
      chunkIndex: c.chunkIndex,
      content: c.content,
      tokenCount: c.tokenCount,
      embedding: embeddings[i],
    }))

    await upsertServiceChunks(serviceDoc.id, SERVICE_AREA, chunksToUpsert)

    // Mark as embedded
    await prisma.serviceDocument.update({
      where: { id: serviceDoc.id },
      data: { embeddedAt: new Date() },
    })

    console.log(`[seed-advisor-docs] ✓ ${doc.title} — ${textChunks.length} chunks`)
  }

  console.log('[seed-advisor-docs] Done.')
  await pgPool.end()
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('[seed-advisor-docs] Fatal error:', err)
  process.exit(1)
})
