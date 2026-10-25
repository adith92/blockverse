import { defineConfig } from 'vite';
export default defineConfig({
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
  build: { outDir: 'dist', assetsDir: 'assets', sourcemap: false, target: 'es2022' }
});
