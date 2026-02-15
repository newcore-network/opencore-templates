export function sendNUIMessage(type: string, data: unknown) {
  SendNUIMessage({
    type,
    data,
  })
}

export function setChatFocus(visible: boolean) {
  SetNuiFocus(visible, visible)
}

export function registerChatCallbacks() {
  RegisterNuiCallback(
    'sendMessage',
    (data: { message?: string }, cb: (response: { ok: boolean }) => void) => {
      const rawMessage = typeof data?.message === 'string' ? data.message : ''
      const message = rawMessage.trim()

      if (!message) {
        cb({ ok: false })
        return
      }

      if (message.startsWith('/')) {
        const [command = '', ...args] = message.slice(1).trim().split(/\s+/)
        if (!command) {
          cb({ ok: false })
          return
        }
        emitNet('core:execute-command', command, args)
      } else {
        emitNet('core:execute-command', 'say', [message])
      }

      cb({ ok: true })
    },
  )

  RegisterNuiCallback('closeChat', (_data: unknown, cb: (response: { ok: boolean }) => void) => {
    setChatFocus(false)
    sendNUIMessage('toggleChat', { visible: false })
    cb({ ok: true })
  })
}
