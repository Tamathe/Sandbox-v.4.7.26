import { prisma } from '../prisma'
import type { RoomRecommendation } from './types'

/**
 * Recommend top 5 rooms for a course based on predicted section size.
 * Ranks by utilization fit (80-95% ideal) + building engagement score
 * from BuildingAcademicProfile.weatherScore.
 */
export async function recommendRooms(
  predictedEnrollment: number,
  sections: number
): Promise<RoomRecommendation[]> {
  const sectionSize = Math.ceil(predictedEnrollment / Math.max(sections, 1))

  // Get rooms with sufficient capacity for one section
  const rooms = await prisma.campusRoom.findMany({
    where: {
      capacity: { gte: Math.floor(sectionSize * 0.7) }, // Allow slightly smaller rooms
      isAvailable: true,
    },
    orderBy: { capacity: 'asc' },
  })

  if (rooms.length === 0) return []

  // CampusRoom.building is a string name — look up engagement scores via CampusBuilding
  const buildingNames = [...new Set(rooms.map((r) => r.building))]
  const buildings = await prisma.campusBuilding.findMany({
    where: { name: { in: buildingNames } },
    include: { academicProfiles: { orderBy: { computedAt: 'desc' }, take: 1 } },
  })

  const engagementByBuilding = new Map<string, number>()
  for (const b of buildings) {
    const score = b.academicProfiles[0]?.weatherScore ?? 0
    engagementByBuilding.set(b.name, score)
  }

  const scored = rooms.map((room) => {
    const utilizationRate = room.capacity > 0 ? sectionSize / room.capacity : 0
    const engagementScore = engagementByBuilding.get(room.building) ?? 0

    // Ideal utilization is 80-95% — penalize deviation
    const utilizationFit = 1 - Math.abs(utilizationRate - 0.875)

    return {
      roomId: room.id,
      buildingName: room.building,
      roomName: room.name,
      capacity: room.capacity,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      engagementScore: Math.round(engagementScore * 100) / 100,
      reason: buildRoomReason(room.capacity, sectionSize, utilizationRate, engagementScore),
      _sortScore: utilizationFit * 0.6 + engagementScore * 0.4,
    }
  })

  return scored
    .sort((a, b) => b._sortScore - a._sortScore)
    .slice(0, 5)
    .map(({ _sortScore: _, ...rec }) => rec)
}

function buildRoomReason(
  capacity: number,
  sectionSize: number,
  utilization: number,
  engagement: number
): string {
  const parts: string[] = []

  if (utilization >= 0.8 && utilization <= 0.95) {
    parts.push(`Ideal fit: ${Math.round(utilization * 100)}% utilization`)
  } else if (utilization > 0.95) {
    parts.push(`Tight fit: ${Math.round(utilization * 100)}% utilization`)
  } else {
    parts.push(`${capacity - sectionSize} extra seats available`)
  }

  if (engagement >= 0.7) {
    parts.push('High engagement building')
  } else if (engagement >= 0.4) {
    parts.push('Moderate engagement building')
  }

  return parts.join(' · ')
}
