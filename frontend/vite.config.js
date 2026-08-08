import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Mirrors vercel.json's /db-api and /api rewrites for local dev, so
    // the browser sees this same-origin (localhost:5173) both here and
    // in prod — the httpOnly session cookie (SameSite=Lax) only rides
    // along on requests the browser considers same-origin, and `vite
    // dev` doesn't run Vercel's rewrite engine, so without this the
    // cookie would silently never be sent locally.
    proxy: {
      '/db-api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/db-api/, '/db-proxy'),
      },
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
