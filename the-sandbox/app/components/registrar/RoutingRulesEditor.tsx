'use client'

import { useState } from 'react'
import { Plus, Save } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface RoutingRule {
  id: string
  departmentName: string
  contactEmail: string
  autoApproveThreshold: number
  autoRouteThreshold: number
}

interface RoutingRulesEditorProps {
  rules: RoutingRule[]
  onSave: (rules: RoutingRule[]) => void
}

export function RoutingRulesEditor({ rules, onSave }: RoutingRulesEditorProps) {
  const { currentUser } = useAuth()
  const canEdit = currentUser.role === 'REGISTRAR' || currentUser.role === 'ADMIN'
  const [editing, setEditing] = useState<Record<string, Partial<RoutingRule>>>({})
  const [newRow, setNewRow] = useState<Partial<RoutingRule> | null>(null)

  const handleEdit = (id: string, field: keyof RoutingRule, value: string | number) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const handleSaveRow = (rule: RoutingRule) => {
    const updated = { ...rule, ...editing[rule.id] }
    onSave(rules.map((r) => (r.id === rule.id ? (updated as RoutingRule) : r)))
    setEditing((prev) => { const n = { ...prev }; delete n[rule.id]; return n })
  }

  const handleAddNew = () => {
    if (!newRow?.departmentName || !newRow?.contactEmail) return
    const added: RoutingRule = {
      id: `new-${Date.now()}`,
      departmentName: newRow.departmentName!,
      contactEmail: newRow.contactEmail!,
      autoApproveThreshold: newRow.autoApproveThreshold ?? 85,
      autoRouteThreshold: newRow.autoRouteThreshold ?? 65,
    }
    onSave([...rules, added])
    setNewRow(null)
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Email</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Auto-Approve %</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Auto-Route %</th>
              {canEdit && <th className="py-2 px-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rules.map((rule) => {
              const e = editing[rule.id] ?? {}
              return (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-800">{e.departmentName ?? rule.departmentName}</td>
                  <td className="py-2 px-3">
                    {canEdit ? (
                      <input
                        type="email"
                        value={e.contactEmail ?? rule.contactEmail}
                        onChange={(ev) => handleEdit(rule.id, 'contactEmail', ev.target.value)}
                        className="border border-gray-200 rounded px-2 py-1 text-xs w-full"
                      />
                    ) : (
                      <span className="text-gray-600">{rule.contactEmail}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {canEdit ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={e.autoApproveThreshold ?? rule.autoApproveThreshold}
                        onChange={(ev) => handleEdit(rule.id, 'autoApproveThreshold', Number(ev.target.value))}
                        className="border border-gray-200 rounded px-2 py-1 text-xs w-20"
                      />
                    ) : (
                      <span>{rule.autoApproveThreshold}%</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {canEdit ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={e.autoRouteThreshold ?? rule.autoRouteThreshold}
                        onChange={(ev) => handleEdit(rule.id, 'autoRouteThreshold', Number(ev.target.value))}
                        className="border border-gray-200 rounded px-2 py-1 text-xs w-20"
                      />
                    ) : (
                      <span>{rule.autoRouteThreshold}%</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-2 px-3">
                      {editing[rule.id] && (
                        <button
                          onClick={() => handleSaveRow(rule)}
                          className="text-xs px-2 py-1 bg-[#0033A0] text-white rounded hover:bg-blue-800 flex items-center gap-1"
                        >
                          <Save className="size-3" /> Save
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
            {/* New row */}
            {newRow !== null && (
              <tr className="bg-blue-50">
                <td className="py-2 px-3">
                  <input
                    type="text"
                    placeholder="Department name"
                    value={newRow.departmentName ?? ''}
                    onChange={(e) => setNewRow((p) => ({ ...p, departmentName: e.target.value }))}
                    className="border border-blue-300 rounded px-2 py-1 text-xs w-full"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="email"
                    placeholder="contact@uky.edu"
                    value={newRow.contactEmail ?? ''}
                    onChange={(e) => setNewRow((p) => ({ ...p, contactEmail: e.target.value }))}
                    className="border border-blue-300 rounded px-2 py-1 text-xs w-full"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    value={newRow.autoApproveThreshold ?? 85}
                    onChange={(e) => setNewRow((p) => ({ ...p, autoApproveThreshold: Number(e.target.value) }))}
                    className="border border-blue-300 rounded px-2 py-1 text-xs w-20"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    value={newRow.autoRouteThreshold ?? 65}
                    onChange={(e) => setNewRow((p) => ({ ...p, autoRouteThreshold: Number(e.target.value) }))}
                    className="border border-blue-300 rounded px-2 py-1 text-xs w-20"
                  />
                </td>
                <td className="py-2 px-3">
                  <button
                    onClick={handleAddNew}
                    className="text-xs px-2 py-1 bg-[#0033A0] text-white rounded hover:bg-blue-800 flex items-center gap-1"
                  >
                    <Save className="size-3" /> Add
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {canEdit && !newRow && (
        <button
          onClick={() => setNewRow({})}
          className="mt-3 flex items-center gap-1.5 text-sm text-[#0033A0] hover:text-blue-800 font-medium"
        >
          <Plus className="size-4" /> Add Department Rule
        </button>
      )}
    </div>
  )
}
