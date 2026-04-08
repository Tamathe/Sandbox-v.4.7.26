/**
 * room-reservation-service.ts
 *
 * Sandy-powered room search and booking intelligence.
 */

import { ROOMS, BUILDINGS, searchRooms, getAmenityLabel } from './room-data'

export interface RoomSearchRequest {
  query: string
  userId: string
  userName: string
}

export function getRoomSearchSystemPrompt(req: RoomSearchRequest): string {
  const roomList = ROOMS.map(r => `- ${r.id}: ${r.name} in ${r.building} (cap: ${r.capacity}, amenities: ${r.amenities.join(', ')})`).join('\n')
  const buildingList = BUILDINGS.map(b => `- ${b.code}: ${b.name} (${b.address})`).join('\n')

  return `You are Sandy, helping ${req.userName} find and book a room at the University of Kentucky.

## Available Buildings
${buildingList}

## Available Rooms
${roomList}

## Instructions
The user has made a room request. Parse their request and respond with:

1. A friendly 1-2 sentence acknowledgment
2. A JSON block with the search parameters:

\`\`\`json
{
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "minCapacity": number,
  "amenities": ["projector", "video-conf"],
  "building": "building code or null"
}
\`\`\`

If any parameter is missing from the request, use reasonable defaults:
- date: next weekday
- time: 10:00-11:00
- capacity: 10
- amenities: []
- building: null (search all)

If the user says something like "I need a room for 10 people with a projector next Thursday", parse all of that into the JSON.
Always include the JSON block in your response.`
}

/**
 * Parse Sandy's response to extract search parameters.
 */
export function parseSearchParams(response: string): {
  date: string
  startTime: string
  endTime: string
  minCapacity: number
  amenities: string[]
  building: string | null
  sandyMessage: string
} | null {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/) ?? response.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) return null
    const json = jsonMatch[1] ?? jsonMatch[0]
    const parsed = JSON.parse(json)

    // Extract Sandy's message (everything before the JSON)
    const jsonStart = response.indexOf('```json') !== -1 ? response.indexOf('```json') : response.indexOf('{')
    const sandyMessage = response.slice(0, jsonStart).trim()

    return {
      date: parsed.date ?? new Date().toISOString().split('T')[0],
      startTime: parsed.startTime ?? '10:00',
      endTime: parsed.endTime ?? '11:00',
      minCapacity: parsed.minCapacity ?? 10,
      amenities: parsed.amenities ?? [],
      building: parsed.building ?? null,
      sandyMessage,
    }
  } catch {
    return null
  }
}

export { searchRooms, ROOMS, BUILDINGS, getAmenityLabel }
