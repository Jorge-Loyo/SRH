import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const useMock = process.env.DOTANEITOR_MOCK === undefined
  ? true
  : process.env.DOTANEITOR_MOCK !== '0' && process.env.DOTANEITOR_MOCK !== 'false'

export default defineConfig({
  plugins: [react()],
  define: {
    __DOTANEITOR_USE_MOCK__: JSON.stringify(useMock),
  },
  server: {
    port: 5174,
    proxy: useMock ? undefined : {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})