import { defineConfig } from '@open-core/cli'

export default defineConfig({
  name: 'opencore-templates',
  outDir: './build',

  destination: 'your test enviroment...', // <- CHANGE

  // OR edit for your core tester
  core: {
    path: './core',
    resourceName: 'core',
    entryPoints: {
      server: './core/src/server.ts',
      client: './core/src/client.ts',
    },
  },

  // This information may not be up to date.
  resources: {
    include: ['./resources/*'],
    explicit: [{
      resourceName: 'xchat',
      path: './resources/xchat',
      build: { sourceMaps: false, nui: true},
      entryPoints: {
        client: './resources/xchat/src/client.ts',
        server: './resources/xchat/src/server.ts'
      },
      views: {
        path: "./resources/xchat/ui",
        framework: 'vanilla'
      },
    }]
  },

  build: {
    minify: true,
    sourceMaps: false,
    target: 'ES2020',
    parallel: true,
    maxWorkers: 8,
  },

  dev: {
    port: 3847,
  }
})
