'use client'

import { CoffeeRouletteView } from './adapters/CoffeeRouletteView'
import { PredictionMarketView } from './adapters/PredictionMarketView'
import { SurvivorPoolView } from './adapters/SurvivorPoolView'
import type { LeagueCycle, LeagueDetail } from './types'

export function LeagueSubmissionPanel({
  league,
  cycle,
  actionBusy,
  onSubmit,
  onResolve,
}: {
  league: LeagueDetail
  cycle: LeagueCycle
  actionBusy: boolean
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  onResolve: (payload: Record<string, unknown>) => Promise<void>
}) {
  const mySubmission =
    league.myMembership ? cycle.submissions.find((submission) => submission.memberId === league.myMembership?.id) ?? null : null
  const isAdmin = league.myMembership?.role === 'OWNER' || league.myMembership?.role === 'ADMIN'

  if (league.kind === 'PREDICTION_MARKET') {
    return (
      <PredictionMarketView
        cycle={cycle}
        mySubmission={mySubmission}
        isAdmin={isAdmin}
        actionBusy={actionBusy}
        onSubmit={onSubmit}
        onResolve={onResolve}
      />
    )
  }

  if (league.kind === 'SURVIVOR_POOL') {
    return (
      <SurvivorPoolView
        cycle={cycle}
        mySubmission={mySubmission}
        isAdmin={isAdmin}
        actionBusy={actionBusy}
        onSubmit={onSubmit}
        onResolve={onResolve}
      />
    )
  }

  return (
    <CoffeeRouletteView
      cycle={cycle}
      mySubmission={mySubmission}
      members={league.members}
      isAdmin={isAdmin}
      actionBusy={actionBusy}
      onSubmit={onSubmit}
      onResolve={onResolve}
    />
  )
}
