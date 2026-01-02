import { ChatMessage, NUIMessage } from './types'
import { CHAT_CONFIG } from './config'
import { rgbToString, renderTextWithInlineColors } from './utils/colors'
import { formatTime } from './utils/time'
import { CommandHistory } from './components/history'
import { DevTools } from './services/dev-tools'

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

  constructor() {
    this.root = document.getElementById('chat-container')!
    this.messagesContainer = document.getElementById('chat-messages')!
    this.newIndicator = document.getElementById('chat-new-indicator') as HTMLButtonElement
    this.inputContainer = document.getElementById('chat-input-container')!
    this.input = document.getElementById('chat-input') as HTMLInputElement
    this.settingsContainer = document.getElementById('chat-settings')!
    this.autoHideCheckbox = document.getElementById('setting-autohide') as HTMLInputElement
    this.hideDurationInput = document.getElementById('setting-duration') as HTMLInputElement
    this.charCountEl = document.getElementById('chat-char-count')!
    this.settingsToggleBtn = document.getElementById('chat-settings-toggle') as HTMLButtonElement

    this.input.maxLength = CHAT_CONFIG.MAX_INPUT_LENGTH

    this.loadSettings()
    this.setupEventListeners()
    this.setupNUIListener()
    this.updateCharCount()
    this.updateSettingsVisibility()

    const addMsg = (m: Partial<ChatMessage>) => this.addMessage(this.normalizeMessage(m))
    const toggle = (v: boolean) => this.toggleChat(v)
    const clear = () => this.clearMessages()

    ;(window as any).ocChatDev = {
      addMessage: addMsg,
      clearChat: clear,
      toggleChat: toggle,
      emit: (type: string, data: any) => window.postMessage({ type, data }, '*'),
      scrollToBottom: () => this.scrollToBottom(true),
    }

    if (!(window as any).invokeNative) {
      new DevTools(addMsg, toggle, clear)
    }

    this.resetHideTimer()
  }

  private loadSettings() {
    const saved = localStorage.getItem('chat_settings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        if (settings.autoHide !== undefined) CHAT_CONFIG.AUTO_HIDE_ENABLED = !!settings.autoHide
        if (settings.hideDuration !== undefined) CHAT_CONFIG.AUTO_HIDE_DURATION = Number(settings.hideDuration)
      } catch (e) {
        console.error('Failed to load chat settings', e)
      }
    }

    // Sync UI with config
    if (this.autoHideCheckbox) this.autoHideCheckbox.checked = CHAT_CONFIG.AUTO_HIDE_ENABLED
    if (this.hideDurationInput) this.hideDurationInput.value = CHAT_CONFIG.AUTO_HIDE_DURATION.toString()
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

      // Position dropdown dynamically below input container
      this.positionSettingsDropdown()
    } else {
      this.settingsContainer.classList.add('hidden')
      this.settingsToggleBtn.classList.remove('active')
    }
  }

  private positionSettingsDropdown() {
    const inputRect = this.inputContainer.getBoundingClientRect()

    // Position dropdown below input container with 8px gap
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

    this.input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.sendMessage()
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        this.closeChat()
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const val = this.history.navigate(-1, this.input.value)
        if (val !== null) {
          this.input.value = val
          this.input.setSelectionRange(val.length, val.length)
          this.updateCharCount()
        }
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const val = this.history.navigate(1, this.input.value)
        if (val !== null) {
          this.input.value = val
          this.input.setSelectionRange(val.length, val.length)
          this.updateCharCount()
        }
        return
      }

      if (e.key === 'End') {
        e.preventDefault()
        this.scrollToBottom(true)
        return
      }
    })

    // Settings listeners
    this.autoHideCheckbox.addEventListener('change', () => {
      CHAT_CONFIG.AUTO_HIDE_ENABLED = this.autoHideCheckbox.checked
      this.resetHideTimer()
      this.saveSettings()
    })

    this.hideDurationInput.addEventListener('change', () => {
      const val = parseInt(this.hideDurationInput.value)
      if (!isNaN(val)) {
        CHAT_CONFIG.AUTO_HIDE_DURATION = val
        this.resetHideTimer()
        this.saveSettings()
      }
    })

    window.addEventListener('keydown', (e) => {
      if ((e.target as any)?.id === 'chat-input') return
      const k = e.key.toLowerCase()
      if (k === 't' && !this.isVisible) {
        e.preventDefault()
        this.toggleChat(true)
      }
      if (e.key === 'End') this.scrollToBottom(true)
    })
  }

  private setupNUIListener() {
    window.addEventListener('message', (event: MessageEvent<NUIMessage>) => {
      const { type, data } = event.data
      switch (type) {
        case 'addMessage':
          this.addMessage(this.normalizeMessage(data as Partial<ChatMessage>))
          break
        case 'clearChat':
          this.clearMessages()
          break
        case 'toggleChat':
          this.toggleChat(!!data?.visible)
          break
        case 'updateSettings':
          if (data.autoHide !== undefined) {
            CHAT_CONFIG.AUTO_HIDE_ENABLED = !!data.autoHide
            if (this.autoHideCheckbox) this.autoHideCheckbox.checked = CHAT_CONFIG.AUTO_HIDE_ENABLED
          }
          if (data.hideDuration !== undefined) {
            CHAT_CONFIG.AUTO_HIDE_DURATION = Number(data.hideDuration)
            if (this.hideDurationInput) this.hideDurationInput.value = CHAT_CONFIG.AUTO_HIDE_DURATION.toString()
          }
          this.resetHideTimer()
          this.saveSettings()
          break
      }
    })
  }

  private normalizeMessage(msg: Partial<ChatMessage>): ChatMessage {
    return {
      author: msg.author ?? '',
      message: msg.message ?? '',
      color: msg.color,
      authorColor: msg.authorColor,
      textColor: msg.textColor,
      timestamp: msg.timestamp ?? Date.now(),
      type: msg.type ?? (msg.author === 'SYSTEM' ? 'system' : 'chat'),
      trusted: msg.trusted ?? false,
    }
  }

  private addMessage(msg: ChatMessage) {
    if (!msg.message) return

    const messageEl = document.createElement('div')
    messageEl.className = 'chat-message'
    if (msg.type) messageEl.classList.add(msg.type)
    if (msg.author === 'SYSTEM') messageEl.classList.add('system')

    const authorColor = msg.authorColor ?? msg.color
    const textColor = msg.textColor ?? msg.color

    if (msg.author) {
      const authorEl = document.createElement('span')
      authorEl.className = 'author'
      authorEl.textContent = msg.author
      if (authorColor) authorEl.style.color = rgbToString(authorColor)
      messageEl.appendChild(authorEl)
      messageEl.appendChild(document.createTextNode(': '))
    }

    const messageTextEl = document.createElement('span')
    messageTextEl.className = 'message-text'
    if (textColor) messageTextEl.style.color = rgbToString(textColor)

    if (CHAT_CONFIG.ENABLE_INLINE_COLOR_CODES && msg.trusted) {
      renderTextWithInlineColors(messageTextEl, msg.message, textColor)
    } else {
      messageTextEl.textContent = msg.message
    }

    messageEl.appendChild(messageTextEl)

    const timestampEl = document.createElement('span')
    timestampEl.className = 'timestamp'
    timestampEl.textContent = formatTime(msg.timestamp ?? Date.now())
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

    this.resetHideTimer()
  }

  private clearMessages() {
    this.messagesContainer.innerHTML = ''
    this.messageElements = []
    this.newSinceUnpinned = 0
    this.updateNewIndicator()
    this.resetHideTimer()
  }

  private toggleChat(visible: boolean) {
    this.isVisible = visible
    this.resetHideTimer()

    if (visible) {
      this.root.classList.remove('chat-closed')
      this.root.classList.add('chat-open')
      this.inputContainer.classList.remove('hidden')
      
      this.updateSettingsVisibility()
      
      // Focus but keep existing draft (don't clear input.value)
      requestAnimationFrame(() => {
        this.scrollToBottom(true)
        this.input.focus()
      })
      this.updatePinnedState()
      this.updateNewIndicator()
      this.updateCharCount()
    } else {
      this.root.classList.remove('chat-open')
      this.root.classList.add('chat-closed')
      this.inputContainer.classList.add('hidden')
      this.settingsContainer.classList.add('hidden')
      this.isSettingsOpen = false
      this.settingsToggleBtn.classList.remove('active')
      // Don't clear input.value here either to preserve draft
      this.history.reset()
    }
  }

  private sendMessage() {
    const message = this.input.value.trim()
    if (!message) return

    this.history.push(message)
    this.resetHideTimer()

    const isCommand = message.startsWith('/')

    fetch(`https://${this.getResourceName()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          this.input.value = '' // Clear input ONLY on successful send
          this.updateCharCount()
          this.history.reset()
          if (!isCommand) {
            requestAnimationFrame(() => this.closeChat())
          } else {
            this.input.focus()
          }
        }
      })
      .catch((err) => console.error('Failed to send message:', err))
  }

  private closeChat() {
    fetch(`https://${this.getResourceName()}/closeChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .catch((err) => console.error('Failed to close chat:', err))
  }

  private updatePinnedState() {
    const el = this.messagesContainer
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight)
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

  private getResourceName(): string {
    return (window as any).GetParentResourceName ? (window as any).GetParentResourceName() : 'chat-oc'
  }
}
