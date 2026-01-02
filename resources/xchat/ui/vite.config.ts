import { defineConfig } from 'vite'

export default defineConfig({
  root: './',
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  build: {
    outDir: '../../../build/xchat/ui',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
})
