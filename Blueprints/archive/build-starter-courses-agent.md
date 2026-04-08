# Agent Instructions: Build Starter Courses
### Run this agent repeatedly (or once through all courses) to build out UK starter course content.
### Each run: find next unbuilt course → write content → mark done → continue.

---

## Your Job

You are building seed data for UK college starter courses. Each course gets written as a
TypeScript object appended to `STARTER_COURSES` in:

  `c:\AA Code\Educator marketplace\the-sandbox\prisma\seed-starter-courses.ts`

Work through ALL unbuilt courses in `c:\AA Code\Educator marketplace\STARTER-COURSES.md`
in order, top to bottom. Do not stop until every `### [ ]` has become `### [x]`.

---

## Step-by-Step Loop

### Step 1 — Find the next course to build

Read `c:\AA Code\Educator marketplace\STARTER-COURSES.md`.
Find the FIRST section that starts with `### [ ]`.
Extract: courseCode, college, semester, module list, Sandy questions.

If NO `### [ ]` exists → all courses are built. Output a completion summary and stop.

---

### Step 2 — Check current state of the seed file

Read `c:\AA Code\Educator marketplace\the-sandbox\prisma\seed-starter-courses.ts`.
Check if an entry with this courseCode already exists in `STARTER_COURSES`.
If it already exists → skip to Step 4 (just mark done in the markdown).

---

### Step 3 — Write the course content

Write a rich, complete TypeScript course object following this EXACT structure:

```typescript
{
  courseCode: 'PSY-100-STARTER',
  title: 'Introduction to Psychology',
  description: 'One to two sentence description of what this course covers and who it is for.',
  college: 'College of Arts & Sciences',
  semester: 'Spring 2026',
  materials: [
    // MODULE 1: SYLLABUS — always first, always materialType: 'syllabus'
    // This is the most important material. Sandy will be asked all schedule/policy/grading questions.
    // Must include ALL of:
    //   - Grading breakdown with exact percentages summing to 100%
    //   - Weekly schedule (weeks 1-14 minimum, with topic per week)
    //   - Assignment list with point values and due dates (use "Week X" as dates)
    //   - Late policy (exact penalty — e.g., "10 points per day, max 3 days")
    //   - Attendance policy
    //   - Office hours (days, times, location, Zoom link placeholder)
    //   - Exam dates (which weeks)
    //   - Required textbook or materials
    //   - Academic integrity policy reference
    {
      moduleNumber: 1,
      title: 'Course Syllabus',
      materialType: 'syllabus',
      content: `...`
    },
    // MODULES 2-7: LECTURES — one per major topic area from STARTER-COURSES.md
    // Each lecture must be substantive: 300-500 words of actual content.
    // Include: key concepts, definitions, examples, discussion questions.
    // Do NOT write placeholder text. Write real educational content.
    {
      moduleNumber: 2,
      title: 'Module 1: [Topic]',
      materialType: 'lecture',
      content: `...`
    },
    // ... more lectures ...
    // FINAL MODULE: RUBRIC — always last, always materialType: 'rubric'
    // Must include: criteria names, point values per criterion, descriptions of each performance level.
    {
      moduleNumber: 8,
      title: '[Assignment Name] Rubric',
      materialType: 'rubric',
      content: `...`
    },
  ]
},
```

**Content quality bar — do not cut corners:**
- Syllabus: must be detailed enough that Sandy can answer every listed Sandy question
- Lectures: real educational content, not "this module covers X" — actually cover X
- Rubric: real criteria with point values, not "graded on quality"
- Total content per course: aim for 3,000–5,000 words across all materials combined

**After writing the object**, mentally answer each Sandy question from STARTER-COURSES.md
using only the content you just wrote. If any question would get "I don't have information
about that" — go back and add the missing content before proceeding.

---

### Step 4 — Append to the seed file

Open `c:\AA Code\Educator marketplace\the-sandbox\prisma\seed-starter-courses.ts`.

Add the new course object to the `STARTER_COURSES` array.
Do NOT overwrite existing entries. Append only.

---

### Step 5 — Mark the course as done

In `c:\AA Code\Educator marketplace\STARTER-COURSES.md`:
- Change `### [ ] COURSE-CODE` to `### [x] COURSE-CODE`
- Change `⬜ Not built` to `✅ Built` in the progress table at the bottom

---

### Step 6 — Continue to next course

Go back to Step 1. Find the next `### [ ]`. Repeat.

---

## Reference: The Seed File Structure

The file you are appending to looks like this:

```typescript
// c:\AA Code\Educator marketplace\the-sandbox\prisma\seed-starter-courses.ts

export const STARTER_COURSES: StarterCourse[] = [
  // courses go here, comma-separated
]
```

Each entry is a `StarterCourse` object as shown in Step 3.

The `seedStarterCourses` function in this file handles the actual DB writes.
You are only responsible for adding course data objects to `STARTER_COURSES`.

---

## Reference: Pattern From Existing Seed (TEK-100)

For content quality reference, the existing TEK-100 course in `prisma/seed.ts` starting
around line 2206 shows the exact level of detail expected. Each module has:
- A clear title with module number
- Core skill or key topic statement
- Bulleted key concepts
- Learning objectives
- Discussion questions or lab prompts
- Real subject matter content (not filler)

Match or exceed that level of detail.

---

## Do Not

- Do not modify `prisma/seed.ts` — starter courses load via `seed-starter-courses.ts`
- Do not delete existing entries from `STARTER_COURSES`
- Do not write placeholder content ("This module covers X topics")
- Do not mark a course `[x]` until the content is actually written and appended
- Do not stop early — work through all `### [ ]` entries

---

## When All Courses Are Built

Output a completion summary:
```
✅ All 17 starter courses built.

Courses added to seed-starter-courses.ts:
- PSY-100-STARTER (Arts & Sciences)
- ACC-201-STARTER (Business)
... etc

Next step: run `npm run db:seed` from the-sandbox/ to load into the database.
Then test Sandy on each course with the listed Sandy questions.
```
