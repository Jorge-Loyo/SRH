import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // Redirige todas las llamadas /api/* al backend Node.js
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Vercel/CI → dist; local → app/public/spa para que Express lo sirva
    outDir: process.env.VERCEL ? 'dist' : '../app/public/spa',
    emptyOutDir: true,
  },
})
