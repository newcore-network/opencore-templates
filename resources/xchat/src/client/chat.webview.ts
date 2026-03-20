import type { IClientRuntimeBridge } from '@open-core/framework/contracts/client'

export const CHAT_VIEW_ID = 'default'

export function resolveChatViewUrl(runtime: IClientRuntimeBridge): string {
  const resourceName = runtime.getCurrentResourceName()
  if (typeof (globalThis as { mp?: unknown }).mp !== 'undefined') {
    return `package://${resourceName}/ui/index.html`
  }

  return `https://cfx-nui-${resourceName}/ui/index.html`
}
