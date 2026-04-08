'use client'

/**
 * Shared recharts barrel — import chart components from here instead of 'recharts'.
 *
 * Consolidating recharts imports through this module lets webpack produce a single
 * shared chunk for the library (~80-150 KB gzipped). Parent pages/components that
 * render chart components should load them via next/dynamic({ ssr: false }) with
 * the ChartSkeleton as the loading placeholder.
 *
 * Usage in a chart component:
 *   import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from '@/components/DynamicChart'
 *
 * Usage in a parent page:
 *   import dynamic from 'next/dynamic'
 *   import { ChartSkeleton } from '@/components/DynamicChart'
 *   const MyChart = dynamic(() => import('./MyChart'), { ssr: false, loading: ChartSkeleton })
 */

// ── Skeleton placeholder ────────────────────────────────────────────────────

export function ChartSkeleton() {
  return <div className="animate-pulse bg-gray-100 rounded-xl h-64 w-full" />
}

// ── Recharts re-exports (25 components used across 48 files) ────────────────

export {
  // Chart containers
  AreaChart,
  BarChart,
  ComposedChart,
  LineChart,
  PieChart,
  RadarChart,
  RadialBarChart,
  ScatterChart,

  // Data series
  Area,
  Bar,
  Line,
  Pie,
  Radar,
  RadialBar,
  Scatter,

  // Axes & grid
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  XAxis,
  YAxis,

  // Decorations
  Cell,
  Legend,
  ReferenceLine,
  Tooltip,

  // Layout
  ResponsiveContainer,
} from 'recharts'
