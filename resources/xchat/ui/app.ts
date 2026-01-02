import { ChatUI } from './src/chat-ui'

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ChatUI())
} else {
  new ChatUI()
}
