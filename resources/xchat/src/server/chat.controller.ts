import { Server } from "@open-core/framework";

/**
 * Chat Commands Controller
 * Implements roleplay chat commands: /me, /do, /ooc, /b, /pm
 */
@Server.Controller()
export class ChatController {
  constructor(
    private readonly chatService: Server.ChatService,
    private readonly playerService: Server.PlayerDirectoryPort
  ) {}

  /**
   * /say [message] - Normal chat message
   * Example: /say Hello everyone
   */
  @Server.Command({
    command: "say",
    description: "Send a chat message",
    usage: "/say [message]",
  })
  sayCommand(player: Server.Player, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /say [message]", "error");
      return;
    }

    this.chatService.broadcast(message, player.name, {
      r: 255,
      g: 255,
      b: 255,
    });
  }

  /**
   * /me [action] - Third-person action
   * Example: /me dances -> "* John Doe dances"
   */
  @Server.Command({
    command: "me",
    description: "Third-person action",
    usage: "Usage: /me [action]",
  })
  meCommand(player: Server.Player, action: string) {
    if (!action || action.trim().length === 0) {
      return;
    }

    const message = `* ${player.name} ${action}`;
    this.chatService.broadcast(message, "", { r: 194, g: 162, b: 218 });
  }

  /**
   * /do [description] - Environmental description
   * Example: /do The door is locked -> "** The door is locked ((John Doe))"
   */
  @Server.Command({ command: "do", description: "Environmental description" })
  doCommand(player: Server.Player, description: string) {
    if (!description || description.trim().length === 0) {
      player.send("Usage: /do [description]", "error");
      return;
    }

    const message = `** ${description} ((${player.name}))`;
    this.chatService.broadcast(message, "", { r: 163, g: 190, b: 140 });
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
   * /b [message] - Local out of character chat
   * Example: /b brb -> "(( John Doe: brb ))"
   */
  @Server.Command({ command: "b", description: "Local OOC chat" })
  bCommand(player: Server.Player, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /b [message]", "error");
      return;
    }

    const formattedMessage = `(( ${player.name}: ${message} ))`;
    this.chatService.broadcast(formattedMessage, "", {
      r: 150,
      g: 150,
      b: 150,
    });
  }

  /**
   * /pm [playerId] [message] - Private message
   * Example: /pm 1 hello -> Sends "hello" to player with clientId 1
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
   * /shout [message] - Shout (visible from distance)
   * Example: /shout Help! -> "John Doe shouts: Help!"
   */
  @Server.Command({ command: "shout", description: "Shout message" })
  shoutCommand(player: Server.Player, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /shout [message]", "error");
      return;
    }

    const formattedMessage = `${player.name} shouts: ${message}!`;
    this.chatService.broadcast(formattedMessage, "", { r: 255, g: 87, b: 87 });
  }

  /**
   * /whisper [message] - Whisper (very quiet)
   * Example: /whisper Secret message -> "John Doe whispers: Secret message"
   */
  @Server.Command({ command: "whisper", description: "Whisper message" })
  whisperCommand(player: Server.Player, message: string) {
    if (!message || message.trim().length === 0) {
      player.send("Usage: /whisper [message]", "error");
      return;
    }

    const formattedMessage = `${player.name} whispers: ${message}`;
    this.chatService.broadcast(formattedMessage, "", {
      r: 180,
      g: 180,
      b: 180,
    });
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
