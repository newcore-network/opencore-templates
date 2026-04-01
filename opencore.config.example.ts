import { defineConfig } from '@open-core/cli'
import { FiveMClientAdapter } from '@open-core/fivem-adapter/client'
import { FiveMServerAdapter } from '@open-core/fivem-adapter/server'

export default defineConfig({
  name: 'opencore-templates',

  destination: '../build',

  adapter: {
    client: FiveMClientAdapter(),
    server: FiveMServerAdapter(),
  },

  core: {
    path: './core',
    resourceName: 'core',
  },

  resources: {
    include: ['./resources/*'],
  },

  standalones: {
    include: ['./standalones/*'],
  },

  build: {
    logLevel: 'DEBUG', // INFO by default
    minify: true, // If you want to debug the compiled JS, you can set it to 'false' but it makes the build heavier.
    sourceMaps: false, // It's also useful for debugging, but it makes the build very large.
    parallel: true,
    maxWorkers: 8,
  },

  dev: {
    bridge: {
      port: 3847,
    },
    restart: {
      mode: 'auto',
    },
  },
})
