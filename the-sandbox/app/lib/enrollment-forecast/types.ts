export type HistoricalTrend = 'growing' | 'stable' | 'declining'
export type RiskLevel = 'normal' | 'over-capacity' | 'under-enrolled' | 'bottleneck'

export interface DemandForecast {
  courseCode: string
  term: string
  degreeAuditDemand: number
  historicalAvg: number
  historicalTrend: HistoricalTrend
  waitlistHistory: number
  prerequisitesPassed: number
  predictedEnrollment: number
  predictedSections: number
  confidenceLevel: number
  riskLevel: RiskLevel
  currentCapacity: number
  capacityGap: number
}

export interface RoomRecommendation {
  roomId: string
  buildingName: string
  roomName: string
  capacity: number
  utilizationRate: number
  engagementScore: number
  reason: string
}

export interface EnrollmentForecastRecord {
  id: string
  term: string
  courseCode: string
  computedAt: Date
  degreeAuditDemand: number
  historicalAvg: number
  historicalTrend: string
  waitlistHistory: number
  prerequisitesPassed: number
  predictedEnrollment: number
  predictedSections: number
  confidenceLevel: number
  riskLevel: string
  recommendedRooms: RoomRecommendation[]
  currentCapacity: number
  capacityGap: number
}

export interface ForecastBriefingBlock {
  type: 'enrollment-bottleneck'
  title: string
  summary: string
  items: Array<{
    courseCode: string
    predictedEnrollment: number
    currentCapacity: number
    capacityGap: number
  }>
}
