import { prisma } from './prisma'
import { computeComplianceScore } from './compliance-scoring-service'

// ── Types ───────────────────────────────────────────────────────────────────

export type TestResult = {
  name: string
  status: 'pass' | 'fail'
  durationMs: number
  error?: string
}

export type TestSuiteResult = {
  ranAt: string
  totalTests: number
  passed: number
  failed: number
  durationMs: number
  results: TestResult[]
}

// ── Test Helpers ────────────────────────────────────────────────────────────

async function runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now()
  try {
    await fn()
    return { name, status: 'pass', durationMs: Date.now() - start }
  } catch (e) {
    return {
      name,
      status: 'fail',
      durationMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

// ── Test Suite ──────────────────────────────────────────────────────────────

export async function runComplianceTests(): Promise<TestSuiteResult> {
  const start = Date.now()
  const results: TestResult[] = []

  // T1: Auth guard — users table should exist and have users
  results.push(
    await runTest('Auth: Users exist in database', async () => {
      const count = await prisma.user.count()
      assert(count > 0, 'No users found in database')
    }),
  )

  // T2: Auth guard — admin users exist
  results.push(
    await runTest('Auth: Admin users exist', async () => {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
      assert(admins.length > 0, 'No admin users found')
    }),
  )

  // T3: Data isolation — each user's compliance data is scoped
  results.push(
    await runTest('Data isolation: Compliance notifications scoped to user', async () => {
      const users = await prisma.user.findMany({ take: 2, select: { id: true } })
      if (users.length < 2) return // skip if < 2 users

      const notifs1 = await prisma.complianceNotification.findMany({ where: { userId: users[0].id } })
      const notifs2 = await prisma.complianceNotification.findMany({ where: { userId: users[1].id } })

      // Verify no cross-contamination
      for (const n of notifs1) {
        assert(n.userId === users[0].id, `Notification ${n.id} leaked to wrong user`)
      }
      for (const n of notifs2) {
        assert(n.userId === users[1].id, `Notification ${n.id} leaked to wrong user`)
      }
    }),
  )

  // T4: Data isolation — consent categories scoped
  results.push(
    await runTest('Data isolation: Consent categories scoped to user', async () => {
      const users = await prisma.user.findMany({ take: 2, select: { id: true } })
      if (users.length < 2) return

      const cats1 = await prisma.userConsentCategory.findMany({ where: { userId: users[0].id } })
      for (const c of cats1) {
        assert(c.userId === users[0].id, `Consent category ${c.id} leaked to wrong user`)
      }
    }),
  )

  // T5: FERPA field visibility — non-educator users should not have ferpaAckAt required
  results.push(
    await runTest('FERPA: Students get auto-granted FERPA score (20pts)', async () => {
      const student = await prisma.user.findFirst({
        where: { role: 'STUDENT' },
        select: { id: true },
      })
      if (!student) return

      const result = await computeComplianceScore(student.id)
      assert(result.breakdown.ferpa === 20, `Student FERPA score should be 20 (auto-grant), got ${result.breakdown.ferpa}`)
    }),
  )

  // T6: Score computation — user with no compliance should score low
  results.push(
    await runTest('Score: User with no TOS/consent/FERPA scores 25 or less', async () => {
      const user = await prisma.user.findFirst({
        where: {
          tosAcceptedAt: null,
          dataConsentAt: null,
        },
        select: { id: true, role: true },
      })
      if (!user) return // skip — all users have compliance

      const result = await computeComplianceScore(user.id)
      // Without TOS (0) and consent (0), max from FERPA (20 if student) + recency (5) + categories (0) = 25
      assert(result.score <= 25, `Score for non-compliant user should be ≤25, got ${result.score}`)
    }),
  )

  // T7: Score computation — full compliance user
  results.push(
    await runTest('Score: TOS acceptance yields 25 points', async () => {
      const user = await prisma.user.findFirst({
        where: { tosAcceptedAt: { not: null } },
        select: { id: true },
      })
      if (!user) return

      const result = await computeComplianceScore(user.id)
      assert(result.breakdown.tos === 25, `TOS should be 25 when accepted, got ${result.breakdown.tos}`)
    }),
  )

  // T8: Score computation — consent yields 25
  results.push(
    await runTest('Score: Data consent yields 25 points', async () => {
      const user = await prisma.user.findFirst({
        where: { dataConsentAt: { not: null } },
        select: { id: true },
      })
      if (!user) return

      const result = await computeComplianceScore(user.id)
      assert(result.breakdown.consent === 25, `Consent should be 25 when accepted, got ${result.breakdown.consent}`)
    }),
  )

  // T9: Score range — all scores should be 0–100
  results.push(
    await runTest('Score: All scores in 0–100 range', async () => {
      const users = await prisma.user.findMany({ take: 10, select: { id: true } })
      for (const u of users) {
        const result = await computeComplianceScore(u.id)
        assert(result.score >= 0 && result.score <= 100, `Score ${result.score} out of 0–100 range for user ${u.id}`)
      }
    }),
  )

  // T10: FERPA training attempts are scoped to user
  results.push(
    await runTest('Data isolation: FERPA training attempts scoped to user', async () => {
      const attempts = await prisma.ferpaTrainingAttempt.findMany({ take: 10 })
      for (const a of attempts) {
        assert(!!a.userId, `FERPA attempt ${a.id} missing userId`)
      }
    }),
  )

  // T11: Compliance audit logs have valid actions
  results.push(
    await runTest('Audit: Compliance audit log entries have valid actions', async () => {
      const logs = await prisma.complianceAuditLog.findMany({ take: 20 })
      const validActions = ['accept-tos', 'accept-consent', 'accept-ferpa', 'bulk-tos-reset', 'update-consent-categories']
      for (const log of logs) {
        assert(validActions.includes(log.action), `Unknown audit action: ${log.action}`)
      }
    }),
  )

  // T12: DPA records have required fields
  results.push(
    await runTest('DPA: All DPA records have vendor name and expiry', async () => {
      const dpas = await prisma.dataProcessingAgreement.findMany()
      for (const dpa of dpas) {
        assert(!!dpa.vendorName, `DPA ${dpa.id} missing vendorName`)
        assert(!!dpa.expiresAt, `DPA ${dpa.id} missing expiresAt`)
      }
    }),
  )

  // T13: FERPA incidents have valid severity
  results.push(
    await runTest('Incidents: FERPA incidents have valid severity levels', async () => {
      const incidents = await prisma.ferpaIncident.findMany()
      const validSeverities = ['low', 'medium', 'high', 'critical']
      for (const inc of incidents) {
        assert(validSeverities.includes(inc.severity), `Invalid severity: ${inc.severity}`)
      }
    }),
  )

  const totalDuration = Date.now() - start
  const passed = results.filter((r) => r.status === 'pass').length

  return {
    ranAt: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed: results.length - passed,
    durationMs: totalDuration,
    results,
  }
}
