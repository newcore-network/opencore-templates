import { Server } from "@open-core/framework";

/**
 * Chat distance constants (in meters)
 */
const CHAT_DISTANCES = {
  WHISPER: 5,
  NORMAL: 20,
  SHOUT: 50,
};

/**
 * Chat Commands Controller
 * Implements roleplay chat commands with distance-based proximity
 */
@Server.Controller()
export class ChatController {
  constructor(
    private readonly chatService: Server.ChatService,
    private readonly playerService: Server.PlayerDirectoryPort
  ) {}

  private getCoords(player: Server.Player): { x: number; y: number; z: number } | null {

    const ped = GetPlayerPed(player.clientIDStr)
    if (!ped) return null

    const coords = GetEntityCoords(ped) as unknown
    if (Array.isArray(coords)) {
      const [x, y, z] = coords as unknown as [number, number, number]
      return { x, y, z }
    }

    const c = coords as any
    if (typeof c?.x === 'number' && typeof c?.y === 'number' && typeof c?.z === 'number') {
      return { x: c.x, y: c.y, z: c.z }
    }

    return null
  }

  private applyDistanceFade(
    base: { r: number; g: number; b: number },
    distance: number,
    radius: number
  ): { r: number; g: number; b: number } {
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

    const t = radius <= 0 ? 1 : distance / radius
    const bucket = Math.max(0, Math.min(3, Math.floor(t * 4)))

    const desat = bucket / 3
    const darken = 1 - bucket * 0.12

    const gray = 0.299 * base.r + 0.587 * base.g + 0.114 * base.b
    const r = (base.r + (gray - base.r) * desat) * darken
    const g = (base.g + (gray - base.g) * desat) * darken
    const b = (base.b + (gray - base.b) * desat) * darken

    return { r: clamp(r), g: clamp(g), b: clamp(b) }
  }

