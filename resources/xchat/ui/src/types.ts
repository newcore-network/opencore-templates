export type RGB = { r: number; g: number; b: number }

export interface ChatMessage {
  author?: string
  message: string
  color?: RGB
  authorColor?: RGB
  textColor?: RGB
  timestamp?: number
  type?: 'chat' | 'system' | 'error' | 'warning'
  trusted?: boolean
}

export interface ChatSettings {
  autoHide?: boolean
  hideDuration?: number
}

export interface ChatState {
  visible: boolean
  settings: ChatSettings
  messages: ChatMessage[]
}

export interface LegacyUIMessage {
  type: string
  data: any
}

export interface WebViewMessage {
  __opencoreWebView: true
  type?: 'create' | 'destroy' | 'show' | 'hide'
  viewId?: string
  payload?: unknown
  action?: string
  data?: any
}
