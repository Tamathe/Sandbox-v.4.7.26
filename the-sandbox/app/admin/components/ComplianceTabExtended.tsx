'use client'

import { format } from 'date-fns'
import {
  Activity, AlertTriangle, ArrowRightLeft, BarChart2, CheckCircle,
  CheckCircle2, ChevronDown, ChevronUp, Clock, Database, Download,
  FileText, Fingerprint, GraduationCap, Loader2, Megaphone, MessageSquare,
  Play, Plus, RefreshCw, Send, Shield, Tag, Trash2, TrendingUp, UserCog,
  Wifi, X, XCircle, Zap,
} from 'lucide-react'
import type { ComplianceTabProps } from './ComplianceTab'

// Extended compliance sections — 24 sections that complement the core sections in ComplianceTab.tsx
export default function ComplianceTabExtended(p: ComplianceTabProps) {
  return (
    <>
      {/* ===== Compliance Workflows ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Compliance Workflows</h2>
        </div>
        {/* Create workflow form */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Rule Name</label>
              <input type="text" value={p.wfName} onChange={(e) => p.setWfName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="e.g. Consent Expiry Reminder" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Trigger Event</label>
              <select value={p.wfTrigger} onChange={(e) => p.setWfTrigger(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="consent-expired">Consent Expired</option>
                <option value="ferpa-expired">FERPA Expired</option>
                <option value="tos-not-accepted">TOS Not Accepted</option>
                <option value="incident-created">Incident Created</option>
                <option value="dpa-expiring">DPA Expiring</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Actions</label>
            <div className="flex flex-wrap gap-2">
              {['send-email', 'create-task', 'notify-admin', 'suspend-access', 'escalate'].map((a) => (
                <button key={a} type="button" onClick={() => p.setWfActions((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])} className={`rounded-full px-3 py-1 text-xs font-semibold ${p.wfActions.includes(a) ? 'bg-uk-blue text-white' : 'border border-gray-200 text-gray-600 hover:border-uk-blue'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Delay Days (comma-separated)</label>
            <input type="text" value={p.wfDelays} onChange={(e) => p.setWfDelays(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="0,7,14" />
          </div>
          <button type="button" onClick={() => void p.handleCreateWorkflow()} disabled={p.wfSaving || !p.wfName.trim() || p.wfActions.length === 0} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
            {p.wfSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create Rule
          </button>
        </div>
        {p.workflowsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.workflowRules.length === 0 ? (
          <p className="text-sm text-gray-500">No workflow rules configured yet.</p>
        ) : (
          <div className="space-y-3">
            {p.workflowRules.map((rule) => (
              <div key={rule.id} className="rounded-2xl border-2 border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900">{rule.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{rule.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-xs text-gray-500">Trigger: <span className="font-medium">{rule.triggerEvent}</span></p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rule.actions.map((a, i) => (
                        <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{a}{rule.delayDays[i] ? ` (+${rule.delayDays[i]}d)` : ''}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => void p.handleDryRun(rule.id)} disabled={p.dryRunLoading[rule.id]} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                      {p.dryRunLoading[rule.id] ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}Dry Run
                    </button>
                    <button type="button" onClick={() => void p.handleToggleWorkflow(rule.id, rule.active)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.active ? 'bg-uk-blue' : 'bg-gray-300'}`}>
                      <span className={`inline-block size-3.5 rounded-full bg-white transition-transform ${rule.active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </button>
                    <button type="button" onClick={() => void p.handleDeleteWorkflow(rule.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
                  </div>
                </div>
                {p.dryRunResults[rule.id] && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <h4 className="text-xs font-semibold text-gray-500 mb-2">Dry Run Results</h4>
                    <div className="space-y-1">
                      {p.dryRunResults[rule.id].map((dr, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs ${dr.triggered ? 'text-amber-700' : 'text-gray-500'}`}>
                          {dr.triggered ? <AlertTriangle className="size-3 text-amber-500" /> : <CheckCircle className="size-3 text-gray-400" />}
                          <span className="font-medium">{dr.email}</span>
                          <span>{dr.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Workflow Execution History */}
        {p.workflowExecsLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-4 animate-spin text-gray-400" /></div>
        ) : p.workflowExecs.length > 0 ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Recent Executions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="pb-2 pr-4 font-semibold">Rule</th>
                    <th className="pb-2 pr-4 font-semibold">Action</th>
                    <th className="pb-2 pr-4 font-semibold">User</th>
                    <th className="pb-2 pr-4 font-semibold">Result</th>
                    <th className="pb-2 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {p.workflowExecs.slice(0, 10).map((ex) => (
                    <tr key={ex.id} className="border-b border-gray-50">
                      <td className="py-2 pr-4 text-xs font-medium text-gray-900">{ex.ruleName}</td>
                      <td className="py-2 pr-4"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{ex.action}</span></td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{ex.user.email}</td>
                      <td className="py-2 pr-4"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ex.result === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{ex.result}</span></td>
                      <td className="py-2 text-xs text-gray-400">{format(new Date(ex.createdAt), 'MMM d, h:mm a')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* ===== External Integrations (Webhooks + SIEM/CSV) ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">External Integrations</h2>
        {/* Webhooks */}
        <h3 className="text-sm font-bold text-gray-700 mb-3">Webhooks</h3>
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Endpoint URL</label>
              <input type="text" value={p.whUrl} onChange={(e) => p.setWhUrl(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Secret</label>
              <input type="password" value={p.whSecret} onChange={(e) => p.setWhSecret(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="webhook-secret" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Events</label>
            <div className="flex flex-wrap gap-2">
              {['compliance.incident', 'compliance.consent-expired', 'compliance.dpa-expiring', 'compliance.test-failed', 'compliance.workflow-executed'].map((ev) => (
                <button key={ev} type="button" onClick={() => p.setWhEvents((prev) => prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev])} className={`rounded-full px-3 py-1 text-xs font-semibold ${p.whEvents.includes(ev) ? 'bg-uk-blue text-white' : 'border border-gray-200 text-gray-600 hover:border-uk-blue'}`}>
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => void p.handleCreateWebhook()} disabled={p.whSaving || !p.whUrl.trim() || !p.whSecret.trim() || p.whEvents.length === 0} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
            {p.whSaving ? <Loader2 className="size-4 animate-spin" /> : <Wifi className="size-4" />}
            Register Webhook
          </button>
        </div>
        {p.webhooksLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.webhooks.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">No webhooks configured.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {p.webhooks.map((wh) => (
              <div key={wh.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {wh.events.map((ev) => <span key={ev} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{ev}</span>)}
                  </div>
                </div>
                <button type="button" onClick={() => void p.handleDeleteWebhook(wh.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
        )}
        {/* SIEM/CSV Exports */}
        <h3 className="text-sm font-bold text-gray-700 mb-3 mt-4 border-t border-gray-100 pt-4">SIEM &amp; CSV Exports</h3>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void p.handleSiemExport()} disabled={p.siemExporting} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            {p.siemExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export SIEM (CEF)
          </button>
          <button type="button" onClick={() => void p.handleCsvExport()} disabled={p.csvExporting} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            {p.csvExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export CSV
          </button>
        </div>
      </section>

      {/* ===== Compliance Roles ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Compliance Roles</h2>
        <div className="mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input type="text" value={p.crEmail} onChange={(e) => p.setCrEmail(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="user@uky.edu" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
            <select value={p.crRole} onChange={(e) => p.setCrRole(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option value="viewer">Viewer</option>
              <option value="auditor">Auditor</option>
              <option value="officer">Compliance Officer</option>
              <option value="admin">Compliance Admin</option>
            </select>
          </div>
          <button type="button" onClick={() => void p.handleAssignRole()} disabled={p.crSaving || !p.crEmail.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
            {p.crSaving ? <Loader2 className="size-4 animate-spin" /> : <UserCog className="size-4" />}
            Assign
          </button>
        </div>
        {p.compRolesLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.compRoles.length === 0 ? (
          <p className="text-sm text-gray-500">No compliance roles assigned.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4 font-semibold">User</th>
                  <th className="pb-2 pr-4 font-semibold">Role</th>
                  <th className="pb-2 pr-4 font-semibold">Granted</th>
                  <th className="pb-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {p.compRoles.map((cr) => (
                  <tr key={cr.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4"><div className="font-medium text-gray-900">{cr.user.name}</div><div className="text-xs text-gray-400">{cr.user.email}</div></td>
                    <td className="py-2.5 pr-4"><span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 uppercase">{cr.role}</span></td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{format(new Date(cr.grantedAt), 'MMM d, yyyy')}</td>
                    <td className="py-2.5"><button type="button" onClick={() => void p.handleRevokeRole(cr.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== Compliance Documents ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Compliance Documents</h2>
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
              <select value={p.cdType} onChange={(e) => p.setCdType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="policy">Policy</option>
                <option value="procedure">Procedure</option>
                <option value="report">Report</option>
                <option value="agreement">Agreement</option>
                <option value="training">Training Material</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
              <input type="text" value={p.cdTitle} onChange={(e) => p.setCdTitle(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Document title" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Version (optional)</label>
              <input type="text" value={p.cdVersion} onChange={(e) => p.setCdVersion(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="1.0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Expires (optional)</label>
              <input type="date" value={p.cdExpires} onChange={(e) => p.setCdExpires(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
            <input type="text" value={p.cdDesc} onChange={(e) => p.setCdDesc(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Brief description..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Content</label>
            <textarea rows={3} value={p.cdContent} onChange={(e) => p.setCdContent(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Full document content..." />
          </div>
          <button type="button" onClick={() => void p.handleCreateDoc()} disabled={p.cdSaving || !p.cdTitle.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
            {p.cdSaving ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            Create Document
          </button>
        </div>
        {p.compDocsLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.compDocs.length === 0 ? (
          <p className="text-sm text-gray-500">No compliance documents yet.</p>
        ) : (
          <div className="space-y-2">
            {p.compDocs.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{doc.title}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 uppercase">{doc.type}</span>
                    {doc.version && <span className="text-[10px] text-gray-400">v{doc.version}</span>}
                  </div>
                  {doc.description && <p className="text-xs text-gray-500 mt-1">{doc.description}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">By {doc.uploader.name} · {format(new Date(doc.createdAt), 'MMM d, yyyy')}{doc.expiresAt ? ` · Expires ${format(new Date(doc.expiresAt), 'MMM d, yyyy')}` : ''}</p>
                </div>
                <button type="button" onClick={() => void p.handleDeleteDoc(doc.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Regulatory Mapping ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Regulatory Mapping</h2>
          <button type="button" onClick={() => void p.handleSeedRequirements()} disabled={p.regSeeding} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
            {p.regSeeding ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
            Seed Requirements
          </button>
        </div>
        {p.regMatrixLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : !p.regMatrix ? (
          <p className="text-sm text-gray-500">No regulatory matrix data. Seed requirements to get started.</p>
        ) : (
          <div className="space-y-4">
            {/* Summary counts per regulation */}
            {Object.entries(p.regMatrix.counts).map(([reg, counts]) => (
              <div key={reg} className="rounded-2xl border-2 border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">{reg}</h3>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{counts.met} Met</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{counts.partial} Partial</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">{counts.unmet} Unmet</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{counts.na} N/A</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${counts.total > 0 ? Math.round((counts.met / counts.total) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
            {/* Gaps */}
            {p.regMatrix.gaps.length > 0 && (
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                <h3 className="text-sm font-bold text-red-900 mb-2">Compliance Gaps ({p.regMatrix.gaps.length})</h3>
                <div className="space-y-2">
                  {p.regMatrix.gaps.map((gap) => (
                    <div key={gap.id} className="text-xs text-red-800">
                      <span className="font-semibold">{gap.regulation} {gap.articleRef}:</span> {gap.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== Audit Reports ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Audit Reports</h2>
          <button type="button" onClick={() => void p.handleGenerateAuditReport()} disabled={p.auditGenerating} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
            {p.auditGenerating ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            Generate Report
          </button>
        </div>
        {p.auditReportsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.auditReports.length === 0 ? (
          <p className="text-sm text-gray-500">No audit reports generated yet.</p>
        ) : (
          <div className="space-y-3">
            {p.auditReports.map((report) => {
              const expanded = p.expandedReportId === report.id
              return (
                <div key={report.id} className="rounded-2xl border-2 border-gray-200 p-4">
                  <button type="button" onClick={() => p.setExpandedReportId(expanded ? null : report.id)} className="flex w-full items-center justify-between text-left">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{report.scope}</span>
                        {report.findings.overallRisk && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${report.findings.overallRisk === 'low' ? 'bg-emerald-100 text-emerald-700' : report.findings.overallRisk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{report.findings.overallRisk} risk</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Generated {format(new Date(report.generatedAt), 'MMM d, yyyy h:mm a')} by {report.generatedBy}</p>
                    </div>
                    {expanded ? <ChevronUp className="size-5 text-gray-400" /> : <ChevronDown className="size-5 text-gray-400" />}
                  </button>
                  {expanded && (
                    <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                      {report.findings.summary && <p className="text-sm text-gray-700">{report.findings.summary}</p>}
                      {report.findings.findings?.map((f, i) => (
                        <div key={i} className={`rounded-lg p-3 ${f.severity === 'critical' ? 'bg-red-50 border border-red-200' : f.severity === 'high' ? 'bg-orange-50 border border-orange-200' : f.severity === 'medium' ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${f.severity === 'critical' ? 'bg-red-100 text-red-700' : f.severity === 'high' ? 'bg-orange-100 text-orange-700' : f.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{f.severity}</span>
                            <span className="text-xs font-semibold text-gray-700">{f.title}</span>
                          </div>
                          <p className="text-xs text-gray-600">{f.description}</p>
                          <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Recommendation:</span> {f.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== Compliance Training ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Compliance Training</h2>
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
              <input type="text" value={p.tmTitle} onChange={(e) => p.setTmTitle(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="FERPA Basics for Educators" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
              <select value={p.tmType} onChange={(e) => p.setTmType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="ferpa">FERPA</option>
                <option value="data-privacy">Data Privacy</option>
                <option value="security">Security</option>
                <option value="general">General Compliance</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
            <textarea rows={2} value={p.tmDesc} onChange={(e) => p.setTmDesc(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Module description..." />
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Required For</label>
              <div className="flex gap-2">
                {['EDUCATOR', 'ADMIN', 'STUDENT'].map((role) => (
                  <button key={role} type="button" onClick={() => p.setTmRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role])} className={`rounded-full px-3 py-1 text-xs font-semibold ${p.tmRoles.includes(role) ? 'bg-uk-blue text-white' : 'border border-gray-200 text-gray-600'}`}>
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Passing Score</label>
              <input type="number" value={p.tmPassing} onChange={(e) => p.setTmPassing(e.target.value)} className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm" min={0} max={100} />
            </div>
          </div>
          <button type="button" onClick={() => void p.handleCreateTraining()} disabled={p.tmSaving || !p.tmTitle.trim() || !p.tmDesc.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
            {p.tmSaving ? <Loader2 className="size-4 animate-spin" /> : <GraduationCap className="size-4" />}
            Create Module
          </button>
        </div>
        {p.trainingLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.trainingModules.length === 0 ? (
          <p className="text-sm text-gray-500">No training modules configured.</p>
        ) : (
          <div className="space-y-3">
            {p.trainingModules.map((mod) => {
              const stats = p.tmStats[mod.id]
              return (
                <div key={mod.id} className="rounded-2xl border-2 border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <GraduationCap className="size-4 text-gray-400 shrink-0" />
                        <span className="text-sm font-bold text-gray-900">{mod.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${mod.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{mod.active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <p className="text-xs text-gray-500">{mod.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mod.requiredForRoles.map((role) => <span key={role} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{role}</span>)}
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">Pass: {mod.passingScore}%</span>
                      </div>
                      {stats && (
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          <span>{stats.completed}/{stats.eligibleUsers} completed ({stats.completionRate}%)</span>
                          <span>{stats.passed} passed ({stats.passRate}%)</span>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => void p.handleDeleteTraining(mod.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== Compliance Benchmarks ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Compliance Benchmarks</h2>
        {p.benchmarksLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.benchmarks.length === 0 ? (
          <p className="text-sm text-gray-500">No benchmarks configured.</p>
        ) : (
          <div className="space-y-3">
            {p.benchmarks.map((bm) => {
              const pct = bm.targetValue > 0 ? Math.round((bm.currentValue / bm.targetValue) * 100) : 0
              const met = pct >= 100
              return (
                <div key={bm.id} className="rounded-2xl border-2 border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{bm.label}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase">{bm.category}</span>
                    </div>
                    <span className={`text-sm font-bold ${met ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                      {bm.currentValue}{bm.unit} / {bm.targetValue}{bm.unit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 mb-1">
                    <div className={`h-1.5 rounded-full transition-all ${met ? 'bg-emerald-400' : pct >= 75 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  {bm.notes && <p className="text-[10px] text-gray-400">{bm.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== Report Templates ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Report Templates</h2>
        {p.templatesLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.reportTemplates.length === 0 ? (
          <p className="text-sm text-gray-500">No report templates configured.</p>
        ) : (
          <div className="space-y-3">
            {p.reportTemplates.map((tpl) => (
              <div key={tpl.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="size-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-bold text-gray-900">{tpl.name}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase">{tpl.format}</span>
                    {!tpl.active && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400">Inactive</span>}
                  </div>
                  {tpl.description && <p className="text-xs text-gray-500">{tpl.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tpl.sections.map((s) => <span key={s} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{s}</span>)}
                  </div>
                </div>
                <button type="button" onClick={() => void p.handleGenerateFromTemplate(tpl.id)} disabled={p.templateGenerating[tpl.id]} className="inline-flex items-center gap-1.5 rounded-xl border border-uk-blue px-3 py-1.5 text-xs font-semibold hover:bg-blue-50 shrink-0" style={{ color: '#0033A0' }}>
                  {p.templateGenerating[tpl.id] ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                  Generate
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Incident Playbooks ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Incident Playbooks</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => void p.handleSeedPlaybooks()} disabled={p.pbSeeding} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              {p.pbSeeding ? <Loader2 className="size-3 animate-spin" /> : <Database className="size-3" />}
              Seed Defaults
            </button>
            <button type="button" onClick={() => p.setPbFormOpen(!p.pbFormOpen)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#0033A0' }}>
              {p.pbFormOpen ? 'Cancel' : '+ New Playbook'}
            </button>
          </div>
        </div>
        {p.pbFormOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                <input type="text" value={p.pbName} onChange={(e) => p.setPbName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Data Breach Response" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Incident Type</label>
                <select value={p.pbType} onChange={(e) => p.setPbType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="data-breach">Data Breach</option>
                  <option value="ferpa-violation">FERPA Violation</option>
                  <option value="unauthorized-access">Unauthorized Access</option>
                  <option value="policy-violation">Policy Violation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Severity</label>
                <select value={p.pbSeverity} onChange={(e) => p.setPbSeverity(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <button type="button" onClick={() => void p.handleCreatePlaybook()} disabled={p.pbSaving || !p.pbName.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
              {p.pbSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create Playbook
            </button>
          </div>
        )}
        {p.playbooksLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.playbooks.length === 0 ? (
          <p className="text-sm text-gray-500">No incident playbooks configured. Seed defaults to get started.</p>
        ) : (
          <div className="space-y-3">
            {p.playbooks.map((pb) => (
              <div key={pb.id} className="rounded-2xl border-2 border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900">{pb.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${pb.severity === 'critical' ? 'bg-red-100 text-red-700' : pb.severity === 'high' ? 'bg-orange-100 text-orange-700' : pb.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{pb.severity}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{pb.incidentType}</span>
                    </div>
                    <div className="space-y-1 mt-2">
                      {pb.steps.map((step) => (
                        <div key={step.order} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="flex items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 size-5 shrink-0">{step.order}</span>
                          <span className="font-medium">{step.title}</span>
                          <span className="text-gray-400">({step.assignee}, {step.slaHours}h SLA)</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">{pb._count.responses} response(s) · Notify: {pb.notifyRoles.join(', ')}</p>
                  </div>
                  <button type="button" onClick={() => void p.handleDeletePlaybook(pb.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Communications ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Compliance Communications</h2>
          <button type="button" onClick={() => p.setCcFormOpen(!p.ccFormOpen)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#0033A0' }}>
            {p.ccFormOpen ? 'Cancel' : '+ New Communication'}
          </button>
        </div>
        {p.ccFormOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                <select value={p.ccType} onChange={(e) => p.setCcType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="announcement">Announcement</option>
                  <option value="reminder">Reminder</option>
                  <option value="alert">Alert</option>
                  <option value="update">Policy Update</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Priority</label>
                <select value={p.ccPriority} onChange={(e) => p.setCcPriority(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Subject</label>
              <input type="text" value={p.ccSubject} onChange={(e) => p.setCcSubject(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Communication subject..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Body</label>
              <textarea rows={3} value={p.ccBody} onChange={(e) => p.setCcBody(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Communication body..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Target Roles</label>
              <div className="flex gap-2">
                {['EDUCATOR', 'ADMIN', 'STUDENT'].map((role) => (
                  <button key={role} type="button" onClick={() => p.setCcRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role])} className={`rounded-full px-3 py-1 text-xs font-semibold ${p.ccRoles.includes(role) ? 'bg-uk-blue text-white' : 'border border-gray-200 text-gray-600'}`}>
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => void p.handleSendComm()} disabled={p.ccSaving || !p.ccSubject.trim() || !p.ccBody.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
              {p.ccSaving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send Communication
            </button>
          </div>
        )}
        {p.compCommsLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.compComms.length === 0 ? (
          <p className="text-sm text-gray-500">No compliance communications sent.</p>
        ) : (
          <div className="space-y-2">
            {p.compComms.map((comm) => (
              <div key={comm.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Megaphone className="size-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-900">{comm.subject}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${comm.priority === 'urgent' ? 'bg-red-100 text-red-700' : comm.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>{comm.priority}</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{comm.type}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{comm.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Sent {format(new Date(comm.sentAt), 'MMM d, yyyy h:mm a')} by {comm.sender.name} · {comm.readBy.length} read · To: {comm.targetRoles.join(', ')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Metric Tracking ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Compliance Metric Tracking</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => void p.handleCaptureSnapshot()} disabled={p.capturingMetrics} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              {p.capturingMetrics ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              Capture Snapshot
            </button>
            <button type="button" onClick={() => void p.handleExportMetrics()} disabled={p.exportingMetrics} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              {p.exportingMetrics ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
              Export CSV
            </button>
          </div>
        </div>
        {p.metricHistoryLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : Object.keys(p.metricHistory).length === 0 ? (
          <p className="text-sm text-gray-500">No metric snapshots captured yet. Click &quot;Capture Snapshot&quot; to start tracking.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(p.metricHistory).map(([metric, snaps]) => {
              const latest = snaps.length > 0 ? snaps[snaps.length - 1] : null
              return (
                <div key={metric} className="rounded-2xl border-2 border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900">{metric.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {latest && <span className="text-lg font-bold text-gray-700">{latest.value.toFixed(1)}</span>}
                  </div>
                  {snaps.length > 1 && (
                    <div className="flex items-end gap-0.5 h-10">
                      {snaps.slice(-30).map((snap, i) => {
                        const maxVal = Math.max(...snaps.slice(-30).map((s) => s.value), 1)
                        const heightPct = (snap.value / maxVal) * 100
                        return <div key={i} className="flex-1 rounded-t bg-uk-blue opacity-60" style={{ height: `${heightPct}%` }} title={`${snap.value.toFixed(1)} - ${format(new Date(snap.capturedAt), 'MMM d')}`} />
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">{snaps.length} snapshot(s) over last 90 days</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== Evidence Collection ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Evidence Collection</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => void p.handleAutoCollect()} disabled={p.evAutoCollecting} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              {p.evAutoCollecting ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
              Auto-Collect
            </button>
            <button type="button" onClick={() => p.setEvFormOpen(!p.evFormOpen)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#0033A0' }}>
              {p.evFormOpen ? 'Cancel' : '+ Add Evidence'}
            </button>
          </div>
        </div>
        {p.evFormOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
                <input type="text" value={p.evTitle} onChange={(e) => p.setEvTitle(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Evidence title" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                <select value={p.evType} onChange={(e) => p.setEvType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="manual">Manual</option>
                  <option value="automated">Automated</option>
                  <option value="screenshot">Screenshot</option>
                  <option value="log">Log Entry</option>
                  <option value="report">Report</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
              <textarea rows={2} value={p.evDescription} onChange={(e) => p.setEvDescription(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Describe the evidence..." />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tags (comma-separated)</label>
                <input type="text" value={p.evTags} onChange={(e) => p.setEvTags(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="ferpa, training, q1" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Linked Requirement (optional)</label>
                <select value={p.evReqId} onChange={(e) => p.setEvReqId(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="">None</option>
                  {p.allRegRequirements.map((req) => (
                    <option key={req.id} value={req.id}>{req.regulation} — {req.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="button" onClick={() => void p.handleCreateEvidence()} disabled={p.evSaving || !p.evTitle.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
              {p.evSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add Evidence
            </button>
          </div>
        )}
        {p.evidenceLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.evidenceItems.length === 0 ? (
          <p className="text-sm text-gray-500">No evidence collected. Use &quot;Auto-Collect&quot; to gather evidence automatically.</p>
        ) : (
          <div className="space-y-2">
            {p.evidenceItems.map((ev) => (
              <div key={ev.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Fingerprint className="size-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{ev.title}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase">{ev.evidenceType}</span>
                  </div>
                  {ev.description && <p className="text-xs text-gray-500">{ev.description}</p>}
                  {ev.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ev.tags.map((t) => <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{t}</span>)}
                    </div>
                  )}
                  {ev.requirement && <p className="text-[10px] text-gray-400 mt-1">Linked: {ev.requirement.regulation} — {ev.requirement.title}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">Collected {format(new Date(ev.collectedAt), 'MMM d, yyyy')} by {ev.collector.name}{ev.validUntil ? ` · Valid until ${format(new Date(ev.validUntil), 'MMM d, yyyy')}` : ''}</p>
                </div>
                <button type="button" onClick={() => void p.handleDeleteEvidence(ev.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Vendor Risk Assessments ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Vendor Risk Assessments</h2>
          <button type="button" onClick={() => p.setVaFormOpen(!p.vaFormOpen)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#0033A0' }}>
            {p.vaFormOpen ? 'Cancel' : '+ New Assessment'}
          </button>
        </div>
        {p.vaFormOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Vendor Name</label>
                <input type="text" value={p.vaVendor} onChange={(e) => p.setVaVendor(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Vendor name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Risk Level</label>
                <select value={p.vaRisk} onChange={(e) => p.setVaRisk(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Overall Score (0-100)</label>
                <input type="number" value={p.vaScore} onChange={(e) => p.setVaScore(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" min={0} max={100} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Next Review (optional)</label>
                <input type="date" value={p.vaNextReview} onChange={(e) => p.setVaNextReview(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Data Categories (comma-separated)</label>
                <input type="text" value={p.vaCategories} onChange={(e) => p.setVaCategories(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="PII, education records" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Security Measures (comma-separated)</label>
                <input type="text" value={p.vaMeasures} onChange={(e) => p.setVaMeasures(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="encryption, SOC2, MFA" />
              </div>
            </div>
            <button type="button" onClick={() => void p.handleCreateVendorAssessment()} disabled={p.vaSaving || !p.vaVendor.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
              {p.vaSaving ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
              Create Assessment
            </button>
          </div>
        )}
        {p.vendorLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.vendorAssessments.length === 0 ? (
          <p className="text-sm text-gray-500">No vendor assessments yet.</p>
        ) : (
          <div className="space-y-3">
            {p.vendorAssessments.map((va) => (
              <div key={va.id} className={`rounded-2xl border-2 p-4 ${va.riskLevel === 'critical' ? 'border-red-200' : va.riskLevel === 'high' ? 'border-orange-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900">{va.vendorName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${va.riskLevel === 'critical' ? 'bg-red-100 text-red-700' : va.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' : va.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{va.riskLevel} risk</span>
                      <span className={`text-sm font-bold ${va.overallScore >= 80 ? 'text-emerald-600' : va.overallScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{va.overallScore}/100</span>
                    </div>
                    {va.dataCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {va.dataCategories.map((cat) => <span key={cat} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{cat}</span>)}
                      </div>
                    )}
                    {va.securityMeasures.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {va.securityMeasures.map((m) => <span key={m} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{m}</span>)}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1.5">Assessed {format(new Date(va.assessmentDate), 'MMM d, yyyy')} by {va.assessor.name}{va.nextReviewDate ? ` · Next review: ${format(new Date(va.nextReviewDate), 'MMM d, yyyy')}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => void p.handleDeleteVendorAssessment(va.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Audit Chain ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Immutable Audit Chain</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => void p.handleVerifyChain()} disabled={p.chainVerifyLoading} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              {p.chainVerifyLoading ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}
              Verify Integrity
            </button>
            <button type="button" onClick={() => void p.handleExportChain('json')} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <Download className="size-3" />JSON
            </button>
            <button type="button" onClick={() => void p.handleExportChain('csv')} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <Download className="size-3" />CSV
            </button>
          </div>
        </div>
        {p.chainIntegrity && (
          <div className={`mb-4 rounded-xl border-2 p-3 ${p.chainIntegrity.valid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-center gap-2">
              {p.chainIntegrity.valid ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-red-600" />}
              <span className={`text-sm font-semibold ${p.chainIntegrity.valid ? 'text-emerald-700' : 'text-red-700'}`}>
                {p.chainIntegrity.valid ? `Chain intact — ${p.chainIntegrity.totalRecords} records verified` : `Chain broken at record #${p.chainIntegrity.brokenAt}`}
              </span>
            </div>
          </div>
        )}
        {p.auditChainLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.auditChainEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No audit chain entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4 font-semibold">#</th>
                  <th className="pb-2 pr-4 font-semibold">Event</th>
                  <th className="pb-2 pr-4 font-semibold">Actor</th>
                  <th className="pb-2 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {p.auditChainEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 text-xs font-mono text-gray-400">{entry.sequenceNumber}</td>
                    <td className="py-2 pr-4"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{entry.eventType}</span></td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{entry.actorEmail}</td>
                    <td className="py-2 text-xs text-gray-400">{format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== Policy Acceptance ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Policy Acceptance Stats</h2>
        {p.policyAcceptanceLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.policyAcceptanceStats.length === 0 ? (
          <p className="text-sm text-gray-500">No policy acceptance data.</p>
        ) : (
          <div className="space-y-3">
            {p.policyAcceptanceStats.map((stat) => (
              <div key={stat.policyType} className="rounded-2xl border-2 border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 uppercase">{stat.policyType}</span>
                    <span className="text-xs text-gray-400">v{stat.currentVersion}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-700">{stat.currentVersionPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 mb-2">
                  <div className="h-1.5 rounded-full bg-uk-blue" style={{ width: `${stat.currentVersionPct}%` }} />
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>Total accepted: {stat.totalAccepted}</span>
                  <span>Current version: {stat.currentVersionAccepted}/{stat.totalUsers}</span>
                  {stat.withdrawn > 0 && <span className="text-red-500">Withdrawn: {stat.withdrawn}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== System Health ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Compliance System Health</h2>
          <button type="button" onClick={() => void p.fetchHealthCheck()} disabled={p.healthLoading} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {p.healthLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            Refresh
          </button>
        </div>
        {p.healthLoading && !p.healthResult ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : !p.healthResult ? (
          <p className="text-sm text-gray-500">Click &quot;Refresh&quot; to check system health.</p>
        ) : (
          <div>
            <div className={`mb-4 rounded-xl border-2 p-3 ${p.healthResult.status === 'healthy' ? 'border-emerald-200 bg-emerald-50' : p.healthResult.status === 'degraded' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {p.healthResult.status === 'healthy' ? <CheckCircle2 className="size-5 text-emerald-600" /> : p.healthResult.status === 'degraded' ? <AlertTriangle className="size-5 text-amber-600" /> : <XCircle className="size-5 text-red-600" />}
                <span className={`text-sm font-bold uppercase ${p.healthResult.status === 'healthy' ? 'text-emerald-700' : p.healthResult.status === 'degraded' ? 'text-amber-700' : 'text-red-700'}`}>{p.healthResult.status}</span>
                <span className="text-[10px] text-gray-400">{format(new Date(p.healthResult.timestamp), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {p.healthResult.checks.map((check, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${check.status === 'pass' ? 'bg-emerald-50' : check.status === 'warn' ? 'bg-amber-50' : 'bg-red-50'}`}>
                  {check.status === 'pass' ? <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> : check.status === 'warn' ? <AlertTriangle className="size-4 text-amber-600 shrink-0" /> : <XCircle className="size-4 text-red-600 shrink-0" />}
                  <span className="font-medium flex-1">{check.name}</span>
                  <span className="text-xs text-gray-500">{check.message}</span>
                  {check.value != null && <span className="text-xs font-mono text-gray-400">{check.value}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ===== Data Classification ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Data Classification</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => void p.handleSeedClassifications()} disabled={p.dcSeeding} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              {p.dcSeeding ? <Loader2 className="size-3 animate-spin" /> : <Database className="size-3" />}
              Seed
            </button>
            <button type="button" onClick={() => p.setDcFormOpen(!p.dcFormOpen)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#0033A0' }}>
              {p.dcFormOpen ? 'Cancel' : '+ Classify Asset'}
            </button>
          </div>
        </div>
        {/* Summary */}
        {p.dcSummary && (
          <div className="mb-4 flex flex-wrap gap-3">
            {Object.entries(p.dcSummary.countsByLevel).map(([level, count]) => (
              <div key={level} className="rounded-xl border border-gray-200 px-3 py-2 text-center">
                <div className="text-lg font-bold text-gray-900">{count}</div>
                <div className="text-[10px] text-gray-500 uppercase">{level}</div>
              </div>
            ))}
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center">
              <div className="text-lg font-bold text-red-700">{p.dcSummary.piiCount}</div>
              <div className="text-[10px] text-red-600 uppercase">PII</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <div className="text-lg font-bold text-amber-700">{p.dcSummary.ferpaCount}</div>
              <div className="text-[10px] text-amber-600 uppercase">FERPA</div>
            </div>
          </div>
        )}
        {p.dcFormOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Data Asset</label>
                <input type="text" value={p.dcAsset} onChange={(e) => p.setDcAsset(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="e.g. ChatMessage" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Classification Level</label>
                <select value={p.dcLevel} onChange={(e) => p.setDcLevel(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={p.dcFerpa} onChange={(e) => p.setDcFerpa(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-xs font-semibold text-gray-700">FERPA Protected</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={p.dcPii} onChange={(e) => p.setDcPii(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-xs font-semibold text-gray-700">Contains PII</span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Sensitivity Tags (comma-separated)</label>
                <input type="text" value={p.dcTags} onChange={(e) => p.setDcTags(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="grades, student-records" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                <input type="text" value={p.dcNotes} onChange={(e) => p.setDcNotes(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Additional notes..." />
              </div>
            </div>
            <button type="button" onClick={() => void p.handleCreateClassification()} disabled={p.dcSaving || !p.dcAsset.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
              {p.dcSaving ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
              Classify
            </button>
          </div>
        )}
        {p.dcLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.dcItems.length === 0 ? (
          <p className="text-sm text-gray-500">No data classifications. Seed defaults or add manually.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4 font-semibold">Asset</th>
                  <th className="pb-2 pr-4 font-semibold">Level</th>
                  <th className="pb-2 pr-4 font-semibold text-center">FERPA</th>
                  <th className="pb-2 pr-4 font-semibold text-center">PII</th>
                  <th className="pb-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {p.dcItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4">
                      <span className="font-medium text-gray-900">{item.dataAsset}</span>
                      {item.sensitivityTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {item.sensitivityTags.map((t) => <span key={t} className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">{t}</span>)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${item.classificationLevel === 'restricted' ? 'bg-red-100 text-red-700' : item.classificationLevel === 'confidential' ? 'bg-orange-100 text-orange-700' : item.classificationLevel === 'internal' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.classificationLevel}</span></td>
                    <td className="py-2.5 pr-4 text-center">{item.ferpaProtected ? <CheckCircle2 className="mx-auto size-4 text-amber-500" /> : <span className="text-xs text-gray-300">-</span>}</td>
                    <td className="py-2.5 pr-4 text-center">{item.piiContained ? <CheckCircle2 className="mx-auto size-4 text-red-500" /> : <span className="text-xs text-gray-300">-</span>}</td>
                    <td className="py-2.5"><button type="button" onClick={() => void p.handleDeleteClassification(item.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== Access Reviews ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Access Reviews</h2>
        </div>
        <div className="mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Review Cycle</label>
            <input type="text" value={p.arCycle} onChange={(e) => p.setArCycle(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Q1-2026" />
          </div>
          <button type="button" onClick={() => void p.handleCreateReview()} disabled={p.arCreating || !p.arCycle.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
            {p.arCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create Review
          </button>
        </div>
        {p.arLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.arItems.length === 0 ? (
          <p className="text-sm text-gray-500">No access reviews created.</p>
        ) : (
          <div className="space-y-3">
            {p.arItems.map((ar) => {
              const expanded = p.arExpandedId === ar.id
              const statusStyles: Record<string, string> = { pending: 'bg-gray-100 text-gray-600', 'in-progress': 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700' }
              return (
                <div key={ar.id} className="rounded-2xl border-2 border-gray-200 p-4">
                  <button type="button" onClick={() => p.setArExpandedId(expanded ? null : ar.id)} className="flex w-full items-center justify-between text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{ar.reviewCycle}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyles[ar.status] ?? 'bg-gray-100 text-gray-600'}`}>{ar.status}</span>
                      <span className="text-xs text-gray-400">{ar.usersReviewed}/{ar.totalUsers} users</span>
                    </div>
                    {expanded ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                  </button>
                  {expanded && (
                    <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                      {ar.reviewer && <p className="text-xs text-gray-500">Reviewer: {ar.reviewer.name} ({ar.reviewer.email})</p>}
                      {ar.startedAt && <p className="text-xs text-gray-500">Started: {format(new Date(ar.startedAt), 'MMM d, yyyy')}</p>}
                      {ar.completedAt && <p className="text-xs text-gray-500">Completed: {format(new Date(ar.completedAt), 'MMM d, yyyy')}</p>}
                      <p className="text-xs text-gray-500">Changes recommended: {ar.changesRecommended}</p>
                      <div className="flex gap-2 mt-2">
                        {ar.status === 'pending' && (
                          <button type="button" onClick={() => void p.handleAccessReviewAction(ar.id, 'start')} className="inline-flex items-center gap-1 rounded-lg border border-uk-blue px-3 py-1.5 text-xs font-semibold hover:bg-blue-50" style={{ color: '#0033A0' }}>
                            <Play className="size-3" />Start Review
                          </button>
                        )}
                        {ar.status === 'in-progress' && (
                          <button type="button" onClick={() => void p.handleAccessReviewAction(ar.id, 'complete')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                            <CheckCircle className="size-3" />Complete
                          </button>
                        )}
                        <button type="button" onClick={() => void p.handleDeleteReview(ar.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                          <Trash2 className="size-3" />Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== Delegations & Approvals ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Delegations &amp; Approvals</h2>

        {/* Delegations */}
        <h3 className="text-sm font-bold text-gray-700 mb-3">Active Delegations</h3>
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Delegator Email</label>
              <input type="text" value={p.delDelegatorEmail} onChange={(e) => p.setDelDelegatorEmail(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="delegator@uky.edu" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Delegate Email</label>
              <input type="text" value={p.delDelegateEmail} onChange={(e) => p.setDelDelegateEmail(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="delegate@uky.edu" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Scope</label>
              <select value={p.delScope} onChange={(e) => p.setDelScope(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="full">Full</option>
                <option value="read-only">Read Only</option>
                <option value="approvals">Approvals Only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Reason (optional)</label>
              <input type="text" value={p.delReason} onChange={(e) => p.setDelReason(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Vacation coverage" />
            </div>
          </div>
          <button type="button" onClick={() => void p.handleCreateDelegation()} disabled={p.delSaving || !p.delDelegatorEmail.trim() || !p.delDelegateEmail.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
            {p.delSaving ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
            Create Delegation
          </button>
        </div>
        {p.delegationsLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.delegations.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">No active delegations.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {p.delegations.map((del) => (
              <div key={del.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">{del.delegator.name}</span>
                    <ArrowRightLeft className="size-3 text-gray-400" />
                    <span className="font-medium text-gray-900">{del.delegate.name}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{del.scope}</span>
                  </div>
                  {del.reason && <p className="text-xs text-gray-400 mt-0.5">{del.reason}</p>}
                  <p className="text-[10px] text-gray-400">From {format(new Date(del.validFrom), 'MMM d, yyyy')}{del.validUntil ? ` to ${format(new Date(del.validUntil), 'MMM d, yyyy')}` : ' (no expiry)'}</p>
                </div>
                <button type="button" onClick={() => void p.handleRevokeDelegation(del.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"><X className="size-4" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Approvals */}
        <h3 className="text-sm font-bold text-gray-700 mb-3 mt-4 border-t border-gray-100 pt-4">Pending Approvals</h3>
        <div className="mb-3 flex gap-2">
          <button type="button" onClick={() => p.setApprovalFormOpen(!p.approvalFormOpen)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#0033A0' }}>
            {p.approvalFormOpen ? 'Cancel' : '+ Request Approval'}
          </button>
        </div>
        {p.approvalFormOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Request Type</label>
                <select value={p.newApprovalType} onChange={(e) => p.setNewApprovalType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="dpa-renewal">DPA Renewal</option>
                  <option value="data-access">Data Access</option>
                  <option value="policy-change">Policy Change</option>
                  <option value="exception-request">Exception Request</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                <input type="text" value={p.newApprovalDesc} onChange={(e) => p.setNewApprovalDesc(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Describe the request..." />
              </div>
            </div>
            <button type="button" onClick={() => void p.handleCreateApproval()} disabled={p.newApprovalSaving || !p.newApprovalDesc.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
              {p.newApprovalSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Submit Request
            </button>
          </div>
        )}
        {p.approvalsLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.pendingApprovals.length === 0 ? (
          <p className="text-sm text-gray-500">No pending approvals.</p>
        ) : (
          <div className="space-y-3">
            {p.pendingApprovals.map((appr) => {
              const statusStyles: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700', escalated: 'bg-purple-100 text-purple-700' }
              return (
                <div key={appr.id} className="rounded-2xl border-2 border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-900">{appr.requestType}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyles[appr.status] ?? 'bg-gray-100 text-gray-600'}`}>{appr.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Requested by {appr.requester.name} on {format(new Date(appr.createdAt), 'MMM d, yyyy')}</p>
                  {Boolean((appr.requestData as Record<string, unknown>).description) && <p className="text-xs text-gray-700">{String((appr.requestData as Record<string, unknown>).description)}</p>}
                  {appr.status === 'pending' && (
                    <div className="mt-3 space-y-2">
                      <input type="text" placeholder="Comments (optional)" value={p.approvalComments[appr.id] ?? ''} onChange={(e) => p.setApprovalComments((prev) => ({ ...prev, [appr.id]: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs" />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => void p.handleApprovalAction(appr.id, 'approve')} disabled={p.approvalActioning === appr.id} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                          {p.approvalActioning === appr.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}Approve
                        </button>
                        <button type="button" onClick={() => void p.handleApprovalAction(appr.id, 'reject')} disabled={p.approvalActioning === appr.id} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">
                          {p.approvalActioning === appr.id ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}Reject
                        </button>
                        <button type="button" onClick={() => void p.handleApprovalAction(appr.id, 'escalate')} disabled={p.approvalActioning === appr.id} className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100">
                          {p.approvalActioning === appr.id ? <Loader2 className="size-3 animate-spin" /> : <TrendingUp className="size-3" />}Escalate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== Integration Status ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Integration Status</h2>
          <button type="button" onClick={() => void p.fetchIntegrationStatus()} disabled={p.integrationsLoading} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {p.integrationsLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            Refresh
          </button>
        </div>
        {p.integrationsLoading && p.integrations.length === 0 ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.integrations.length === 0 ? (
          <p className="text-sm text-gray-500">No integrations configured.</p>
        ) : (
          <div className="space-y-2">
            {p.integrations.map((intg) => (
              <div key={intg.name} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`rounded-full size-3 shrink-0 ${intg.status === 'active' ? 'bg-emerald-500' : intg.status === 'degraded' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{intg.name}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase">{intg.type}</span>
                    </div>
                    <p className="text-xs text-gray-500">{intg.details}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0 ${intg.status === 'active' ? 'bg-emerald-100 text-emerald-700' : intg.status === 'degraded' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{intg.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Exceptions & Waivers ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Exceptions &amp; Waivers</h2>
          <button type="button" onClick={() => p.setExcFormOpen(!p.excFormOpen)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#0033A0' }}>
            {p.excFormOpen ? 'Cancel' : '+ Grant Exception'}
          </button>
        </div>
        {p.expiringExceptions.length > 0 && (
          <div className="mb-4 rounded-xl border-2 border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="size-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">{p.expiringExceptions.length} exception(s) expiring within 30 days</span>
            </div>
          </div>
        )}
        {p.excFormOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">User Email (optional)</label>
                <input type="text" value={p.excUserEmail} onChange={(e) => p.setExcUserEmail(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="user@uky.edu" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                <select value={p.excType} onChange={(e) => p.setExcType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="waiver">Waiver</option>
                  <option value="exemption">Exemption</option>
                  <option value="deferral">Deferral</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Valid Until</label>
                <input type="date" value={p.excValidUntil} onChange={(e) => p.setExcValidUntil(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Linked Requirement (optional)</label>
                <select value={p.excReqId} onChange={(e) => p.setExcReqId(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="">None</option>
                  {p.allRegRequirements.map((req) => (
                    <option key={req.id} value={req.id}>{req.regulation} — {req.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Reason</label>
              <textarea rows={2} value={p.excReason} onChange={(e) => p.setExcReason(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Justification for the exception..." />
            </div>
            <button type="button" onClick={() => void p.handleCreateException()} disabled={p.excSaving || !p.excReason.trim() || !p.excValidUntil} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
              {p.excSaving ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
              Grant Exception
            </button>
          </div>
        )}
        {p.exceptionsLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.exceptions.length === 0 ? (
          <p className="text-sm text-gray-500">No active exceptions or waivers.</p>
        ) : (
          <div className="space-y-3">
            {(() => { const now = Date.now(); return p.exceptions.map((exc) => {
              const expires = new Date(exc.validUntil).getTime()
              const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24))
              const isExpiring = daysLeft > 0 && daysLeft <= 30
              return (
                <div key={exc.id} className={`rounded-2xl border-2 p-4 ${isExpiring ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 uppercase">{exc.exceptionType}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${exc.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{exc.status}</span>
                        {isExpiring && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">EXPIRING ({daysLeft}d)</span>}
                      </div>
                      <p className="text-sm text-gray-900">{exc.reason}</p>
                      {exc.user && <p className="text-xs text-gray-500 mt-1">User: {exc.user.name} ({exc.user.email})</p>}
                      {exc.requirement && <p className="text-xs text-gray-500">Requirement: {exc.requirement.regulation} — {exc.requirement.title}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">Granted by {exc.grantor.name} · Valid {format(new Date(exc.validFrom), 'MMM d, yyyy')} to {format(new Date(exc.validUntil), 'MMM d, yyyy')}</p>
                    </div>
                    {exc.status === 'active' && (
                      <div className="shrink-0">
                        {p.excRevokeId === exc.id ? (
                          <div className="space-y-2">
                            <input type="text" placeholder="Reason for revocation" value={p.excRevokeReason} onChange={(e) => p.setExcRevokeReason(e.target.value)} className="w-40 rounded-lg border border-gray-200 px-2 py-1 text-xs" />
                            <div className="flex gap-1">
                              <button type="button" onClick={() => void p.handleRevokeException(exc.id)} className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">Revoke</button>
                              <button type="button" onClick={() => { p.setExcRevokeId(null); p.setExcRevokeReason('') }} className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-500">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => p.setExcRevokeId(exc.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50"><X className="size-4" /></button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            }) })()}
          </div>
        )}
      </section>

      {/* ===== Tags ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-4">Compliance Tags</h2>
        <div className="mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tag Name</label>
            <input type="text" value={p.newTagName} onChange={(e) => p.setNewTagName(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="New tag" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Color</label>
            <input type="color" value={p.newTagColor} onChange={(e) => p.setNewTagColor(e.target.value)} className="rounded-lg border border-gray-200 h-9 w-12" />
          </div>
          <button type="button" onClick={() => void p.handleCreateTag()} disabled={p.tagSaving || !p.newTagName.trim()} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: '#0033A0' }}>
            {p.tagSaving ? <Loader2 className="size-4 animate-spin" /> : <Tag className="size-4" />}
            Create Tag
          </button>
        </div>
        {p.compTagsLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.compTags.length === 0 ? (
          <p className="text-sm text-gray-500">No compliance tags created.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {p.compTags.map((tag) => (
              <div key={tag.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5">
                <div className="rounded-full size-3 shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                <span className="text-[10px] text-gray-400">{tag._count.assignments}</span>
                <button type="button" onClick={() => void p.handleDeleteTag(tag.id)} className="rounded-full p-0.5 text-gray-400 hover:text-red-500"><X className="size-3" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Activity Feed ===== */}
      <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900">Compliance Activity Feed</h2>
          <button type="button" onClick={() => void p.fetchActivityFeed(p.activityLimit)} disabled={p.activityLoading} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {p.activityLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            Refresh
          </button>
        </div>
        {p.activityLoading && p.activityFeed.length === 0 ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-gray-400" /></div>
        ) : p.activityFeed.length === 0 ? (
          <p className="text-sm text-gray-500">No recent compliance activity.</p>
        ) : (
          <div className="space-y-2">
            {p.activityFeed.map((act) => (
              <div key={act.id} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                <Activity className="size-4 text-gray-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{act.title}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase">{act.type}</span>
                  </div>
                  <p className="text-xs text-gray-500">{act.description}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{act.actor} · {format(new Date(act.timestamp), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
            ))}
            {p.activityFeed.length >= p.activityLimit && (
              <button type="button" onClick={() => { p.setActivityLimit(p.activityLimit + 50); void p.fetchActivityFeed(p.activityLimit + 50) }} className="w-full rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50">
                Load More
              </button>
            )}
          </div>
        )}
      </section>
    </>
  )
}
