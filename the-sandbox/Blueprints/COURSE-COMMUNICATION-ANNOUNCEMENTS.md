# Blueprint: Course Communication & Announcements

> **Sprint Scope:** Build a friction-free faculty → student communication system with course posts, audience targeting, channel selection, scheduling, and Sandy-recommended nudges.
> **Depends On:** Faculty Homepage Intelligence (for clickable surfaces) — but can be built in parallel.
> **Estimated Size:** Medium-Large (1 sprint)

---

## Context

Faculty need to communicate with students quickly. Currently:
- The "Post announcement" quick action opens Sandy with `post_announcement` tool
- `AdminAnnouncement` model exists for global banners (admin-only)
- `AnnouncementsBanner.tsx` on student homepage shows global announcements
- `DepartmentFeed` component shows department-level posts
- There is **no course-level post/announcement system** owned by individual educators

### The Vision
A faculty member sees a student struggling → clicks "Send nudge" → message arrives on the student's homepage, in their course feed, and optionally via email. Total friction: 2 clicks.

---

## Key Files

| File | Role |
|------|------|
| `app/components/faculty-home/OfficeHoursCard.tsx` | Add "Send nudge" to flagged students |
| `app/components/student-home/AnnouncementsBanner.tsx` | Extend to show course posts |
| `app/components/student-home/StudentHomepage.tsx` | Add course post feed |
| `prisma/schema.prisma` | New `CoursePost` model |
| `app/api/courses/[id]/posts/route.ts` | CRUD for course posts |
| `app/lib/agent/tools/communication-tools.ts` | Extend Sandy tools |
| `app/components/faculty-home/QuickActionsStrip.tsx` | Wire "Post announcement" |

---

## Data Model

### New Prisma Model: `CoursePost`

```prisma
model CoursePost {
  id          String   @id @default(cuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id])
  authorId   String
  author      User     @relation(fields: [authorId], references: [id])

  title       String?            // Optional — nudges may not have titles
  body        String             // Markdown content
  type        CoursePostType     // ANNOUNCEMENT, NUDGE, REMINDER, RESOURCE
  audience    CoursePostAudience // ALL, AT_RISK, SPECIFIC

  // Targeting
  targetStudentIds String[]      // Only if audience === 'SPECIFIC'

  // Channels
  channelPlatform Boolean @default(true)   // Show in Sandbox feed
  channelEmail    Boolean @default(false)  // Also send via email
  // channelCanvas Boolean @default(false) // Future: push to Canvas

  // Scheduling
  scheduledFor DateTime?  // null = send immediately
  publishedAt  DateTime?  // Set when actually sent

  // Sandy metadata
  sandyGenerated Boolean @default(false)  // Was this drafted by Sandy?
  sandyPrompt    String?                  // Original Sandy prompt (for transparency)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Read tracking
  reads       CoursePostRead[]
}

enum CoursePostType {
  ANNOUNCEMENT   // General course announcement
  NUDGE          // Targeted student nudge (e.g., "Come to office hours")
  REMINDER       // Deadline reminder
  RESOURCE       // Shared resource link
}

enum CoursePostAudience {
  ALL       // Entire course
  AT_RISK   // Students with riskScore > threshold
  SPECIFIC  // Manually selected students
}

model CoursePostRead {
  id        String   @id @default(cuid())
  postId    String
  post      CoursePost @relation(fields: [postId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  readAt    DateTime @default(now())

  @@unique([postId, userId])
}
```

---

## Feature 1: Course Post Composer

### Entry Points (all should open the same composer)
1. **Quick Actions Strip** → "Post announcement" → Sandy drafts, but faculty can also use direct form
2. **Flagged student card** → "Send nudge" → pre-fills with student name + flag context
3. **Course page** → dedicated "Posts" tab (future)
4. **Sandy tool** → `post_announcement` and new `send_nudge` tool

### Composer UI (Modal or Sandy-Driven)

**Option A: Pre-filled Form (preferred for structured posts)**
```
┌─────────────────────────────────────────┐
│ New Course Post                         │
├─────────────────────────────────────────┤
│ Course: [TEK-301 ▾]                     │
│ Type:   [Announcement ▾]               │
│                                         │
│ Title: [Optional — auto-generated]      │
│ Body:  [────────────────────────]       │
│        [Rich text / markdown    ]       │
│                                         │
│ Audience: ○ All students                │
│           ○ At-risk students (3)        │
│           ○ Specific students [Select]  │
│                                         │
│ Channels: ☑ Platform  ☐ Email           │
│                                         │
│ Timing: ○ Send now                      │
│         ○ Schedule: [Date] [Time]       │
│                                         │
│ [Preview] [Send]                        │
└─────────────────────────────────────────┘
```

**Option B: Sandy-Driven (for "help me write this")**
- User clicks "Post announcement" → Sandy opens with context
- Sandy: "I'll help you post to TEK-301. What would you like to say?"
- After drafting, Sandy shows the same composer form pre-filled with its draft
- Faculty reviews, edits audience/channels, and sends

### Pre-filled Nudge Flow (from flagged students)
When clicking "Send nudge" on Maria L. (grade drop, TEK-301):
1. Composer opens pre-filled:
   - Course: TEK-301 (locked)
   - Type: NUDGE
   - Audience: SPECIFIC → Maria L. (pre-selected)
   - Body: Sandy-drafted: "Hi Maria, I noticed your recent scores in Module 5 have dipped. I'd love to help — can you come by office hours today (2:00-3:30 PM)? We can work through the case study together."
