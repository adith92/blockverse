import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Vite 8 (Rolldown), Tailwind CSS 4 CSS-first. Existing build outputs remain unchanged.
export default defineConfig({
  plugins: [tailwindcss()],
  server: { port: 5173, strictPort: true, proxy: { '/api/npc': { target: 'http://127.0.0.1:3001' } } },
  preview: { port: 4173 },
  build: { outDir: 'dist', assetsDir: 'assets', sourcemap: false, target: 'es2022' }
});
