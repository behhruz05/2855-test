import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND =
  process.env.VITE_API_TARGET ||
  'https://2701-tg-back-production.up.railway.app'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api to the real Telegram backend so the browser stays same-origin
    // (avoids the backend's CORS allowlist entirely).
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
