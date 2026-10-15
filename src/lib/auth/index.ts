import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';

import * as schema from './schema';

/**
 * GitHub sign-in only. `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are read
 * from the environment by Better Auth itself.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  // Lets server actions set the session cookie; must stay last.
  plugins: [nextCookies()],
});

export type User = typeof auth.$Infer.Session.user;

/**
 * The signed-in user, or a redirect to the sign-in page. Every server action
 * and page that touches data calls this: Proxy only checks that a cookie
 * exists, and server actions are reachable as plain POSTs regardless.
 *
 */
export async function requireUser(): Promise<User> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/sign-in');
  }
  return session.user;
}
