# Sandy Agent Tools Registry

> Auto-generated reference. 20 modules, ~127 tools. Last synced: 2026-04-02.

---

## Summary

| Module | File | Tools | Roles |
|--------|------|-------|-------|
| Academic | `academic-tools.ts` | 10 | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| Communication | `communication-tools.ts` | 11 | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| Calendar | `calendar-tools.ts` | 6 | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| Sandy | `sandy-tools.ts` | 5 | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| Campus | `campus-tools.ts` | 13 | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| Analytics | `analytics-tools.ts` | 5 | EDUCATOR, ADMIN, REGISTRAR |
| Content | `content-tools.ts` | 9 | EDUCATOR, STUDENT, ADMIN |
| Faculty | `faculty-tools.ts` | 5 | EDUCATOR, ADMIN |
| Document | `document-tools.ts` | 2 | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| AI Literacy | `ai-literacy-tools.ts` | 23 | EDUCATOR, STUDENT, ADMIN, STAFF |
| University Systems | `university-systems-tools.ts` | 10 | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| Fingerprint | `fingerprint-tools.ts` | 2 | STUDENT, EDUCATOR, ADMIN, STAFF |
| Crisis Comms | `crisis-comms-tools.ts` | 4 | EDUCATOR, ADMIN, STAFF, STUDENT, REGISTRAR |
| Philanthropy | `philanthropy-tools.ts` | 3 | STUDENT, EDUCATOR, ADMIN, STAFF, REGISTRAR |
| Learning Goals | `learning-goal-tools.ts` | 2 | STUDENT |
| MEI | `mei-tools.ts` | 1 | STUDENT, EDUCATOR, ADMIN |
| Success | `success-tools.ts` | 4 | EDUCATOR, ADMIN |
| Accreditation | `accreditation-tools.ts` | 4 | ADMIN, STAFF |
| Classroom Intelligence | `classroom-intelligence-tools.ts` | 5 | EDUCATOR, ADMIN |
| Tasks | `task-tools.ts` | 3 | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |

---

## Detailed Registry

### Academic (`academic-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_courses` | List courses for the current user. Educators see courses they teach; students see enrolled courses; admins see all. | _(none)_ | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `get_course_roster` | Get the student roster for a course, including enrollment date and last activity. Paginated (max 50). | `courseId`\*, `limit`, `offset` | EDUCATOR, ADMIN, REGISTRAR |
| `get_course_materials` | Get modules and materials for a course, ordered by module number. | `courseId`\* | EDUCATOR, STUDENT, ADMIN |
| `get_student_progress` | Get detailed progress for a specific student in a course: scores, activity, concepts, risk signals. | `studentId`\*, `courseId` | EDUCATOR, ADMIN, REGISTRAR |
| `get_at_risk_students` | Get students with elevated risk scores (>= threshold) across courses. | `courseId`, `threshold` | EDUCATOR, ADMIN, REGISTRAR |
| `get_course_health` | Get engagement and health metrics for a course: enrollment, materials, assignments, recent submissions. | `courseId`\* | EDUCATOR, ADMIN |
| `create_assignment` | Create a new assignment for a course. Shows preview for approval. **confirm** | `courseId`\*, `title`\*, `description`\*, `dueAt`, `pointsPossible`, `category` | EDUCATOR, ADMIN |
| `grade_submission` | Run AI grading on a student submission. Shows score/feedback for review. **confirm** | `submissionId`\* | EDUCATOR, ADMIN |
| `generate_study_guide` | Generate a personalized study guide for a topic or course module. | `courseId`\*, `topic`\*, `moduleNumber` | EDUCATOR, STUDENT, ADMIN |
| `create_quiz` | Generate quiz questions at a specified Bloom level. Shows for approval. **confirm** | `courseId`\*, `topic`\*, `questionCount`, `bloomLevel` | EDUCATOR, ADMIN |

---

