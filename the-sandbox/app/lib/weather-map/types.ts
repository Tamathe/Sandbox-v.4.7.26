/**
 * Learning Weather Map — Shared Types
 *
 * Academic performance overlay for the campus map.
 * All location data is schedule-inferred, never GPS.
 */

// ── Building weather data for the map overlay ──

export interface WeatherBuildingData {
  id: string
  name: string
  lat: number
  lng: number
  type: string
  weatherScore: number
  weatherTrend: string // "heating" | "stable" | "cooling"
  weeklyStudents: number
  weeklySessions: number
  avgMinutes: number
  peakHours: number[]
  topCourses: string[]
  topModes: string[]
  noiseLevel: string | null
  hasStudySpaces: boolean
  hasFood: boolean
  avgSessionScore: number | null
}

export interface WeatherMapData {
  buildings: WeatherBuildingData[]
  lastComputed: string
}

// ── Study recommendation ──

export interface StudyRecommendation {
  buildingId: string
  buildingName: string
  score: number
  reason: string
  courseRelevance: string[]
  weatherScore: number
  noiseLevel: string | null
  peakHours: number[]
  hasFood?: boolean
}

// ── Building profile computation result ──

export interface BuildingProfileData {
  weeklySessionCount: number
  weeklyStudentCount: number
  avgSessionMinutes: number
  peakHours: number[]
  peakDays: number[]
  avgSessionScore: number | null
  avgMasteryGain: number | null
  topCourses: string[]
  topStudyModes: string[]
  bloomDistribution: Record<string, number> | null
  hasStudySpaces: boolean
  hasFood: boolean
  noiseLevel: string
  wifiQuality: string | null
  weatherScore: number
  weatherTrend: string
}
