import { Client } from "@open-core/framework";
import { ChatMessage } from "./modules/types";
import { sendNUIMessage, setChatFocus } from "./modules/nui.utils";
import { registerChatCallbacks } from "./modules/nui.callbacks";
import { registerChatCommands } from "./modules/commands";

/**
 * Chat UI Controller
 * Handles chat events from server and manages NUI communication
 */
@Client.Controller()
export class ChatUIController {
  private chatVisible = false;
  private messages: ChatMessage[] = [];
  private readonly MAX_MESSAGES = 100;

  constructor() {
    registerChatCallbacks();
    registerChatCommands();
  }

  /**
   * Handle broadcast messages
   * Event: core:chat:message
   */
  @Client.OnNet("core:chat:message")
  handleBroadcast(data: {
    args: [string, string];
    color: { r: number; g: number; b: number };
    type?: "chat" | "system" | "error" | "warning";
  }) {
    const [author, message] = data.args;
    this.addMessage(author, message, data.color, data.type ?? "chat");
  }

  /**
   * Handle private messages
   * Event: core:chat:addMessage
   */
  @Client.OnNet("core:chat:addMessage")
  handlePrivateMessage(data: {
    args: [string, string];
    color: { r: number; g: number; b: number };
    type?: "chat" | "system" | "error" | "warning";
  }) {
    const [author, message] = data.args;
    this.addMessage(author, message, data.color, data.type ?? "chat");
  }

  /**
   * Handle simple notifications (from player.send())
   * Event: core:chat:send
   */
  @Client.OnNet("core:chat:send")
  handleChatSend(
    message: string,
    type: "chat" | "error" | "success" | "warning"
  ) {
    const colorMap = {
      chat: { r: 255, g: 255, b: 255 },
      error: { r: 255, g: 100, b: 100 },
      success: { r: 100, g: 255, b: 100 },
      warning: { r: 255, g: 200, b: 100 },
    };

    const messageType = type === "success" ? "chat" : type;
    this.addMessage("SYSTEM", message, colorMap[type], messageType);
  }

  /**
   * Handle clear chat event
   * Event: core:chat:clear
   */
  @Client.OnNet("core:chat:clear")
  handleClearChat() {
    this.messages = [];
    sendNUIMessage("clearChat", null);
  }

  /**
   * Update chat settings
   * Event: core:chat:updateSettings
   */
  @Client.OnNet("core:chat:updateSettings")
  handleUpdateSettings(settings: { autoHide?: boolean; hideDuration?: number }) {
    sendNUIMessage("updateSettings", settings);
  }

  /**
   * Add a message to the chat
   */
  private addMessage(
    author: string,
    message: string,
    color: { r: number; g: number; b: number },
    type?: "chat" | "system" | "error" | "warning"
  ) {
    const chatMessage: ChatMessage = {
      author,
      message,
      color,
      timestamp: Date.now(),
      type,
      trusted: true,
    };

    this.messages.push(chatMessage);

    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages.shift();
    }

    sendNUIMessage("addMessage", chatMessage);
  }

  /**
   * Toggle chat visibility
   */
  public toggleChat() {
    this.chatVisible = !this.chatVisible;
    sendNUIMessage("toggleChat", { visible: this.chatVisible });
    setChatFocus(this.chatVisible);
  }
}
