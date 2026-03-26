import type { BaseEntity, Spatial, Vector3 } from '@open-core/framework'
import type { Player } from '@open-core/framework/server'

export type RGB = { r: number; g: number; b: number }

export type SourceKind = 'player' | 'npc' | 'entity'

export type SpatialSource = (BaseEntity & Spatial) | Player

export interface ChatSourceSnapshot {
  id: string
  kind: SourceKind
  name: string
  position: Vector3
  dimension?: number
  playerClientId?: number
}

export interface SpatialBroadcastInput {
  message: string
  author?: string
  radius?: number
  color?: RGB
  fade?: boolean
  source: {
    id?: string
    kind?: SourceKind
    name?: string
    position: Vector3
    dimension?: number
  }
}
