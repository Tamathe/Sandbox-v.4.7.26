declare module 'react-simple-maps' {
  import * as React from 'react'

  export interface ComposableMapProps {
    projection?: string
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
    className?: string
    style?: React.CSSProperties
    children?: React.ReactNode
  }

  export interface GeographiesProps {
    geography: string | object
    children: (args: { geographies: Geography[] }) => React.ReactNode
  }

  export interface Geography {
    rsmKey: string
    properties: Record<string, unknown>
    [key: string]: unknown
  }

  export interface GeographyProps {
    geography: unknown
    style?: { default?: React.CSSProperties; hover?: React.CSSProperties; pressed?: React.CSSProperties }
    className?: string
    onClick?: (e: React.MouseEvent) => void
    onMouseEnter?: (e: React.MouseEvent) => void
    onMouseLeave?: (e: React.MouseEvent) => void
    [key: string]: unknown
  }

  export const ComposableMap: React.FC<ComposableMapProps>
  export const Geographies: React.FC<GeographiesProps>
  export const Geography: React.FC<GeographyProps>
  export const Marker: React.FC<{ coordinates: [number, number]; children?: React.ReactNode; [key: string]: unknown }>
  export const ZoomableGroup: React.FC<{ center?: [number, number]; zoom?: number; children?: React.ReactNode; [key: string]: unknown }>
}
