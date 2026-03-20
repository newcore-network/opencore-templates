import type { IClientRuntimeBridge } from '@open-core/framework/contracts/client'

export const CHAT_VIEW_ID = 'default'

declare const mp: unknown

export function resolveChatViewUrl(runtime: IClientRuntimeBridge): string {
  const resourceName = runtime.getCurrentResourceName()
  if (typeof mp !== 'undefined') {
    return `http://package/xchat/ui/index.html`
  }

  return `https://cfx-nui-${resourceName}/ui/index.html`
}
