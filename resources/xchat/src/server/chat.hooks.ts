import type { IEngineEvents } from '@open-core/framework/contracts/server'
import type { ChatSourceSnapshot } from './chat.types'

export interface ChatMessageHookPayload {
  source: ChatSourceSnapshot
  message: string
  command: string
}

export function notifyChatMessageHooks(
  engineEvents: IEngineEvents,
  payload: ChatMessageHookPayload,
): void {
  engineEvents.emit('xchat:onMessage', payload)
}
