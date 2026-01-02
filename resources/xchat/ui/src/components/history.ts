export class CommandHistory {
  private history: string[] = []
  private cursor: number = -1
  private draft = ''

  push(message: string) {
    // Avoid duplicating consecutive identical messages
    if (this.history.length === 0 || this.history[this.history.length - 1] !== message) {
      this.history.push(message)
      if (this.history.length > 60) this.history.shift()
    }
    this.reset()
  }

  reset() {
    this.cursor = -1
    this.draft = ''
  }

  navigate(delta: -1 | 1, currentValue: string): string | null {
    if (this.history.length === 0) return null

    // First time entering history: save draft
    if (this.cursor === -1) {
      this.draft = currentValue
      this.cursor = this.history.length
    }

    this.cursor += delta
    this.cursor = Math.max(0, Math.min(this.history.length, this.cursor))

    if (this.cursor === this.history.length) {
      return this.draft
    }

    return this.history[this.cursor] ?? ''
  }
}
