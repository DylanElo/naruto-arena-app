import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Prefer an explicit base when provided (e.g., GitHub Pages), otherwise fall back to
// a relative path so the site still loads if assets are served from any subfolder.
const base = process.env.VITE_BASE_PATH
  ? process.env.VITE_BASE_PATH
  : (process.env.NODE_ENV === 'production' ? './' : '/')

export default defineConfig({
  base,
  plugins: [react()],
})
