import { Server } from '@open-core/framework/server'
import './server/chat.controller'

// Initialize OpenCore in RESOURCE mode
Server.init({
  mode: 'RESOURCE',
  coreResourceName: 'core',
})
  .then(() => {
    console.log('[xchat] Chat system initialized successfully')
  })
  .catch((error: unknown) => {
    console.error('[xchat] Failed to initialize:', error)
  })
