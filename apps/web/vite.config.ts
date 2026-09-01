import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    // Must mirror tsconfig.app.json paths — Vite resolves modules independently of TypeScript
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Forward all /api/* requests to the Express server so auth cookies are set on
    // the same origin (localhost) as the Vite dev server. This eliminates cross-origin
    // cookie issues in development and means the better-auth client needs no explicit baseURL.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
