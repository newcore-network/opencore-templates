import {
  Chat,
  Command,
  Controller,
  Export,
  Guard,
  Player,
  Players,
} from '@open-core/framework/server'
import { notifyChatMessageHooks } from './chat.hooks'
import { createSourceSnapshot, sendNearbyFaded } from './chat.proximity'
import type { RGB, SpatialBroadcastInput } from './chat.types'

const CHAT_DISTANCES = {
  WHISPER: 5,
  NORMAL: 20,
  SHOUT: 50,
} as const

@Controller()
export class ChatController {
  constructor(
    private readonly chat: Chat,
    private readonly players: Players,
  ) {}

  @Command({
    command: 'say',
    description: 'Send a chat message to nearby players',
    usage: '/say [message]',
  })
  async sayCommand(player: Player, ...parts: string[]) {
    const message = this.requireMessage(player, parts, '/say [message]')
    if (!message) return

    this.sendProximityMessage(player, message, CHAT_DISTANCES.NORMAL, player.name, {
      r: 255,
      g: 255,
      b: 255,
    })

    await this.emitHooks(player, message, 'say')
  }

  @Command({
    command: 'me',
    description: 'Third-person action for nearby players',
    usage: '/me [action]',
  })
  meCommand(player: Player, ...parts: string[]) {
    const action = this.requireMessage(player, parts, '/me [action]')
    if (!action) return

    this.sendProximityMessage(player, `* ${player.name} ${action}`, CHAT_DISTANCES.NORMAL, '', {
      r: 194,
      g: 162,
      b: 218,
    })
  }

  @Command({
    command: 'do',
    description: 'Environmental description for nearby players',
    usage: '/do [description]',
  })
  doCommand(player: Player, ...parts: string[]) {
    const description = this.requireMessage(player, parts, '/do [description]')
    if (!description) return

    this.sendProximityMessage(
      player,
      `** ${description} ((${player.name}))`,
      CHAT_DISTANCES.NORMAL,
      '',
      {
        r: 163,
        g: 190,
        b: 140,
      },
    )
  }

  @Command({ command: 'ooc', description: 'Out of character chat', usage: '/ooc [message]' })
  oocCommand(player: Player, ...parts: string[]) {
    const message = this.requireMessage(player, parts, '/ooc [message]')
    if (!message) return

    this.chat.broadcast(message, `[OOC] ${player.name}`, {
      r: 100,
      g: 149,
      b: 237,
    })
  }

  @Command({
    command: 'b',
    description: 'Local OOC chat for nearby players',
    usage: '/b [message]',
  })
  bCommand(player: Player, ...parts: string[]) {
    const message = this.requireMessage(player, parts, '/b [message]')
    if (!message) return

    this.sendProximityMessage(
      player,
      `(( ${player.name}: ${message} ))`,
      CHAT_DISTANCES.NORMAL,
      '',
      {
        r: 150,
        g: 150,
        b: 150,
      },
    )
  }

  @Command({
    command: 'pm',
    description: 'Send private message',
    usage: '/pm [playerId] [message]',
  })
  pmCommand(player: Player, targetIdRaw: string, ...parts: string[]) {
    const targetId = Number.parseInt(targetIdRaw, 10)
    if (!Number.isInteger(targetId)) {
      player.send('Usage: /pm [playerId] [message]', 'error')
      return
    }

    const message = this.requireMessage(player, parts, '/pm [playerId] [message]')
    if (!message) return

    const targetPlayer = this.players.getByClient(targetId)
    if (!targetPlayer) {
      player.send(`Player with ID ${targetId} not found`, 'error')
      return
    }

    this.chat.sendPrivate(targetPlayer, `From ${player.name}: ${message}`, 'Private Message', {
      r: 255,
      g: 200,
      b: 0,
    })
    player.send(`To ${targetPlayer.name}: ${message}`, 'success')
  }

