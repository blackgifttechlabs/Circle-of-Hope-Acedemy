import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Do not publish source maps: they can reconstruct the original source.
    sourcemap: false,
    // Keep the browser bundle compact and difficult to read.
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: true
  }
})
