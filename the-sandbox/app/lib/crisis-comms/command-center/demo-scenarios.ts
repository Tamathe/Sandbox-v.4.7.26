/**
 * demo-scenarios.ts
 *
 * Three pre-built demo scenarios for the Crisis Command Center.
 * Each provides a realistic incident input text that kicks off the
 * AI assessment → document generation pipeline.
 */

import type { DemoScenario } from './types'

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'chemistry-lab-explosion',
    title: 'Chemistry Lab Explosion',
    severity: 3,
    icon: 'Flame',
    description:
      'Explosion in the Chemistry-Physics Building during a graduate research experiment. Two students injured, hazmat response, building evacuated, media arriving.',
    inputText: `FROM: UK Police Department Operations Center
TO: Crisis Communications Team
PRIORITY: URGENT
TIME: 14:22 EST

At 14:08 today an explosion occurred in Room 312 of the Chemistry-Physics Building during a graduate-level research experiment involving volatile organic compounds. Two graduate students were injured — one with severe burns transported to UK Chandler Hospital in critical condition, the other with minor lacerations treated on scene by EMS.

The building has been fully evacuated. Lexington Fire Department Hazmat Unit is on scene assessing air quality and structural integrity. Classes in the adjacent CP2 annex and the Biology Building have been cancelled as a precaution.

WKYT and LEX18 news crews are arriving at the South Limestone perimeter. Multiple students are posting videos on social media. The UK Police PIO is on scene but has not issued a statement. The injured students' families have NOT yet been notified.

We need a coordinated communications response immediately. Awaiting your guidance on public messaging.

— Lt. Marcus Webb, UK Police Operations`,
  },
  {
    id: 'student-data-breach',
    title: 'Student Data Breach',
    severity: 2,
    icon: 'ShieldAlert',
    description:
      'Vendor breach exposed ~12,000 student records including partial SSNs. FERPA implications, Reddit post surfacing, media not yet involved.',
    inputText: `INTERNAL MEMO — CONFIDENTIAL
FROM: Dana Chen, Chief Information Security Officer
TO: Crisis Communications Team, General Counsel, VP Student Affairs
DATE: March 27, 2026

This memo confirms a data security incident involving our third-party dining card vendor, CampusCard Solutions. Our Security Operations Center detected anomalous data exfiltration from the vendor's API integration at approximately 08:00 yesterday. The vendor confirmed the breach at 18:30 last evening.

Scope: Approximately 12,000 current student records were exposed, including full names, university email addresses, student ID numbers, and the last four digits of Social Security numbers. No full SSNs, financial data, or academic records were compromised.

The vendor's compromised endpoint has been disabled. We have engaged Mandiant for forensic analysis. Under FERPA and KRS 365.732, we are required to notify affected individuals and the Kentucky Attorney General.

A student posted on r/UniversityofKentucky two hours ago claiming their dining account was compromised. The post has 340 upvotes and rising. No mainstream media inquiries yet, but we expect them within hours.

We need to get ahead of this. Requesting immediate crisis comms activation.

— Dana Chen, CISO`,
  },
  {
    id: 'controversial-speaker-protest',
    title: 'Controversial Speaker Protest',
    severity: 1,
    icon: 'Megaphone',
    description:
      'Politically divisive speaker event tomorrow night with counter-protests expected. Social media heated but no threats detected. Proactive communications needed.',
    inputText: `BRIEFING NOTE
FROM: Office of the Dean of Students
TO: Crisis Communications Team
RE: Tomorrow's Speaker Event — Proactive Comms Request

The student organization Young Americans for Liberty has invited commentator [SPEAKER NAME] to speak tomorrow evening (7:00 PM, Memorial Coliseum). The event is permitted under university policy and First Amendment obligations.

We are expecting approximately 500 attendees and 200 counter-protesters organized by the Progressive Student Alliance. Student Government passed a resolution last night "disassociating" from the event. Social media activity is elevated — primarily heated debate on X and Instagram — but UK Police Threat Assessment has identified no credible threats.

UK Police will have 30 officers on site. Counter-protest has a permitted assembly area on the Coliseum plaza. Lexington PD is on standby.

Our concern is messaging: we need to affirm free expression while acknowledging community concerns and ensuring everyone feels safe. Several faculty have emailed the Provost asking for a university statement. Local media will likely cover the protests.

Requesting crisis comms support for proactive messaging before, during, and after the event.

— Dr. Patricia Huang, Dean of Students`,
  },
]

export function getDemoScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id)
}
