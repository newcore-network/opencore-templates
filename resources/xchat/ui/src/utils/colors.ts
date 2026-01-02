import { RGB } from '../types'

export function rgbToString(color: RGB): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`
}

export function hexToRgb(hex: string): RGB | null {
  const n = parseInt(hex, 16)
  if (Number.isNaN(n)) return null
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/**
 * SA:MP-like inline color parsing: "{RRGGBB}"
 * Example: "hello {FF0000}red{FFFFFF} normal"
 * NOTE: This should only be called for TRUSTED messages from the server
 */
export function renderTextWithInlineColors(target: HTMLElement, text: string, defaultColor?: RGB) {
  const regex = /\{([0-9a-fA-F]{6})\}/g
  let lastIndex = 0
  let currentColor = defaultColor

  const pushSpan = (chunk: string) => {
    if (!chunk) return
    const span = document.createElement('span')
    span.textContent = chunk
    if (currentColor) span.style.color = rgbToString(currentColor)
    target.appendChild(span)
  }

  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const chunk = text.slice(lastIndex, match.index)
    pushSpan(chunk)

    const hex = match[1]
    currentColor = hexToRgb(hex) ?? currentColor
    lastIndex = match.index + match[0].length
  }

  pushSpan(text.slice(lastIndex))
}
