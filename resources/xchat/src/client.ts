import { Client } from '@open-core/framework';
import './client/chat-ui.controller';

Client.init({
    mode: 'RESOURCE'
}).catch( error => {
    console.error(error)
}).then(()=> {
    console.log('xchat client initialized!')
})
