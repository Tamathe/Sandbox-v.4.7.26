'use client'

import type { LeagueEvent } from './types'

export function LeagueFeed({ events }: { events: LeagueEvent[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-bold text-gray-900">Activity Feed</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {events.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500">League activity will show up here.</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="px-5 py-3">
              <p className="text-sm text-gray-800">{event.message}</p>
              <p className="mt-1 text-xs text-gray-500">
                {new Date(event.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
