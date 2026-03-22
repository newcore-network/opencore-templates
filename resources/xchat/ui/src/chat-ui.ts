import { CommandHistory } from './components/history'
import { CHAT_CONFIG } from './config'
import { DevTools } from './services/dev-tools'
import type { ChatMessage, ChatSettings, ChatState, LegacyUIMessage, WebViewMessage } from './types'
import { renderTextWithInlineColors, rgbToString } from './utils/colors'
import { formatTime } from './utils/time'

const DEFAULT_VIEW_ID = 'default'
const WEBVIEW_BRIDGE_CALLBACK = '__opencore:webview:message'

export class ChatUI {
  private root: HTMLElement
  private messagesContainer: HTMLElement
  private newIndicator: HTMLButtonElement
  private inputContainer: HTMLElement
  private input: HTMLInputElement
  private settingsContainer: HTMLElement
  private autoHideCheckbox: HTMLInputElement
  private hideDurationInput: HTMLInputElement
  private charCountEl: HTMLElement
  private settingsToggleBtn: HTMLButtonElement

  private isVisible = false
  private isSettingsOpen = false
  private isPinnedToBottom = true
  private newSinceUnpinned = 0
  private messageElements: HTMLElement[] = []
  private history = new CommandHistory()
  private hideTimeout: number | null = null
  private readyAttempts = 0
  private readonly hasRuntimeBridge: boolean

  constructor() {
    const root = document.getElementById('chat-container')
    const messagesContainer = document.getElementById('chat-messages')
    const newIndicator = document.getElementById('chat-new-indicator') as HTMLButtonElement
    const inputContainer = document.getElementById('chat-input-container')
    const input = document.getElementById('chat-input') as HTMLInputElement
    const settingsContainer = document.getElementById('chat-settings')
    const autoHideCheckbox = document.getElementById('setting-autohide') as HTMLInputElement
    const hideDurationInput = document.getElementById('setting-duration') as HTMLInputElement
    const charCountEl = document.getElementById('chat-char-count')
    const settingsToggleBtn = document.getElementById('chat-settings-toggle') as HTMLButtonElement

    if (!root || !messagesContainer || !inputContainer || !settingsContainer || !charCountEl) {
      throw new Error('Required chat elements not found')
    }

    this.root = root
    this.messagesContainer = messagesContainer
    this.newIndicator = newIndicator
    this.inputContainer = inputContainer
    this.input = input
    this.settingsContainer = settingsContainer
    this.autoHideCheckbox = autoHideCheckbox
    this.hideDurationInput = hideDurationInput
    this.charCountEl = charCountEl
    this.settingsToggleBtn = settingsToggleBtn

    this.input.maxLength = CHAT_CONFIG.MAX_INPUT_LENGTH

    this.loadSettings()
    this.setupEventListeners()
    this.setupMessageListener()
    this.updateCharCount()
    this.updateSettingsVisibility()

    const addMsg = (message: Partial<ChatMessage>) =>
      this.addMessage(this.normalizeMessage(message))
    const toggle = (visible: boolean) => this.toggleChat(visible)
    const clear = () => this.clearMessages()

      ; (window as any).ocChatDev = {
        addMessage: addMsg,
        clearChat: clear,
        toggleChat: toggle,
        emit: (type: string, data: any) => window.postMessage({ type, data }, '*'),
        scrollToBottom: () => this.scrollToBottom(true),
      }

    this.hasRuntimeBridge =
      typeof (window as any).__OpenCoreWebView?.emit === 'function' ||
      typeof (window as any).mp?.trigger === 'function' ||
      typeof (window as any).GetParentResourceName === 'function'

    if (!this.hasRuntimeBridge) {
      new DevTools(addMsg, toggle, clear)
    }

    this.resetHideTimer()
    this.notifyRuntimeReady()
  }

  private loadSettings() {
    const saved = localStorage.getItem('chat_settings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        if (settings.autoHide !== undefined) CHAT_CONFIG.AUTO_HIDE_ENABLED = !!settings.autoHide
        if (settings.hideDuration !== undefined) {
          CHAT_CONFIG.AUTO_HIDE_DURATION = Number(settings.hideDuration)
        }
      } catch (error) {
        console.error('Failed to load chat settings', error)
      }
    }

