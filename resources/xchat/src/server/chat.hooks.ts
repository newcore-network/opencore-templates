import type { ChatSourceSnapshot } from './chat.types'

export interface ChatMessageHookPayload {
  source: ChatSourceSnapshot
  message: string
  command: string
}

export async function notifyChatMessageHooks(payload: ChatMessageHookPayload): Promise<void> {
  TriggerEvent('xchat:onMessage', payload)

  if (payload.source.kind !== 'player' || payload.source.playerClientId === undefined) {
    return
  }

  const npctestState = GetResourceState('npctest')
  if (npctestState !== 'started') {
    return
  }

  try {
    ;(globalThis as Record<string, any>).exports?.npctest?.handleNpcActivationByChat?.(
      payload.source.playerClientId,
      payload.message,
    )
  } catch (error: unknown) {
    console.warn('[xchat] failed to forward chat hook to npctest', error)
  }
}
