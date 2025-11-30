import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages serves the site from "/naruto-arena-app/", so we need an explicit base
// and we emit the production build into /docs to match the Pages settings.
const base = process.env.VITE_BASE_PATH || '/naruto-arena-app/'

export default defineConfig({
  base,
  plugins: [react()],
})