### Communication (`communication-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_unread_emails` | Fetch unread emails with category breakdown (decision, waiting, fyi, noise). | `category`, `limit` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `draft_email` | Compose a draft email for review before sending. **confirm** | `to`\*, `subject`\*, `body`\*, `replyToEmailId` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `send_message` | Send a platform message to a user or group chat. **confirm** | `recipientId`, `groupId`, `content`\* | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `post_announcement` | Post an announcement to a course or platform-wide. **confirm** | `courseId`, `title`\*, `body`\*, `audience` | EDUCATOR, ADMIN, STAFF |
| `get_conversations` | List recent message threads/conversations with unread counts. | `limit` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `compose_email` | Start composing a new email with context-aware suggestions. | `to`, `about` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `summarize_thread` | Summarize an email thread -- key decisions, whether a response is needed. | `threadId`\* | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `detect_thread_stall` | Check if an email thread is going in circles. Suggests starting a Commons session. | `threadId`\* | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `send_nudge` | Send a targeted nudge message to a specific student in a course. **confirm** | `courseId`\*, `message`\*, `studentName`, `studentId`, `context` | EDUCATOR, ADMIN |
| `suggest_course_posts` | Analyze course data and suggest posts/nudges faculty should send. | _(none)_ | EDUCATOR, ADMIN |
| `check_follow_ups` | Check for emails where you replied but haven't heard back. | `thresholdDays` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |

---

### Calendar (`calendar-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_calendar` | Fetch calendar events for a date range. Defaults to today. | `startDate`, `endDate` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `get_tasks` | Fetch the user's task list with priorities and due dates. | `status`, `limit` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `create_task` | Create a new task with optional due date. **confirm** | `title`\*, `description`, `dueAt` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `complete_task` | Mark a task as complete. **confirm** | `taskId`\* | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `create_calendar_event` | Add a new event to the user's calendar. **confirm** | `title`\*, `startTime`\*, `endTime`\*, `location`, `description`, `attendees` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `find_free_time` | Find available time slots for scheduling a meeting. | `targetEmail`, `durationMinutes`, `startDate`, `endDate` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |

---

### Sandy (`sandy-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_current_context` | Get context about the current page, time, and user role. | `currentPage` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `get_user_profile` | Get detailed profile for the current user including role, courses, preferences. | _(none)_ | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `navigate_user` | Navigate the user to a specific page on the platform. | `path`\*, `reason` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `search_platform` | Full-text search across courses, tools, materials, and users. | `query`\*, `type`, `limit` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `launch_tool` | Open a specific tool by name or ID. | `toolName`, `toolId` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |

---

### Campus (`campus-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `search_policies` | Search university policies using RAG (vector similarity). | `query`\*, `category`, `limit` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `lookup_directory` | Search the university directory by name, email, or department. | `query`\*, `limit` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `check_degree_audit` | Run a degree audit for a student to check graduation progress. | `studentId`, `programCode` | EDUCATOR, ADMIN, REGISTRAR, STUDENT |
| `get_campus_news` | Fetch recent UKNow articles, campus news, and university alerts. | `query`, `limit` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `search_campus_orgs` | Search student organizations from BBNvolved (CampusLabs Engage). | `query`, `category`, `limit` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `search_campus_events` | Search upcoming campus events from BBNvolved. | `query`, `theme`, `benefit`, `daysAhead`, `limit` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `search_campus_map` | Search for buildings and locations on the UK campus map. | `query`\* | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `find_nearest_parking` | Find the nearest parking structures to a campus building. | `building`\* | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `estimate_walking_route` | Estimate walking distance and time between two campus buildings. | `from`\*, `to`\* | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `get_building_details` | Get full details for a campus building including floors, departments, accessibility. | `building`\*, `room` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `request_department_tool` | Submit a tool request to a department. **confirm** | `title`\*, `description`\*, `department`, `category` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `check_dining` | Check dining hall hours, menus, and what is open now. | `query`, `nearBuilding` | EDUCATOR, ADMIN, STAFF, STUDENT, REGISTRAR |
| `search_department_tools` | Search for approved tools within department storefronts. | `query`\*, `department` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |

