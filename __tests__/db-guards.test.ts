import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertDatabaseMatchesEnvironment,
  assertDrizzleTargetIsSafe,
  databaseFile,
  isProductionDatabase,
  PRODUCTION_DB_PATH,
} from '@/lib/db/config';

const PROD = `file:./${PRODUCTION_DB_PATH}`;
const DEV = 'file:./data/dev.db';
const REMOTE = 'libsql://fcards-acme.turso.io';

describe('databaseFile', () => {
  it('resolves a relative file: URL against the working directory', () => {
    expect(databaseFile(DEV)).toBe(path.resolve('data/dev.db'));
  });

  it('accepts an absolute path', () => {
    expect(databaseFile('file:/var/tmp/x.db')).toBe(
      path.resolve('/var/tmp/x.db'),
    );
  });

  it('drops libSQL connection options', () => {
    expect(databaseFile(`${DEV}?mode=ro`)).toBe(path.resolve('data/dev.db'));
  });

  it('returns null for a remote database', () => {
    expect(databaseFile(REMOTE)).toBeNull();
  });
});

describe('isProductionDatabase', () => {
  it.each([
    ['the plain relative path', PROD],
    ['a path without the leading dot', 'file:data/prod.db'],
    ['an absolute path', `file:${path.resolve(PRODUCTION_DB_PATH)}`],
    ['a path that needs normalising', 'file:./data/../data/prod.db'],
    ['a path with connection options', `${PROD}?mode=rw`],
  ])('recognises production through %s', (_label, url) => {
    expect(isProductionDatabase(url)).toBe(true);
  });

  it.each([
    ['the development database', DEV],
    ['a backup', 'file:./data/backups/prod-2026-01-01.db'],
    ['a lookalike name elsewhere', 'file:./prod.db'],
    ['a remote database', REMOTE],
  ])('does not mistake %s for production', (_label, url) => {
    expect(isProductionDatabase(url)).toBe(false);
  });
});

describe('assertDatabaseMatchesEnvironment', () => {
  it('refuses to open production outside NODE_ENV=production', () => {
    expect(() => assertDatabaseMatchesEnvironment(PROD, 'development')).toThrow(
      /production database/,
    );
  });

  it('refuses when NODE_ENV is unset, rather than assuming production', () => {
    expect(() => assertDatabaseMatchesEnvironment(PROD, undefined)).toThrow();
  });

  it('refuses under the test environment too', () => {
    expect(() => assertDatabaseMatchesEnvironment(PROD, 'test')).toThrow();
  });

  it('allows production when production is what was asked for', () => {
    expect(() =>
      assertDatabaseMatchesEnvironment(PROD, 'production'),
    ).not.toThrow();
  });

  it('leaves every other database alone', () => {
    for (const env of ['development', 'test', 'production', undefined]) {
      expect(() => assertDatabaseMatchesEnvironment(DEV, env)).not.toThrow();
      expect(() => assertDatabaseMatchesEnvironment(REMOTE, env)).not.toThrow();
    }
  });
});

describe('assertDrizzleTargetIsSafe', () => {
  it('refuses push against production even when production was asked for', () => {
    expect(() => assertDrizzleTargetIsSafe(PROD, 'production', 'push')).toThrow(
      /Refusing to `drizzle-kit push`/,
    );
  });

  it('refuses push against production from any environment', () => {
    for (const env of ['development', 'test', undefined]) {
      expect(() => assertDrizzleTargetIsSafe(PROD, env, 'push')).toThrow();
    }
  });

  it('refuses any command against production without NODE_ENV=production', () => {
    for (const command of [
      'migrate',
      'generate',
      'studio',
      'drop',
      undefined,
    ]) {
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

  it('allows anything against development, push included', () => {
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
