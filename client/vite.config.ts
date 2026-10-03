import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const workspaceRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

/**
 * Vite configuration for the PUARAI client workspace.
 *
 * - Client builds into `client/dist/public` (see build.outDir below) so the
 *   Express server (`npm run build` at the repo root, then `npm start`)
 *   can serve it as static assets in production.
 * - In development, `/api` requests are proxied to the Express backend
 *   started with `npm run dev:server` (default http://localhost:8787).
 * - server.fs.allow also includes the workspace root because the offline
 *   fallback intentionally imports the shared regulation corpus from
 *   `server/corpus.ts` (see client/src/lib/vectorStore.ts). Both workspaces
 *   install their dependencies at the monorepo root, so no duplicate installs
 *   are created inside client/ or server/.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: false,
    fs: {
      allow: [fileURLToPath(new URL('.', import.meta.url)), workspaceRoot],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});

