import type { ScenarioPreset } from './types'

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'campus-lockdown',
    title: 'Campus Lockdown',
    icon: 'Shield',
    summary: 'Active threat reported on campus — law enforcement responding, buildings locked down.',
    factSheet: {
      confirmedFacts: [
        'UK Police received a report of an armed individual near the Student Center at 2:14 PM.',
        'A campus-wide lockdown was issued at 2:18 PM via UK Alert.',
        'One person was transported to UK Chandler Hospital with non-life-threatening injuries.',
        'UK Police and Lexington PD are on scene and have secured a perimeter.',
        'All classes and campus events are suspended until further notice.',
      ],
      unknownFacts: [
        'Whether there is an active shooter or if the weapon was brandished without shots fired.',
        'The identity of the suspect — not in custody yet.',
        'Whether the injured person is a student, employee, or visitor.',
        'How long the lockdown will last.',
      ],
      stakeholderPositions: [
        'UK Police: "This is an active law enforcement operation. We are asking everyone to shelter in place."',
        'President\'s Office: Monitoring the situation; no public statement yet.',
        'Student Government: Pushing for immediate communication to parents.',
      ],
      mediaLandscape: 'Local TV stations are live outside the Student Center. LEX18 has a helicopter. Student journalists posting on X. Parent Facebook groups are active with unverified claims.',
    },
    suggestedRole: 'University Spokesperson',
    incidentStage: 'First 90 minutes — lockdown active',
    inject: {
      afterQuestion: 4,
      headline: 'BREAKING: A second person has been transported to UK Chandler Hospital. Condition unknown.',
      newFacts: [
        'A second individual was transported from the Engineering Building at 3:05 PM.',
        'UK Police have not confirmed whether this is related to the original incident.',
        'The Engineering Building is now included in the secured perimeter.',
      ],
    },
  },
  {
    id: 'severe-weather',
    title: 'Severe Weather Emergency',
    icon: 'CloudLightning',
    summary: 'Tornado warning mid-day — campus closing, students sheltering, power outages.',
    factSheet: {
      confirmedFacts: [
        'National Weather Service issued a tornado warning for Fayette County at 1:45 PM.',
        'University ordered campus closure and shelter-in-place at 1:50 PM.',
        'Approximately 8,000 students are currently on campus.',
        'Power outages reported in three campus buildings including Whitehall Classroom Building.',
        'UK Emergency Management has activated the Emergency Operations Center.',
      ],
      unknownFacts: [
        'Whether a tornado has actually touched down on or near campus.',
        'Full extent of power outages and whether backup generators are holding.',
        'Whether any students or staff have been injured.',
        'When campus will reopen — NWS warning is in effect until 4:00 PM.',
      ],
      stakeholderPositions: [
        'Facilities: Generators are active in critical buildings (hospital, data center). Other buildings may lose HVAC.',
        'Housing & Residence Life: All RAs are doing floor checks and headcounts.',
        'Transit: LexTran has suspended campus routes. UK shuttle buses are parked and locked.',
      ],
      mediaLandscape: 'Local news covering the storm region-wide. UK is one of several institutions closing. Social media focused on damage photos, not yet campus-specific.',
    },
    suggestedRole: 'University Spokesperson',
    incidentStage: 'Warning active — sheltering in progress',
    inject: {
      afterQuestion: 3,
      headline: 'BREAKING: Roof collapse reported at Whitehall Classroom Building. Emergency crews dispatched.',
      newFacts: [
        'Lexington Fire Department dispatched to Whitehall Classroom Building at 2:35 PM for a partial roof collapse in a third-floor classroom.',
        'Building was believed to be evacuated, but facilities cannot confirm all rooms were cleared.',
        'NWS has extended the tornado warning to 5:30 PM.',
      ],
    },
  },
  {
    id: 'data-breach',
    title: 'Student Data Breach',
    icon: 'ShieldAlert',
    summary: 'Student records potentially exposed — scope unknown, IT investigating.',
    factSheet: {
      confirmedFacts: [
        'UK Information Technology Services detected unauthorized access to a database containing student records on March 15.',
        'The breach was discovered during a routine security audit.',
        'The affected system has been taken offline and isolated.',
        'UK has engaged a third-party cybersecurity firm (CrowdStrike) to investigate.',
        'The Kentucky Attorney General\'s office has been notified as required by KRS 365.732.',
      ],
      unknownFacts: [
        'Exactly how many student records were accessed — estimates range from 5,000 to 40,000.',
        'Whether Social Security numbers, financial aid data, or health records were included.',
        'Whether any data has appeared for sale on dark web markets.',
        'How the attacker gained access — phishing, unpatched vulnerability, or insider.',
      ],
      stakeholderPositions: [
        'CIO: "We are treating this with the highest urgency. The compromised system is isolated."',
        'General Counsel: Advising caution on specifics until investigation is further along.',
        'Student Affairs: Wants to notify affected students quickly to enable credit monitoring.',
      ],
      mediaLandscape: 'Kentucky Kernel (student paper) has a source inside ITS. Lexington Herald-Leader preparing a story. Ars Technica and Inside Higher Ed monitoring.',
    },
    suggestedRole: 'University Spokesperson',
    incidentStage: 'Day 2 — investigation in progress, no public statement yet',
    inject: {
      afterQuestion: 5,
      headline: 'BREAKING: A dark web monitoring firm reports UK student data appearing on a known breach marketplace.',
      newFacts: [
        'CrowdStrike has flagged a listing on a dark web forum that appears to contain UK student email addresses and partial SSNs.',
        'The listing claims 22,000 records. This number is unverified.',
        'General Counsel is accelerating the student notification timeline.',
      ],
    },
  },
  {
    id: 'student-death',
    title: 'Student Injury or Death',
    icon: 'Heart',
    summary: 'Student death on campus — cause unknown, family notified, community grieving.',
    factSheet: {
      confirmedFacts: [
        'A 20-year-old undergraduate student was found unresponsive in their residence hall room at 7:30 AM.',
        'UK Police and EMS responded. The student was pronounced dead at 7:48 AM.',
        'The Fayette County Coroner\'s Office is handling the investigation.',
        'The student\'s family has been notified.',
        'The Counseling Center has activated walk-in crisis support in the residence hall.',
      ],
      unknownFacts: [
        'Cause and manner of death — pending coroner\'s determination.',
        'Whether foul play is suspected (UK Police have not indicated this).',
        'Whether substance use was involved.',
        'Whether the student had previously sought counseling services.',
      ],
      stakeholderPositions: [
        'Dean of Students: "Our immediate focus is supporting this student\'s friends, roommate, and the hall community."',
        'UK Police: "There is no indication of foul play at this time. This is a coroner\'s case."',
        'Family: Has requested privacy. No statement through university.',
      ],
      mediaLandscape: 'Student newspaper running the story. Local TV asking for on-campus interviews. A student\'s social media tribute post is going viral. A parent Facebook group is speculating about hazing.',
    },
    suggestedRole: 'University Spokesperson',
    incidentStage: 'Day 1 — afternoon following discovery',
    inject: {
      afterQuestion: 4,
      headline: 'BREAKING: A second student from the same residence hall has been hospitalized.',
      newFacts: [
        'A 19-year-old student from the same floor was transported to UK Chandler Hospital at 1:15 PM with similar symptoms.',
        'The student is in stable condition.',
        'UK Police and Lexington-Fayette County Health Department are now investigating a potential environmental or substance-related cause.',
      ],
    },
  },
  {
    id: 'reputational-allegation',
    title: 'Viral Reputational Allegation',
    icon: 'AlertTriangle',
    summary: 'Misconduct allegation spreading online — investigation not started, petition gaining signatures.',
    factSheet: {
      confirmedFacts: [
        'A social media post alleging inappropriate behavior by a tenured faculty member was published 36 hours ago.',
        'The post has been shared over 12,000 times and covered by two national education outlets.',
        'An online petition calling for the faculty member\'s termination has 8,400 signatures.',
        'The Office of Institutional Equity has received a formal complaint and opened a preliminary inquiry.',
        'The faculty member remains employed and has not been placed on leave.',
      ],
      unknownFacts: [
        'Whether the allegations are substantiated — the investigation has not begun.',
        'How many complainants are involved beyond the original poster.',
        'Whether the faculty member will cooperate with the investigation.',
        'Whether media has contacted the faculty member directly.',
      ],
      stakeholderPositions: [
        'Provost: "We take all allegations seriously. The process must be followed."',
        'Faculty Senate: Concerned about due process and public pressure influencing the outcome.',
        'Student Government: Issued a statement demanding "swift accountability."',
      ],
      mediaLandscape: 'Inside Higher Ed and Chronicle of Higher Education running stories. Local TV picked it up from the petition. Twitter/X threads naming the faculty member. Reddit thread with unverified claims.',
    },
    suggestedRole: 'University Spokesperson',
    incidentStage: '36 hours in — public pressure building, investigation not yet started',
    inject: {
      afterQuestion: 5,
      headline: 'BREAKING: The faculty member\'s attorney has released a public statement denying all allegations and threatening defamation lawsuits.',
      newFacts: [
        'Attorney statement: "My client categorically denies these false allegations and reserves the right to pursue legal action against those spreading defamatory claims."',
        'The petition has surged to 15,000 signatures in the last 2 hours following the statement.',
        'A national cable news outlet has requested an on-camera interview with university leadership.',
      ],
    },
  },
]

export function getPresetById(id: string): ScenarioPreset | undefined {
  return SCENARIO_PRESETS.find((p) => p.id === id)
}
