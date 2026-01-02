import { ChatMessage, RGB } from '../types'
import { hexToRgb } from '../utils/colors'

export class DevTools {
  private panel: HTMLElement | null = null

  constructor(private addMessageCallback: (msg: ChatMessage) => void, private toggleChatCallback: (visible: boolean) => void, private clearMessagesCallback: () => void) {
    this.panel = document.getElementById('chat-dev-panel')
    if (!this.panel) return

    this.setupDevPanel()
    this.setupBrowserTesting()
  }

  private setupBrowserTesting() {
    console.log('[ChatUI] Browser mode: dev helpers enabled. Press T to open chat, F2 for dev panel.')

    this.addMessageCallback({
      author: 'SYSTEM',
      message: '{78BEFF}OpenCore Chat{FFFFFF} • DevMode active (browser)',
      color: { r: 120, g: 190, b: 255 },
      type: 'system',
      trusted: true,
    })

    const originalFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.includes('sendMessage')) {
        const body = JSON.parse((init?.body as string) ?? '{}')
        const msg = String(body.message ?? '')

        setTimeout(() => {
          if (msg.startsWith('/')) {
            this.addMessageCallback({
              author: 'SYSTEM',
              message: `{FFAA00}Command received:{FFFFFF} ${msg}`,
              color: { r: 255, g: 170, b: 0 },
              type: 'system',
              trusted: true,
            })
          } else {
            this.addMessageCallback({
              author: 'You',
              message: msg,
              color: { r: 230, g: 230, b: 230 },
              type: 'chat',
              trusted: false,
            })
          }
        }, 80)

        return Promise.resolve(new Response(JSON.stringify({ ok: true })))
      }

      if (typeof input === 'string' && input.includes('closeChat')) {
        this.toggleChatCallback(false)
        return Promise.resolve(new Response(JSON.stringify({ ok: true })))
      }

      return originalFetch(input, init)
    }
  }

  private setupDevPanel() {
    if (!this.panel) return

    const toggle = () => this.panel!.classList.toggle('hidden')

    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        e.preventDefault()
        toggle()
      }
    })

    this.panel.innerHTML = `
      <div class="dev-title">Chat DevMode</div>
      <div class="dev-row">
        <label>Type</label>
        <select id="dev-type">
          <option value="chat">chat</option>
          <option value="system">system</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
        </select>
      </div>
      <div class="dev-row">
        <label>Author</label>
        <input id="dev-author" value="DevUser" />
      </div>
      <div class="dev-row">
        <label>Color</label>
        <input id="dev-color" value="#FFFFFF" />
      </div>
      <div class="dev-row">
        <label>Msg</label>
        <input id="dev-msg" value="{00FF00}Green{FFFFFF} text with {FF0000}red{FFFFFF} (system only)" />
      </div>
      <div class="dev-actions">
        <button id="dev-send">Send</button>
        <button id="dev-spam">Spam x10</button>
      </div>
      <div class="dev-actions">
        <button id="dev-toggle-chat">Toggle Chat</button>
        <button id="dev-clear">Clear</button>
      </div>
      <div class="dev-hint">
        F2 = panel • API: <code>window.ocChatDev.addMessage({...})</code>
      </div>
    `

    const q = <T extends HTMLElement>(id: string) => this.panel!.querySelector(`#${id}`) as T

    const typeEl = q<HTMLSelectElement>('dev-type')
    const authorEl = q<HTMLInputElement>('dev-author')
    const colorEl = q<HTMLInputElement>('dev-color')
    const msgEl = q<HTMLInputElement>('dev-msg')

    const parseHex = (s: string): RGB | undefined => {
      const m = s.trim().match(/^#?([0-9a-fA-F]{6})$/)
      if (!m) return undefined
      return hexToRgb(m[1]) ?? undefined
    }

    q<HTMLButtonElement>('dev-send').onclick = () => {
      const messageType = typeEl.value as any
      const isTrusted = messageType === 'system' || messageType === 'error' || messageType === 'warning'
      this.addMessageCallback({
        type: messageType,
        author: authorEl.value,
        message: msgEl.value,
        color: parseHex(colorEl.value) ?? { r: 255, g: 255, b: 255 },
        trusted: isTrusted,
      })
    }

    q<HTMLButtonElement>('dev-spam').onclick = () => {
      for (let i = 0; i < 10; i++) {
        this.addMessageCallback({
          author: 'SpamBot',
          message: `{FF5555}Line ${i + 1}{FFFFFF} — flood test.`,
          color: { r: 255, g: 180, b: 80 },
          trusted: true,
        })
      }
    }

    q<HTMLButtonElement>('dev-toggle-chat').onclick = () => this.toggleChatCallback(true)
    q<HTMLButtonElement>('dev-clear').onclick = () => this.clearMessagesCallback()

    this.panel.classList.remove('hidden')
  }
}
