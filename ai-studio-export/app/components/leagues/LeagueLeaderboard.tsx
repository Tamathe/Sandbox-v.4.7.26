'use client'

import type { LeagueStanding } from './types'

export function LeagueLeaderboard({ standings }: { standings: LeagueStanding[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-bold text-gray-900">Leaderboard</h3>
      </div>
      {standings.length === 0 ? (
        <div className="px-5 py-8 text-sm text-gray-500">Standings will appear after the first cycle resolves.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 text-left">#</th>
              <th className="px-5 py-3 text-left">Member</th>
              <th className="px-5 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing) => (
              <tr key={standing.id} className="border-t border-gray-100">
                <td className="px-5 py-3 font-semibold text-gray-500">{standing.rank ?? '-'}</td>
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{standing.name}</div>
                  <div className="text-xs text-gray-500">
                    {standing.wins}W / {standing.losses}L
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-bold text-[#0033A0]">
                  {Number.isInteger(standing.score) ? standing.score : standing.score.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
