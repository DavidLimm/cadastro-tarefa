import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    // Permite importar ../shared (fora da pasta do workspace).
    fs: { allow: ['..'] },
    // ADR 0004: em dev o front chama /api e o Vite repassa ao back (sem CORS).
    proxy: { '/api': 'http://127.0.0.1:8080' },
  },
});
