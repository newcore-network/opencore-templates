import { Client } from '@open-core/framework/client'

Client.init({
  mode: 'RESOURCE',
})
  .catch((error: unknown) => {
    console.error(error)
  })
  .then(() => {
    console.log('xchat client initialized!')
  })
