// ─── Communication Compliance Service ─────────────────────────
// Pattern-based + keyword scanning for regulated content areas.
// Returns compliance flags with policy references and suggests
// additional approvers based on content sensitivity.

// ── Types ────────────────────────────────────────────────────

export interface ComplianceFlag {
  policy: string
  policyTitle: string
  reason: string
  severity: 'error' | 'warning' | 'info'
}

export interface ComplianceCheckResult {
  flags: ComplianceFlag[]
  suggestedApprovers: string[]
}

// ── Pattern Definitions ─────────────────────────────────────

interface CompliancePattern {
  pattern: RegExp
  flag: ComplianceFlag
  approver?: string
}

const COMPLIANCE_PATTERNS: CompliancePattern[] = [
  // FERPA — student records / PII
  {
    pattern: /\b(student record|transcript|grade report|academic record|student id|education record|student name|GPA|academic standing|enrollment status|disciplinary|FERPA)\b/i,
    flag: {
      policy: 'AR 6:1',
      policyTitle: 'FERPA Compliance — Student Records',
      reason: 'Draft may reference student records or PII — ensure no personally identifiable student information is included.',
      severity: 'warning',
    },
    approver: 'Registrar',
  },
  // Title IX — sexual harassment / assault
  {
    pattern: /\b(title ix|title nine|sexual harassment|sexual assault|sexual misconduct|gender.?based violence|dating violence|stalking complaint|sex discrimination)\b/i,
    flag: {
      policy: 'SC 8:3',
      policyTitle: 'Title IX Compliance',
      reason: 'Draft touches Title IX subject matter — must be reviewed by the Title IX Coordinator before distribution.',
      severity: 'error',
    },
    approver: 'Title IX Coordinator',
  },
  // Safety / emergency
  {
    pattern: /\b(active shooter|bomb threat|campus lockdown|emergency evacuat|shelter.?in.?place|hazardous material|safety alert|campus safety|security incident|threat assessment)\b/i,
    flag: {
      policy: 'BPM E-2',
      policyTitle: 'Emergency Operations',
      reason: 'Draft references campus safety or emergency — VP Safety should review before distribution.',
      severity: 'error',
    },
    approver: 'VP Safety',
  },
  // Financial data / budget
  {
    pattern: /\b(budget (?:cut|reduction|increase|allocation|shortfall)|financial data|revenue figure|expenditure report|fiscal year|endowment|tuition increase|salary data|compensation)\b/i,
    flag: {
      policy: 'BPM E-1',
      policyTitle: 'Financial Reporting',
      reason: 'Draft contains financial or budget information — VP Finance should review for accuracy.',
      severity: 'warning',
    },
    approver: 'VP Finance',
  },
  // Legal / liability
  {
    pattern: /\b(legal action|lawsuit|litigation|liability|indemnif|settlement|attorney|legal counsel|regulatory compliance|consent decree|legal obligation)\b/i,
    flag: {
      policy: 'GR XIV',
      policyTitle: 'Legal Affairs',
      reason: 'Draft contains legal or liability language — Legal Counsel should review before distribution.',
      severity: 'warning',
    },
    approver: 'Legal Counsel',
  },
]

// ── Main Function ───────────────────────────────────────────

/**
 * Scan communication content for compliance-sensitive keywords and
 * patterns. Returns flags with policy references and a list of
 * suggested additional approvers.
 */
export async function checkCommunicationCompliance(
  content: string,
  type: string
): Promise<ComplianceCheckResult> {
  const flags: ComplianceFlag[] = []
  const approvers = new Set<string>()

  // Run each pattern against the content
  for (const rule of COMPLIANCE_PATTERNS) {
    if (rule.pattern.test(content)) {
      flags.push(rule.flag)
      if (rule.approver) approvers.add(rule.approver)
    }
  }

  // Campus-wide + crisis type always needs VP Communications
  if (type === 'crisis' || (type === 'campus-wide' && flags.some((f) => f.severity === 'error'))) {
    approvers.add('VP Communications')
  }

  // Campus-wide announcements should always go through Communications
  if (type === 'campus-wide' && !approvers.has('VP Communications')) {
    flags.push({
      policy: 'AR 1:3',
      policyTitle: 'University Communications',
      reason: 'Campus-wide announcements should be reviewed by University Communications for brand consistency.',
      severity: 'info',
    })
    approvers.add('VP Communications')
  }

  return {
    flags,
    suggestedApprovers: Array.from(approvers),
  }
}
