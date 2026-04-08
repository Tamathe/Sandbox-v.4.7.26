import { prisma } from '../prisma'
import {
  buildGraphUserPath,
  getGraphAccessToken,
  getGraphRuntimeDiagnostics,
  graphJsonRequest,
} from '../assistant/graph-client'
import {
  getInstitutionIntegrationById,
  getIntegrationCatalogEntry,
  persistIntegrationHealthResult,
  serializeIntegration,
} from './registry'
import type {
  IntegrationHealthCheckOptions,
  IntegrationHealthCheckResult,
  IntegrationStatus,
  ResolvedIntegration,
} from './types'

function buildResult(
  integration: ResolvedIntegration,
  input: Omit<IntegrationHealthCheckResult, 'key'>,
): IntegrationHealthCheckResult {
  return {
    key: integration.record.key as IntegrationHealthCheckResult['key'],
    ...input,
  }
}

async function checkSimulatedAssistant(
  integration: ResolvedIntegration,
  simulate: boolean,
) {
  const checkedAt = new Date().toISOString()

  if (simulate) {
    return buildResult(integration, {
      status: 'HEALTHY',
      configured: true,
      simulated: true,
      checkedAt,
      lastHealthyAt: checkedAt,
      lastFailureAt: null,
      lastError: null,
      message: 'Dry run: simulated assistant provider is available.',
      details: {
        provider: 'simulated',
        scopes: ['calendar', 'email'],
      },
    })
  }

  const [calendarEvents, emails] = await Promise.all([
    prisma.assistantCalendarEvent.count(),
    prisma.assistantEmail.count(),
  ])

  return buildResult(integration, {
    status: 'HEALTHY',
    configured: true,
    simulated: false,
    checkedAt,
    lastHealthyAt: checkedAt,
    lastFailureAt: null,
    lastError: null,
    message: 'Simulated assistant provider is healthy.',
    details: {
      provider: 'simulated',
      calendarEvents,
      emails,
    },
  })
}

async function checkSimulatedFiles(
  integration: ResolvedIntegration,
  simulate: boolean,
) {
  const checkedAt = new Date().toISOString()

  if (simulate) {
    return buildResult(integration, {
      status: 'HEALTHY',
      configured: true,
      simulated: true,
      checkedAt,
      lastHealthyAt: checkedAt,
      lastFailureAt: null,
      lastError: null,
      message: 'Dry run: simulated file provider is available.',
      details: {
        provider: 'simulated',
      },
    })
  }

  const [courseMaterials, serviceDocuments] = await Promise.all([
    prisma.courseMaterial.count(),
    prisma.serviceDocument.count(),
  ])

  return buildResult(integration, {
    status: 'HEALTHY',
    configured: true,
    simulated: false,
    checkedAt,
    lastHealthyAt: checkedAt,
    lastFailureAt: null,
    lastError: null,
    message: 'Simulated SharePoint/OneDrive file provider is healthy.',
    details: {
      provider: 'simulated',
      courseMaterials,
      serviceDocuments,
    },
  })
}

function checkSimulatedSIS(
  integration: ResolvedIntegration,
  simulate: boolean,
) {
  const checkedAt = new Date().toISOString()

  return buildResult(integration, {
    status: 'HEALTHY',
    configured: true,
    simulated: simulate,
    checkedAt,
    lastHealthyAt: checkedAt,
    lastFailureAt: null,
    lastError: null,
    message: simulate
      ? 'Dry run: mock SIS adapter is available.'
      : 'Mock SIS adapter is healthy.',
    details: {
      adapter: 'mock',
      mode: 'simulated',
    },
  })
}

function blockedResult(
  integration: ResolvedIntegration,
  status: IntegrationStatus,
  message: string,
  details: Record<string, unknown> | null = null,
) {
  const checkedAt = new Date().toISOString()

  return buildResult(integration, {
    status,
    configured: integration.effectiveConfigured,
    simulated: false,
    checkedAt,
    lastHealthyAt:
      status === 'HEALTHY'
        ? checkedAt
        : integration.record.lastHealthyAt?.toISOString() ?? null,
    lastFailureAt:
      status === 'HEALTHY' ? null : checkedAt,
    lastError: status === 'HEALTHY' ? null : message,
    message,
    details,
  })
}