---

### Analytics (`analytics-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `run_cohort_analysis` | Analyze a group of students by course, risk level, engagement. Returns aggregates and distributions. | `courseId`\*, `riskThreshold`, `minSessions` | EDUCATOR, ADMIN, REGISTRAR |
| `generate_report` | Create a formatted analytics report for a course (engagement, grades, at-risk, comprehensive). | `courseId`\*, `reportType` | EDUCATOR, ADMIN |
| `get_engagement_trends` | Get engagement metrics over time: daily/weekly submissions, active students, session trends. | `courseId`\*, `days` | EDUCATOR, ADMIN |
| `get_bloom_distribution` | Get the Bloom's taxonomy level distribution for students in a course. | `courseId`\* | EDUCATOR, ADMIN |
| `get_faculty_intelligence` | Combined faculty intelligence: morning briefing, top actions, assignment scorecard. | `courseId` | EDUCATOR, ADMIN |

---

### Content (`content-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `generate_rubric` | Create a grading rubric from assignment title and description. AI-generated criteria with performance bands. | `courseId`\*, `assignmentTitle`\*, `assignmentDescription`\*, `pointsPossible` | EDUCATOR, ADMIN |
| `create_discussion_prompt` | Generate discussion board prompts at a target Bloom's level. Returns 2-3 prompts with rubric criteria. | `courseId`\*, `topic`\*, `bloomLevel`, `count` | EDUCATOR, ADMIN |
| `build_practice_exam` | Generate a full practice exam with answer key targeting weak concepts. **confirm** | `courseId`\*, `studentId`, `questionCount` | EDUCATOR, STUDENT, ADMIN |
| `check_contrast` | Check HTML content for WCAG AA color contrast violations. | `htmlContent`, `appId` | EDUCATOR, ADMIN, STUDENT |
| `compliance_report` | Generate an ADA compliance report for a course, department, or university. WCAG 2.1 AA. | `scope`, `scopeId` | EDUCATOR, ADMIN, STAFF |
| `remediate_content` | Auto-fix accessibility issues in a course material or tool (headings, readability, structure). **confirm** | `targetType`, `targetId`, `courseId`, `fixTypes`, `apply` | EDUCATOR, ADMIN |
| `accessibility_scan` | Run a full ADA/WCAG accessibility scan on a course material or entire course. **confirm** | `materialId`, `courseId`, `text` | EDUCATOR, ADMIN |
| `check_readability` | Analyze text readability using Flesch-Kincaid scoring. Grade level, jargon, long sentences. | `text`, `toolId`, `courseId`, `simplify` | EDUCATOR, ADMIN, STUDENT |
| `generate_alt_text` | Generate accessible alt text for images using AI vision analysis. Bulk or single mode. **confirm** | `mode`, `imageUrl` | EDUCATOR, ADMIN |

---

### Faculty (`faculty-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_advisee_list` | List advisees with registration holds, degree-audit-review needs, and registration window. | `facultyId` | EDUCATOR, ADMIN |
| `get_advisee_detail` | Get detailed advisee profile with courses, hold details, and degree-progress context. | `facultyId`, `adviseeId`, `studentId`, `studentEmail`, `studentName` | EDUCATOR, ADMIN |
| `draft_recommendation` | Draft a faculty recommendation letter. Updates stored draft or creates new request. **confirm** | `studentName`\*, `purpose`\*, `targetOrg`\*, `facultyId`, `requestId`, `studentEmail`, `dueDate`, `facultyNotes` | EDUCATOR, ADMIN |
| `get_committee_actions` | List committee action items assigned to the faculty member across all committees. | `facultyId` | EDUCATOR, ADMIN |
| `complete_committee_action` | Mark a committee action item complete. **confirm** | `actionId`\*, `facultyId`, `notes` | EDUCATOR, ADMIN |

---

### Document (`document-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `search_documents` | Search the internal document library by query and/or tags. | `query`\*, `tags` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `get_document_info` | Get metadata for a specific document by ID. | `document_id`\* | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |

