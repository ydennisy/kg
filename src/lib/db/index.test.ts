import { afterEach, describe, expect, it, vi } from 'vitest';

const DEV = 'file:./data/dev.db';
const PROD = 'libsql://kg-acme.turso.io';

describe('src/lib/db wiring', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('refuses to construct the client when dev points at production', async () => {
    vi.stubEnv('DATABASE_URL', PROD);
    vi.stubEnv('NODE_ENV', 'development');

    await expect(import('@/lib/db')).rejects.toThrow(/Refusing to start/);
  });

  it('still requires DATABASE_URL to be set at all', async () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('NODE_ENV', 'development');

    await expect(import('@/lib/db')).rejects.toThrow(/DATABASE_URL is not set/);
  });

  it('connects when pointed at the development database', async () => {
    vi.stubEnv('DATABASE_URL', DEV);
    vi.stubEnv('NODE_ENV', 'development');

    await expect(import('@/lib/db')).resolves.toHaveProperty('db');
  });
});
