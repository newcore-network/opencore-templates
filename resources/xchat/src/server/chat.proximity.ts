import type { Chat, Players } from '@open-core/framework/server'
import type { ChatSourceSnapshot, RGB } from './chat.types'
import { Vector3 } from '@open-core/framework'

const DEFAULT_CHAT_COLOR: RGB = { r: 255, g: 255, b: 255 }

export function createSourceSnapshot(
  source: {
    getPosition: () => Vector3
    name?: string
    id?: string
    kind?: string
    dimension?: number
    clientID?: number
  },
  defaults?: { kind?: 'player' | 'npc' | 'entity'; name?: string },
): ChatSourceSnapshot | null {
  const position = source.getPosition?.()
  if (!isVec3(position)) {
    return null
  }

  const fallbackName = defaults?.name ?? 'Unknown'
  const kind = normalizeKind(source.kind, defaults?.kind)
  const id = source.id ?? `${kind}:${source.clientID ?? 'unknown'}`
  const name = source.name ?? fallbackName

  return {
    id,
    kind,
    name,
    position,
    dimension: typeof source.dimension === 'number' ? source.dimension : undefined,
    playerClientId: typeof source.clientID === 'number' ? source.clientID : undefined,
  }
}

export function sendNearbyFaded(input: {
  chat: Chat
  players: Players
  source: ChatSourceSnapshot
  message: string
  radius: number
  author: string
  baseColor?: RGB
  fade?: boolean
}) {
  const { chat, players, source, message, radius, author } = input
  const color = input.baseColor ?? DEFAULT_CHAT_COLOR
  const withFade = input.fade ?? true
  const radiusSafe = Math.max(0, radius)

  const targets = players.getAll().filter((target) => {
    const pos = target.getPosition()
    if (!isVec3(pos)) {
      return false
    }

    if (!sameDimension(source.dimension, target.dimension)) {
      return false
    }

    return distance3D(source.position, pos) <= radiusSafe
  })

  for (const target of targets) {
    const dist = distance3D(source.position, target.getPosition())
    const targetColor = withFade ? applyDistanceFade(color, dist, radiusSafe) : color
    chat.sendPrivate(target, message, author, targetColor)
  }
}

function applyDistanceFade(base: RGB, distance: number, radius: number): RGB {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

  const t = radius <= 0 ? 1 : distance / radius
  const bucket = Math.max(0, Math.min(3, Math.floor(t * 4)))

  const desaturation = bucket / 3
  const darken = 1 - bucket * 0.12
  const gray = 0.299 * base.r + 0.587 * base.g + 0.114 * base.b

  return {
    r: clamp((base.r + (gray - base.r) * desaturation) * darken),
    g: clamp((base.g + (gray - base.g) * desaturation) * darken),
    b: clamp((base.b + (gray - base.b) * desaturation) * darken),
  }
}

function distance3D(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function sameDimension(a?: number, b?: number): boolean {
  if (a === undefined || b === undefined) {
    return true
  }
  return a === b
}

function isVec3(value: unknown): value is Vector3 {
  if (!value || typeof value !== 'object') {
    return false
  }
  const v = value as Record<string, unknown>
  return typeof v.x === 'number' && typeof v.y === 'number' && typeof v.z === 'number'
}

function normalizeKind(
  kind?: string,
  fallback?: 'player' | 'npc' | 'entity',
): 'player' | 'npc' | 'entity' {
  if (kind === 'player' || kind === 'npc' || kind === 'entity') {
    return kind
  }
  return fallback ?? 'entity'
}
