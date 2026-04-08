'use client'

import type { PluginManifest, PluginLifecycleHooks } from './types'

// ── Sample Plugin Definitions ──────────────────────────────────────────────

export interface SamplePluginDef {
  manifest: PluginManifest
  hooks: PluginLifecycleHooks
}

// ── 1. Custom Node Types ───────────────────────────────────────────────────

const customNodeTypesManifest: PluginManifest = {
  id: 'custom-node-types',
  name: 'Custom Node Types',
  version: '1.0.0',
  author: 'University of Kentucky Team',
  description: 'Adds Assessment, Discussion, and Lab node types with custom colors and icons for richer course maps.',
  category: 'Node Types',
  icon: 'Layers',
  entryPoint: 'custom-node-types',
  permissions: ['read-nodes', 'write-nodes'],
  configSchema: [
    { key: 'assessmentColor', label: 'Assessment Color', type: 'string', default: '#DC2626', description: 'Color for assessment nodes' },
    { key: 'discussionColor', label: 'Discussion Color', type: 'string', default: '#7C3AED', description: 'Color for discussion nodes' },
    { key: 'labColor', label: 'Lab Color', type: 'string', default: '#059669', description: 'Color for lab nodes' },
  ],
}

const customNodeTypesHooks: PluginLifecycleHooks = {
  onLoad: () => {
    // Register custom node type styles
  },
  onEnable: () => {
    // Activate custom rendering
  },
  onDisable: () => {
    // Revert to default node rendering
  },
  onMapChange: () => {
    // Refresh custom node styling when map changes
  },
}

// ── 2. Grade Calculator ────────────────────────────────────────────────────

const gradeCalculatorManifest: PluginManifest = {
  id: 'grade-calculator',
  name: 'Grade Calculator',
  version: '1.0.0',
  author: 'University of Kentucky Team',
  description: 'Adds grade weight visualization to nodes and computes weighted averages across connected assessment nodes.',
  category: 'Calculators',
  icon: 'BarChart3',
  entryPoint: 'grade-calculator',
  permissions: ['read-map', 'read-nodes'],
  configSchema: [
    { key: 'gradingScale', label: 'Grading Scale', type: 'select', default: 'percentage', options: [
      { label: 'Percentage (0-100)', value: 'percentage' },
      { label: 'Letter (A-F)', value: 'letter' },
      { label: 'GPA (0-4.0)', value: 'gpa' },
    ]},
    { key: 'showWeights', label: 'Show Weights on Nodes', type: 'boolean', default: true },
    { key: 'decimalPlaces', label: 'Decimal Places', type: 'number', default: 2 },
  ],
}

const gradeCalculatorHooks: PluginLifecycleHooks = {
  onLoad: () => {
    // Initialize grade data store
  },
  onEnable: () => {
    // Show grade weight overlays on nodes
  },
  onDisable: () => {
    // Remove grade overlays
  },
  onMapChange: ({ nodes }: { nodes: unknown[] }) => {
    // Recalculate weighted averages when map changes
    void nodes // used for recalculation
  },
}

// ── 3. Attendance Tracker ──────────────────────────────────────────────────

const attendanceTrackerManifest: PluginManifest = {
  id: 'attendance-tracker',
  name: 'Attendance Tracker',
  version: '1.0.0',
  author: 'University of Kentucky Team',
  description: 'Adds attendance data overlay to nodes showing participation rates, absence counts, and engagement metrics.',
  category: 'Trackers',
  icon: 'Users',
  entryPoint: 'attendance-tracker',
  permissions: ['read-map', 'read-nodes'],
  configSchema: [
    { key: 'thresholdWarning', label: 'Warning Threshold (%)', type: 'number', default: 80, description: 'Highlight nodes below this attendance rate' },
    { key: 'thresholdCritical', label: 'Critical Threshold (%)', type: 'number', default: 60, description: 'Red highlight below this rate' },
    { key: 'showOverlay', label: 'Show Attendance Overlay', type: 'boolean', default: true },
  ],
}

const attendanceTrackerHooks: PluginLifecycleHooks = {
  onLoad: () => {
    // Initialize attendance data
  },
  onEnable: () => {
    // Show attendance overlays
  },
  onDisable: () => {
    // Remove overlays
  },
  onMapChange: () => {
    // Refresh attendance data for changed nodes
  },
}

// ── Export all sample plugins ──────────────────────────────────────────────

export const SAMPLE_PLUGINS: SamplePluginDef[] = [
  { manifest: customNodeTypesManifest, hooks: customNodeTypesHooks },
  { manifest: gradeCalculatorManifest, hooks: gradeCalculatorHooks },
  { manifest: attendanceTrackerManifest, hooks: attendanceTrackerHooks },
]

/** Get the available (not yet installed) sample plugins */
export function getAvailablePlugins(installedIds: string[]): SamplePluginDef[] {
  return SAMPLE_PLUGINS.filter((p) => !installedIds.includes(p.manifest.id))
}

/** Get all sample manifests */
export function getAllSampleManifests(): PluginManifest[] {
  return SAMPLE_PLUGINS.map((p) => p.manifest)
}

/** Get a sample plugin by ID */
export function getSamplePlugin(id: string): SamplePluginDef | undefined {
  return SAMPLE_PLUGINS.find((p) => p.manifest.id === id)
}

/** Node type metadata added by the Custom Node Types plugin */
export const CUSTOM_NODE_TYPES = [
  { type: 'ASSESSMENT', label: 'Assessment', color: '#DC2626', icon: 'ClipboardList' },
  { type: 'DISCUSSION', label: 'Discussion', color: '#7C3AED', icon: 'MessageSquare' },
  { type: 'LAB', label: 'Lab', color: '#059669', icon: 'Flask' },
] as const
