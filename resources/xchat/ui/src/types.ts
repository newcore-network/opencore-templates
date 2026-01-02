export type RGB = { r: number; g: number; b: number }

export interface ChatMessage {
  author?: string
  message: string
  color?: RGB
  authorColor?: RGB
  textColor?: RGB
  timestamp?: number
  type?: 'chat' | 'system' | 'error' | 'warning'
  trusted?: boolean // If true, allow color codes and formatting from server
}

export interface NUIMessage {
  type: string
  data: any
}
