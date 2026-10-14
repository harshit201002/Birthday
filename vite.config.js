import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, isPreview }) => ({
  // Serve development at /; build and preview the GitHub Pages project path.
  base: process.env.PAGES_BASE_PATH || (command === 'serve' && !isPreview ? '/' : '/Birthday/'),
  plugins: [react(), tailwindcss()],
}));