async function checkCanvas(
  integration: ResolvedIntegration,
  simulate: boolean,
) {
  if (!integration.effectiveConfigured || !integration.effectiveBaseUrl) {
    return blockedResult(
      integration,
      'NOT_CONFIGURED',
      'Canvas is set to real mode but a base URL and API token are not configured.',
    )
  }

  if (simulate) {
    return blockedResult(
      integration,
      'DEGRADED',
      'Dry run only: Canvas configuration is present, but the external API ping was skipped.',
      { baseUrl: integration.effectiveBaseUrl },
    )
  }

  try {
    const response = await fetch(
      `${integration.effectiveBaseUrl}/api/v1/users/self`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CANVAS_API_TOKEN}`,
        },
      },
    )

    if (response.ok) {
      const checkedAt = new Date().toISOString()
      return buildResult(integration, {
        status: 'HEALTHY',
        configured: true,
        simulated: false,
        checkedAt,
        lastHealthyAt: checkedAt,
        lastFailureAt: null,
        lastError: null,
        message: 'Canvas API responded successfully.',
        details: { baseUrl: integration.effectiveBaseUrl },
      })
    }

    if (response.status === 401 || response.status === 403) {
      return blockedResult(
        integration,
        'BLOCKED',
        `Canvas rejected the configured credentials with HTTP ${response.status}.`,
        { baseUrl: integration.effectiveBaseUrl },
      )
    }

    return blockedResult(
      integration,
      'DEGRADED',
      `Canvas health check returned HTTP ${response.status}.`,
      { baseUrl: integration.effectiveBaseUrl },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Canvas connectivity error'
    return blockedResult(
      integration,
      'DEGRADED',
      `Canvas health check failed: ${message}`,
      { baseUrl: integration.effectiveBaseUrl },
    )
  }
}

async function checkGraphAssistant(
  integration: ResolvedIntegration,
  simulate: boolean,
) {
  const checkedAt = new Date().toISOString()
  const diagnostics = getGraphRuntimeDiagnostics()

  if (simulate) {
    return buildResult(integration, {
      status: 'DEGRADED',
      configured: integration.effectiveConfigured,
      simulated: true,
      checkedAt,
      lastHealthyAt: integration.record.lastHealthyAt?.toISOString() ?? null,
      lastFailureAt: null,
      lastError: null,
      message:
        'Dry run: Microsoft Graph assistant provider is configured, but the mailbox probes were skipped.',
      details: {
        provider: 'graph',
        healthcheckUserEmail: diagnostics.healthcheckUserEmail,
      },
    })
  }

  try {
    await getGraphAccessToken()

    if (!diagnostics.healthcheckUserEmail) {
      return buildResult(integration, {
        status: 'DEGRADED',
        configured: integration.effectiveConfigured,
        simulated: false,
        checkedAt,
        lastHealthyAt: integration.record.lastHealthyAt?.toISOString() ?? null,
        lastFailureAt: checkedAt,
        lastError:
          'AZURE_GRAPH_HEALTHCHECK_USER_EMAIL is not configured for mailbox probes.',
        message:
          'Microsoft Graph credentials are valid, but no health-check mailbox is configured.',
        details: {
          provider: 'graph',
        },
      })
    }

    const userPath = buildGraphUserPath(diagnostics.healthcheckUserEmail)
    const now = new Date()
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)

    await Promise.all([
      graphJsonRequest(`${userPath}/mailFolders/Inbox/messages?$top=1&$select=id`),
      graphJsonRequest(
        `${userPath}/calendarView?startDateTime=${encodeURIComponent(now.toISOString())}&endDateTime=${encodeURIComponent(inOneHour.toISOString())}&$top=1&$select=id`,
        {
          headers: {
            Prefer: 'outlook.timezone="UTC"',
          },
        },
      ),
    ])

    return buildResult(integration, {
      status: 'HEALTHY',
      configured: true,
      simulated: false,
      checkedAt,
      lastHealthyAt: checkedAt,
      lastFailureAt: null,
      lastError: null,
      message: 'Microsoft Graph calendar and inbox probes succeeded.',
      details: {
        provider: 'graph',
        healthcheckUserEmail: diagnostics.healthcheckUserEmail,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Microsoft Graph error'
    return blockedResult(
      integration,
      /401|403/.test(message) ? 'BLOCKED' : 'DEGRADED',
      `Microsoft Graph assistant health check failed: ${message}`,
      {
        provider: 'graph',
        healthcheckUserEmail: diagnostics.healthcheckUserEmail,
      },
    )
  }
}

async function checkGraphFiles(
  integration: ResolvedIntegration,
  simulate: boolean,
) {
  const checkedAt = new Date().toISOString()
  const diagnostics = getGraphRuntimeDiagnostics()

  if (simulate) {
    return buildResult(integration, {
      status: 'DEGRADED',
      configured: integration.effectiveConfigured,
      simulated: true,
      checkedAt,
      lastHealthyAt: integration.record.lastHealthyAt?.toISOString() ?? null,
      lastFailureAt: null,
      lastError: null,
      message:
        'Dry run: Microsoft Graph file provider is configured, but the drive probe was skipped.',
      details: {
        provider: 'graph',
        healthcheckUserEmail: diagnostics.healthcheckUserEmail,
        sharePointSiteId: diagnostics.sharePointSiteId,
      },
    })
  }

  try {
    await getGraphAccessToken()

    if (diagnostics.sharePointSiteId) {
      await graphJsonRequest(
        `/sites/${encodeURIComponent(diagnostics.sharePointSiteId)}/drive/root?$select=id,name,webUrl`,
      )

      return buildResult(integration, {
        status: 'HEALTHY',
        configured: true,
        simulated: false,
        checkedAt,
        lastHealthyAt: checkedAt,
        lastFailureAt: null,
        lastError: null,
        message: 'Microsoft Graph SharePoint drive probe succeeded.',
        details: {
          provider: 'graph',
          sharePointSiteId: diagnostics.sharePointSiteId,
        },
      })
    }

    if (diagnostics.healthcheckUserEmail) {
      await graphJsonRequest(
        `${buildGraphUserPath(diagnostics.healthcheckUserEmail)}/drive/root?$select=id,name,webUrl`,
      )

      return buildResult(integration, {
        status: 'HEALTHY',
        configured: true,
        simulated: false,
        checkedAt,
        lastHealthyAt: checkedAt,
        lastFailureAt: null,
        lastError: null,
        message: 'Microsoft Graph OneDrive probe succeeded.',
        details: {
          provider: 'graph',
          healthcheckUserEmail: diagnostics.healthcheckUserEmail,
        },
      })
    }

    return buildResult(integration, {
      status: 'DEGRADED',
      configured: integration.effectiveConfigured,
      simulated: false,
      checkedAt,
      lastHealthyAt: integration.record.lastHealthyAt?.toISOString() ?? null,
      lastFailureAt: checkedAt,
      lastError:
        'No SharePoint site ID or health-check user email is configured for drive probes.',
      message:
        'Microsoft Graph credentials are valid, but no drive probe target is configured.',
      details: {
        provider: 'graph',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Microsoft Graph error'
    return blockedResult(
      integration,
      /401|403/.test(message) ? 'BLOCKED' : 'DEGRADED',
      `Microsoft Graph file health check failed: ${message}`,
      {
        provider: 'graph',
        healthcheckUserEmail: diagnostics.healthcheckUserEmail,
        sharePointSiteId: diagnostics.sharePointSiteId,
      },
    )
  }
}

function checkUnimplementedRealProvider(integration: ResolvedIntegration) {
  const catalog = getIntegrationCatalogEntry(
    integration.record.key as IntegrationHealthCheckResult['key'],
  )

  return blockedResult(
    integration,
    integration.effectiveConfigured ? 'BLOCKED' : 'NOT_CONFIGURED',
    integration.effectiveConfigured
      ? `${catalog.name} is configured for real mode, but the real provider is not implemented yet.`
      : `${catalog.name} is set to real mode, but the required credentials are not configured.`,
  )
}

async function executeHealthCheck(
  integration: ResolvedIntegration,
  simulate: boolean,
) {
  if (!integration.effectiveConfigured && integration.effectiveMode === 'REAL') {
    return blockedResult(
      integration,
      'NOT_CONFIGURED',
      `${integration.catalog.name} is set to real mode, but its required configuration is incomplete.`,
    )
  }

  switch (integration.record.key) {
    case 'OUTLOOK_GRAPH_ASSISTANT':
      if (integration.effectiveMode === 'SIMULATED') {
        return checkSimulatedAssistant(integration, simulate)
      }
      return checkGraphAssistant(integration, simulate)
    case 'CANVAS':
      if (integration.effectiveMode === 'SIMULATED') {
        return blockedResult(
          integration,
          'BLOCKED',
          'Canvas does not have a simulated connector path yet.',
        )
      }
      return checkCanvas(integration, simulate)
    case 'SIS':
      if (integration.effectiveMode === 'SIMULATED') {
        return checkSimulatedSIS(integration, simulate)
      }
      return checkUnimplementedRealProvider(integration)
    case 'SHAREPOINT_ONEDRIVE_FILES':
      if (integration.effectiveMode === 'SIMULATED') {
        return checkSimulatedFiles(integration, simulate)
      }
      return checkGraphFiles(integration, simulate)
    case 'ROOM_BOOKING':
    case 'ATTENDANCE':
    case 'TRAVEL_REIMBURSEMENT':
    case 'DEPARTMENT_CMS':
    case 'GRANTS_PORTAL':
    case 'PAPER_REVIEW':
      if (integration.effectiveMode === 'SIMULATED') {
        return checkSimulatedUniversitySystem(integration, simulate)
      }
      return checkUnimplementedRealProvider(integration)
  }
}

function checkSimulatedUniversitySystem(
  integration: ResolvedIntegration,
  simulate: boolean,
) {
  const checkedAt = new Date().toISOString()

  return buildResult(integration, {
    status: 'HEALTHY',
    configured: true,
    simulated: simulate,
    checkedAt,
    lastHealthyAt: checkedAt,
    lastFailureAt: null,
    lastError: null,
    message: simulate
      ? `Dry run: simulated ${integration.catalog.name} provider is available.`
      : `Simulated ${integration.catalog.name} provider is healthy.`,
    details: {
      provider: 'simulated',
      capabilities: integration.catalog.capabilities,
    },
  })
}

export async function runIntegrationHealthCheckById(
  id: string,
  options: IntegrationHealthCheckOptions = {},
) {
  const integration = await getInstitutionIntegrationById(id)
  if (!integration) {
    throw new Error('Integration not found')
  }

  const simulate = options.simulate ?? false
  const persist = options.persist ?? !simulate
  const result = await executeHealthCheck(integration, simulate)

  const persisted = persist
    ? await persistIntegrationHealthResult(id, result)
    : integration

  return {
    integration: serializeIntegration(persisted),
    healthCheck: result,
  }
}