  @Command({ command: 'clear', description: 'Clear your chat' })
  clearCommand(player: Player) {
    this.chat.clearChat(player)
    player.send('Chat cleared', 'success')
  }

  @Command({
    command: 'shout',
    description: 'Shout message to players in a large area',
    usage: '/shout [message]',
  })
  shoutCommand(player: Player, ...parts: string[]) {
    const message = this.requireMessage(player, parts, '/shout [message]')
    if (!message) return

    this.sendProximityMessage(
      player,
      `${player.name} shouts: ${message}!`,
      CHAT_DISTANCES.SHOUT,
      '',
      { r: 255, g: 87, b: 87 },
    )
  }

  @Command({
    command: 'whisper',
    description: 'Whisper message to very close players',
    usage: '/whisper [message]',
  })
  whisperCommand(player: Player, ...parts: string[]) {
    const message = this.requireMessage(player, parts, '/whisper [message]')
    if (!message) return

    this.sendProximityMessage(
      player,
      `${player.name} whispers: ${message}`,
      CHAT_DISTANCES.WHISPER,
      '',
      {
        r: 180,
        g: 180,
        b: 180,
      },
    )
  }

  @Command({ command: 'announce', description: 'Admin announcement', usage: '/announce [message]' })
  @Guard({ rank: 1 })
  announceCommand(player: Player, ...parts: string[]) {
    const message = this.requireMessage(player, parts, '/announce [message]')
    if (!message) return

    this.chat.broadcast(message, 'ANNOUNCEMENT', {
      r: 255,
      g: 215,
      b: 0,
    })
  }

  @Export()
  sendChatMessage(
    message: string,
    author: string = 'SYSTEM',
    r: number = 255,
    g: number = 255,
    b: number = 255,
  ) {
    this.chat.broadcast(message, author, { r, g, b })
  }

  @Export()
  sendSpatialMessage(payload: SpatialBroadcastInput) {
    if (!payload || typeof payload.message !== 'string' || !payload.message.trim()) {
      return
    }

    const source = payload.source
    if (!source || !this.isVec3(source.position)) {
      return
    }

    const sourceSnapshot = {
      id: source.id ?? `${source.kind ?? 'entity'}:external`,
      kind: source.kind ?? 'entity',
      name: source.name ?? payload.author ?? 'ENTITY',
      position: source.position,
      dimension: source.dimension,
    }

    sendNearbyFaded({
      chat: this.chat,
      players: this.players,
      source: sourceSnapshot,
      message: payload.message,
      radius: payload.radius ?? CHAT_DISTANCES.NORMAL,
      author: payload.author ?? sourceSnapshot.name,
      baseColor: payload.color,
      fade: payload.fade ?? true,
    })
  }

  private sendProximityMessage(
    player: Player,
    message: string,
    radius: number,
    author: string,
    baseColor: RGB,
  ) {
    const source = createSourceSnapshot(player, { kind: 'player', name: player.name })
    if (!source) {
      this.chat.sendNearby(player, message, radius, author, baseColor)
      return
    }

    sendNearbyFaded({
      chat: this.chat,
      players: this.players,
      source,
      message,
      radius,
      author,
      baseColor,
      fade: true,
    })
  }

  private async emitHooks(player: Player, message: string, command: string): Promise<void> {
    const source = createSourceSnapshot(player, { kind: 'player', name: player.name })
    if (!source) {
      return
    }

    await notifyChatMessageHooks({
      source,
      message,
      command,
    })
  }

  private requireMessage(player: Player, parts: string[], usage: string): string | null {
    const message = parts.join(' ').trim()
    if (message.length === 0) {
      player.send(`Usage: ${usage}`, 'error')
      return null
    }
    return message
  }

  private isVec3(value: unknown): value is { x: number; y: number; z: number } {
    if (!value || typeof value !== 'object') return false
    const vector = value as Record<string, unknown>
    return (
      typeof vector.x === 'number' && typeof vector.y === 'number' && typeof vector.z === 'number'
    )
  }
}
