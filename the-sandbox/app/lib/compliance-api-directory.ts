// ── Compliance API Directory ────────────────────────────────────────────────
// Static registry of all compliance-related API endpoints built across phases A-Y.

export type APIEndpointEntry = {
  method: string
  path: string
  auth: string
  description: string
}

export type APIDirectoryCategory = {
  category: string
  endpoints: APIEndpointEntry[]
}

export function getAPIDirectory(): APIDirectoryCategory[] {
  return [
    {
      category: 'User Compliance',
      endpoints: [
        { method: 'GET', path: '/api/users/compliance', auth: 'requireRequestUser', description: 'Get current user compliance status (TOS, consent, FERPA)' },
        { method: 'POST', path: '/api/users/compliance', auth: 'requireRequestUser', description: 'Accept TOS, data consent, or FERPA acknowledgment' },
        { method: 'GET', path: '/api/users/compliance-score', auth: 'requireRequestUser', description: 'Get current user compliance score' },
        { method: 'GET', path: '/api/users/compliance-notifications', auth: 'requireRequestUser', description: 'List compliance notifications for current user' },
        { method: 'PATCH', path: '/api/users/compliance-notifications/[id]', auth: 'requireRequestUser', description: 'Mark a compliance notification as read' },
        { method: 'GET', path: '/api/users/compliance-communications', auth: 'requireRequestUser', description: 'List compliance communications for current user' },
        { method: 'PATCH', path: '/api/users/compliance-communications/[id]/read', auth: 'requireRequestUser', description: 'Mark a compliance communication as read' },
        { method: 'GET', path: '/api/users/compliance-notification-preferences', auth: 'requireRequestUser', description: 'Get user notification preferences' },
        { method: 'PUT', path: '/api/users/compliance-notification-preferences', auth: 'requireRequestUser', description: 'Update user notification preferences' },
      ],
    },
    {
      category: 'Admin Management',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-stats', auth: 'requireAdminUser', description: 'Get compliance statistics (user counts, acceptance rates)' },
        { method: 'POST', path: '/api/admin/compliance/reset-tos', auth: 'requireAdminUser', description: 'Reset TOS acceptance for all users (version bump)' },
        { method: 'GET', path: '/api/admin/compliance-audit-log', auth: 'requireAdminUser', description: 'List compliance audit log entries' },
        { method: 'GET', path: '/api/admin/compliance-scores', auth: 'requireAdminUser', description: 'Get compliance scores for all users' },
        { method: 'GET', path: '/api/admin/compliance-analytics', auth: 'requireAdminUser', description: 'Compliance analytics aggregates and trends' },
        { method: 'GET', path: '/api/admin/compliance-matrix', auth: 'requireAdminUser', description: 'Cross-reference compliance matrix' },
        { method: 'POST', path: '/api/admin/compliance-test', auth: 'requireAdminUser', description: 'Run compliance test suite' },
      ],
    },
    {
      category: 'Cron Jobs',
      endpoints: [
        { method: 'GET', path: '/api/cron/compliance-notifications', auth: 'verifyCronSecret', description: 'Send pending compliance reminders and notifications' },
        { method: 'GET', path: '/api/cron/compliance-workflows', auth: 'verifyCronSecret', description: 'Process pending compliance workflow executions' },
        { method: 'GET', path: '/api/cron/compliance-metrics', auth: 'verifyCronSecret', description: 'Capture compliance metrics snapshot' },
      ],
    },
    {
      category: 'V2 API',
      endpoints: [
        { method: 'GET', path: '/api/v2/compliance/score', auth: 'requireRequestUser', description: 'V2: Get compliance score with breakdown' },
        { method: 'GET', path: '/api/v2/compliance/notifications', auth: 'requireRequestUser', description: 'V2: List compliance notifications (paginated)' },
        { method: 'GET', path: '/api/v2/compliance/status', auth: 'requireRequestUser', description: 'V2: Full compliance status with score and notifications' },
      ],
    },
    {
      category: 'Training',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-training', auth: 'requireAdminUser', description: 'List all compliance training modules' },
        { method: 'POST', path: '/api/admin/compliance-training', auth: 'requireAdminUser', description: 'Create a new compliance training module' },
        { method: 'GET', path: '/api/admin/compliance-training/[id]', auth: 'requireAdminUser', description: 'Get training module details' },
        { method: 'PATCH', path: '/api/admin/compliance-training/[id]', auth: 'requireAdminUser', description: 'Update a training module' },
        { method: 'DELETE', path: '/api/admin/compliance-training/[id]', auth: 'requireAdminUser', description: 'Delete a training module' },
        { method: 'GET', path: '/api/admin/compliance-training/[id]/stats', auth: 'requireAdminUser', description: 'Get training module completion statistics' },
        { method: 'GET', path: '/api/compliance-training', auth: 'requireRequestUser', description: 'List available training modules for current user' },
        { method: 'POST', path: '/api/compliance-training/[id]/complete', auth: 'requireRequestUser', description: 'Mark a training module as completed' },
      ],
    },
    {
      category: 'Calendar',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-calendar', auth: 'requireAdminUser', description: 'List compliance calendar events' },
        { method: 'POST', path: '/api/admin/compliance-calendar', auth: 'requireAdminUser', description: 'Create a compliance calendar event' },
        { method: 'GET', path: '/api/admin/compliance-calendar/[id]', auth: 'requireAdminUser', description: 'Get calendar event details' },
        { method: 'PATCH', path: '/api/admin/compliance-calendar/[id]', auth: 'requireAdminUser', description: 'Update a calendar event' },
        { method: 'DELETE', path: '/api/admin/compliance-calendar/[id]', auth: 'requireAdminUser', description: 'Delete a calendar event' },
      ],
    },
    {
      category: 'Risk',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-risk', auth: 'requireAdminUser', description: 'Compute institutional risk score with breakdown' },
      ],
    },
    {
      category: 'Workflows',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-workflows', auth: 'requireAdminUser', description: 'List compliance workflow definitions' },
        { method: 'POST', path: '/api/admin/compliance-workflows', auth: 'requireAdminUser', description: 'Create a compliance workflow' },
        { method: 'GET', path: '/api/admin/compliance-workflows/[id]', auth: 'requireAdminUser', description: 'Get workflow details' },
        { method: 'PATCH', path: '/api/admin/compliance-workflows/[id]', auth: 'requireAdminUser', description: 'Update a workflow' },
        { method: 'DELETE', path: '/api/admin/compliance-workflows/[id]', auth: 'requireAdminUser', description: 'Delete a workflow' },
        { method: 'POST', path: '/api/admin/compliance-workflows/[id]/dry-run', auth: 'requireAdminUser', description: 'Dry-run a workflow without execution' },
        { method: 'GET', path: '/api/admin/compliance-workflow-executions', auth: 'requireAdminUser', description: 'List workflow execution history' },
      ],
    },
    {
      category: 'Integrations',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-webhooks', auth: 'requireAdminUser', description: 'List compliance webhook configurations' },
        { method: 'POST', path: '/api/admin/compliance-webhooks', auth: 'requireAdminUser', description: 'Create a compliance webhook' },
        { method: 'GET', path: '/api/admin/compliance-webhooks/[id]', auth: 'requireAdminUser', description: 'Get webhook details' },
        { method: 'PATCH', path: '/api/admin/compliance-webhooks/[id]', auth: 'requireAdminUser', description: 'Update a webhook' },
        { method: 'DELETE', path: '/api/admin/compliance-webhooks/[id]', auth: 'requireAdminUser', description: 'Delete a webhook' },
        { method: 'GET', path: '/api/admin/compliance-integrations/status', auth: 'requireAdminUser', description: 'Get integration health status' },
        { method: 'GET', path: '/api/admin/compliance-export/siem', auth: 'requireAdminUser', description: 'Export compliance data in SIEM format' },
        { method: 'GET', path: '/api/admin/compliance-export/csv', auth: 'requireAdminUser', description: 'Export compliance data as CSV' },
      ],
    },
    {
      category: 'RBAC',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-roles', auth: 'requireAdminUser', description: 'List compliance RBAC roles' },
        { method: 'POST', path: '/api/admin/compliance-roles', auth: 'requireAdminUser', description: 'Create a compliance role' },
        { method: 'GET', path: '/api/admin/compliance-roles/[id]', auth: 'requireAdminUser', description: 'Get role details' },
        { method: 'PATCH', path: '/api/admin/compliance-roles/[id]', auth: 'requireAdminUser', description: 'Update a role' },
        { method: 'DELETE', path: '/api/admin/compliance-roles/[id]', auth: 'requireAdminUser', description: 'Delete a role' },
      ],
    },
    {
      category: 'Documents',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-documents', auth: 'requireAdminUser', description: 'List compliance documents' },
        { method: 'POST', path: '/api/admin/compliance-documents', auth: 'requireAdminUser', description: 'Upload a compliance document' },
        { method: 'GET', path: '/api/admin/compliance-documents/[id]', auth: 'requireAdminUser', description: 'Get document details' },
        { method: 'PATCH', path: '/api/admin/compliance-documents/[id]', auth: 'requireAdminUser', description: 'Update a document' },
        { method: 'DELETE', path: '/api/admin/compliance-documents/[id]', auth: 'requireAdminUser', description: 'Delete a document' },
      ],
    },
    {
      category: 'Regulatory',
      endpoints: [
        { method: 'GET', path: '/api/admin/regulatory-requirements', auth: 'requireAdminUser', description: 'List regulatory requirements (FERPA, COPPA, GDPR, etc.)' },
        { method: 'POST', path: '/api/admin/regulatory-requirements', auth: 'requireAdminUser', description: 'Create a regulatory requirement' },
        { method: 'GET', path: '/api/admin/regulatory-requirements/[id]', auth: 'requireAdminUser', description: 'Get requirement details' },
        { method: 'PATCH', path: '/api/admin/regulatory-requirements/[id]', auth: 'requireAdminUser', description: 'Update a requirement' },
        { method: 'DELETE', path: '/api/admin/regulatory-requirements/[id]', auth: 'requireAdminUser', description: 'Delete a requirement' },
      ],
    },
    {
      category: 'Benchmarks',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-benchmarks', auth: 'requireAdminUser', description: 'List compliance benchmarks' },
        { method: 'POST', path: '/api/admin/compliance-benchmarks', auth: 'requireAdminUser', description: 'Create a benchmark' },
        { method: 'GET', path: '/api/admin/compliance-benchmarks/[id]', auth: 'requireAdminUser', description: 'Get benchmark details' },
        { method: 'PATCH', path: '/api/admin/compliance-benchmarks/[id]', auth: 'requireAdminUser', description: 'Update a benchmark' },
        { method: 'DELETE', path: '/api/admin/compliance-benchmarks/[id]', auth: 'requireAdminUser', description: 'Delete a benchmark' },
      ],
    },
    {
      category: 'Templates',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-templates', auth: 'requireAdminUser', description: 'List compliance report templates' },
        { method: 'POST', path: '/api/admin/compliance-templates', auth: 'requireAdminUser', description: 'Create a report template' },
        { method: 'POST', path: '/api/admin/compliance-reports/generate-from-template', auth: 'requireAdminUser', description: 'Generate a report from a template' },
      ],
    },
    {
      category: 'Incidents',
      endpoints: [
        { method: 'GET', path: '/api/admin/incident-playbooks', auth: 'requireAdminUser', description: 'List incident response playbooks' },
        { method: 'POST', path: '/api/admin/incident-playbooks', auth: 'requireAdminUser', description: 'Create an incident playbook' },
        { method: 'GET', path: '/api/admin/incident-playbooks/[id]', auth: 'requireAdminUser', description: 'Get playbook details' },
        { method: 'PATCH', path: '/api/admin/incident-playbooks/[id]', auth: 'requireAdminUser', description: 'Update a playbook' },
        { method: 'DELETE', path: '/api/admin/incident-playbooks/[id]', auth: 'requireAdminUser', description: 'Delete a playbook' },
        { method: 'GET', path: '/api/admin/incident-responses/[id]', auth: 'requireAdminUser', description: 'Get incident response details' },
        { method: 'PATCH', path: '/api/admin/incident-responses/[id]', auth: 'requireAdminUser', description: 'Update an incident response' },
      ],
    },
    {
      category: 'Communications',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-communications', auth: 'requireAdminUser', description: 'List all compliance communications' },
        { method: 'POST', path: '/api/admin/compliance-communications', auth: 'requireAdminUser', description: 'Send a compliance communication' },
      ],
    },
    {
      category: 'Metrics',
      endpoints: [
        { method: 'POST', path: '/api/admin/compliance-metrics/capture', auth: 'requireAdminUser', description: 'Capture a compliance metrics snapshot' },
        { method: 'GET', path: '/api/admin/compliance-metrics/history', auth: 'requireAdminUser', description: 'Get metrics history over time' },
        { method: 'GET', path: '/api/admin/compliance-metrics/export', auth: 'requireAdminUser', description: 'Export metrics data' },
      ],
    },
    {
      category: 'Evidence',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-evidence', auth: 'requireAdminUser', description: 'List compliance evidence items' },
        { method: 'POST', path: '/api/admin/compliance-evidence', auth: 'requireAdminUser', description: 'Upload compliance evidence' },
        { method: 'GET', path: '/api/admin/compliance-evidence/[id]', auth: 'requireAdminUser', description: 'Get evidence details' },
        { method: 'PATCH', path: '/api/admin/compliance-evidence/[id]', auth: 'requireAdminUser', description: 'Update evidence metadata' },
        { method: 'DELETE', path: '/api/admin/compliance-evidence/[id]', auth: 'requireAdminUser', description: 'Delete evidence' },
        { method: 'POST', path: '/api/admin/compliance-evidence/auto-collect', auth: 'requireAdminUser', description: 'Auto-collect evidence from platform data' },
      ],
    },
    {
      category: 'Vendors',
      endpoints: [
        { method: 'GET', path: '/api/admin/vendor-assessments', auth: 'requireAdminUser', description: 'List vendor risk assessments' },
        { method: 'POST', path: '/api/admin/vendor-assessments', auth: 'requireAdminUser', description: 'Create a vendor assessment' },
        { method: 'GET', path: '/api/admin/vendor-assessments/[id]', auth: 'requireAdminUser', description: 'Get vendor assessment details' },
        { method: 'PATCH', path: '/api/admin/vendor-assessments/[id]', auth: 'requireAdminUser', description: 'Update a vendor assessment' },
        { method: 'DELETE', path: '/api/admin/vendor-assessments/[id]', auth: 'requireAdminUser', description: 'Delete a vendor assessment' },
      ],
    },
    {
      category: 'DPA Management',
      endpoints: [
        { method: 'GET', path: '/api/admin/dpa', auth: 'requireAdminUser', description: 'List Data Processing Agreements' },
        { method: 'POST', path: '/api/admin/dpa', auth: 'requireAdminUser', description: 'Create a DPA' },
        { method: 'GET', path: '/api/admin/dpa/[id]', auth: 'requireAdminUser', description: 'Get DPA details' },
        { method: 'PATCH', path: '/api/admin/dpa/[id]', auth: 'requireAdminUser', description: 'Update a DPA' },
        { method: 'DELETE', path: '/api/admin/dpa/[id]', auth: 'requireAdminUser', description: 'Delete a DPA' },
      ],
    },
    {
      category: 'Data Classification',
      endpoints: [
        { method: 'GET', path: '/api/admin/data-classifications', auth: 'requireAdminUser', description: 'List data classifications' },
        { method: 'POST', path: '/api/admin/data-classifications', auth: 'requireAdminUser', description: 'Create a data classification' },
        { method: 'GET', path: '/api/admin/data-classifications/[id]', auth: 'requireAdminUser', description: 'Get classification details' },
        { method: 'PATCH', path: '/api/admin/data-classifications/[id]', auth: 'requireAdminUser', description: 'Update a classification' },
        { method: 'DELETE', path: '/api/admin/data-classifications/[id]', auth: 'requireAdminUser', description: 'Delete a classification' },
      ],
    },
    {
      category: 'Data Retention',
      endpoints: [
        { method: 'GET', path: '/api/admin/data-retention', auth: 'requireAdminUser', description: 'List data retention policies' },
        { method: 'POST', path: '/api/admin/data-retention', auth: 'requireAdminUser', description: 'Create a retention policy' },
        { method: 'GET', path: '/api/admin/data-retention/[id]', auth: 'requireAdminUser', description: 'Get retention policy details' },
        { method: 'PATCH', path: '/api/admin/data-retention/[id]', auth: 'requireAdminUser', description: 'Update a retention policy' },
        { method: 'DELETE', path: '/api/admin/data-retention/[id]', auth: 'requireAdminUser', description: 'Delete a retention policy' },
      ],
    },
    {
      category: 'Consent Versions',
      endpoints: [
        { method: 'GET', path: '/api/admin/consent-versions', auth: 'requireAdminUser', description: 'List consent document versions (TOS, consent, FERPA)' },
        { method: 'POST', path: '/api/admin/consent-versions', auth: 'requireAdminUser', description: 'Create a new consent document version' },
      ],
    },
    {
      category: 'Health',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-health', auth: 'requireAdminUser', description: 'Get compliance system health status (admin)' },
        { method: 'GET', path: '/api/compliance-health', auth: 'requireRequestUser', description: 'Get compliance system health status (public)' },
      ],
    },
    {
      category: 'Audit Chain',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-audit-chain', auth: 'requireAdminUser', description: 'Get tamper-evident audit chain entries' },
        { method: 'POST', path: '/api/admin/compliance-audit-chain/verify', auth: 'requireAdminUser', description: 'Verify audit chain integrity' },
        { method: 'GET', path: '/api/admin/compliance-audit-chain/export', auth: 'requireAdminUser', description: 'Export audit chain' },
      ],
    },
    {
      category: 'Delegations',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-delegations', auth: 'requireAdminUser', description: 'List compliance task delegations' },
        { method: 'POST', path: '/api/admin/compliance-delegations', auth: 'requireAdminUser', description: 'Create a delegation' },
        { method: 'GET', path: '/api/admin/compliance-delegations/[id]', auth: 'requireAdminUser', description: 'Get delegation details' },
        { method: 'PATCH', path: '/api/admin/compliance-delegations/[id]', auth: 'requireAdminUser', description: 'Update a delegation' },
        { method: 'DELETE', path: '/api/admin/compliance-delegations/[id]', auth: 'requireAdminUser', description: 'Revoke a delegation' },
      ],
    },
    {
      category: 'Approvals',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-approvals', auth: 'requireAdminUser', description: 'List pending compliance approvals' },
        { method: 'POST', path: '/api/admin/compliance-approvals', auth: 'requireAdminUser', description: 'Create an approval request' },
        { method: 'GET', path: '/api/admin/compliance-approvals/[id]', auth: 'requireAdminUser', description: 'Get approval details' },
        { method: 'PATCH', path: '/api/admin/compliance-approvals/[id]', auth: 'requireAdminUser', description: 'Approve or reject a request' },
      ],
    },
    {
      category: 'Notifications & Preferences',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-trends', auth: 'requireAdminUser', description: 'Get compliance trend data' },
      ],
    },
    {
      category: 'Exceptions',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-exceptions', auth: 'requireAdminUser', description: 'List compliance exceptions' },
        { method: 'POST', path: '/api/admin/compliance-exceptions', auth: 'requireAdminUser', description: 'Create a compliance exception' },
        { method: 'GET', path: '/api/admin/compliance-exceptions/[id]', auth: 'requireAdminUser', description: 'Get exception details' },
        { method: 'PATCH', path: '/api/admin/compliance-exceptions/[id]', auth: 'requireAdminUser', description: 'Update an exception' },
        { method: 'DELETE', path: '/api/admin/compliance-exceptions/[id]', auth: 'requireAdminUser', description: 'Delete an exception' },
      ],
    },
    {
      category: 'Maturity',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-maturity', auth: 'requireAdminUser', description: 'Get compliance maturity assessment' },
      ],
    },
    {
      category: 'Trends & Analysis',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-trends-analysis', auth: 'requireAdminUser', description: 'Get detailed compliance trends analysis' },
      ],
    },
    {
      category: 'Comparison',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-comparison', auth: 'requireAdminUser', description: 'Compare compliance across departments or periods' },
      ],
    },
    {
      category: 'Readiness',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-readiness', auth: 'requireAdminUser', description: 'Get compliance readiness assessment' },
      ],
    },
    {
      category: 'Tags',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-tags', auth: 'requireAdminUser', description: 'List compliance tags' },
        { method: 'POST', path: '/api/admin/compliance-tags', auth: 'requireAdminUser', description: 'Create a tag' },
        { method: 'GET', path: '/api/admin/compliance-tags/[id]', auth: 'requireAdminUser', description: 'Get tag details' },
        { method: 'PATCH', path: '/api/admin/compliance-tags/[id]', auth: 'requireAdminUser', description: 'Update a tag' },
        { method: 'DELETE', path: '/api/admin/compliance-tags/[id]', auth: 'requireAdminUser', description: 'Delete a tag' },
        { method: 'POST', path: '/api/admin/compliance-tags/assign', auth: 'requireAdminUser', description: 'Assign a tag to a resource' },
        { method: 'POST', path: '/api/admin/compliance-tags/unassign', auth: 'requireAdminUser', description: 'Unassign a tag from a resource' },
      ],
    },
    {
      category: 'Activity',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-activity', auth: 'requireAdminUser', description: 'Get compliance activity feed' },
      ],
    },
    {
      category: 'Reports & Exports',
      endpoints: [
        { method: 'GET', path: '/api/admin/compliance-report/export', auth: 'requireAdminUser', description: 'Export compliance report' },
        { method: 'GET', path: '/api/compliance/audit-export', auth: 'requireRequestUser', description: 'Export personal compliance audit data' },
      ],
    },
    {
      category: 'Bootstrap',
      endpoints: [
        { method: 'POST', path: '/api/admin/compliance-bootstrap', auth: 'requireAdminUser', description: 'One-click initialize all default compliance data' },
        { method: 'GET', path: '/api/admin/compliance-api-directory', auth: 'requireAdminUser', description: 'List all compliance API endpoints' },
      ],
    },
  ]
}

export function getAPIDirectoryTotalCount(): number {
  return getAPIDirectory().reduce((sum, cat) => sum + cat.endpoints.length, 0)
}
