import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Ambiente DOM (necessário para sessionStorage em rateLimit.ts)
    environment: 'jsdom',
    // Mocks automáticos para módulos Firebase (evitam inicialização real)
    setupFiles: ['src/__tests__/setup.ts'],
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    // Timeout generoso para processos lentos
    testTimeout: 30000,
    hookTimeout: 30000,
    // Pool inline — evita timeout do worker por conta do Firebase SDK
    pool: 'forks',
    forks: {
      singleFork: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Mocka o JSON de config do Firebase nos testes
      '../firebase-applet-config.json': path.resolve(__dirname, 'src/__tests__/__mocks__/firebase-config.json'),
    },
  },
});
