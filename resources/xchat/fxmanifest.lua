fx_version 'cerulean'

games {
    'gta5',
    'rdr3'
}

rdr3_warning 'I acknowledge that this is a proprietary RAGE:MP/RedM software and I am not authorized to modify or distribute it without explicit permission from the authors.'

name 'xchat'
author 'opencore team'
version '1.1.0'

client_scripts {
    'client.js'
}

server_scripts {
    'server.js'
}

ui_page 'ui/index.html'

files {
    'ui/**/*'
}

dependencies {
    'core'
}
