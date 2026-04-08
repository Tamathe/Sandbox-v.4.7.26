/**
 * Canvas LMS API client.
 *
 * Current role: write-only grade sink.
 * Future: Sandbox becomes system of record; Canvas becomes an optional sync target.
 *
 * Required env vars when Canvas runs in real mode:
 *   CANVAS_BASE_URL
 *   CANVAS_API_TOKEN
 */

import { getInstitutionIntegrationByKey } from './integrations/registry'

async function getCanvasRuntimeConfig() {
  const integration = await getInstitutionIntegrationByKey('CANVAS')
  const baseUrl = integration.effectiveBaseUrl
  const token = process.env.CANVAS_API_TOKEN ?? null
  const configured =
    integration.effectiveMode === 'REAL' && Boolean(baseUrl && token)

  return {
    integration,
    baseUrl,
    token,
    configured,
  }
}

export interface GradePushParams {
  canvasCourseId: string
  canvasAssignmentId: string
  studentEmail: string
  score: number
  comment?: string
}

export interface GradePushResult {
  success: boolean
  error?: string
}

export async function pushGradeToCanvas(
  params: GradePushParams,
): Promise<GradePushResult> {
  const { baseUrl, token, configured } = await getCanvasRuntimeConfig()

  if (!configured || !baseUrl || !token) {
    console.warn('[canvas-client] Canvas not configured, skipping grade push')
    return { success: false, error: 'Canvas not configured' }
  }

  try {
    const userRes = await fetch(
      `${baseUrl}/api/v1/accounts/self/users?search_term=${encodeURIComponent(params.studentEmail)}&per_page=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!userRes.ok) {
      return { success: false, error: `Canvas user lookup failed: ${userRes.status}` }
    }

    const usersRaw = await userRes.json()
    if (!Array.isArray(usersRaw)) {
      return {
        success: false,
        error: 'Canvas user lookup returned unexpected response format',
      }
    }

    const users = usersRaw as Array<{ id: number }>
    if (!users.length || typeof users[0]?.id !== 'number') {
      return {
        success: false,
        error: `Student not found in Canvas: ${params.studentEmail}`,
      }
    }

    const canvasUserId = users[0].id
    const body: Record<string, unknown> = {
      submission: { posted_grade: String(params.score) },
    }

    if (params.comment) {
      body.comment = { text_comment: params.comment }
    }

    const gradeRes = await fetch(
      `${baseUrl}/api/v1/courses/${params.canvasCourseId}/assignments/${params.canvasAssignmentId}/submissions/${canvasUserId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    )

    if (!gradeRes.ok) {
      const errText = await gradeRes.text().catch(() => '')
      return {
        success: false,
        error: `Canvas grade push failed: ${gradeRes.status} ${errText}`,
      }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[canvas-client] Grade push error:', message)
    return { success: false, error: message }
  }
}

export async function canvasConfigured(): Promise<boolean> {
  const { configured } = await getCanvasRuntimeConfig()
  return configured
}

export interface CanvasModuleResult {
  id: number
  name: string
  position: number
}

export interface CanvasModuleItemResult {
  id: number
  title: string
  type: string
}

export async function getCanvasModules(
  canvasCourseId: string,
): Promise<CanvasModuleResult[]> {
  const { baseUrl, token, configured } = await getCanvasRuntimeConfig()
  if (!configured || !baseUrl || !token) {
    throw new Error('Canvas not configured')
  }

  const res = await fetch(
    `${baseUrl}/api/v1/courses/${canvasCourseId}/modules?per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Canvas get modules failed: ${res.status} ${errText}`)
  }

  const modulesRaw = await res.json()
  if (!Array.isArray(modulesRaw)) {
    throw new Error('Canvas get modules returned unexpected response format')
  }

  const modules = modulesRaw as CanvasModuleResult[]
  return modules.sort((a, b) => a.position - b.position)
}

export async function getCanvasModuleItems(
  canvasCourseId: string,
  moduleId: number,
): Promise<CanvasModuleItemResult[]> {
  const { baseUrl, token, configured } = await getCanvasRuntimeConfig()
  if (!configured || !baseUrl || !token) {
    throw new Error('Canvas not configured')
  }

  const res = await fetch(
    `${baseUrl}/api/v1/courses/${canvasCourseId}/modules/${moduleId}/items?per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Canvas get module items failed: ${res.status} ${errText}`)
  }

  const itemsRaw = await res.json()
  if (!Array.isArray(itemsRaw)) {
    throw new Error('Canvas get module items returned unexpected response format')
  }

  return itemsRaw as CanvasModuleItemResult[]
}

export async function createCanvasModule(
  canvasCourseId: string,
  name: string,
  position: number,
): Promise<CanvasModuleResult> {
  const { baseUrl, token, configured } = await getCanvasRuntimeConfig()
  if (!configured || !baseUrl || !token) {
    throw new Error('Canvas not configured')
  }

  const res = await fetch(
    `${baseUrl}/api/v1/courses/${canvasCourseId}/modules`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        module: { name, position },
      }),
    },
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Canvas create module failed: ${res.status} ${errText}`)
  }

  return res.json() as Promise<CanvasModuleResult>
}

export async function addCanvasModuleItem(
  canvasCourseId: string,
  moduleId: number,
  title: string,
  type: 'SubHeader' | 'ExternalUrl' | 'Page',
  options?: { externalUrl?: string; newTab?: boolean },
): Promise<CanvasModuleItemResult> {
  const { baseUrl, token, configured } = await getCanvasRuntimeConfig()
  if (!configured || !baseUrl || !token) {
    throw new Error('Canvas not configured')
  }

  const item: Record<string, unknown> = { title, type }
  if (type === 'ExternalUrl' && options?.externalUrl) {
    item.external_url = options.externalUrl
    item.new_tab = options.newTab ?? true
  }

  const res = await fetch(
    `${baseUrl}/api/v1/courses/${canvasCourseId}/modules/${moduleId}/items`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ module_item: item }),
    },
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Canvas add module item failed: ${res.status} ${errText}`)
  }

  return res.json() as Promise<CanvasModuleItemResult>
}