    if (this.autoHideCheckbox) this.autoHideCheckbox.checked = CHAT_CONFIG.AUTO_HIDE_ENABLED
    if (this.hideDurationInput) {
      this.hideDurationInput.value = CHAT_CONFIG.AUTO_HIDE_DURATION.toString()
    }
  }

  private saveSettings() {
    const settings = {
      autoHide: CHAT_CONFIG.AUTO_HIDE_ENABLED,
      hideDuration: CHAT_CONFIG.AUTO_HIDE_DURATION,
    }
    localStorage.setItem('chat_settings', JSON.stringify(settings))
  }

  private updateSettingsVisibility() {
    if (CHAT_CONFIG.ALLOW_PLAYER_SETTINGS) {
      this.settingsToggleBtn.classList.remove('hidden')
    } else {
      this.settingsToggleBtn.classList.add('hidden')
      this.isSettingsOpen = false
      this.settingsContainer.classList.add('hidden')
    }
  }

  private toggleSettings() {
    this.isSettingsOpen = !this.isSettingsOpen
    if (this.isSettingsOpen) {
      this.settingsContainer.classList.remove('hidden')
      this.settingsToggleBtn.classList.add('active')
      this.positionSettingsDropdown()
      return
    }

    this.settingsContainer.classList.add('hidden')
    this.settingsToggleBtn.classList.remove('active')
  }

  private positionSettingsDropdown() {
    const inputRect = this.inputContainer.getBoundingClientRect()
    this.settingsContainer.style.left = `${inputRect.left}px`
    this.settingsContainer.style.top = `${inputRect.bottom + 8}px`
  }

  private resetHideTimer() {
    if (!CHAT_CONFIG.AUTO_HIDE_ENABLED) return

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout)
    }

    if (this.isVisible) {
      this.messagesContainer.classList.remove('chat-fade-out')
      return
    }

    this.messagesContainer.classList.remove('chat-fade-out')
    this.hideTimeout = window.setTimeout(() => {
      if (!this.isVisible) {
        this.messagesContainer.classList.add('chat-fade-out')
      }
    }, CHAT_CONFIG.AUTO_HIDE_DURATION)
  }

  private updateCharCount() {
    const current = this.input.value.length
    const max = CHAT_CONFIG.MAX_INPUT_LENGTH
    this.charCountEl.textContent = `${current} / ${max}`

    if (current >= max) {
      this.charCountEl.style.color = '#ff4444'
    } else if (current >= max * 0.8) {
      this.charCountEl.style.color = '#ffbb33'
    } else {
      this.charCountEl.style.color = ''
    }
  }

  private setupEventListeners() {
    this.messagesContainer.addEventListener('scroll', () => {
      this.updatePinnedState()
      this.resetHideTimer()
    })

    this.newIndicator.addEventListener('click', () => {
      this.scrollToBottom(true)
      this.input.focus()
    })

    this.input.addEventListener('input', () => {
      this.updateCharCount()
    })

    this.settingsToggleBtn.addEventListener('click', () => {
      this.toggleSettings()
    })

    this.input.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        this.sendMessage()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        this.closeChat()
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        const value = this.history.navigate(-1, this.input.value)
        if (value !== null) {
          this.input.value = value
          this.input.setSelectionRange(value.length, value.length)
          this.updateCharCount()
        }
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        const value = this.history.navigate(1, this.input.value)
        if (value !== null) {
          this.input.value = value
          this.input.setSelectionRange(value.length, value.length)
          this.updateCharCount()
        }
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        this.scrollToBottom(true)
      }
    })

    this.autoHideCheckbox.addEventListener('change', () => {
      CHAT_CONFIG.AUTO_HIDE_ENABLED = this.autoHideCheckbox.checked
      this.resetHideTimer()
      this.saveSettings()
      this.emitToGame('chat:settings:update', {
        autoHide: CHAT_CONFIG.AUTO_HIDE_ENABLED,
        hideDuration: CHAT_CONFIG.AUTO_HIDE_DURATION,
      })
    })

    this.hideDurationInput.addEventListener('change', () => {
      const value = parseInt(this.hideDurationInput.value, 10)
      if (!Number.isNaN(value)) {
        CHAT_CONFIG.AUTO_HIDE_DURATION = value
        this.resetHideTimer()
        this.saveSettings()
        this.emitToGame('chat:settings:update', {
          autoHide: CHAT_CONFIG.AUTO_HIDE_ENABLED,
          hideDuration: CHAT_CONFIG.AUTO_HIDE_DURATION,
        })
      }
    })

    if (!this.hasRuntimeBridge) {
      window.addEventListener('keydown', (event) => {
        if ((event.target as { id?: string } | null)?.id === 'chat-input') return
        const key = event.key.toLowerCase()
        if (key === 't' && !this.isVisible) {
          event.preventDefault()
          this.toggleChat(true)
        }
        if (event.key === 'End') this.scrollToBottom(true)
      })
    }
  }

  private setupMessageListener() {
    window.addEventListener('message', (event: MessageEvent<LegacyUIMessage | WebViewMessage>) => {
      const payload = event.data
      if (!payload) return

      if ((payload as WebViewMessage).__opencoreWebView === true) {
        this.handleWebViewMessage(payload as WebViewMessage)
        return
      }

      this.handleLegacyMessage(payload as LegacyUIMessage)
    })
  }

  private handleLegacyMessage(message: LegacyUIMessage) {
    switch (message.type) {
      case 'addMessage':
        this.addMessage(this.normalizeMessage(message.data as Partial<ChatMessage>))
        break
      case 'clearChat':
        this.clearMessages()
        break
      case 'toggleChat':
        this.toggleChat(!!message.data?.visible)
        break
      case 'updateSettings':
        this.applySettings(message.data)
        break
    }
  }

  private handleWebViewMessage(message: WebViewMessage) {
    switch (message.type) {
      case 'show':
        this.toggleChat(true)
        return
      case 'hide':
      case 'destroy':
        this.toggleChat(false)
        return
      case 'create':
        return
    }

    switch (message.action) {
      case 'chat:state':
        this.applyState(message.data as ChatState)
        break
      case 'chat:add-message':
        this.addMessage(this.normalizeMessage(message.data as Partial<ChatMessage>))
        break
      case 'chat:clear':
        this.clearMessages()
        break
      case 'chat:settings':
        this.applySettings(message.data as ChatSettings)
        break
      case 'chat:visibility':
        this.toggleChat(!!message.data?.visible)
        break
      case 'chat:focus-input':
        requestAnimationFrame(() => this.input.focus())
        break
      case 'chat:blur-input':
        this.input.blur()
        break
    }
  }

  private applyState(state?: ChatState) {
    if (!state) return

    this.clearMessages(false)
    for (const message of state.messages ?? []) {
      this.addMessage(this.normalizeMessage(message), false)
    }

    this.applySettings(state.settings)
    this.toggleChat(!!state.visible)
    this.scrollToBottom(true)
  }

  private applySettings(settings?: ChatSettings) {
    if (!settings) return

    if (settings.autoHide !== undefined) {
      CHAT_CONFIG.AUTO_HIDE_ENABLED = !!settings.autoHide
      if (this.autoHideCheckbox) this.autoHideCheckbox.checked = CHAT_CONFIG.AUTO_HIDE_ENABLED
    }

    if (settings.hideDuration !== undefined) {
      CHAT_CONFIG.AUTO_HIDE_DURATION = Number(settings.hideDuration)
      if (this.hideDurationInput) {
        this.hideDurationInput.value = CHAT_CONFIG.AUTO_HIDE_DURATION.toString()
      }
    }

    this.resetHideTimer()
    this.saveSettings()
  }

  private normalizeMessage(message: Partial<ChatMessage>): ChatMessage {
    return {
      author: message.author ?? '',
      message: message.message ?? '',
      color: message.color,
      authorColor: message.authorColor,
      textColor: message.textColor,
      timestamp: message.timestamp ?? Date.now(),
      type: message.type ?? (message.author === 'SYSTEM' ? 'system' : 'chat'),
      trusted: message.trusted ?? false,
    }
  }

  private addMessage(message: ChatMessage, resetTimer = true) {
    if (!message.message) return

    const messageEl = document.createElement('div')
    messageEl.className = 'chat-message'
    if (message.type) messageEl.classList.add(message.type)
    if (message.author === 'SYSTEM') messageEl.classList.add('system')

    const authorColor = message.authorColor ?? message.color
    const textColor = message.textColor ?? message.color

    if (message.author) {
      const authorEl = document.createElement('span')
      authorEl.className = 'author'
      authorEl.textContent = message.author
      if (authorColor) authorEl.style.color = rgbToString(authorColor)
      messageEl.appendChild(authorEl)
      messageEl.appendChild(document.createTextNode(': '))
    }

    const messageTextEl = document.createElement('span')
    messageTextEl.className = 'message-text'
    if (textColor) messageTextEl.style.color = rgbToString(textColor)

    if (CHAT_CONFIG.ENABLE_INLINE_COLOR_CODES && message.trusted) {
      renderTextWithInlineColors(messageTextEl, message.message, textColor)
    } else {
      messageTextEl.textContent = message.message
    }

    messageEl.appendChild(messageTextEl)

    const timestampEl = document.createElement('span')
    timestampEl.className = 'timestamp'
    timestampEl.textContent = formatTime(message.timestamp ?? Date.now())
    messageEl.appendChild(timestampEl)

    this.messagesContainer.appendChild(messageEl)
    this.messageElements.push(messageEl)

    if (this.messageElements.length > CHAT_CONFIG.MAX_VISIBLE_MESSAGES) {
      this.messageElements.shift()?.remove()
    }

    if (this.isPinnedToBottom) {
      this.scrollToBottom(false)
    } else {
      this.newSinceUnpinned++
      this.updateNewIndicator()
    }

    if (resetTimer) {
      this.resetHideTimer()
    }
  }

  private clearMessages(resetTimer = true) {
    this.messagesContainer.innerHTML = ''
    this.messageElements = []
    this.newSinceUnpinned = 0
    this.updateNewIndicator()
    if (resetTimer) {
      this.resetHideTimer()
    }
  }

  private toggleChat(visible: boolean) {
    this.isVisible = visible
    this.resetHideTimer()

    if (visible) {
      this.root.classList.add('chat-open')
      this.inputContainer.hidden = false
      this.updateSettingsVisibility()

      requestAnimationFrame(() => {
        this.scrollToBottom(true)
        this.input.focus()
      })
      this.updatePinnedState()
      this.updateNewIndicator()
      this.updateCharCount()
      return
    }

    this.root.classList.remove('chat-open')
    this.inputContainer.hidden = true
    this.settingsContainer.classList.add('hidden')
    this.isSettingsOpen = false
    this.settingsToggleBtn.classList.remove('active')
    this.history.reset()
  }

  private sendMessage() {
    const message = this.input.value.trim()

    if (message) {
      const submitted = this.emitToGame('chat:submit', { message })
      if (!submitted) return

      this.history.push(message)
      this.input.value = ''
      this.updateCharCount()
      this.history.reset()
    }

    this.resetHideTimer()
    this.closeChat()
  }

  private closeChat() {
    if (!this.emitToGame('chat:close', {})) {
      this.toggleChat(false)
    }
  }

  private updatePinnedState() {
    const distance =
      this.messagesContainer.scrollHeight -
      (this.messagesContainer.scrollTop + this.messagesContainer.clientHeight)
    const pinned = distance <= CHAT_CONFIG.PIN_THRESHOLD_PX

    this.isPinnedToBottom = pinned
    if (pinned) {
      this.newSinceUnpinned = 0
      this.updateNewIndicator()
    }
  }

  private updateNewIndicator() {
    if (this.newSinceUnpinned <= 0) {
      this.newIndicator.classList.add('hidden')
      return
    }

    this.newIndicator.classList.remove('hidden')
    this.newIndicator.textContent = `New messages (${this.newSinceUnpinned}) • Click or End`
  }

  private scrollToBottom(forcePin: boolean) {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
    if (forcePin) {
      this.isPinnedToBottom = true
      this.newSinceUnpinned = 0
      this.updateNewIndicator()
    }
  }

  private notifyRuntimeReady() {
    const emitted = this.emitToGame('chat:ready', { source: 'xchat-ui' })
    if (emitted || this.readyAttempts >= 20) return

    this.readyAttempts += 1
    window.setTimeout(() => this.notifyRuntimeReady(), 150)
  }

  private emitToGame(eventName: string, payload: unknown): boolean {
    const bridge = (
      window as { __OpenCoreWebView?: { emit?: (event: string, payload: unknown) => void } }
    ).__OpenCoreWebView
    if (bridge?.emit) {
      bridge.emit(eventName, payload)
      return true
    }

    const rageMp = window as unknown as {
      mp?: { trigger?: (eventName: string, viewId: string, event: string, payloadJson: string) => void }
    }
    if (typeof rageMp.mp?.trigger === 'function') {
      rageMp.mp.trigger(WEBVIEW_BRIDGE_CALLBACK, DEFAULT_VIEW_ID, eventName, JSON.stringify(payload ?? null))
      return true
    }

    if (
      typeof (window as { GetParentResourceName?: () => string }).GetParentResourceName ===
      'function'
    ) {
      const resourceName = (window as unknown as { GetParentResourceName: () => string }).GetParentResourceName()
      void fetch(`https://${resourceName}/${WEBVIEW_BRIDGE_CALLBACK}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewId: DEFAULT_VIEW_ID,
          event: eventName,
          payload,
        }),
      }).catch((error) => console.error(`Failed to emit ${eventName}:`, error))
      return true
    }

    return false
  }
}
