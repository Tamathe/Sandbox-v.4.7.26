import { config } from 'dotenv'

config({ path: '.env' })

const contestArg = process.argv.find((arg) => arg.startsWith('--contest='))
const targetContestId = contestArg?.slice('--contest='.length) ?? null

async function syncContest(
  contestId: string,
  commissionerId: string,
  name: string,
  prisma: Awaited<ReturnType<typeof loadDeps>>['prisma'],
  results: Awaited<ReturnType<typeof loadDeps>>['results'],
  recalculateAllEntries: Awaited<ReturnType<typeof loadDeps>>['recalculateAllEntries']
) {
  for (const result of results) {
    const enteredAt = new Date(`${result.completedAt}T23:59:59.000Z`)
    await prisma.bracketResult.upsert({
      where: { contestId_gameId: { contestId, gameId: result.gameId } },
      create: {
        contestId,
        gameId: result.gameId,
        winnerId: result.winnerId,
        round: result.round,
        enteredAt,
        enteredById: commissionerId,
      },
      update: {
        winnerId: result.winnerId,
        round: result.round,
        enteredAt,
        enteredById: commissionerId,
      },
    })
  }

  await prisma.bracketContest.update({
    where: { id: contestId },
    data: { status: 'IN_PROGRESS' },
  })

  await recalculateAllEntries(contestId)

  console.log(
    `Synced ${results.length} results into "${name}" (${contestId}).`
  )
}

async function loadDeps() {
  const [{ prisma }, { OFFICIAL_RESULTS_2026 }, { recalculateAllEntries }] =
    await Promise.all([
      import('../app/lib/prisma'),
      import('../app/lib/bracket/official-results-2026'),
      import('../app/lib/bracket/scoring-service'),
    ])

  return {
    prisma,
    results: OFFICIAL_RESULTS_2026,
    recalculateAllEntries,
  }
}

async function main(deps: Awaited<ReturnType<typeof loadDeps>>) {
  const { prisma, results, recalculateAllEntries } = deps
  const contests = await prisma.bracketContest.findMany({
    where: targetContestId ? { id: targetContestId } : undefined,
    select: { id: true, commissionerId: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  if (contests.length === 0) {
    console.log(targetContestId
      ? `No bracket contest found for ${targetContestId}.`
      : 'No bracket contests found.')
    return
  }

  for (const contest of contests) {
    await syncContest(contest.id, contest.commissionerId, contest.name, prisma, results, recalculateAllEntries)
  }
}

async function run() {
  const deps = await loadDeps()
  try {
    await main(deps)
  } finally {
    await deps.prisma.$disconnect()
  }
}

run().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
