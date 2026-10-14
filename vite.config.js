import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Actions supplies the Pages path; use / for a root or custom-domain build.
  base: process.env.PAGES_BASE_PATH || '/Birthday/',
  plugins: [react(), tailwindcss()],
});
