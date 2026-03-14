import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Use absolute paths to ensure assets load correctly on all routes
  publicDir: 'public', // Explicitly set public directory
  server: {
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    copyPublicDir: true, // Explicitly enable copying public directory
  }
})
