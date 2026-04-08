// ─── ClinicalTrials.gov API v2 Client ─────────────────────────────────────────

import type { ClinicalTrial, TrialSearchParams } from './types'

const BASE_URL = 'https://clinicaltrials.gov/api/v2'

/**
 * Search ClinicalTrials.gov for studies matching the given parameters.
 * No API key required — public endpoint.
 */
export async function searchTrials(params: TrialSearchParams): Promise<ClinicalTrial[]> {
  const url = new URL(`${BASE_URL}/studies`)

  if (params.condition) url.searchParams.set('query.cond', params.condition)
  if (params.intervention) url.searchParams.set('query.intr', params.intervention)

  // Default to recruiting trials
  const statuses = params.status?.length
    ? params.status.join(',')
    : 'RECRUITING,ENROLLING_BY_INVITATION,NOT_YET_RECRUITING'
  url.searchParams.set('filter.overallStatus', statuses)

  // Age group filter
  if (params.ageRange?.min || params.ageRange?.max) {
    const ageFilters: string[] = []
    const age = params.ageRange.min ?? params.ageRange.max ?? 30
    if (age < 18) ageFilters.push('ages:child')
    if (age >= 18 && age < 65) ageFilters.push('ages:adult')
    if (age >= 65) ageFilters.push('ages:older_adult')
    if (ageFilters.length) {
      url.searchParams.set('aggFilters', ageFilters.join(','))
    }
  }

  url.searchParams.set('pageSize', String(params.pageSize ?? 20))
  url.searchParams.set('countTotal', 'true')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`ClinicalTrials.gov API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  return (data.studies ?? []).map(mapStudyToTrial)
}

/**
 * Fetch a single trial by NCT ID.
 */
export async function getTrialByNctId(nctId: string): Promise<ClinicalTrial> {
  const res = await fetch(`${BASE_URL}/studies/${nctId}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw new Error(`ClinicalTrials.gov API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  return mapStudyToTrial(data)
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapStudyToTrial(study: any): ClinicalTrial {
  const p = study.protocolSection ?? study
  const id = p.identificationModule ?? {}
  const status = p.statusModule ?? {}
  const desc = p.descriptionModule ?? {}
  const conds = p.conditionsModule ?? {}
  const design = p.designModule ?? {}
  const arms = p.armsInterventionsModule ?? {}
  const elig = p.eligibilityModule ?? {}
  const sponsor = p.sponsorCollaboratorsModule ?? {}
  const contacts = p.contactsLocationsModule ?? {}

  return {
    nctId: id.nctId ?? '',
    briefTitle: id.briefTitle ?? '',
    officialTitle: id.officialTitle ?? undefined,
    overallStatus: status.overallStatus ?? 'UNKNOWN',
    phases: design.phases ?? [],
    conditions: conds.conditions ?? [],
    interventions: (arms.interventions ?? []).map((i: any) => ({
      type: i.type ?? '',
      name: i.name ?? '',
      description: i.description ?? undefined,
    })),
    eligibilityCriteria: elig.eligibilityCriteria ?? '',
    minimumAge: elig.minimumAge ?? undefined,
    maximumAge: elig.maximumAge ?? undefined,
    sex: elig.sex ?? 'ALL',
    healthyVolunteers: elig.healthyVolunteers ?? false,
    enrollmentCount: design.enrollmentInfo?.count ?? undefined,
    enrollmentType: design.enrollmentInfo?.type ?? undefined,
    briefSummary: desc.briefSummary ?? undefined,
    leadSponsor: sponsor.leadSponsor?.name ?? undefined,
    startDate: status.startDateStruct?.date ?? undefined,
    locations: (contacts.locations ?? []).slice(0, 5).map((loc: any) => ({
      facility: loc.facility ?? '',
      city: loc.city ?? '',
      state: loc.state ?? '',
      country: loc.country ?? '',
    })),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