2. Faculty reviews → edits if needed → sends

---

## Feature 2: Sandy-Recommended Nudges & Posts

### What
Sandy proactively suggests posts/nudges based on course data patterns.

### Triggers (computed in `homepage-aggregator.ts` or a new `nudge-suggestion-service.ts`)

| Trigger | Suggested Post |
|---------|---------------|
| Assignment due in 48 hours + <50% submissions | "Reminder: [Assignment] is due [date]. You still have time!" |
| Engagement dropped >5% this week | "Quick check-in: How is everyone doing with Module [X]? Reply here or come to office hours." |
| 3+ students flagged as at-risk in same course | "I'm hosting extra review sessions this week. Sign up here: [link]" |
| Post-exam, class average <70% | "I see Module [X] was challenging. I've posted additional resources and will cover key concepts in Thursday's class." |
| Student inactive >10 days | (Private nudge) "Hey [Name], I haven't seen you in a while. Everything okay? Let me know if you need anything." |

### UI
- Suggestions appear as a subtle card in the "Your Courses" tab or Attention Bar
- "Sandy suggests: Post a deadline reminder for TEK-301 Assignment 6.2 (due in 48h, 12/28 submitted)"
- One-click to open pre-filled composer
- "Dismiss" to hide the suggestion

### Sandy Tool Extension
```typescript
// New Sandy tool: suggest_course_posts
{
  name: 'suggest_course_posts',
  description: 'Analyze course data and suggest posts/nudges faculty should send',
  handler: async ({ courseId }) => {
    // Check submission rates, engagement trends, flagged students
    // Return array of suggested posts with pre-filled content
  }
}
```

---

## Feature 3: Where Posts Show Up for Students

### Student Homepage Integration

**New component: `CoursePostsFeed.tsx`**
- Location: Student homepage, in the "My Courses" section or as a dedicated feed
- Shows recent posts from enrolled courses, newest first
- NUDGE-type posts targeted at the student show with a highlight
- Read tracking: mark as read when student scrolls past or clicks

**Rendering:**
```
┌──────────────────────────────────────┐
│ 📢 TEK-301 — Prof. Thompson         │
│ "Module 5 review resources posted"   │
│ Come to office hours today...        │
│ 2 hours ago                          │
└──────────────────────────────────────┘
```

**Also shows in:**
- Sandy's briefing context (morning summary includes new course posts)
- Email (if `channelEmail` is true) — sent via Resend
- Future: Canvas announcement (when Canvas integration is live)

### Visibility Rules
- `ALL` posts → visible to all enrolled students
- `AT_RISK` posts → visible only to students with `riskScore > threshold` in that course (student doesn't see the "at-risk" label — just sees a normal post)
- `SPECIFIC` posts → visible only to named students

---

## Feature 4: Channel Selection & Scheduling

### Channel Selection
- **Platform** (default, always on): Shows in student's course feed on the platform
- **Email**: Sends via Resend email provider. Subject = post title or "New post from [course]"
- **Canvas** (future, when integrated): Creates a Canvas announcement via API

### Scheduling
- Default: "Send now" (immediate `publishedAt = now()`)
- Optional: "Schedule for [datetime]"
  - Scheduled posts stored with `scheduledFor` timestamp
  - A cron job (`/api/cron/publish-scheduled-posts`) checks every 5 minutes for due posts
  - On publish: set `publishedAt`, send email channel if enabled, push notifications

### API Endpoint

```typescript
// POST /api/courses/[id]/posts
// Auth: requireEducatorUser + verify instructor owns course
{
  title?: string
  body: string
  type: 'ANNOUNCEMENT' | 'NUDGE' | 'REMINDER' | 'RESOURCE'
  audience: 'ALL' | 'AT_RISK' | 'SPECIFIC'
  targetStudentIds?: string[]
  channelPlatform: boolean
  channelEmail: boolean
  scheduledFor?: string  // ISO datetime
  sandyGenerated?: boolean
  sandyPrompt?: string
}
```

---

## Feature 5: Audience Targeting

### "All Students"
- Post visible to everyone enrolled in the course

### "At-Risk Students"
- Computed from `StudentProfile.riskScore > 0.6` for students in that course
- The composer shows the count: "At-risk students (3)"
- Faculty can click to see the names before sending
- **Critical UX:** The student never sees that they were targeted as "at-risk." The post just appears in their feed like any other post.

### "Specific Students"
- Faculty selects from a student picker (searchable dropdown of enrolled students)
- Multiple selection supported
- Pre-selected when coming from a flagged student card

---

## Acceptance Criteria

- [ ] `CoursePost` and `CoursePostRead` models added to schema
- [ ] POST/GET API for course posts with auth guard
- [ ] Composer modal with course, type, audience, channels, scheduling fields
- [ ] "Send nudge" action on flagged student cards in OfficeHoursCard
- [ ] Pre-filled nudge content from Sandy based on student flag context
- [ ] Sandy-recommended post suggestions surface on homepage
- [ ] Student homepage shows course posts feed
- [ ] AT_RISK and SPECIFIC audience targeting works with no "at-risk" label visible to students
- [ ] Email channel sends via Resend when enabled
- [ ] Scheduled posts publish via cron job
- [ ] Read tracking per student per post
- [ ] Demo seed data: 3-5 sample posts per course

---

## FERPA Notes
- AT_RISK targeting is invisible to students — they see a normal post
- Faculty cannot see which other faculty's courses a student is at-risk in
- Post read tracking is visible only to the post's author (the educator)
- Nudge content should never include raw risk scores or algorithmic language
