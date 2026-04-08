import type { SISAdapter } from './adapter'
import { MockSISAdapter } from './mock-adapter'
import { BannerSISAdapter } from './banner-adapter'
import { getInstitutionIntegrationByKey } from '../integrations/registry'

export type { SISAdapter }
export type { StudentProfile, CompletedCourse, TransferCredit, EnrolledCourse, AcademicStanding } from './types'

let _adapter: SISAdapter | null = null
let _adapterSignature = ''

export async function getSISAdapter(): Promise<SISAdapter> {
  const integration = await getInstitutionIntegrationByKey('SIS')
  const apiKey = process.env.SIS_API_KEY ?? ''
  const baseUrl = integration.effectiveBaseUrl ?? process.env.SIS_BASE_URL ?? ''
  const signature = `${integration.record.updatedAt.toISOString()}:${integration.effectiveMode}:${baseUrl}:${apiKey ? 'configured' : 'missing'}`

  if (_adapter && _adapterSignature === signature) return _adapter

  _adapter =
    integration.effectiveMode === 'SIMULATED'
      ? new MockSISAdapter()
      : new BannerSISAdapter(apiKey, baseUrl)
  _adapterSignature = signature
  return _adapter
}
