'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

/** Starts the GitHub OAuth flow; GitHub sends the browser back to `/`. */
export async function signInWithGitHub() {
  const { url } = await auth.api.signInSocial({
    body: {
      provider: 'github',
      callbackURL: '/',
      errorCallbackURL: '/sign-in',
    },
  });
  if (!url) {
    throw new Error('Better Auth returned no GitHub authorization URL');
  }
  redirect(url);
}

/** Ends the session and returns to the sign-in page. */
export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect('/sign-in');
}
