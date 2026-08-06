import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build output goes directly into ../public so the Hono worker build
// (vite build at project root) picks it up as static assets.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true
  }
})
