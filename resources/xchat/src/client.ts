import { Client } from '@open-core/framework/client'
import './client/chat-ui.controller'

Client.init({
  mode: 'RESOURCE',
})
  .catch((error: unknown) => {
    console.error(error)
  })
  .then(() => {
    console.log('xchat client initialized!')
  })
