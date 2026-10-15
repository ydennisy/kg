import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertDatabaseMatchesEnvironment,
  assertDrizzleTargetIsSafe,
  isRemoteDatabase,
} from '@/lib/db/config';

const DEV = 'file:./data/dev.db';
const PROD = 'libsql://kg-acme.turso.io';

describe('isRemoteDatabase', () => {
  it.each([
    ['a Turso URL', PROD],
    ['an https URL', 'https://kg-acme.turso.io'],
  ])('treats %s as production', (_label, url) => {
    expect(isRemoteDatabase(url)).toBe(true);
  });

  it.each([
    ['a relative file', DEV],
    ['an absolute file', 'file:/var/tmp/x.db'],
    ['a file with options', `${DEV}?mode=ro`],
  ])('treats %s as local', (_label, url) => {
    expect(isRemoteDatabase(url)).toBe(false);
  });
});

describe('assertDatabaseMatchesEnvironment', () => {
  it.each(['development', 'test', undefined])(
    'refuses production under NODE_ENV=%s',
    (env) => {
      expect(() => assertDatabaseMatchesEnvironment(PROD, env)).toThrow(
        /Refusing to start/,
      );
    },
  );

  it('allows production when production is what was asked for', () => {
    expect(() =>
      assertDatabaseMatchesEnvironment(PROD, 'production'),
    ).not.toThrow();
  });

  it('leaves a local file alone in every environment', () => {
    for (const env of ['development', 'test', 'production', undefined]) {
      expect(() => assertDatabaseMatchesEnvironment(DEV, env)).not.toThrow();
    }
  });
});

describe('assertDrizzleTargetIsSafe', () => {
  it('refuses push against production from any environment', () => {
    for (const env of ['production', 'development', 'test', undefined]) {
      expect(() => assertDrizzleTargetIsSafe(PROD, env, 'push')).toThrow(
        /Refusing to `drizzle-kit push`/,
      );
    }
  });

  it('refuses any command against production without NODE_ENV=production', () => {
    for (const command of ['migrate', 'generate', 'studio', undefined]) {
      expect(() =>
        assertDrizzleTargetIsSafe(PROD, 'development', command),
      ).toThrow(/NODE_ENV is not "production"/);
    }
  });

  it('allows migrating production when production was asked for', () => {
    expect(() =>
      assertDrizzleTargetIsSafe(PROD, 'production', 'migrate'),
    ).not.toThrow();
  });

  it('allows anything against a local file, push included', () => {
    for (const command of ['push', 'migrate', 'generate', 'studio']) {
      expect(() =>
        assertDrizzleTargetIsSafe(DEV, 'development', command),
      ).not.toThrow();
    }
  });
});

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
