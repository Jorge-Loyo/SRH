import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isVercel = process.env.VERCEL === '1'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Vercel buildea el frontend solo → dist/
    // Local/Docker → app/public/spa/ para que Express lo sirva
    outDir: isVercel ? 'dist' : '../app/public/spa',
    emptyOutDir: true,
  },
})
