/**
 * generate-demo-syllabus.ts — Generates a clean, text-based PDF syllabus
 * for TEK 100 "Collaborative Intelligence: Understanding and Using Modern AI" used in the
 * Sandbox Experience demo "magic trick" moment.
 *
 * The PDF is designed to parse cleanly through the 3-pass Haiku pipeline
 * (pdf-parser.ts): structure detection, date normalization, prerequisite edges.
 *
 * Usage:
 *   npx tsx scripts/generate-demo-syllabus.ts
 *   npm run gen:syllabus
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as fs from 'fs'
import * as path from 'path'

const MARGIN = 50
const PAGE_WIDTH = 612  // US Letter
const PAGE_HEIGHT = 792
const LINE_HEIGHT = 14
const SECTION_GAP = 10

interface PDFWriter {
  doc: ReturnType<typeof PDFDocument.create> extends Promise<infer R> ? R : never
  page: ReturnType<PDFWriter['doc']['addPage']>
  y: number
  fontRegular: Awaited<ReturnType<PDFWriter['doc']['embedFont']>>
  fontBold: Awaited<ReturnType<PDFWriter['doc']['embedFont']>>
}

async function main() {
  const doc = await PDFDocument.create()
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  // Helper: add new page if needed
  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN
    }
  }

  // Helper: draw a line of text
  function drawText(text: string, opts: { size?: number; bold?: boolean; indent?: number } = {}) {
    const { size = 10, bold = false, indent = 0 } = opts
    const font = bold ? fontBold : fontRegular
    const maxWidth = PAGE_WIDTH - 2 * MARGIN - indent

    // Word-wrap
    const words = text.split(' ')
    let currentLine = ''
    const lines: string[] = []

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      if (font.widthOfTextAtSize(testLine, size) > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)

    for (const line of lines) {
      ensureSpace(LINE_HEIGHT)
      page.drawText(line, {
        x: MARGIN + indent,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      })
      y -= LINE_HEIGHT
    }
  }

  function drawBlank(n = 1) {
    y -= LINE_HEIGHT * n
  }

  function drawSection(title: string) {
    ensureSpace(LINE_HEIGHT * 3)
    drawBlank()
    drawText(title, { size: 13, bold: true })
    drawBlank(0.5)
  }

  function drawSubSection(title: string) {
    ensureSpace(LINE_HEIGHT * 2)
    drawText(title, { size: 11, bold: true })
  }

  // ════════════════════════════════════════════════════════════════════════
  // SYLLABUS CONTENT
  // ════════════════════════════════════════════════════════════════════════

  // Title block
  drawText('University of Kentucky', { size: 14, bold: true })
  drawText('College of Education — Department of Educational Technology', { size: 10 })
  drawBlank()
  drawText('TEK 100 — Collaborative Intelligence: Understanding and Using Modern AI', { size: 16, bold: true })
  drawText('Spring 2026 Syllabus', { size: 12, bold: true })
  drawBlank()

  // Course info
  drawText('Instructor: Dr. Sarah Chen', { size: 10, bold: true })
  drawText('Office: Taylor Education Building 310', { size: 10 })
  drawText('Email: sarah.chen@uky.edu', { size: 10 })
  drawText('Office Hours: Tuesdays & Thursdays 2:00 – 3:30 PM, or by appointment', { size: 10 })
  drawBlank()
  drawText('Meeting Times: Mon/Wed/Fri 10:00 – 10:50 AM', { size: 10 })
  drawText('Location: Taylor Education Building 206', { size: 10 })
  drawText('Semester: January 13 – April 25, 2026 (15 weeks)', { size: 10 })

  // Prerequisites
  drawSection('Prerequisites')
  drawText('TEK 100 — Foundations of Teaching and Learning (required). Students must have completed TEK 100 prior to enrollment. This course builds on the pedagogical frameworks, assessment basics, and classroom management principles covered in TEK 100.', { size: 10 })

  // Course Description
  drawSection('Course Description')
  drawText('This course provides a comprehensive introduction to educational technology and its role in modern teaching and learning. Students will explore how artificial intelligence, learning management systems, multimedia tools, and data-driven approaches are transforming K-20 education. Through hands-on projects and critical analysis, students will develop practical skills in selecting, evaluating, and integrating technology into instructional practice while maintaining ethical and equitable standards.', { size: 10 })

  // Learning Objectives
  drawSection('Learning Objectives')
  drawText('By the end of this course, students will be able to:', { size: 10 })
  const objectives = [
    '1. Evaluate the pedagogical effectiveness of emerging educational technologies, including AI-powered tools, using evidence-based frameworks.',
    '2. Design a technology-enhanced lesson plan that aligns learning objectives, assessments, and instructional activities using backward design principles.',
    '3. Analyze the ethical implications of AI and data analytics in educational settings, including issues of bias, privacy, and digital equity.',
    '4. Create multimedia learning materials that apply principles of cognitive load theory and universal design for learning (UDL).',
    '5. Synthesize current research on educational technology to develop a position paper advocating for responsible technology integration in a specific educational context.',
    '6. Apply formative and summative assessment strategies that leverage technology to provide timely, actionable feedback to diverse learners.',
  ]
  for (const obj of objectives) {
    drawText(obj, { size: 10, indent: 10 })
  }

  // Required Texts
  drawSection('Required Texts & Materials')
  drawText('• Bates, A.W. (2025). Teaching in a Digital Age (4th ed.). Open textbook — free online.', { size: 10, indent: 10 })
  drawText('• Selwyn, N. (2024). Education and Technology: Key Issues and Debates (4th ed.). Bloomsbury.', { size: 10, indent: 10 })
  drawText('• Additional readings posted weekly on Canvas.', { size: 10, indent: 10 })

  // Grading
  drawSection('Grading Breakdown')
  drawText('Participation & Discussion Posts: 15%', { size: 10, indent: 10 })
  drawText('Weekly Assignments (5 total): 40%', { size: 10, indent: 10 })
  drawText('Midterm Project — Technology Audit: 20%', { size: 10, indent: 10 })
  drawText('Final Project — Integration Proposal: 25%', { size: 10, indent: 10 })
  drawBlank()
  drawText('Grading Scale: A (90-100%), B (80-89%), C (70-79%), D (60-69%), E (below 60%)', { size: 10 })

  // Policies
  drawSection('Course Policies')

  drawSubSection('Attendance Policy')
  drawText('Regular attendance is expected. More than three unexcused absences will result in a 5% deduction from your final grade per additional absence. If you must miss class, notify the instructor in advance.', { size: 10 })

  drawSubSection('Late Policy')
  drawText('Assignments submitted late will lose 10% per calendar day, up to a maximum of 3 days. After 3 days, late work will not be accepted unless a prior extension has been approved. Technology failures are not accepted as excuses — submit early.', { size: 10 })

  drawSubSection('Academic Integrity')
  drawText('All work must be your own. Use of AI writing tools must be disclosed and is permitted only for brainstorming and outlining, not for final submissions. Violations will be reported to the Office of Academic Ombud Services per University Senate Rules 6.3.1.', { size: 10 })

  // ─── Weekly Schedule ──────────────────────────────────────────────────
  drawSection('Course Schedule')

  const weeks: { week: number; dates: string; topic: string; readings: string[]; activity: string }[] = [
    {
      week: 1, dates: 'January 13 – January 17',
      topic: 'Introduction: What Is Educational Technology?',
      readings: ['Bates Ch. 1: Fundamental Change in Education', 'Selwyn Ch. 1: Technology and Education — An Introduction'],
      activity: 'Discussion: Share your earliest memory of technology in a classroom. What worked? What didn\'t?',
    },
    {
      week: 2, dates: 'January 20 – January 24',
      topic: 'Learning Theory Meets Technology',
      readings: ['Bates Ch. 2: The Nature of Knowledge and Epistemology', 'Clark, R. (1994) "Media Will Never Influence Learning" (Canvas)'],
      activity: 'Assignment 1: Analyze a learning app through the lens of behaviorism, cognitivism, and constructivism. Due: January 24, 2026.',
    },
    {
      week: 3, dates: 'January 27 – January 31',
      topic: 'Backward Design and Alignment',
      readings: ['Wiggins & McTighe (2005) Understanding by Design, Ch. 1 (Canvas)', 'Bates Ch. 4: Methods of Teaching with an Online Focus'],
      activity: 'Discussion: Critique a real syllabus for alignment gaps between objectives, activities, and assessments.',
    },
    {
      week: 4, dates: 'February 3 – February 7',
      topic: 'Learning Management Systems and Digital Ecosystems',
      readings: ['Bates Ch. 6: Understanding Technology in Education', 'Selwyn Ch. 4: Education and the Internet'],
      activity: 'Assignment 2: Build and populate a sample Canvas module for a unit of your choice. Due: February 7, 2026.',
    },
    {
      week: 5, dates: 'February 10 – February 14',
      topic: 'Multimedia Learning and Cognitive Load Theory',
      readings: ['Mayer, R. (2021) Multimedia Learning, Ch. 3 (Canvas)', 'Bates Ch. 7: Pedagogical Roles for Audio and Video'],
      activity: 'Discussion: Evaluate three educational videos for Mayer\'s multimedia principles. Post findings to discussion board.',
    },
    {
      week: 6, dates: 'February 17 – February 21',
      topic: 'Universal Design for Learning (UDL)',
      readings: ['CAST (2024) UDL Guidelines 3.0 (online)', 'Selwyn Ch. 6: Digital Inequalities and Education'],
      activity: 'Assignment 3: Redesign an inaccessible learning resource using UDL principles. Due: February 21, 2026.',
    },
    {
      week: 7, dates: 'February 24 – February 28',
      topic: 'Midterm Project Workshop — Technology Audit',
      readings: ['Review all readings from Weeks 1-6'],
      activity: 'In-class workshop: Peer review drafts of your Technology Audit. Midterm Project due: February 28, 2026.',
    },
    {
      week: 8, dates: 'March 3 – March 7',
      topic: 'Introduction to AI in Education',
      readings: ['Holmes, W. et al. (2023) AI and Education, Ch. 2-3 (Canvas)', 'Bates Ch. 12: Planning for the Future'],
      activity: 'Discussion: Hands-on exploration of three AI-powered educational tools. Compare affordances and limitations.',
    },
    {
      week: 9, dates: 'March 10 – March 14',
      topic: 'Spring Break — No Classes',
      readings: [],
      activity: 'No assignments due.',
    },
    {
      week: 10, dates: 'March 17 – March 21',
      topic: 'AI Ethics, Bias, and Equity in EdTech',
      readings: ['Selwyn Ch. 8: Critical Perspectives on EdTech', 'O\'Neil, C. (2016) Weapons of Math Destruction, Ch. 3 (Canvas)'],
      activity: 'Assignment 4: Write an ethical impact assessment for an AI tool used in K-12 education. Due: March 21, 2026.',
    },
    {
      week: 11, dates: 'March 24 – March 28',
      topic: 'Data-Driven Decision Making and Learning Analytics',
      readings: ['Siemens, G. (2013) "Learning Analytics" (Canvas)', 'Bates Ch. 10: Trends in Open Education'],
      activity: 'Discussion: Examine a sample learning analytics dashboard. What decisions can it support? What risks does it create?',
    },
    {
      week: 12, dates: 'March 31 – April 4',
      topic: 'Assessment Innovation: Portfolios, Badges, and Rubrics',
      readings: ['Mueller, J. (2024) Authentic Assessment Toolbox (online)', 'Selwyn Ch. 9: The Future of Education and Technology'],
      activity: 'Assignment 5: Design a rubric and portfolio framework for a course of your choosing. Due: April 4, 2026.',
    },
    {
      week: 13, dates: 'April 7 – April 11',
      topic: 'Emerging Technologies: VR, AR, and Immersive Learning',
      readings: ['Radianti, J. et al. (2020) "Systematic Review of VR in Education" (Canvas)', 'Bates Ch. 8: Emerging Technologies'],
      activity: 'Discussion: After trying a VR classroom demo, evaluate its potential for your discipline.',
    },
    {
      week: 14, dates: 'April 14 – April 18',
      topic: 'Responsible Innovation and the Future of EdTech',
      readings: ['Holmes, W. et al. (2023) AI and Education, Ch. 7: Policy (Canvas)', 'Selwyn Ch. 10: Toward More Critical EdTech'],
      activity: 'Final Project workshop: Present a 5-minute pitch of your Integration Proposal for peer feedback.',
    },
    {
      week: 15, dates: 'April 21 – April 25',
      topic: 'Final Presentations and Course Wrap-Up',
      readings: [],
      activity: 'Final Project — Technology Integration Proposal due: April 25, 2026. In-class presentations during final exam slot.',
    },
  ]

  for (const w of weeks) {
    ensureSpace(LINE_HEIGHT * 6)
    drawSubSection(`Week ${w.week}: ${w.topic}`)
    drawText(`Dates: ${w.dates}`, { size: 9, indent: 10 })
    if (w.readings.length > 0) {
      drawText('Readings:', { size: 9, bold: true, indent: 10 })
      for (const r of w.readings) {
        drawText(`• ${r}`, { size: 9, indent: 20 })
      }
    }
    drawText(w.activity, { size: 9, indent: 10 })
    drawBlank(0.3)
  }

  // ─── Assignment Summary ───────────────────────────────────────────────
  drawSection('Assignment Summary with Due Dates')
  const assignments = [
    'Assignment 1: Learning Theory App Analysis — Due: January 24, 2026',
    'Assignment 2: Canvas Module Build — Due: February 7, 2026',
    'Assignment 3: UDL Resource Redesign — Due: February 21, 2026',
    'Midterm Project: Technology Audit — Due: February 28, 2026',
    'Assignment 4: AI Ethical Impact Assessment — Due: March 21, 2026',
    'Assignment 5: Rubric & Portfolio Framework — Due: April 4, 2026',
    'Final Project: Technology Integration Proposal — Due: April 25, 2026',
  ]
  for (const a of assignments) {
    drawText(`• ${a}`, { size: 10, indent: 10 })
  }

  // ─── Save PDF ─────────────────────────────────────────────────────────
  const pdfBytes = await doc.save()
  const outDir = path.join(__dirname, '..', 'public', 'demo')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  const outPath = path.join(outDir, 'tek-100-syllabus.pdf')
  fs.writeFileSync(outPath, pdfBytes)
  console.log(`✅ Syllabus PDF generated: ${outPath} (${(pdfBytes.length / 1024).toFixed(1)} KB)`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
