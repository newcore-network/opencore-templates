import { sendNUIMessage, setChatFocus } from './nui.utils'

export function registerChatCommands() {
  // Key binding to open chat (T key)
  RegisterCommand(
    '+openchat',
    () => {
      setChatFocus(true)
      sendNUIMessage('toggleChat', { visible: true })
    },
    false,
  )

  RegisterCommand(
    '-openchat',
    () => {
      // Key released
    },
    false,
  )

  RegisterKeyMapping('+openchat', 'Open Chat', 'keyboard', 'T')

  // Command to configure chat settings
  RegisterCommand(
    'chatconfig',
    (_source: any, args: string[]) => {
      const option = args[0]?.toLowerCase()
      const value = args[1]

      if (option === 'autohide') {
        const enabled = value === 'true' || value === '1'
        sendNUIMessage('updateSettings', { autoHide: enabled })
        console.log(`[Chat] Auto-hide ${enabled ? 'enabled' : 'disabled'}`)
      } else if (option === 'duration') {
        const duration = parseInt(value, 10)
        if (!Number.isNaN(duration)) {
          sendNUIMessage('updateSettings', { hideDuration: duration })
          console.log(`[Chat] Auto-hide duration set to ${duration}ms`)
        }
      } else {
        console.log('[Chat] Usage: /chatconfig [autohide|duration] [value]')
        console.log('[Chat] Example: /chatconfig autohide true')
        console.log('[Chat] Example: /chatconfig duration 5000')
      }
    },
    false,
  )
}
