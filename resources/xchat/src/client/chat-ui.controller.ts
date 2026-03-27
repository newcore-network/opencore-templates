import { Client, WebView } from '@open-core/framework/client'
import { EventsAPI, IClientRuntimeBridge } from '@open-core/framework/contracts/client'
import type { ChatMessage, ChatSettings, ChatViewState } from './chat.types'
import { resolveChatViewUrl } from './chat.webview'
import { SYSTEM_EVENTS } from '@open-core/framework'

const DEFAULT_SETTINGS: ChatSettings = {
  autoHide: true,
  hideDuration: 5000,
}

@Client.Controller()
export class ChatUIController {
  private chatVisible = false
  private chatReady = false
  private readonly messages: ChatMessage[] = []
  private readonly maxMessages = 120
  private settings: ChatSettings = { ...DEFAULT_SETTINGS }

  constructor(
    private readonly events: EventsAPI<'client'>,
    private readonly runtime: IClientRuntimeBridge,
  ) {
    this.ensureWebView()
  }

  @Client.Key('T', 'Open chat')
  openChat(): void {
    this.ensureWebView()

    if (this.chatVisible) {
      WebView.show(true, true)
      this.sendToView('chat:focus-input', null)
      return
    }

    this.chatVisible = true
    WebView.show(true, true)
    this.sendToView('chat:visibility', { visible: true })
  }

  @Client.OnView('chat:ready')
  onReady(): void {
    this.chatReady = true
    this.syncViewState()
  }

  @Client.OnView('chat:submit')
  onSubmit(payload: { message?: string }): void {
    const rawMessage = typeof payload?.message === 'string' ? payload.message : ''
    const message = rawMessage.trim()
    if (!message) return

    this.closeChat()

    if (message.startsWith('/')) {
      const [command = '', ...args] = message.slice(1).trim().split(/\s+/)
      const normalizedArgs = args
        .map((arg) => (typeof arg === 'string' ? arg.trim() : ''))
        .filter((arg) => arg.length > 0)

      if (!command) return
      this.events.emit(SYSTEM_EVENTS.command.execute, command.trim(), normalizedArgs)
    } else {
      this.events.emit(SYSTEM_EVENTS.command.execute, 'say', [message])
    }
  }

  @Client.OnView('chat:close')
  onClose(): void {
    this.closeChat()
  }

  @Client.OnView('chat:settings:update')
  onSettingsUpdate(payload: Partial<ChatSettings>): void {
    if (typeof payload?.autoHide === 'boolean') {
      this.settings.autoHide = payload.autoHide
    }
    if (typeof payload?.hideDuration === 'number' && Number.isFinite(payload.hideDuration)) {
      this.settings.hideDuration = payload.hideDuration
    }

    this.sendToView('chat:settings', this.settings)
  }

  @Client.OnNet(SYSTEM_EVENTS.chat.message)
  handleBroadcast(data: {
    args: [string, string]
    color: { r: number; g: number; b: number }
    type?: 'chat' | 'system' | 'error' | 'warning'
  }): void {
    const [author, message] = data.args
    this.addMessage({
      author,
      message,
      color: data.color,
      authorColor: data.color,
      textColor: data.color,
      timestamp: Date.now(),
      type: data.type ?? 'chat',
      trusted: true,
    })
  }

  @Client.OnNet(SYSTEM_EVENTS.chat.addMessage)
  handlePrivateMessage(data: {
    args: [string, string]
    color: { r: number; g: number; b: number }
    type?: 'chat' | 'system' | 'error' | 'warning'
  }): void {
    const [author, message] = data.args
    this.addMessage({
      author,
      message,
      color: data.color,
      authorColor: data.color,
      textColor: data.color,
      timestamp: Date.now(),
      type: data.type ?? 'chat',
      trusted: true,
    })
  }

  @Client.OnNet(SYSTEM_EVENTS.chat.send)
  handleChatSend(message: string, type: 'chat' | 'error' | 'success' | 'warning'): void {
    const colorMap = {
      chat: { r: 255, g: 255, b: 255 },
      error: { r: 255, g: 100, b: 100 },
      success: { r: 100, g: 255, b: 100 },
      warning: { r: 255, g: 200, b: 100 },
    }

    this.addMessage({
      author: 'SYSTEM',
      message,
      color: colorMap[type],
      authorColor: colorMap[type],
      textColor: colorMap[type],
      timestamp: Date.now(),
      type: type === 'success' ? 'chat' : type,
      trusted: true,
    })
  }

  @Client.OnNet(SYSTEM_EVENTS.chat.clear)
  handleClearChat(): void {
    this.messages.length = 0
    this.sendToView('chat:clear', null)
  }

  @Client.OnNet('core:chat:updateSettings')
  handleUpdateSettings(settings: Partial<ChatSettings>): void {
    this.onSettingsUpdate(settings)
  }

  private ensureWebView(): void {
    if (WebView.exists()) return

    WebView.create(resolveChatViewUrl(this.runtime), {
      visible: true,
      focused: false,
      cursor: false,
      chatMode: true,
    })

    WebView.markAsChat()
  }

  private closeChat(): void {
    this.chatVisible = false
    this.sendToView('chat:visibility', { visible: false })
    this.sendToView('chat:blur-input', null)
    WebView.blur()
  }

  private addMessage(message: ChatMessage): void {
    this.ensureWebView()
    this.messages.push(message)
    if (this.messages.length > this.maxMessages) {
      this.messages.shift()
    }

    this.sendToView('chat:add-message', message)
  }

  private syncViewState(): void {
    const state: ChatViewState = {
      visible: this.chatVisible,
      settings: this.settings,
      messages: [...this.messages],
    }

    this.sendToView('chat:state', state)
  }

  private sendToView(action: string, data: unknown): void {
    if (!this.chatReady) return
    WebView.sendRaw(action, data)
  }
}
