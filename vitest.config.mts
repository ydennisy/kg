import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the "@/*" alias from tsconfig.json (native in Vite 7+,
  // replaces the vite-tsconfig-paths plugin the Next.js docs still mention).
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
});
