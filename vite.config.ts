// Compila React e Tailwind; os mocks são carregados antes da árvore da aplicação.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { compressaoDoBuild } from './configuracao/compressao.ts';
export default defineConfig({
  plugins: [react(), tailwindcss(), compressaoDoBuild()],
  server: {
    watch: {
      ignored: [
        '**/playwright-report/**',
        '**/test-results/**',
        '**/relatorios/**',
        '**/output/**',
      ],
    },
  },
  build: { chunkSizeWarningLimit: 800 },
});