---

### AI Literacy (`ai-literacy-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_stance_profile` | Get the faculty member's current AI teaching stance (Prohibit to Require). | _(none)_ | EDUCATOR, ADMIN |
| `start_stance_assessment` | Begin the guided AI stance reflection (10-question assessment). | _(none)_ | EDUCATOR, ADMIN |
| `get_stance_distribution` | Show anonymized campus-wide distribution of AI teaching stances. | _(none)_ | EDUCATOR, ADMIN |
| `analyze_assignment_ai_risk` | Analyze an assignment for AI completability. Vulnerability score + redesign suggestions. | `description`\*, `assignmentType`, `discipline` | EDUCATOR, ADMIN |
| `generate_ai_policy` | Generate an AI policy for a course based on instructor's stance. **confirm** | `courseId`, `stance` | EDUCATOR, ADMIN |
| `ai_literacy_coach` | Comprehensive AI literacy readiness assessment -- stance, policy coverage, next step. | _(none)_ | EDUCATOR, ADMIN |
| `get_campus_ai_pulse` | Campus-wide AI readiness metrics -- policy coverage, stance distribution, trends. | _(none)_ | EDUCATOR, ADMIN |
| `suggest_assignment_redesign_from_grading` | Suggest redesigning an assignment instead of detecting AI use. Scans for vulnerabilities. | `assignmentDescription` | EDUCATOR, ADMIN |
| `start_advising_practice` | Start interactive advising practice (Sandy roleplays student/colleague). | `scenario` | EDUCATOR, ADMIN |
| `get_prompt_lab_progress` | Get the user's Prompt Lab progress -- attempts, scores, per-level breakdown. | _(none)_ | STUDENT, EDUCATOR, ADMIN, STAFF |
| `get_output_eval_progress` | Get the user's Output Evaluator progress -- evaluations, scores, per-tier breakdown. | _(none)_ | STUDENT, EDUCATOR, ADMIN, STAFF |
| `suggest_prompt_lab_challenge` | Recommend a Prompt Lab challenge based on weakest skill level. | _(none)_ | STUDENT, EDUCATOR, ADMIN, STAFF |
| `get_output_eval_scenario` | Get an Output Evaluator scenario for practice. Auto-selects weakest tier. | `tier` | STUDENT, EDUCATOR, ADMIN, STAFF |
| `get_progressive_profile` | Get a user's progressive AI profile -- 5 dimensions, readiness band, materialization status. | `targetEmail` | STUDENT, EDUCATOR, ADMIN, STAFF |
| `recalculate_profile` | Recalculate the user's progressive AI profile based on latest activity. | `studentLessonCompletions` | STUDENT, EDUCATOR, ADMIN, STAFF |
| `get_student_ai_policies` | Get a student's enrolled course AI policies -- stance, summary, clarity check status. | _(none)_ | STUDENT, ADMIN |
| `check_assignment_ai_policy` | Check whether AI is allowed for a specific course. Returns policy excerpts. | `courseName`\*, `assignmentDescription` | STUDENT, ADMIN |
| `get_student_literacy_profile` | Get the student's AI Literacy profile -- 4 dimensions, readiness band, module completion. | _(none)_ | STUDENT, ADMIN |
| `suggest_ai_strategy_for_course` | Suggest 3-5 ways to use AI effectively in a course based on its AI policy stance. | `courseName`\* | STUDENT, ADMIN |
| `start_study_coach_session` | Start a new AI Study Coach session on a topic (optionally linked to a course). | `topic`\*, `courseName` | STUDENT, ADMIN |
| `get_student_module_recommendations` | Recommend next best AI Literacy module(s) based on profile gaps. | _(none)_ | STUDENT, ADMIN |
| `build_starter_pack` | Launch the Starter Pack Builder for a personalized AI integration pack. | _(none)_ | EDUCATOR, ADMIN |
| `get_pack_status` | Check implementation progress on a faculty member's starter pack. | `courseId` | EDUCATOR, ADMIN |
| `suggest_next_assignment` | Suggest the next assignment from the faculty's starter pack to implement. | `packId` | EDUCATOR, ADMIN |

