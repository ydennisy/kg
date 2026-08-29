import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Resolves the "@/*" alias from tsconfig.json (native in Vite 7+,
  // replaces the vite-tsconfig-paths plugin the Next.js docs still mention).
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['__tests__/**/*.test.{ts,tsx}'],
  },
});