  private sendNearbyFaded(
    playerFrom: Server.Player,
    message: string,
    radius: number,
    author: string,
    baseColor: { r: number; g: number; b: number }
  ) {
    const fromCoords = this.getCoords(playerFrom)
    if (!fromCoords) {
      this.chatService.sendNearby(playerFrom, message, radius, author, baseColor)
      return
    }

    const players = this.playerService.getAll()
    for (const target of players) {
      const targetCoords = this.getCoords(target)
      if (!targetCoords) continue

      const dx = fromCoords.x - targetCoords.x
      const dy = fromCoords.y - targetCoords.y
      const dz = fromCoords.z - targetCoords.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist > radius) continue

      const color = this.applyDistanceFade(baseColor, dist, radius)
      this.chatService.sendPrivate(target, message, author, color)
    }
  }

  /**
   * /say [message] - Normal chat message (Proximal)
   */
  @Server.Command({
    command: "say",
    description: "Send a chat message to nearby players",
    usage: "/say [message]",
  })
  sayCommand(player: Server.Player, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /say [message]", "error");
      return;
    }

    this.sendNearbyFaded(player, message, CHAT_DISTANCES.NORMAL, player.name, {
      r: 255,
      g: 255,
      b: 255,
    })
  }

  /**
   * /me [action] - Third-person action (Proximal)
   */
  @Server.Command({
    command: "me",
    description: "Third-person action for nearby players",
    usage: "Usage: /me [action]",
  })
  meCommand(player: Server.Player, action: string) {
    if (!action || action.trim().length === 0) {
      return;
    }

    const message = `* ${player.name} ${action}`;
    this.sendNearbyFaded(player, message, CHAT_DISTANCES.NORMAL, "", { r: 194, g: 162, b: 218 })
  }

  /**
   * /do [description] - Environmental description (Proximal)
   */
  @Server.Command({
    command: "do",
    description: "Environmental description for nearby players",
  })
  doCommand(player: Server.Player, description: string) {
    if (!description || description.trim().length === 0) {
      player.send("Usage: /do [description]", "error");
      return;
    }

    const message = `** ${description} ((${player.name}))`;
    this.sendNearbyFaded(player, message, CHAT_DISTANCES.NORMAL, "", { r: 163, g: 190, b: 140 })
  }

  /**
   * /ooc [message] - Out of character chat
   * Example: /ooc Hello everyone -> "[OOC] John Doe: Hello everyone"
   */
  @Server.Command({ command: "ooc", description: "Out of character chat" })
  oocCommand(player: Server.Player, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /ooc [message]", "error");
      return;
    }

    this.chatService.broadcast(message, `[OOC] ${player.name}`, {
      r: 100,
      g: 149,
      b: 237,
    });
  }

  /**
   * /b [message] - Local out of character chat (Proximal)
   */
  @Server.Command({
    command: "b",
    description: "Local OOC chat for nearby players",
  })
  bCommand(player: Server.Player, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /b [message]", "error");
      return;
    }

    const formattedMessage = `(( ${player.name}: ${message} ))`;
    this.sendNearbyFaded(player, formattedMessage, CHAT_DISTANCES.NORMAL, "", { r: 150, g: 150, b: 150 })
  }

  /**
   * /pm [playerId] [message] - Private message (Global)
   */
  @Server.Command({ command: "pm", description: "Send private message" })
  pmCommand(player: Server.Player, targetId: number, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /pm [playerId] [message]", "error");
      return;
    }

    const targetPlayer = this.playerService.getByClient(targetId);
    if (!targetPlayer) {
      player.send(`Player with ID ${targetId} not found`, "error");
      return;
    }

    // Send to target
    this.chatService.sendPrivate(
      targetPlayer,
      `From ${player.name}: ${message}`,
      "Private Message",
      { r: 255, g: 200, b: 0 }
    );

    // Confirm to sender
    player.send(`To ${targetPlayer.name}: ${message}`, "success");
  }

  /**
   * /clear - Clear your own chat
   */
  @Server.Command({ command: "clear", description: "Clear your chat" })
  clearCommand(player: Server.Player) {
    this.chatService.clearChat(player);
    player.send("Chat cleared", "success");
  }

  /**
   * /shout [message] - Shout (Proximal - Long distance)
   */
  @Server.Command({
    command: "shout",
    description: "Shout message to players in a large area",
  })
  shoutCommand(player: Server.Player, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /shout [message]", "error");
      return;
    }

    const formattedMessage = `${player.name} shouts: ${message}!`;
    this.sendNearbyFaded(player, formattedMessage, CHAT_DISTANCES.SHOUT, "", { r: 255, g: 87, b: 87 })
  }

  /**
   * /whisper [message] - Whisper (Proximal - Short distance)
   */
  @Server.Command({
    command: "whisper",
    description: "Whisper message to very close players",
  })
  whisperCommand(player: Server.Player, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /whisper [message]", "error");
      return;
    }

    const formattedMessage = `${player.name} whispers: ${message}`;
    this.sendNearbyFaded(player, formattedMessage, CHAT_DISTANCES.WHISPER, "", { r: 180, g: 180, b: 180 })
  }

  /**
   * /announce [message] - Admin announcement
   * Example: /announce Server restart in 5 minutes
   */
  @Server.Command({ command: "announce", description: "Admin announcement" })
  @Server.Guard({ rank: 1 }) // Requires admin rank
  announceCommand(player: Server.Player, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /announce [message]", "error");
      return;
    }

    this.chatService.broadcast(message, "📢 ANNOUNCEMENT", {
      r: 255,
      g: 215,
      b: 0,
    });
  }

  /**
   * Export for other resources to send chat messages
   */
  @Server.Export()
  sendChatMessage(
    message: string,
    author: string = "SYSTEM",
    r: number = 255,
    g: number = 255,
    b: number = 255
  ) {
    this.chatService.broadcast(message, author, { r, g, b });
  }
}
