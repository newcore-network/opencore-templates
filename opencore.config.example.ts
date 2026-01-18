import { defineConfig } from '@open-core/cli'

export default defineConfig({
  name: 'opencore-templates',
  destination: 'your test enviroment...', // <- CHANGE

  // OR edit for your core tester
  core: {
    path: './core',
    resourceName: 'core',
  },

  // Auto resource discovery
  resources: {
    include: ['./resources/*'],
  },

  build: {
    logLevel: 'DEBUG', // INFO by default
    minify: true, // If you want to debug the compiled JS, you can set it to 'false' but it makes the build heavier.
    sourceMaps: false, // It's also useful for debugging, but it makes the build very large.
    parallel: true,
    maxWorkers: 8,
  },

  dev: {
    port: 3847,
  },
})
