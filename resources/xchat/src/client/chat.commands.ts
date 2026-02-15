import { sendNUIMessage, setChatFocus } from './chat.nui'

export function registerChatCommands() {
  RegisterCommand(
    '+openchat',
    () => {
      setChatFocus(true)
      sendNUIMessage('toggleChat', { visible: true })
    },
    false,
  )

  RegisterCommand('-openchat', () => {}, false)

  RegisterKeyMapping('+openchat', 'Open Chat', 'keyboard', 'T')

  RegisterCommand(
    'chatconfig',
    (_source: unknown, args: string[]) => {
      const option = args[0]?.toLowerCase()
      const value = args[1]

      if (option === 'autohide') {
        const enabled = value === 'true' || value === '1'
        sendNUIMessage('updateSettings', { autoHide: enabled })
        console.log(`[Chat] Auto-hide ${enabled ? 'enabled' : 'disabled'}`)
        return
      }

      if (option === 'duration') {
        const duration = Number.parseInt(value, 10)
        if (!Number.isNaN(duration)) {
          sendNUIMessage('updateSettings', { hideDuration: duration })
          console.log(`[Chat] Auto-hide duration set to ${duration}ms`)
          return
        }
      }

      console.log('[Chat] Usage: /chatconfig [autohide|duration] [value]')
      console.log('[Chat] Example: /chatconfig autohide true')
      console.log('[Chat] Example: /chatconfig duration 5000')
    },
    false,
  )
}