---

### University Systems (`university-systems-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `book_room` | Search for and book available classrooms/meeting rooms on campus. **confirm** | `date`\*, `startTime`\*, `endTime`\*, `capacity`, `building` | EDUCATOR, ADMIN, STAFF, STUDENT, REGISTRAR |
| `log_attendance` | Log attendance for a course session (present, absent, excused, late). **confirm** | `courseId`\*, `records`\*, `date` | EDUCATOR, ADMIN |
| `get_attendance_summary` | Get attendance summary and risk flags for a course. | `courseId`\* | EDUCATOR, ADMIN |
| `submit_grades_to_sis` | Submit final grades to Banner SIS. **confirm** | `courseId`\*, `grades`\* | EDUCATOR, ADMIN |
| `check_enrollment_changes` | Check for enrollment changes (dropped/added students) in a course. | `courseId`\* | EDUCATOR, ADMIN |
| `start_reimbursement` | Start a travel reimbursement request with trip details and expenses. **confirm** | `tripPurpose`\*, `destination`\*, `startDate`\*, `endDate`\*, `expenses`\*, `fundingSource` | EDUCATOR, ADMIN, STAFF, STUDENT, REGISTRAR |
| `search_travel_grants` | Search for conference travel grant opportunities. Can match grants to a trip description. | `category`, `tripDescription` | EDUCATOR, ADMIN, STAFF, STUDENT, REGISTRAR |
| `update_department_website` | Submit a change request for department website profile (office hours, bio, etc.). **confirm** | `section`\*, `newContent`\*, `pageUrl`, `currentContent` | EDUCATOR, ADMIN, STAFF |
| `review_paper` | Start or continue reviewing an academic paper with AI assistance. **confirm** | `title`, `authors`, `source`, `venue`, `dueDate`, `paperContent`, `reviewId` | EDUCATOR, ADMIN |
| `get_my_reimbursements` | View your travel reimbursement requests and their status. | _(none)_ | EDUCATOR, ADMIN, STAFF, STUDENT, REGISTRAR |

---

### Fingerprint (`fingerprint-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_learner_profile` | Get the engagement fingerprint and learning profile for the current user. Chronotype, cadence, modes, collaboration style. | _(none)_ | STUDENT, EDUCATOR, ADMIN, STAFF |
| `get_class_profile` | Get the aggregated engagement fingerprint for a course section. Class-level patterns without identifying individuals. | `courseId`\* | EDUCATOR, ADMIN |

---

### Crisis Comms (`crisis-comms-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `start_crisis_drill` | Navigate user to Crisis Spokesperson Trainer. Optionally suggest scenario and difficulty. | `suggestedScenario`, `suggestedDifficulty` | EDUCATOR, ADMIN, STAFF, STUDENT, REGISTRAR |
| `get_crisis_drill_history` | Retrieve past crisis spokesperson drill results including scores and trends. | `limit` | EDUCATOR, ADMIN, STAFF, STUDENT, REGISTRAR |
| `start_crisis_incident` | Start a new crisis incident in the Command Center. Suggests demo scenarios. | `scenarioId` | EDUCATOR, ADMIN, STAFF, STUDENT, REGISTRAR |
| `get_crisis_incidents` | Get the user's recent crisis incidents and their current status. | _(none)_ | EDUCATOR, ADMIN, STAFF, STUDENT, REGISTRAR |

---

### Philanthropy (`philanthropy-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `start_philanthropy_campaign` | Navigate user to Philanthropy Assistant for donation outreach. Pre-fill org and city. | `organization`, `city` | STUDENT, EDUCATOR, ADMIN, STAFF, REGISTRAR |
| `get_campaign_history` | Retrieve past philanthropy outreach campaigns with contact status summaries. | `limit` | STUDENT, EDUCATOR, ADMIN, STAFF, REGISTRAR |
| `get_outreach_tip` | Provide a quick philanthropy outreach coaching tip (cold-call, email, follow-up, objections). | `topic` | STUDENT, EDUCATOR, ADMIN, STAFF, REGISTRAR |

