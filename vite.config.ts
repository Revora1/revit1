import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 3000,
  }
})
