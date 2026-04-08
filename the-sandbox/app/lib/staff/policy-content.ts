// ─── Policy Content ──────────────────────────────────────────
// Policy data source priority:
//   1. Real UK policies from prisma/data/uk-policies.json (scraped from regs.uky.edu)
//   2. Simulated fallback data (30 policies modeled after UK ARs)
//
// To refresh real policies: npx tsx scripts/ingest-uk-policies.ts
// The JSON file is committed to the repo so db:seed always has real data.

import * as fs from 'fs'
import * as path from 'path'

export interface PolicySeed {
  policyNumber: string
  title: string
  category: string
  responsibleOffice: string
  appliesTo: string
  effectiveDate: string // ISO date string
  lastRevised: string   // ISO date string
  fullText: string      // complete markdown
  sourceUrl?: string    // regs.uky.edu URL (real policies only)
}

// ─── Load real policies from JSON if available ──────────────────
function loadRealPolicies(): PolicySeed[] | null {
  try {
    const jsonPath = path.resolve(__dirname, '../../../prisma/data/uk-policies.json')
    if (!fs.existsSync(jsonPath)) return null
    const raw = fs.readFileSync(jsonPath, 'utf-8')
    const data = JSON.parse(raw) as Array<{
      policyNumber: string
      title: string
      category: string
      responsibleOffice: string
      appliesTo: string
      effectiveDate: string
      lastRevised: string
      fullText: string
      sourceUrl?: string
      pdfUrl?: string | null
    }>
    if (!Array.isArray(data) || data.length === 0) return null
    console.log(`📜 Loaded ${data.length} real UK policies from uk-policies.json`)
    return data.map((p) => ({
      policyNumber: p.policyNumber,
      title: p.title,
      category: p.category,
      responsibleOffice: p.responsibleOffice,
      appliesTo: p.appliesTo,
      effectiveDate: p.effectiveDate,
      lastRevised: p.lastRevised,
      fullText: p.fullText,
      sourceUrl: p.sourceUrl,
    }))
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
// HR & EMPLOYMENT (8)
// ═══════════════════════════════════════════════════════════════

const AR_2_9: PolicySeed = {
  policyNumber: 'AR 2:9',
  title: 'Flexible Work Arrangements',
  category: 'HR & Employment',
  responsibleOffice: 'Human Resources',
  appliesTo: 'All regular full-time and part-time employees',
  effectiveDate: '2026-01-15',
  lastRevised: '2026-01-15',
  fullText: `# AR 2:9 — Flexible Work Arrangements

**Policy Number:** AR 2:9
**Effective Date:** January 15, 2026
**Last Revised:** January 15, 2026
**Responsible Office:** Human Resources
**Applies To:** All regular full-time and part-time employees
**Category:** HR & Employment

## 1. Purpose

This policy establishes guidelines for flexible work arrangements, including remote work, compressed schedules, and adjusted hours, to support work-life balance while maintaining operational effectiveness. The University of Kentucky recognizes that flexible work arrangements can enhance employee satisfaction, improve recruitment and retention, and contribute to the institution's sustainability goals by reducing commuting. However, the university's primary mission of education, research, and service requires that all flexible arrangements maintain or improve departmental productivity and service delivery.

## 2. Definitions

- **Remote Work:** Performing assigned duties from an approved location other than the employee's primary campus workspace. Remote work may be full-time (rare, requires VP approval) or partial (most common).
- **Compressed Schedule:** Working the standard number of hours in fewer days (e.g., four 10-hour days per week). Compressed schedules must still provide coverage during core business hours.
- **Hybrid Arrangement:** A combination of on-campus and remote work days following a predictable weekly pattern.
- **Adjusted Hours:** A shift in daily start/end times (e.g., 7:00 AM – 3:30 PM instead of 8:00 AM – 4:30 PM) while maintaining the standard number of hours.
- **Core Business Hours:** The period during which all employees must be available regardless of work arrangement: Monday through Friday, 9:00 AM – 3:00 PM Eastern Time.

## 3. Eligibility

3.1 All regular employees are eligible to request a flexible work arrangement after completing their initial probationary period (typically 6 months). Temporary, seasonal, and student employees are not eligible unless specifically authorized by the division Vice President.

3.2 Eligibility is determined by the nature of the position, departmental needs, and the employee's performance record. Employees with active performance improvement plans or recent disciplinary actions within the past 12 months are not eligible.

3.3 Not all positions are suitable for remote work. Positions requiring physical presence (laboratory work, direct student services, facilities maintenance, public safety, healthcare delivery) may be limited to adjusted hours or compressed schedules only.

3.4 Supervisors retain discretion to deny or modify requests based on operational needs, team coverage requirements, or position-specific constraints. Denials must be documented in writing with specific rationale.

## 4. Requirements

4.1 **Supervisor Approval:** All arrangements must be approved by the employee's direct supervisor and department head. Arrangements involving more than 2 remote days per week additionally require approval from the division Vice President.

4.2 **Minimum On-Campus Days:** Remote work arrangements must include a minimum of 3 days per week on campus unless a specific exception is granted by the division VP. Fully remote arrangements (0 on-campus days) require Provost or appropriate VP approval and are reserved for positions where 100% of duties can be performed off-site.

4.3 **Trial Period:** All new arrangements begin with a 30-day trial period, after which the supervisor evaluates effectiveness based on productivity metrics, communication responsiveness, and team impact. The supervisor may extend the trial by an additional 30 days if needed.

4.4 **Equipment:** The university is not obligated to provide home office equipment beyond a university-issued laptop (if applicable to the position). Employees must ensure adequate workspace, reliable internet connectivity (minimum 25 Mbps download), and compliance with IT security policies for remote access.

4.5 **Availability:** Employees must be available during core business hours (9:00 AM – 3:00 PM Eastern) regardless of location. Response time expectations: email within 2 hours, instant message within 30 minutes, phone calls same business day.

4.6 **Data Security:** Employees working remotely must comply with IT Policy 9:1 (Data Classification and Handling). Confidential and restricted data may only be accessed via university VPN. Physical documents classified as Confidential or above may not be removed from campus.

4.7 **Workers' Compensation:** The university's workers' compensation coverage extends to injuries occurring in the approved remote work location during scheduled work hours. Employees must designate a specific workspace in their remote work agreement.

## 5. Process

5.1 Employee submits a Flexible Work Request Form (HR-FWA-01) to their supervisor, specifying the requested arrangement type, proposed schedule, and how departmental coverage will be maintained.

5.2 Supervisor reviews with department head within 10 business days. The review considers: position suitability, team coverage, employee performance history, and departmental needs.

5.3 Approved arrangements are documented in the employee's HR file with the specific schedule, start date, and trial period end date.

5.4 Arrangements are reviewed annually during the performance evaluation cycle or upon significant role change, reorganization, or change in supervisor.

5.5 Employees must complete the Remote Work Safety Checklist (HR-FWA-02) before beginning any remote work arrangement.

## 6. Revocation

6.1 Either party may end the arrangement with 2 weeks' written notice. The employee returns to the standard on-campus schedule at the end of the notice period.

6.2 The university reserves the right to revoke arrangements immediately for operational necessity, including but not limited to: campus emergencies, critical project deadlines, accreditation visits, or significant events requiring on-campus presence.

6.3 Failure to maintain performance standards, responsiveness requirements, or data security protocols is grounds for immediate revocation without notice.

6.4 Appeals of revocation decisions may be submitted to Human Resources within 10 business days. HR will review and provide a final determination within 15 business days.`,
}

const AR_3_1: PolicySeed = {
  policyNumber: 'AR 3:1',
  title: 'Recruitment and Hiring Process',
  category: 'HR & Employment',
  responsibleOffice: 'Human Resources',
  appliesTo: 'All hiring managers and HR liaisons',
  effectiveDate: '2025-08-01',
  lastRevised: '2025-08-01',
  fullText: `# AR 3:1 — Recruitment and Hiring Process

**Policy Number:** AR 3:1
**Effective Date:** August 1, 2025
**Last Revised:** August 1, 2025
**Responsible Office:** Human Resources
**Applies To:** All hiring managers and HR liaisons
**Category:** HR & Employment

## 1. Purpose

This policy establishes a uniform, equitable, and legally compliant process for recruiting, selecting, and hiring university employees. It ensures that all employment decisions are based on job-related qualifications and that the university fulfills its commitment to equal opportunity and affirmative action in hiring.

## 2. Definitions

- **Regular Employee:** A full-time or part-time employee occupying a budgeted position with an expectation of continued employment. Regular employees are eligible for university benefits.
- **Temporary Employee:** An employee hired for a specific period not exceeding 12 months. Temporary positions may not be renewed more than once without reclassification review.
- **Adjunct Faculty:** A non-tenure-track instructor hired on a per-semester or per-course basis. Adjunct appointments are governed by additional provisions in Section 7.
- **Hiring Manager:** The supervisor or designee responsible for the recruitment and selection process for a specific position.
- **Search Committee:** A group of 3-5 individuals appointed by the hiring manager to review applications, conduct interviews, and recommend candidates. Required for all positions at pay grade 10 and above.

## 3. Position Authorization

3.1 All new positions must be approved through the Budget Office via the Position Authorization Form (HR-PA-01). The form requires: position justification, funding source, classification, salary range, and reporting structure.

3.2 Replacement positions for existing budgeted lines may proceed with department head approval. The hiring manager must verify the position description is current and accurately reflects the role.

3.3 The Classification and Compensation unit must review and approve the position classification and salary band before posting. Standard turnaround is 5 business days.

## 4. Posting Requirements

4.1 All regular positions must be posted for a minimum of 10 business days. Internal-only postings are permitted for the first 5 days, after which the position must be opened externally if no qualified internal candidates are identified.

4.2 Position postings must include: title, department, essential duties, minimum qualifications, preferred qualifications, salary range or "commensurate with experience," application deadline, and EEO statement.

4.3 Postings are managed through the university's applicant tracking system (UK Jobs). Department websites and professional organizations may be used as supplemental posting locations.

4.4 Emergency hires (positions that must be filled within 5 business days due to critical operational need) may bypass the standard posting period with written approval from the division Vice President and HR Director.

## 5. Interview Process

5.1 The search committee (or hiring manager for positions below grade 10) screens applications against posted minimum qualifications. All applicants meeting minimum qualifications must be considered.

5.2 A structured interview rubric must be developed before interviews begin. The rubric must align with posted qualifications and be applied consistently to all candidates.

5.3 A minimum of 3 candidates should be interviewed when the applicant pool allows. Phone/video screening interviews may precede on-campus interviews.

5.4 Reference checks (minimum 3 professional references) must be completed before extending an offer. References must include at least one direct supervisor.

5.5 All interview questions must be job-related. Questions about age, race, religion, national origin, disability, marital status, sexual orientation, or other protected characteristics are prohibited.

## 6. Offer and Onboarding

6.1 All offers of employment must be contingent on successful completion of a background check, including criminal history, education verification, and (for applicable positions) driving record and credit check.

6.2 Offer letters are generated by HR and must include: start date, salary, position title, supervisor, probationary period, and benefits eligibility date.

6.3 New employees must complete the 90-day onboarding checklist (HR-ON-01), which includes: orientation, benefits enrollment, IT account setup, safety training, and Title IX training.

6.4 The probationary period for new regular employees is 6 months. During this period, employment may be terminated with or without cause with supervisor approval.

## 7. Temporary and Adjunct Hiring

7.1 Temporary positions follow a streamlined process: department head approval, 5-day internal posting (external posting optional), and single-interview selection.

7.2 Adjunct faculty positions require: department chair recommendation, dean's office approval, and verification of academic credentials (official transcripts for the highest degree).

7.3 Adjunct compensation follows the published Adjunct Pay Scale, which is reviewed annually. The current rate is published in the Faculty Handbook Appendix C.

7.4 No individual may serve in temporary or adjunct capacity for more than 24 cumulative months within a 36-month period without a formal reclassification review.`,
}

const AR_3_2: PolicySeed = {
  policyNumber: 'AR 3:2',
  title: 'Classification and Compensation',
  category: 'HR & Employment',
  responsibleOffice: 'Human Resources — Classification and Compensation',
  appliesTo: 'All regular staff employees',
  effectiveDate: '2025-07-01',
  lastRevised: '2025-12-01',
  fullText: `# AR 3:2 — Classification and Compensation

**Policy Number:** AR 3:2
**Effective Date:** July 1, 2025
**Last Revised:** December 1, 2025
**Responsible Office:** Human Resources — Classification and Compensation
**Applies To:** All regular staff employees
**Category:** HR & Employment

## 1. Purpose

This policy establishes the framework for classifying staff positions and determining compensation to ensure internal equity, external competitiveness, and compliance with federal and state wage laws.

## 2. Classification System

2.1 All staff positions are assigned to a classification within the university's pay grade structure (Grades 1–20). Each grade has a defined pay range with minimum, midpoint, and maximum.

2.2 Position classifications are based on job duties, required qualifications, supervisory responsibilities, and decision-making authority as documented in the Position Description Questionnaire (PDQ).

2.3 Reclassification requests may be submitted when job duties have changed substantially (typically 25% or more of responsibilities). Reclassifications are reviewed by the Classification and Compensation unit with a standard turnaround of 20 business days.

## 3. Salary Determination

3.1 Starting salary for new hires is typically set between the minimum and midpoint of the applicable pay grade, based on relevant experience and internal equity with current employees in comparable roles.

3.2 Hiring above midpoint requires written justification and approval from the division Vice President and HR Director.

3.3 Annual merit increases are determined by the Board of Trustees during the budget approval process and are distributed based on performance evaluation ratings: Exceptional (up to 5%), Exceeds Expectations (up to 4%), Meets Expectations (up to 3%), Needs Improvement (0%).

## 4. Pay Equity Reviews

4.1 The Classification and Compensation unit conducts a university-wide pay equity analysis annually, examining compensation across gender, race/ethnicity, and other protected characteristics.

4.2 Departments may request a targeted equity review at any time by contacting HR. Adjustments identified through equity reviews are funded centrally and do not reduce departmental operating budgets.

## 5. Overtime and FLSA

5.1 Positions classified as non-exempt under the Fair Labor Standards Act are eligible for overtime at 1.5x the regular hourly rate for hours worked over 40 per workweek.

5.2 All overtime must be pre-approved by the employee's supervisor. Unauthorized overtime is still compensable but may result in disciplinary action.

5.3 Exempt employees are not eligible for overtime but may receive compensatory time at the supervisor's discretion for extraordinary work periods.`,
}

const AR_3_7: PolicySeed = {
  policyNumber: 'AR 3:7',
  title: 'Leave Policies — Vacation, Sick, and Personal',
  category: 'HR & Employment',
  responsibleOffice: 'Human Resources',
  appliesTo: 'All regular employees',
  effectiveDate: '2025-07-01',
  lastRevised: '2025-07-01',
  fullText: `# AR 3:7 — Leave Policies — Vacation, Sick, and Personal

**Policy Number:** AR 3:7
**Effective Date:** July 1, 2025
**Last Revised:** July 1, 2025
**Responsible Office:** Human Resources
**Applies To:** All regular employees
**Category:** HR & Employment

## 1. Purpose

This policy establishes the types of paid leave available to regular employees, accrual rates, usage guidelines, and carryover provisions. The university provides a comprehensive leave program to support employee health, well-being, and personal needs while ensuring continuity of operations.

## 2. Vacation Leave

2.1 **Accrual Rates by Years of Service:**
- 0–5 years: 10 days per year (accrued at 3.08 hours per pay period)
- 6–10 years: 15 days per year (accrued at 4.62 hours per pay period)
- 11–20 years: 20 days per year (accrued at 6.15 hours per pay period)
- 21+ years: 22 days per year (accrued at 6.77 hours per pay period)

2.2 Part-time employees accrue vacation on a pro-rated basis according to their FTE.

2.3 Vacation requests must be submitted at least 2 weeks in advance and are subject to supervisor approval based on departmental coverage needs. Requests during peak periods (commencement, enrollment, fiscal year-end) may be limited.

2.4 **Carryover:** Employees may carry over up to 30 days (240 hours) of unused vacation leave into the next fiscal year. Hours exceeding 30 days as of June 30 are forfeited unless the employee was denied leave during the fiscal year, in which case an extension may be granted by HR.

2.5 Upon separation from the university, employees are paid for accrued unused vacation leave up to the carryover maximum.

## 3. Sick Leave

3.1 All regular employees accrue 12 days (96 hours) of sick leave per year, accrued at 3.69 hours per pay period. There is no maximum accumulation limit for sick leave.

3.2 Sick leave may be used for: personal illness or injury, medical and dental appointments, care of an ill immediate family member (as defined in AR 3:8), and mental health days (up to 3 per year without medical documentation).

3.3 Employees must notify their supervisor as soon as practicable on the first day of absence. For absences exceeding 3 consecutive days, a physician's statement may be required.

3.4 Sick leave is not paid out upon separation from the university. However, accumulated sick leave counts toward service credit for retirement purposes at a rate of 1 month of service credit per 21 days of accumulated sick leave.

## 4. Personal Leave

4.1 All regular employees receive 3 personal days (24 hours) per fiscal year. Personal days do not accrue and do not carry over — unused personal days are forfeited at the end of the fiscal year.

4.2 Personal days may be used for any purpose and do not require disclosure of the reason. A minimum of 24 hours' advance notice is requested but not required.

## 5. FMLA Integration

5.1 Employees who have worked for the university for at least 12 months and at least 1,250 hours are eligible for up to 12 weeks of unpaid leave under the Family and Medical Leave Act.

5.2 FMLA leave runs concurrently with paid sick leave and vacation leave. Employees must exhaust applicable paid leave before transitioning to unpaid FMLA leave.

5.3 Employees on FMLA leave retain all university benefits. The employee's share of health insurance premiums remains due during unpaid FMLA leave.

## 6. Leave Donation Program

6.1 Employees facing a medical emergency who have exhausted all paid leave may receive donated vacation leave from other employees through the Leave Donation Program.

6.2 Donations must be in increments of 8 hours (1 day). Donors must retain a minimum of 5 vacation days after the donation.`,
}

const AR_3_8: PolicySeed = {
  policyNumber: 'AR 3:8',
  title: 'Bereavement Leave',
  category: 'HR & Employment',
  responsibleOffice: 'Human Resources',
  appliesTo: 'All regular employees',
  effectiveDate: '2025-07-01',
  lastRevised: '2025-07-01',
  fullText: `# AR 3:8 — Bereavement Leave

**Policy Number:** AR 3:8
**Effective Date:** July 1, 2025
**Last Revised:** July 1, 2025
**Responsible Office:** Human Resources
**Applies To:** All regular employees
**Category:** HR & Employment

## 1. Purpose

This policy provides paid time off to employees who experience the death of a family member, allowing time for grieving, funeral arrangements, and related family obligations.

## 2. Immediate Family

2.1 Employees are granted up to 5 consecutive workdays of paid bereavement leave for the death of an immediate family member. Immediate family is defined as: spouse, domestic partner, child (including stepchild, adopted child, and foster child), parent (including stepparent and in-law parent), sibling (including step-sibling), grandparent, and grandchild.

2.2 Leave begins on the date of death or the next business day and need not be taken consecutively if funeral or memorial services are delayed. In such cases, leave must be used within 30 days of the date of death.

## 3. Extended Family

3.1 Employees are granted up to 3 consecutive workdays of paid bereavement leave for the death of an extended family member: aunt, uncle, niece, nephew, first cousin, brother-in-law, sister-in-law, son-in-law, daughter-in-law, or grandparent-in-law.

## 4. Documentation

4.1 Employees should notify their supervisor as soon as practicable. An obituary notice, funeral program, or death certificate may be requested for documentation purposes but is not required for leave approval.

## 5. Additional Time

5.1 If additional time is needed beyond the bereavement leave allocation (e.g., for travel to distant locations or estate matters), employees may use vacation or personal leave with supervisor approval.

5.2 In exceptional circumstances (e.g., death of a child, multiple family deaths), the department head may authorize up to 5 additional days of paid leave with HR approval.

## 6. Interaction with Other Leave

6.1 Bereavement leave is separate from and does not reduce vacation, sick, or personal leave balances. It is a standalone benefit.

6.2 If an employee is already on approved leave (vacation, sick, FMLA) when a death occurs, the leave type may be converted to bereavement leave for the applicable period.`,
}

const AR_3_10: PolicySeed = {
  policyNumber: 'AR 3:10',
  title: 'Performance Evaluation',
  category: 'HR & Employment',
  responsibleOffice: 'Human Resources',
  appliesTo: 'All regular employees and their supervisors',
  effectiveDate: '2025-07-01',
  lastRevised: '2025-11-01',
  fullText: `# AR 3:10 — Performance Evaluation

**Policy Number:** AR 3:10
**Effective Date:** July 1, 2025
**Last Revised:** November 1, 2025
**Responsible Office:** Human Resources
**Applies To:** All regular employees and their supervisors
**Category:** HR & Employment

## 1. Purpose

This policy establishes a consistent framework for evaluating employee performance, providing constructive feedback, recognizing achievements, and identifying professional development needs. Annual performance evaluations are a key factor in merit increase determinations.

## 2. Evaluation Cycle

2.1 The annual evaluation period runs from July 1 through June 30. Written evaluations are due by August 15 each year.

2.2 Supervisors must conduct a mid-year check-in (December–January) to discuss progress on goals and address any performance concerns. Mid-year check-ins are documented but do not replace the annual evaluation.

## 3. Rating Scale

3.1 Evaluations use a 4-point rating scale: Exceptional (4), Exceeds Expectations (3), Meets Expectations (2), Needs Improvement (1).

3.2 An overall rating of Needs Improvement triggers a mandatory Performance Improvement Plan (PIP) of 60–90 days. See Section 5.

## 4. Evaluation Components

4.1 Each evaluation covers: job knowledge and skills, quality of work, productivity, communication, teamwork and collaboration, initiative and problem-solving, and (for supervisors) leadership and staff development.

4.2 Evaluations include: self-assessment by the employee, supervisor narrative assessment, agreed-upon goals for the next evaluation period, and professional development plan.

## 5. Performance Improvement Plans

5.1 A PIP must include: specific performance deficiencies cited with examples, measurable improvement goals, resources and support provided, timeline (60–90 days), and consequences of failure to improve.

5.2 PIP progress meetings occur biweekly. At the conclusion of the PIP period, the supervisor issues a written determination: successful completion, PIP extension (maximum 30 additional days), or recommendation for disciplinary action.

## 6. Appeals

6.1 Employees may submit a written rebuttal to their evaluation within 10 business days of the evaluation meeting. The rebuttal is attached to the evaluation in the employee's HR file.

6.2 Employees who believe their evaluation is inaccurate or biased may request a review by the next-level supervisor and HR within 15 business days.`,
}

const AR_3_15: PolicySeed = {
  policyNumber: 'AR 3:15',
  title: 'Separation and Termination',
  category: 'HR & Employment',
  responsibleOffice: 'Human Resources — Employee Relations',
  appliesTo: 'All employees',
  effectiveDate: '2025-07-01',
  lastRevised: '2025-09-15',
  fullText: `# AR 3:15 — Separation and Termination

**Policy Number:** AR 3:15
**Effective Date:** July 1, 2025
**Last Revised:** September 15, 2025
**Responsible Office:** Human Resources — Employee Relations
**Applies To:** All employees
**Category:** HR & Employment

## 1. Purpose

This policy outlines the types of employment separation, the process for each, and the responsibilities of the departing employee, the supervisor, and the university during the separation process.

## 2. Types of Separation

2.1 **Voluntary Resignation:** Employee-initiated separation. A minimum of 2 weeks' written notice is expected; 30 days for management and professional positions.

2.2 **Involuntary Termination:** University-initiated separation for cause, including sustained poor performance, policy violations, or misconduct. Requires HR review and approval before action.

2.3 **Reduction in Force (RIF):** Position elimination due to reorganization, budget reductions, or program discontinuation. RIF procedures are governed by the separate RIF Policy (AR 3:16).

2.4 **Retirement:** Voluntary separation with eligibility for retirement benefits per the university retirement plan. Employees should provide 60 days' notice when possible.

## 3. Exit Process

3.1 All departing employees must complete an exit checklist (HR-EXIT-01) including: return of university property (keys, ID, equipment, P-card), final timesheet submission, benefits continuation information (COBRA), and exit interview.

3.2 IT access is deactivated on the last day of employment. Email forwarding may be maintained for 30 days with supervisor approval.

3.3 Final paychecks include all earned wages and accrued unused vacation leave (per AR 3:7). Final pay is issued on the next regular pay date.

## 4. Involuntary Termination Process

4.1 Before recommending involuntary termination, the supervisor must consult with HR Employee Relations. A pre-termination review evaluates: documentation of performance deficiencies or policy violations, prior corrective actions taken, consistency with treatment of similar situations, and any applicable contractual or legal obligations.

4.2 The employee is entitled to a pre-termination meeting where they may respond to the stated reasons for termination. The employee may bring a representative (union steward, if applicable, or a fellow employee).

4.3 Termination decisions are made by the department head with HR concurrence and are communicated in writing, including the effective date and information about appeal rights.

## 5. Appeal Rights

5.1 Regular employees who have completed their probationary period may appeal an involuntary termination through the Employee Grievance Procedure (AR 3:20) within 10 business days of the termination notice.`,
}

const AR_3_18: PolicySeed = {
  policyNumber: 'AR 3:18',
  title: 'Employee Training and Professional Development',
  category: 'HR & Employment',
  responsibleOffice: 'Human Resources — Organizational Development',
  appliesTo: 'All regular employees',
  effectiveDate: '2025-08-01',
  lastRevised: '2025-08-01',
  fullText: `# AR 3:18 — Employee Training and Professional Development

**Policy Number:** AR 3:18
**Effective Date:** August 1, 2025
**Last Revised:** August 1, 2025
**Responsible Office:** Human Resources — Organizational Development
**Applies To:** All regular employees
**Category:** HR & Employment

## 1. Purpose

This policy establishes the university's commitment to employee professional development, defines available programs, and outlines the process for accessing training opportunities and educational benefits.

## 2. Mandatory Training

2.1 All employees must complete the following within 30 days of hire and annually thereafter: workplace safety, Title IX and sexual harassment prevention, FERPA (for employees with access to student records), information security awareness, and ethics and conflict of interest.

2.2 Supervisors must complete additional mandatory training: supervisory fundamentals (within 90 days of assuming supervisory duties), performance management, and hiring and selection practices.

## 3. Professional Development Programs

3.1 The university offers professional development through: internal workshops and seminars (HR Training Calendar), LinkedIn Learning access (available to all employees at no cost), leadership development programs (by nomination), and conference attendance (subject to departmental funding).

3.2 Employees may request up to 4 hours per month of work time for professional development activities with supervisor approval.

## 4. Educational Benefits

4.1 **Employee Tuition Waiver:** Regular full-time employees may enroll in up to 6 credit hours per semester at the university with tuition waived (fees and books not included). Employees must maintain a grade of C or better.

4.2 **Dependent Tuition Waiver:** Spouses and dependent children of full-time employees with 1+ year of service receive a 50% tuition waiver for undergraduate courses.

4.3 Employees must have supervisor approval to attend classes during work hours. Work schedules may be adjusted to accommodate class times, subject to departmental needs.

## 5. Certification and Licensure

5.1 For positions requiring professional certification or licensure, the university pays renewal fees and provides up to 3 days of paid leave for exam preparation and testing.

5.2 Employees pursuing voluntary certifications relevant to their position may request reimbursement of exam fees (up to $500 per fiscal year) through the Professional Development Fund.`,
}

// ═══════════════════════════════════════════════════════════════
// FINANCE & PROCUREMENT (6)
// ═══════════════════════════════════════════════════════════════

const BPM_4_1: PolicySeed = {
  policyNumber: 'BPM 4:1',
  title: 'Purchase Order Thresholds and Approval Authority',
  category: 'Finance & Procurement',
  responsibleOffice: 'Procurement Services',
  appliesTo: 'All personnel authorized to make purchases',
  effectiveDate: '2025-09-01',
  lastRevised: '2025-09-01',
  fullText: `# BPM 4:1 — Purchase Order Thresholds and Approval Authority

**Policy Number:** BPM 4:1
**Effective Date:** September 1, 2025
**Last Revised:** September 1, 2025
**Responsible Office:** Procurement Services
**Applies To:** All personnel authorized to make purchases
**Category:** Finance & Procurement

## 1. Purpose

This policy establishes the dollar thresholds at which different levels of approval authority are required for university purchases, ensuring proper fiscal oversight while enabling efficient procurement of goods and services.

## 2. Approval Thresholds

2.1 The following approval levels apply to all purchases of goods and services, including contracts and renewals:

| Purchase Amount | Approval Authority | Documentation Required |
|---|---|---|
| Under $2,500 | P-Card holder (no PO required) | Receipt and P-Card log entry |
| $2,500 – $10,000 | Department Head | Purchase requisition with 2 informal quotes |
| $10,001 – $50,000 | Director/Dean | Purchase requisition with 3 written quotes |
| $50,001 – $250,000 | Vice President | Formal bid process managed by Procurement |
| Over $250,000 | Board of Trustees | Formal bid + Board agenda item + legal review |

2.2 All thresholds are based on the total contract value, including renewals and options, not just the initial purchase amount. Multi-year contracts must account for the aggregate value across all years.

## 3. Emergency Purchases

3.1 Emergency purchases exceeding the requester's normal authority may be made when delay would endanger health, safety, or critical university operations. The department head must approve and document the emergency justification within 24 hours.

3.2 Emergency purchases over $50,000 require VP notification within 48 hours and formal ratification at the next Board meeting.

## 4. Sole Source Justification

4.1 When competitive bidding is not feasible (proprietary technology, exclusive distributorship, or compatibility requirements), a Sole Source Justification Form (PROC-SS-01) must be completed and approved by Procurement Services.

4.2 Sole source purchases over $25,000 require additional approval from the Chief Financial Officer.

## 5. Split Purchase Prohibition

5.1 Dividing a purchase into smaller transactions to avoid higher approval thresholds is strictly prohibited and constitutes a policy violation subject to disciplinary action.

5.2 Procurement Services monitors purchasing patterns and may flag potential split purchases for review.

## 6. Documentation and Retention

6.1 All purchase documentation (requisitions, quotes, bids, contracts, justifications) must be retained for 7 years or the life of the contract plus 3 years, whichever is longer.

6.2 Procurement Services maintains the official purchase order system. Departments must use the system for all purchases over $2,500.`,
}

const BPM_4_3: PolicySeed = {
  policyNumber: 'BPM 4:3',
  title: 'Travel Reimbursement',
  category: 'Finance & Procurement',
  responsibleOffice: 'Accounts Payable',
  appliesTo: 'All employees traveling on university business',
  effectiveDate: '2025-09-01',
  lastRevised: '2025-09-01',
  fullText: `# BPM 4:3 — Travel Reimbursement

**Policy Number:** BPM 4:3
**Effective Date:** September 1, 2025
**Last Revised:** September 1, 2025
**Responsible Office:** Accounts Payable
**Applies To:** All employees traveling on university business
**Category:** Finance & Procurement

## 1. Purpose

This policy governs the reimbursement of travel expenses incurred by employees conducting official university business. All travel must be pre-approved and expenses must be reasonable, necessary, and properly documented.

## 2. Pre-Approval

2.1 In-state travel requires supervisor approval. Out-of-state travel requires department head approval via the Travel Authorization Form (FIN-TA-01), submitted at least 10 business days before departure.

2.2 International travel requires additional approval from the division Vice President and must be registered with the Office of International Affairs for insurance and safety purposes.

## 3. Transportation

3.1 **Airfare:** Coach/economy class only. Employees should book at least 14 days in advance when possible. Upgrades to premium economy or business class are not reimbursable unless the flight exceeds 8 hours and is pre-approved by the VP.

3.2 **Mileage:** Personal vehicle use is reimbursed at the current IRS standard mileage rate ($0.67/mile for 2025). Mileage is calculated from the employee's primary work location, not from home.

3.3 **Rental Vehicles:** Compact or intermediate class. The university's fleet should be used when available and practical. Rental car insurance should be declined as the university's auto policy provides coverage.

## 4. Lodging

4.1 Hotel expenses are reimbursed at the federal per diem rate for the destination city (GSA rates for domestic travel). Actual expenses exceeding per diem may be reimbursed with written justification and supervisor approval.

4.2 Conference hotel rates exceeding per diem are automatically approved when the employee is attending the associated conference.

## 5. Meals and Incidentals

5.1 Meals are reimbursed at per diem rates (no receipts required for per diem) or at actual cost with receipts. Per diem rates follow GSA schedules.

5.2 Alcohol is not reimbursable under any circumstances. Tips are reimbursable up to 20% for meals.

## 6. Receipts and Submission

6.1 Original itemized receipts are required for all expenses over $25. Credit card statements are not acceptable substitutes for itemized receipts.

6.2 Travel expense reports must be submitted within 30 calendar days of trip completion using the Travel Expense Report (FIN-TE-01). Reports submitted after 60 days may be denied.

6.3 Reimbursement is processed within 15 business days of approved submission.`,
}

const BPM_4_5: PolicySeed = {
  policyNumber: 'BPM 4:5',
  title: 'Procurement Card (P-Card) Usage',
  category: 'Finance & Procurement',
  responsibleOffice: 'Procurement Services',
  appliesTo: 'All P-Card holders and approvers',
  effectiveDate: '2025-09-01',
  lastRevised: '2026-01-15',
  fullText: `# BPM 4:5 — Procurement Card (P-Card) Usage

**Policy Number:** BPM 4:5
**Effective Date:** September 1, 2025
**Last Revised:** January 15, 2026
**Responsible Office:** Procurement Services
**Applies To:** All P-Card holders and approvers
**Category:** Finance & Procurement

## 1. Purpose

This policy governs the issuance, use, and management of university procurement cards to streamline low-dollar purchases while maintaining proper financial controls.

## 2. Eligibility and Issuance

2.1 P-Cards are issued to regular employees whose duties require routine purchasing, with supervisor recommendation and completion of P-Card training.

2.2 Standard single-transaction limit: $2,500. Monthly cycle limit: $10,000. Higher limits may be requested with department head and Procurement approval.

## 3. Authorized Uses

3.1 P-Cards may be used for: office supplies, laboratory supplies, subscriptions and memberships, conference registration fees, and low-dollar maintenance items.

3.2 P-Cards may NOT be used for: personal purchases, cash advances, gift cards, alcohol, firearms or weapons, travel expenses (use Travel Card), capital equipment over $5,000, or any purchase that should follow the formal PO process.

## 4. Reconciliation

4.1 Cardholders must reconcile all transactions within 5 business days of the monthly statement closing date. Each transaction requires: itemized receipt, business purpose, and proper account coding.

4.2 Approving supervisors must review and approve the monthly statement within 10 business days of statement close.

## 5. Violations

5.1 Misuse of a P-Card is a policy violation and may result in: card suspension, card revocation, requirement to reimburse the university, and disciplinary action up to and including termination.`,
}

const BPM_4_8: PolicySeed = {
  policyNumber: 'BPM 4:8',
  title: 'Grant Expenditure and Cost Principles',
  category: 'Finance & Procurement',
  responsibleOffice: 'Office of Sponsored Projects',
  appliesTo: 'All principal investigators and grant administrators',
  effectiveDate: '2025-09-01',
  lastRevised: '2025-09-01',
  fullText: `# BPM 4:8 — Grant Expenditure and Cost Principles

**Policy Number:** BPM 4:8
**Effective Date:** September 1, 2025
**Last Revised:** September 1, 2025
**Responsible Office:** Office of Sponsored Projects
**Applies To:** All principal investigators and grant administrators
**Category:** Finance & Procurement

## 1. Purpose

This policy ensures that expenditures charged to sponsored projects (grants, contracts, cooperative agreements) comply with federal Uniform Guidance (2 CFR 200), sponsor-specific terms, and university policies.

## 2. Cost Principles

2.1 All costs charged to sponsored projects must be: allowable (permitted by the sponsor and federal regulations), allocable (directly benefiting the project), reasonable (prudent person standard), and consistently treated (applied uniformly across all funding sources).

## 3. Unallowable Costs

3.1 The following are generally unallowable on federal grants: alcohol, entertainment, fines and penalties, fundraising, lobbying, alumni activities, and commencement expenses.

3.2 Pre-award costs are limited to 90 days before the award start date and must be specifically authorized by the sponsor or allowable under the award terms.

## 4. Approval Authority

4.1 The Principal Investigator (PI) is responsible for ensuring all expenditures are appropriate, allowable, and within budget. Budget transfers between categories exceeding 10% of the total budget require sponsor approval.

4.2 No-cost extensions, budget revisions, and scope changes must be routed through the Office of Sponsored Projects.

## 5. Effort Reporting

5.1 All personnel charged to sponsored projects must certify their effort quarterly. Effort certifications must reflect actual effort performed, not budgeted effort.

5.2 Effort reports are due within 30 days of the quarter end. Late certifications may result in suspension of spending authority on the project.

## 6. Equipment

6.1 Equipment purchased with grant funds (single item over $5,000 with useful life exceeding 1 year) is titled to the university but subject to sponsor terms regarding use, disposition, and reporting.`,
}

const BPM_4_10: PolicySeed = {
  policyNumber: 'BPM 4:10',
  title: 'Contract Approval and Signature Authority',
  category: 'Finance & Procurement',
  responsibleOffice: 'Office of Legal Counsel',
  appliesTo: 'All employees who negotiate or administer contracts',
  effectiveDate: '2025-06-01',
  lastRevised: '2025-06-01',
  fullText: `# BPM 4:10 — Contract Approval and Signature Authority

**Policy Number:** BPM 4:10
**Effective Date:** June 1, 2025
**Last Revised:** June 1, 2025
**Responsible Office:** Office of Legal Counsel
**Applies To:** All employees who negotiate or administer contracts
**Category:** Finance & Procurement

## 1. Purpose

This policy designates the individuals authorized to sign contracts on behalf of the university and establishes the review process to protect the university's legal and financial interests.

## 2. Signature Authority

2.1 Only the following individuals may sign contracts binding the university: the President, Provost, Executive Vice President for Finance, Vice Presidents (within their divisions), and specifically delegated individuals documented in the Signature Authority Matrix maintained by Legal Counsel.

2.2 Department heads, deans, directors, and other employees may NOT sign contracts unless specifically delegated.

## 3. Legal Review

3.1 All contracts must be reviewed by Legal Counsel before execution. Standard review turnaround: contracts under $50K — 5 business days; contracts $50K–$250K — 10 business days; contracts over $250K — 15 business days.

3.2 Contracts involving the following require expedited legal review regardless of dollar amount: indemnification clauses, limitation of liability, intellectual property rights, data privacy or FERPA implications, and international parties.

## 4. Contract Types

4.1 **Service Agreements:** For consulting, maintenance, and professional services. Must include scope of work, deliverables, timeline, payment terms, and termination provisions.

4.2 **Software and Technology:** Require ITS security review (per IT 9:5) in addition to legal review. Data handling and breach notification provisions are mandatory.

4.3 **Construction:** Governed by separate construction procurement regulations and require Facilities Management coordination.

## 5. Record Retention

5.1 All executed contracts must be filed with the Contract Management Office. Original signed copies are retained for the life of the contract plus 7 years.`,
}

const BPM_4_12: PolicySeed = {
  policyNumber: 'BPM 4:12',
  title: 'Vendor Selection and Supplier Diversity',
  category: 'Finance & Procurement',
  responsibleOffice: 'Procurement Services',
  appliesTo: 'All personnel involved in vendor selection',
  effectiveDate: '2025-09-01',
  lastRevised: '2025-09-01',
  fullText: `# BPM 4:12 — Vendor Selection and Supplier Diversity

**Policy Number:** BPM 4:12
**Effective Date:** September 1, 2025
**Last Revised:** September 1, 2025
**Responsible Office:** Procurement Services
**Applies To:** All personnel involved in vendor selection
**Category:** Finance & Procurement

## 1. Purpose

This policy ensures a fair, competitive, and transparent vendor selection process and promotes supplier diversity consistent with the university's commitment to economic inclusion.

## 2. Competitive Selection

2.1 All purchases above $2,500 require evidence of competitive selection. The method depends on the purchase amount as specified in BPM 4:1. Vendor selection must be based on best value, considering price, quality, delivery, and service.

2.2 Evaluation criteria must be established before solicitation and applied consistently to all respondents.

## 3. Supplier Diversity

3.1 The university is committed to the participation of Minority Business Enterprises (MBE), Women Business Enterprises (WBE), Small Disadvantaged Business Enterprises (SDBE), and veteran-owned businesses.

3.2 The university's goal is that 15% of addressable spend (by dollar volume) be directed to diverse suppliers. Departments should make good-faith efforts to include diverse suppliers in all competitive processes.

## 4. Conflicts of Interest

4.1 Employees involved in vendor selection must disclose any personal, financial, or familial relationship with a vendor or vendor representative. Conflicts require recusal from the selection process.

4.2 Employees may not accept gifts, meals, or entertainment from vendors valued at more than $25 individually or $100 in aggregate per calendar year from a single vendor.

## 5. Preferred Vendor Agreements

5.1 Procurement Services maintains university-wide agreements with preferred vendors for commonly purchased goods and services. Departments should use preferred vendors when available, as these agreements provide pre-negotiated pricing and terms.`,
}

// ═══════════════════════════════════════════════════════════════
// ACADEMIC & COMPLIANCE (5)
// ═══════════════════════════════════════════════════════════════

const AR_6_1: PolicySeed = {
  policyNumber: 'AR 6:1',
  title: 'FERPA Compliance — Student Educational Records',
  category: 'Academic & Compliance',
  responsibleOffice: 'Office of the Registrar',
  appliesTo: 'All university employees and contractors who access student records',
  effectiveDate: '2024-08-01',
  lastRevised: '2025-08-01',
  fullText: `# AR 6:1 — FERPA Compliance — Student Educational Records

**Policy Number:** AR 6:1
**Effective Date:** August 1, 2024
**Last Revised:** August 1, 2025
**Responsible Office:** Office of the Registrar
**Applies To:** All university employees and contractors who access student records
**Category:** Academic & Compliance

## 1. Purpose

This policy establishes the university's compliance framework for the Family Educational Rights and Privacy Act (FERPA, 20 U.S.C. § 1232g), which protects the privacy of student educational records and grants students specific rights regarding their records.

## 2. Directory Information

2.1 The university designates the following as directory information, which may be disclosed without student consent: full name, university email address, enrollment status (full-time/part-time), dates of attendance, degree(s) awarded and date(s), major/minor, classification (freshman, sophomore, etc.), participation in officially recognized activities and sports, and honors and awards.

2.2 Students may restrict release of directory information by submitting a FERPA Hold Request (REG-FH-01) to the Registrar's Office. The hold remains in effect until the student removes it in writing.

## 3. Non-Directory Information (Protected Records)

3.1 The following are protected and may NOT be disclosed without written student consent: grades, GPA, class schedule, student ID number, Social Security number, disciplinary records, financial aid information, billing records, and disability/accommodation records.

3.2 Protected records may be disclosed only to: the student, school officials with a legitimate educational interest, other schools where the student seeks enrollment (upon request), accreditation agencies, financial aid administrators, and in compliance with a lawful subpoena (with student notification required except under specific federal exceptions).

## 4. Legitimate Educational Interest

4.1 A school official has a legitimate educational interest if they need access to a student record to fulfill their professional responsibilities. This includes faculty advising or teaching the student, administrators managing programs in which the student participates, and staff providing services to the student.

4.2 Curiosity is not a legitimate educational interest. Accessing records outside one's professional need-to-know is a FERPA violation.

## 5. Parent Access

5.1 FERPA rights transfer from parents to students when the student turns 18 or enrolls in a postsecondary institution, regardless of age.

5.2 Parents may access student records only with written student consent or if the student is a dependent for federal income tax purposes (parent must provide documentation).

## 6. Training Requirements

6.1 All employees who access student records must complete FERPA training within 30 days of hire and annually thereafter. Training is provided through the FERPA Online Module in the university's LMS.

6.2 Supervisors are responsible for ensuring compliance within their departments. A record of training completion is maintained by the Registrar's Office.

## 7. Violations and Enforcement

7.1 FERPA violations may result in disciplinary action, including termination. Systemic violations may result in the loss of federal funding for the university.

7.2 Suspected violations must be reported immediately to the Registrar's Office and the Office of Legal Counsel. The university must respond to complaints filed with the U.S. Department of Education within 30 days.`,
}

const AR_6_3: PolicySeed = {
  policyNumber: 'AR 6:3',
  title: 'SACSCOC Reporting and Accreditation Compliance',
  category: 'Academic & Compliance',
  responsibleOffice: 'Office of Institutional Effectiveness',
  appliesTo: 'All academic and administrative units',
  effectiveDate: '2025-01-01',
  lastRevised: '2025-06-01',
  fullText: `# AR 6:3 — SACSCOC Reporting and Accreditation Compliance

**Policy Number:** AR 6:3
**Effective Date:** January 1, 2025
**Last Revised:** June 1, 2025
**Responsible Office:** Office of Institutional Effectiveness
**Applies To:** All academic and administrative units
**Category:** Academic & Compliance

## 1. Purpose

This policy ensures the university maintains compliance with the standards of the Southern Association of Colleges and Schools Commission on Colleges (SACSCOC), the institution's regional accreditor. Accreditation is essential for the university's ability to offer federal financial aid and for the recognition of degrees conferred.

## 2. Substantive Change Reporting

2.1 SACSCOC requires prior notification and, in many cases, prior approval of substantive changes including: new degree programs, new campuses or off-site locations, significant changes in the length of a program, contractual agreements for instruction, and closure of a program or site.

2.2 The Office of Institutional Effectiveness serves as the SACSCOC liaison and must be notified of any potential substantive changes at least 12 months before implementation.

## 3. Compliance Documentation

3.1 All academic and administrative units must maintain current documentation supporting SACSCOC standards, including: mission and goals statements, student learning outcomes assessments, faculty credentials verification, financial audit reports, and governance documentation.

3.2 The Office of Institutional Effectiveness conducts an annual compliance audit of all standards and coordinates the preparation of required reports and the decennial reaffirmation.

## 4. Faculty Credentials

4.1 All faculty teaching credit-bearing courses must hold credentials consistent with SACSCOC guidelines: a minimum of 18 graduate semester hours in the teaching discipline for undergraduate courses, and a terminal degree in the discipline for graduate courses. Exceptions for relevant professional experience must be documented.`,
}

const AR_6_5: PolicySeed = {
  policyNumber: 'AR 6:5',
  title: 'Academic Integrity',
  category: 'Academic & Compliance',
  responsibleOffice: 'Office of Academic Ombud Services',
  appliesTo: 'All students and instructional faculty',
  effectiveDate: '2024-08-01',
  lastRevised: '2025-08-01',
  fullText: `# AR 6:5 — Academic Integrity

**Policy Number:** AR 6:5
**Effective Date:** August 1, 2024
**Last Revised:** August 1, 2025
**Responsible Office:** Office of Academic Ombud Services
**Applies To:** All students and instructional faculty
**Category:** Academic & Compliance

## 1. Purpose

This policy defines the university's expectations for academic integrity, outlines categories of academic misconduct, and establishes the process for reporting and adjudicating violations. Academic integrity is fundamental to the university's educational mission and the value of its degrees.

## 2. Definitions of Academic Misconduct

2.1 **Plagiarism:** Submitting the work of others as one's own without proper attribution, including text, ideas, data, images, or AI-generated content presented as the student's original work.

2.2 **Cheating:** Using unauthorized materials, information, or aids during an examination or assignment. This includes unauthorized collaboration, obtaining exam content in advance, and using technology in ways not permitted by the instructor.

2.3 **Fabrication:** Intentional falsification or invention of data, research results, or citations.

2.4 **Facilitation:** Helping another student commit academic misconduct, including sharing exam content, providing completed work for submission, or allowing unauthorized access to one's own work.

## 3. Faculty Responsibilities

3.1 Faculty must include an academic integrity statement in all course syllabi. Faculty should clearly communicate expectations regarding collaboration, AI tool usage, and acceptable resources for each assignment.

3.2 When an instructor suspects academic misconduct, they must: discuss the matter with the student, provide the student an opportunity to respond, and submit a written report to the Office of Academic Ombud Services within 10 business days.

## 4. Sanctions

4.1 **First offense:** Minimum sanction is a zero on the assignment. The instructor may assign a failing grade for the course.

4.2 **Second offense:** Mandatory E (failing grade) for the course and academic probation. The student may be suspended for one semester.

4.3 **Third offense:** Expulsion from the university.

## 5. Appeal Process

5.1 Students may appeal a finding of academic misconduct to the Academic Integrity Board within 10 business days of notification. The Board conducts a hearing and issues a decision within 20 business days. The Board's decision may be appealed to the Provost within 5 business days.`,
}

const AR_6_7: PolicySeed = {
  policyNumber: 'AR 6:7',
  title: 'Grade Appeal Process',
  category: 'Academic & Compliance',
  responsibleOffice: 'Office of Academic Ombud Services',
  appliesTo: 'All enrolled students',
  effectiveDate: '2025-01-01',
  lastRevised: '2025-01-01',
  fullText: `# AR 6:7 — Grade Appeal Process

**Policy Number:** AR 6:7
**Effective Date:** January 1, 2025
**Last Revised:** January 1, 2025
**Responsible Office:** Office of Academic Ombud Services
**Applies To:** All enrolled students
**Category:** Academic & Compliance

## 1. Purpose

This policy establishes a fair and timely process for students to appeal a course grade they believe was assigned in error, arbitrarily, or in a manner inconsistent with the course syllabus.

## 2. Grounds for Appeal

2.1 A grade appeal may be filed on the following grounds only: mathematical or clerical error in grade calculation, application of standards different from those applied to other students in the same section, deviation from the grading criteria stated in the course syllabus, or assignment of a grade based on factors other than academic performance.

2.2 Disagreement with an instructor's professional academic judgment regarding the quality of work is not grounds for a grade appeal.

## 3. Process

3.1 **Step 1 — Instructor Meeting:** The student must first discuss the grade with the instructor within 15 business days of grade posting. Many disputes are resolved at this stage.

3.2 **Step 2 — Department Chair:** If unresolved, the student submits a written appeal to the department chair within 10 business days. The chair reviews the appeal and attempts mediation.

3.3 **Step 3 — College Grade Appeal Board:** If still unresolved, the student may appeal to the college-level Grade Appeal Board within 10 business days. The Board reviews all documentation and may interview the student and instructor. A decision is rendered within 20 business days.

3.4 **Step 4 — Provost (final):** The Board's decision may be appealed to the Provost within 5 business days. The Provost's decision is final.

## 4. Timeline

4.1 All grade appeals must be initiated within one semester of the grade being posted (e.g., a Fall grade must be appealed by the end of the following Spring semester). Appeals filed after this period are not accepted.`,
}

const AR_6_10: PolicySeed = {
  policyNumber: 'AR 6:10',
  title: 'Curriculum Change Process',
  category: 'Academic & Compliance',
  responsibleOffice: 'Office of the Provost',
  appliesTo: 'All academic departments proposing curriculum changes',
  effectiveDate: '2025-01-01',
  lastRevised: '2025-08-01',
  fullText: `# AR 6:10 — Curriculum Change Process

**Policy Number:** AR 6:10
**Effective Date:** January 1, 2025
**Last Revised:** August 1, 2025
**Responsible Office:** Office of the Provost
**Applies To:** All academic departments proposing curriculum changes
**Category:** Academic & Compliance

## 1. Purpose

This policy establishes the process for proposing, reviewing, and approving changes to academic curricula, including new courses, course modifications, new programs, and program changes. The process ensures academic quality, accreditation compliance, and alignment with the university's strategic plan.

## 2. Types of Changes

2.1 **Minor Changes:** Course title, number, or description modifications; prerequisite changes; credit hour adjustments within the same range. These require departmental approval and dean signature.

2.2 **Major Changes:** New courses, course deletions, new programs, program suspensions or terminations, and significant changes to degree requirements. These follow the full review process described in Section 3.

## 3. Review Process

3.1 Proposals are submitted via the Curriculum Change Form (ACAD-CC-01) and reviewed sequentially by: the department curriculum committee, the college curriculum committee, the University Senate Council, and (for new programs or substantive changes) the Board of Trustees and SACSCOC.

3.2 Standard timeline for major changes: department review (30 days), college review (30 days), Senate Council (60 days), Board of Trustees (next scheduled meeting). Total timeline: typically 6-12 months from submission to implementation.

## 4. New Program Requirements

4.1 New program proposals must include: needs assessment and demand analysis, learning outcomes aligned with the degree level, curriculum map showing progression, resource requirements (faculty, space, technology, library), budget impact analysis, and evidence of stakeholder input.

4.2 New programs are subject to SACSCOC substantive change reporting requirements (see AR 6:3) and must be submitted for review at least 12 months before the anticipated start date.`,
}

// ═══════════════════════════════════════════════════════════════
// FACILITIES & OPERATIONS (4)
// ═══════════════════════════════════════════════════════════════

const OPM_7_1: PolicySeed = {
  policyNumber: 'OPM 7:1',
  title: 'Academic Space Scheduling and Room Assignments',
  category: 'Facilities & Operations',
  responsibleOffice: 'Space Management',
  appliesTo: 'Academic departments, event planners',
  effectiveDate: '2025-06-01',
  lastRevised: '2025-06-01',
  fullText: `# OPM 7:1 — Academic Space Scheduling and Room Assignments

**Policy Number:** OPM 7:1
**Effective Date:** June 1, 2025
**Last Revised:** June 1, 2025
**Responsible Office:** Space Management
**Applies To:** Academic departments, event planners
**Category:** Facilities & Operations

## 1. Purpose

This policy governs the scheduling and assignment of academic and event spaces to ensure efficient utilization of university facilities and equitable access for all campus constituents.

## 2. Request Process

2.1 All space requests must be submitted through the Space Request System (SRS). Academic course scheduling requests are due 6 weeks before the start of each semester. Event and meeting requests should be submitted at least 2 weeks in advance.

2.2 Requests must include: event/class name, expected attendance, date and time, setup requirements, A/V needs, and responsible contact person.

## 3. Priority System

3.1 Spaces are assigned based on the following priority hierarchy:
1. Academic courses (highest priority)
2. Academic events (lectures, colloquia, defenses)
3. University-sponsored events and meetings
4. Registered student organization events
5. External groups and community events (lowest priority)

3.2 Within each priority level, requests are processed on a first-come, first-served basis.

## 4. Audio/Visual and Technology

4.1 Standard classroom technology (projector, screen, computer, HDMI connectivity) is provided in all general-purpose classrooms. Special A/V requests (live streaming, recording, additional microphones) must be submitted at least 5 business days in advance.

## 5. After-Hours Access

5.1 Building access outside of normal operating hours (7 AM – 10 PM Monday–Friday, 8 AM – 6 PM Saturday) requires approval from the building coordinator and notification to University Police.

## 6. Cancellation

6.1 Cancellations must be submitted at least 48 hours in advance. Repeated late cancellations (3 or more per semester) may result in reduced scheduling priority for the department or organization.

## 7. Setup and Cleanup

7.1 Requestors are responsible for returning the space to its standard configuration after use. Additional setup requirements (tables, chairs, podiums) must be requested at least 5 business days in advance through Facilities Management.`,
}

const OPM_7_3: PolicySeed = {
  policyNumber: 'OPM 7:3',
  title: 'Building Access and Key Control',
  category: 'Facilities & Operations',
  responsibleOffice: 'Facilities Management',
  appliesTo: 'All employees and authorized personnel',
  effectiveDate: '2025-06-01',
  lastRevised: '2025-11-01',
  fullText: `# OPM 7:3 — Building Access and Key Control

**Policy Number:** OPM 7:3
**Effective Date:** June 1, 2025
**Last Revised:** November 1, 2025
**Responsible Office:** Facilities Management
**Applies To:** All employees and authorized personnel
**Category:** Facilities & Operations

## 1. Purpose

This policy establishes procedures for the issuance, management, and return of building keys and electronic access credentials to ensure the physical security of university facilities.

## 2. Key and Card Access Issuance

2.1 Key and card access requests are submitted by the department head via the Key Request Form (FAC-KR-01). Requests must specify the building, room(s), and justification for access.

2.2 Electronic card access (Wildcat Card) is the preferred access method and is required for all new installations. Physical keys are issued only when electronic access is not available.

## 3. Master Keys

3.1 Master keys are restricted to Facilities Management, University Police, and building coordinators. Grand master keys are limited to the Director of Facilities Management and the Chief of Police.

3.2 Master key holders must sign an annual acknowledgment of responsibility. Loss of a master key must be reported immediately and may require re-keying of the affected area at the department's expense.

## 4. Return of Keys

4.1 All keys and access credentials must be returned upon separation from the university, transfer to a different department, or when access is no longer required. Key return is part of the exit checklist (HR-EXIT-01).

4.2 Unreturned keys may result in a charge to the individual's final paycheck or to the departing employee's department.

## 5. Lost or Stolen Keys

5.1 Lost or stolen keys must be reported to Facilities Management and University Police within 24 hours. The cost of re-keying may be assessed to the responsible individual or department.`,
}

const OPM_7_5: PolicySeed = {
  policyNumber: 'OPM 7:5',
  title: 'Event Hosting and External Venue Use',
  category: 'Facilities & Operations',
  responsibleOffice: 'Conference and Event Services',
  appliesTo: 'All departments, student organizations, and external groups hosting events on campus',
  effectiveDate: '2025-06-01',
  lastRevised: '2025-06-01',
  fullText: `# OPM 7:5 — Event Hosting and External Venue Use

**Policy Number:** OPM 7:5
**Effective Date:** June 1, 2025
**Last Revised:** June 1, 2025
**Responsible Office:** Conference and Event Services
**Applies To:** All departments, student organizations, and external groups hosting events on campus
**Category:** Facilities & Operations

## 1. Purpose

This policy governs the hosting of events on university property, including requirements for reservations, insurance, catering, safety, and post-event responsibilities.

## 2. Event Registration

2.1 All events with an expected attendance of 50 or more persons, or any event open to the public, must be registered with Conference and Event Services at least 3 weeks in advance.

2.2 Events involving alcohol service require additional approval from the Dean of Students (student events) or the division Vice President (departmental events) and must use a licensed caterer.

## 3. Insurance Requirements

3.1 External organizations hosting events on campus must provide a Certificate of Insurance naming the University of Kentucky as an additional insured, with minimum coverage of $1 million per occurrence and $2 million aggregate.

## 4. Catering

4.1 University Dining Services has the right of first refusal for all catered events on campus. External caterers may be used with Dining Services' written waiver and must hold a current health department permit.

## 5. Safety and Security

5.1 Events with expected attendance over 200 persons require a safety plan reviewed by University Police. Events over 500 persons require on-site police presence at the organizer's expense.

5.2 Organizers are responsible for ADA accessibility of the event venue and materials.`,
}

const OPM_7_8: PolicySeed = {
  policyNumber: 'OPM 7:8',
  title: 'Parking Allocation and Transportation Services',
  category: 'Facilities & Operations',
  responsibleOffice: 'Transportation Services',
  appliesTo: 'All employees and students',
  effectiveDate: '2025-08-01',
  lastRevised: '2025-08-01',
  fullText: `# OPM 7:8 — Parking Allocation and Transportation Services

**Policy Number:** OPM 7:8
**Effective Date:** August 1, 2025
**Last Revised:** August 1, 2025
**Responsible Office:** Transportation Services
**Applies To:** All employees and students
**Category:** Facilities & Operations

## 1. Purpose

This policy governs the allocation of parking permits, enforcement of parking regulations, and the provision of alternative transportation services to the university community.

## 2. Permit Types

2.1 Employee permits are assigned based on employment classification and work location. Permit types include: reserved (assigned space), area (designated lot/structure), and peripheral (remote lot with shuttle service). Rates are published annually by Transportation Services.

2.2 Student permits are available on a first-come, first-served basis for designated student lots. Commuter and residential permits are issued separately.

## 3. Allocation Priority

3.1 Employee permits are allocated by seniority within each department. Departments receive an allocation based on the number of FTE employees and proximity to available parking.

3.2 ADA-accessible spaces are available to all valid placard or plate holders regardless of permit type.

## 4. Enforcement

4.1 Parking regulations are enforced Monday through Friday, 7:30 AM – 5:00 PM during the academic year. Permits are not required after 5:00 PM, on weekends, or during university holidays.

4.2 Violations include: parking without a valid permit, parking in a reserved space, blocking fire lanes, and exceeding time limits in metered areas. Fines range from $25 to $200 depending on the violation.

## 5. Alternative Transportation

5.1 The university provides: free campus shuttle service during the academic year, Lextran bus pass subsidies ($20/month employee rate), bicycle infrastructure (racks, repair stations, secured storage), and a carpool matching program. Employees who forgo parking permits receive a $25/month transportation credit.`,
}

// ═══════════════════════════════════════════════════════════════
// STUDENT AFFAIRS (4)
// ═══════════════════════════════════════════════════════════════

const SC_8_1: PolicySeed = {
  policyNumber: 'SC 8:1',
  title: 'Student Code of Conduct',
  category: 'Student Affairs',
  responsibleOffice: 'Dean of Students Office',
  appliesTo: 'All enrolled students',
  effectiveDate: '2024-08-01',
  lastRevised: '2025-08-01',
  fullText: `# SC 8:1 — Student Code of Conduct

**Policy Number:** SC 8:1
**Effective Date:** August 1, 2024
**Last Revised:** August 1, 2025
**Responsible Office:** Dean of Students Office
**Applies To:** All enrolled students
**Category:** Student Affairs

## 1. Purpose

This code establishes behavioral expectations for students, defines categories of misconduct, and outlines the disciplinary process. The university is committed to fostering an environment that supports academic achievement, personal growth, and mutual respect.

## 2. Scope

2.1 This code applies to all enrolled students, including part-time, online, and non-degree-seeking students. It applies to conduct occurring on university premises, at university-sponsored events, and in online platforms provided by the university.

2.2 Off-campus conduct may be subject to this code when it adversely affects the university community or the pursuit of its mission.

## 3. Prohibited Conduct

3.1 Categories of misconduct include: academic dishonesty (see AR 6:5 for detailed provisions), disruption of university operations, harassment and intimidation, unauthorized use of university property, substance violations (alcohol and drugs), theft or damage to property, violation of university policies and regulations, and failure to comply with directions of university officials.

## 4. Disciplinary Process

4.1 Reports of student misconduct are submitted to the Dean of Students Office. The reporting party may be a faculty member, staff member, student, or community member.

4.2 Upon receipt of a report, a preliminary review determines whether the allegation, if true, would constitute a violation. If so, the student is notified in writing and given an opportunity to meet with a conduct officer.

4.3 Sanctions range from: warning, educational requirements (e.g., community service, essay), probation, suspension (1-4 semesters), and expulsion.

## 5. Appeal Rights

5.1 Students may appeal a conduct decision within 5 business days on grounds of: procedural error, new evidence, or disproportionate sanction. Appeals are heard by the Student Appeals Board.`,
}

const SC_8_3: PolicySeed = {
  policyNumber: 'SC 8:3',
  title: 'Title IX Procedures — Sexual Misconduct',
  category: 'Student Affairs',
  responsibleOffice: 'Title IX Coordinator',
  appliesTo: 'All students, faculty, staff, and campus visitors',
  effectiveDate: '2024-08-01',
  lastRevised: '2025-08-01',
  fullText: `# SC 8:3 — Title IX Procedures — Sexual Misconduct

**Policy Number:** SC 8:3
**Effective Date:** August 1, 2024
**Last Revised:** August 1, 2025
**Responsible Office:** Title IX Coordinator
**Applies To:** All students, faculty, staff, and campus visitors
**Category:** Student Affairs

## 1. Purpose

This policy establishes the university's procedures for addressing reports of sexual misconduct, including sexual harassment, sexual assault, dating violence, domestic violence, and stalking, in compliance with Title IX of the Education Amendments of 1972 and the Violence Against Women Act.

## 2. Reporting

2.1 Any member of the university community may report sexual misconduct to the Title IX Coordinator, University Police, or the Dean of Students Office. Reports may be made in person, by phone, by email, or through the online reporting form.

2.2 All university employees (except designated confidential resources) are responsible employees who must report known incidents of sexual misconduct to the Title IX Coordinator within 24 hours.

2.3 Confidential resources (who are not required to report) include: the Counseling Center, the Violence Intervention and Prevention Center, Student Health Services clinicians, and university chaplains.

## 3. Supportive Measures

3.1 Upon receipt of a report, the Title IX Coordinator will offer supportive measures to the complainant and respondent, which may include: no-contact orders, housing adjustments, class schedule modifications, academic support, and counseling referrals.

## 4. Investigation and Resolution

4.1 Formal complaints are investigated by trained Title IX investigators. Both parties have equal rights to present evidence, identify witnesses, and have an advisor present during all proceedings.

4.2 The standard of proof is preponderance of the evidence (more likely than not). Determinations are made by a trained decision-maker who did not serve as the investigator.

## 5. Sanctions

5.1 If a violation is found, sanctions may include: mandatory education, probation, suspension, expulsion (students), or disciplinary action up to and including termination (employees).

## 6. Retaliation

6.1 Retaliation against anyone who reports sexual misconduct, participates in an investigation, or opposes discriminatory practices is strictly prohibited and constitutes a separate policy violation.`,
}

const SC_8_5: PolicySeed = {
  policyNumber: 'SC 8:5',
  title: 'Disability Accommodations',
  category: 'Student Affairs',
  responsibleOffice: 'Disability Resource Center',
  appliesTo: 'All faculty, staff, and students',
  effectiveDate: '2025-01-01',
  lastRevised: '2025-01-01',
  fullText: `# SC 8:5 — Disability Accommodations

**Policy Number:** SC 8:5
**Effective Date:** January 1, 2025
**Last Revised:** January 1, 2025
**Responsible Office:** Disability Resource Center
**Applies To:** All faculty, staff, and students
**Category:** Student Affairs

## 1. Purpose

This policy establishes the university's commitment to providing equal access and reasonable accommodations for students with disabilities in compliance with the Americans with Disabilities Act (ADA) and Section 504 of the Rehabilitation Act.

## 2. Registration Process

2.1 Students requesting accommodations must register with the Disability Resource Center (DRC) by submitting the Accommodation Request Form and current documentation of their disability. Documentation requirements vary by disability type and are published on the DRC website.

2.2 The DRC reviews documentation, conducts an interactive process with the student, and determines appropriate accommodations. Determination is typically completed within 10 business days of receiving complete documentation.

2.3 Approved accommodations are communicated to the student via an Accommodation Letter. The student is responsible for delivering the letter to each instructor and discussing implementation.

## 3. Types of Accommodations

3.1 Common academic accommodations include: extended time on exams (typically time-and-a-half), reduced-distraction testing environment, note-taking services, permission to record lectures, alternative format textbooks (audio, large print, Braille), preferential seating, and sign language interpreting or real-time captioning.

3.2 Housing and dining accommodations may include: single room assignment, accessible room features, emotional support animal authorization (with documentation), and dietary accommodations.

3.3 Accommodations are individualized and based on the functional limitations of the disability, not the diagnosis alone.

## 4. Faculty Responsibilities

4.1 Faculty must implement approved accommodations within 5 business days of receiving the Accommodation Letter. Accommodations are not retroactive to before the letter is delivered.

4.2 Faculty may not require students to disclose their specific disability or medical condition. The Accommodation Letter specifies the approved accommodations without disclosing the underlying diagnosis.

4.3 If a faculty member believes an accommodation fundamentally alters the essential requirements of a course, they must consult with the DRC before denying the accommodation.

## 5. Dispute Resolution

5.1 If a student believes accommodations are not being properly implemented, they should first contact the DRC. If unresolved, the student may file a grievance with the Office of Institutional Equity within 30 days.

## 6. Temporary Disabilities

6.1 Students with temporary disabilities (e.g., broken limb, concussion, post-surgical recovery) may receive short-term accommodations through the DRC. A healthcare provider's statement with expected duration is required.

## 7. Confidentiality

7.1 All disability-related documentation is confidential and maintained separately from academic records in compliance with FERPA and ADA. Only authorized DRC staff and the student's instructors (limited to accommodation specifics) have access.`,
}

const SC_8_7: PolicySeed = {
  policyNumber: 'SC 8:7',
  title: 'Student Complaint Process',
  category: 'Student Affairs',
  responsibleOffice: 'Dean of Students Office',
  appliesTo: 'All enrolled students',
  effectiveDate: '2025-01-01',
  lastRevised: '2025-01-01',
  fullText: `# SC 8:7 — Student Complaint Process

**Policy Number:** SC 8:7
**Effective Date:** January 1, 2025
**Last Revised:** January 1, 2025
**Responsible Office:** Dean of Students Office
**Applies To:** All enrolled students
**Category:** Student Affairs

## 1. Purpose

This policy provides a structured process for students to raise concerns and complaints about university services, administrative actions, or staff conduct that are not addressed by other specific policies (e.g., grade appeals, discrimination complaints, or Title IX reports).

## 2. Scope

2.1 This process covers complaints regarding: administrative errors or delays, unsatisfactory service quality, billing and financial disputes, housing and dining concerns, and staff conduct.

2.2 This process does NOT cover: grade appeals (see AR 6:7), academic integrity findings (see AR 6:5), Title IX complaints (see SC 8:3), discrimination complaints (see Office of Institutional Equity), and financial aid eligibility determinations (federal process).

## 3. Informal Resolution

3.1 Students are encouraged to first address concerns directly with the department or individual involved. Many issues can be resolved through direct communication.

## 4. Formal Complaint

4.1 If informal resolution is unsuccessful, the student may submit a formal complaint via the Student Complaint Form (available online or from the Dean of Students Office). The form requires: description of the issue, steps already taken to resolve it, desired outcome, and supporting documentation.

4.2 The Dean of Students Office acknowledges receipt within 3 business days and assigns an investigator. The investigation is completed within 20 business days, and the student is notified of the outcome in writing.

## 5. Appeal

5.1 Students may appeal the outcome to the Vice President for Student Affairs within 10 business days. The VP's decision is final.`,
}

// ═══════════════════════════════════════════════════════════════
// IT & DATA (3)
// ═══════════════════════════════════════════════════════════════

const IT_9_1: PolicySeed = {
  policyNumber: 'IT 9:1',
  title: 'Data Classification and Handling',
  category: 'IT & Data',
  responsibleOffice: 'Information Technology Services',
  appliesTo: 'All employees, contractors, and vendors with access to university data',
  effectiveDate: '2025-10-01',
  lastRevised: '2025-10-01',
  fullText: `# IT 9:1 — Data Classification and Handling

**Policy Number:** IT 9:1
**Effective Date:** October 1, 2025
**Last Revised:** October 1, 2025
**Responsible Office:** Information Technology Services
**Applies To:** All employees, contractors, and vendors with access to university data
**Category:** IT & Data

## 1. Purpose

This policy establishes a framework for classifying university data by sensitivity level and defines the handling, storage, transmission, and destruction requirements for each classification level. Proper data classification protects the university, its employees, and its students from the consequences of unauthorized data disclosure.

## 2. Classification Levels

2.1 **Public:** Information intended for public consumption. Examples: press releases, published research, course catalog, directory information (unless FERPA hold applies), campus maps.

2.2 **Internal:** Information intended for internal use that would not cause significant harm if disclosed. Examples: internal memos, organizational charts, meeting minutes, operating procedures, non-sensitive financial reports.

2.3 **Confidential:** Information that could cause harm to individuals or the institution if disclosed. Examples: student educational records (FERPA-protected), employee personnel files, unpublished research data, donor information, internal audit reports, legal correspondence.

2.4 **Restricted:** The most sensitive data requiring the highest level of protection. Examples: Social Security numbers, financial account numbers, protected health information (HIPAA), credit card data (PCI-DSS), passwords and access credentials, export-controlled research data.

## 3. Handling Requirements

3.1 **Public data:** No special handling. May be stored on any university system and shared freely.

3.2 **Internal data:** Store on university-managed systems. May be shared within the university without special authorization. Encrypt when transmitting externally.

3.3 **Confidential data:** Encrypt at rest and in transit. Access limited to individuals with documented need-to-know. Store only on university-managed, access-controlled systems. Do not store on personal devices without encryption and ITS approval.

3.4 **Restricted data:** Encrypt at rest (AES-256 or equivalent) and in transit (TLS 1.2+). Multi-factor authentication required for access. Access logged and audited quarterly. Do not store on portable media. Report any suspected breach within 1 hour to the Information Security Office.

## 4. Breach Notification

4.1 Suspected breaches involving Restricted data must be reported to the Information Security Office within 1 hour of discovery. The ISO activates the Incident Response Plan within 4 hours.

4.2 Breaches involving Confidential data must be reported within 24 hours. The ISO assesses scope and determines notification requirements.

4.3 Kentucky law (KRS 365.732) requires notification to affected individuals "in the most expedient time possible" following a breach of personal information.

## 5. Third-Party Sharing

5.1 Sharing Confidential or Restricted data with third parties requires a Data Sharing Agreement reviewed by Legal Counsel and approved by the Chief Information Security Officer.

5.2 Vendors processing Restricted data must complete the Vendor Security Assessment (IT 9:5) and execute a Business Associate Agreement (for HIPAA data) or similar contractual protections.

## 6. Data Destruction

6.1 When data is no longer needed, it must be destroyed in accordance with the university's Records Retention Schedule and the following methods: electronic data — secure deletion or cryptographic erasure; physical media — shredding (paper) or degaussing/physical destruction (hard drives, tapes).

6.2 Restricted data destruction must be documented, with a certificate of destruction retained for 3 years.

## 7. Annual Review

7.1 Data custodians must review the classification of their data assets annually and report to the Chief Information Security Officer. The ISO publishes a university-wide Data Classification Report each fiscal year.`,
}

const IT_9_3: PolicySeed = {
  policyNumber: 'IT 9:3',
  title: 'Acceptable Use of Information Technology Resources',
  category: 'IT & Data',
  responsibleOffice: 'Information Technology Services',
  appliesTo: 'All users of university IT resources',
  effectiveDate: '2025-10-01',
  lastRevised: '2025-10-01',
  fullText: `# IT 9:3 — Acceptable Use of Information Technology Resources

**Policy Number:** IT 9:3
**Effective Date:** October 1, 2025
**Last Revised:** October 1, 2025
**Responsible Office:** Information Technology Services
**Applies To:** All users of university IT resources
**Category:** IT & Data

## 1. Purpose

This policy defines acceptable use of university information technology resources, including computers, networks, email, cloud services, and telecommunications systems. It protects the university's infrastructure and the rights of all users.

## 2. General Principles

2.1 University IT resources are provided primarily for academic, research, administrative, and outreach activities. Limited personal use is permitted provided it does not interfere with job duties, consume significant resources, or violate this or other university policies.

2.2 Users are responsible for all activity conducted under their accounts. Sharing passwords or allowing unauthorized access to university accounts is prohibited.

## 3. Prohibited Activities

3.1 The following uses of university IT resources are prohibited: unauthorized access to systems, data, or accounts; distribution of malware or participation in cyberattacks; harassment, threats, or discriminatory communications; unauthorized mass email distribution; commercial activities unrelated to the university; illegal downloading or distribution of copyrighted material; and circumvention of security controls.

## 4. Email and Communication

4.1 University email is an official means of communication. Employees and students are expected to read their university email regularly.

4.2 Email may be subject to public records requests under Kentucky's Open Records Act. Users should be aware that email content may not be private.

## 5. Monitoring and Privacy

5.1 The university does not routinely monitor individual email or network activity. However, the university reserves the right to access, monitor, or audit any IT resource for legitimate purposes including: investigation of policy violations, legal proceedings, system maintenance, and security incident response.

5.2 Users should have no expectation of privacy when using university-owned equipment or networks beyond what is afforded by law.

## 6. Consequences

6.1 Violations may result in: temporary or permanent loss of IT access privileges, disciplinary action (employees), conduct proceedings (students), and civil or criminal prosecution for violations of law.`,
}

const IT_9_5: PolicySeed = {
  policyNumber: 'IT 9:5',
  title: 'Vendor Security Review and Cloud Services',
  category: 'IT & Data',
  responsibleOffice: 'Information Security Office',
  appliesTo: 'All personnel procuring technology services or cloud platforms',
  effectiveDate: '2025-10-01',
  lastRevised: '2026-01-01',
  fullText: `# IT 9:5 — Vendor Security Review and Cloud Services

**Policy Number:** IT 9:5
**Effective Date:** October 1, 2025
**Last Revised:** January 1, 2026
**Responsible Office:** Information Security Office
**Applies To:** All personnel procuring technology services or cloud platforms
**Category:** IT & Data

## 1. Purpose

This policy requires a security review of all technology vendors and cloud service providers before the university enters into a contract or shares data. The review ensures that vendor security practices are consistent with the university's data protection standards.

## 2. When a Review Is Required

2.1 A Vendor Security Review is required when: a vendor will access, process, store, or transmit university data classified as Confidential or Restricted; the university is evaluating a new cloud platform or SaaS application; or a contract renewal involves a material change in data handling.

2.2 Reviews are NOT required for: public data only vendors, one-time purchases of non-connected equipment, or vendors already on the Approved Vendor List (published by the ISO).

## 3. Review Process

3.1 The requesting department submits a Vendor Security Review Request (IT-VSR-01) to the Information Security Office. The request includes: vendor name and contact, description of service, data types involved, and estimated contract value.

3.2 The ISO sends the vendor a security questionnaire and reviews responses. Standard review timeline: 10 business days for Confidential data, 20 business days for Restricted data.

3.3 The ISO issues one of three determinations: Approved (vendor meets all requirements), Conditionally Approved (vendor must remediate specific gaps within a defined timeline), or Denied (vendor's security posture is inadequate).

## 4. Minimum Vendor Requirements

4.1 Vendors handling Confidential or Restricted data must demonstrate: SOC 2 Type II certification (or equivalent), encryption at rest and in transit, access controls and multi-factor authentication, incident response and breach notification procedures (24-hour notification to university), data residency within the United States (unless otherwise approved), and contractual right of the university to audit.

## 5. Shadow IT

5.1 Departments and individuals may not independently acquire or deploy cloud services that will handle Confidential or Restricted data without completing the vendor security review process. Unauthorized services discovered through monitoring will be subject to immediate suspension.`,
}

// ═══════════════════════════════════════════════════════════════
// EXPORT — real policies preferred, simulated fallback
// ═══════════════════════════════════════════════════════════════

const SIMULATED_POLICIES: PolicySeed[] = [
  // HR & Employment (8)
  AR_2_9,
  AR_3_1,
  AR_3_2,
  AR_3_7,
  AR_3_8,
  AR_3_10,
  AR_3_15,
  AR_3_18,
  // Finance & Procurement (6)
  BPM_4_1,
  BPM_4_3,
  BPM_4_5,
  BPM_4_8,
  BPM_4_10,
  BPM_4_12,
  // Academic & Compliance (5)
  AR_6_1,
  AR_6_3,
  AR_6_5,
  AR_6_7,
  AR_6_10,
  // Facilities & Operations (4)
  OPM_7_1,
  OPM_7_3,
  OPM_7_5,
  OPM_7_8,
  // Student Affairs (4)
  SC_8_1,
  SC_8_3,
  SC_8_5,
  SC_8_7,
  // IT & Data (3)
  IT_9_1,
  IT_9_3,
  IT_9_5,
]

export const POLICY_DOCUMENTS: PolicySeed[] = loadRealPolicies() ?? SIMULATED_POLICIES
