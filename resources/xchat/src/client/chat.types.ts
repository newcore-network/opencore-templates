export type RGB = { r: number; g: number; b: number }

export interface ChatMessage {
  author: string
  message: string
  color?: RGB
  authorColor?: RGB
  textColor?: RGB
  timestamp: number
  type?: 'chat' | 'system' | 'error' | 'warning'
  trusted?: boolean
}

export interface ChatSettings {
  autoHide: boolean
  hideDuration: number
}

export interface ChatViewState {
  visible: boolean
  settings: ChatSettings
  messages: ChatMessage[]
}