---

### Learning Goals (`learning-goal-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_learning_goals` | Get the student's declared learning goals from My Path, including milestones and progress. | _(none)_ | STUDENT |
| `update_goal_progress` | Mark a milestone as completed on a student's learning goal. **confirm** | `milestoneId`\* | STUDENT |

---

### MEI (`mei-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_mei_score` | Get Mastery Efficiency Index scores for a tool assessment assignment. Educators see class summary; students see own score + trajectory. | `assignmentId`\*, `studentId` | STUDENT, EDUCATOR, ADMIN |

---

### Success (`success-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_student_success_score` | Get a student's current success score and trajectory for a course. Composite score, top risk signals, active alerts. | `studentEmail`\*, `courseId`\* | EDUCATOR, ADMIN |
| `get_course_risk_summary` | Get risk distribution and top at-risk students for a course (healthy/watch/concern/urgent/critical). | `courseId`\* | EDUCATOR, ADMIN |
| `get_intervention_effectiveness` | Get intervention outcome statistics for a course. Shows which outreach types work best. | `courseId`\* | EDUCATOR, ADMIN |
| `suggest_intervention` | Get AI-generated intervention suggestions for a specific at-risk student alert. | `alertId`\* | EDUCATOR, ADMIN |

---

### Accreditation (`accreditation-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_accreditation_readiness` | Get overall accreditation readiness status: standards met, gaps, timeline, compliance score. | _(none)_ | ADMIN |
| `get_compliance_gaps` | List current compliance gaps sorted by severity. Missing evidence, remediation suggestions. | `severity` | ADMIN, STAFF |
| `generate_compliance_narrative` | Generate an AI draft compliance narrative for a SACSCOC standard. **confirm** | `standardNumber`\* | ADMIN |
| `simulate_peer_review` | Generate simulated peer reviewer questions based on current compliance state. | _(none)_ | ADMIN |

---

### Classroom Intelligence (`classroom-intelligence-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `get_concept_difficulty` | Get the concept difficulty map for a course -- which concepts students are struggling with. | `courseId`\* | EDUCATOR, ADMIN |
| `get_teaching_insights` | Get unread teaching insight cards for your courses. Suggested interventions. | `courseId` | EDUCATOR, ADMIN |
| `get_weekly_pulse` | Get this week's Teaching Pulse summary for a course -- concept heatmap, engagement, takeaways. | `courseId`\* | EDUCATOR, ADMIN |
| `get_teaching_intervention_effectiveness` | See which teaching interventions have been most effective in your courses. | `courseId`\* | EDUCATOR, ADMIN |
| `log_teaching_intervention` | Record a teaching adjustment made in response to student difficulty data. | `courseId`\*, `approach`\*, `description`\*, `concepts`\* | EDUCATOR, ADMIN |

---

### Tasks (`task-tools.ts`)

| Tool | Description | Params | Roles |
|------|-------------|--------|-------|
| `create_task` | Create a personal task (to-do list, reminder, action item). | `title`\*, `description`, `priority`, `dueDate`, `tags` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `list_tasks` | List the user's tasks. Returns open tasks by default. | `status`, `priority` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |
| `complete_task` | Mark a task as done. Matches by ID or partial title. | `taskId`, `titleMatch` | EDUCATOR, STUDENT, ADMIN, STAFF, REGISTRAR |

---

## Notes

- **`*`** after a param name means it is required.
- **confirm** means the tool requires user approval before executing (Sandy shows a preview card).
- All tool files live under `app/lib/agent/tools/`.
- The `ai-literacy-tools.ts` module is exported as a default export; all others use named exports.
- Calendar module's `create_task` and `complete_task` are distinct from the Tasks module's tools (Calendar wraps `task-service.ts`; Tasks wraps `prisma.task` directly).
