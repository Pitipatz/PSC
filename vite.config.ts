import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // ✅ ต้องมีบรรทัดนี้

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ✅ และบรรทัดนี้
  ],
})