import { IconBrandGithub } from '@tabler/icons-react';

import { signInWithGitHub } from './actions';

export default async function SignIn({ searchParams }: PageProps<'/sign-in'>) {
  const { error } = await searchParams;

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4"
      style={{
        fontFamily: 'var(--t-font-family)',
        color: 'var(--t-font-color-primary)',
        background: 'var(--t-background-primary)',
      }}
    >
      <span
        className="flex size-8 items-center justify-center rounded"
        style={{
          background: 'var(--t-background-inverted-primary)',
          color: 'var(--t-font-color-inverted)',
          fontWeight: 600,
        }}
      >
        K
      </span>
      <form action={signInWithGitHub}>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-md border px-4 py-2"
          style={{
            borderColor: 'var(--t-border-color-medium)',
            fontWeight: 'var(--t-font-weight-medium)',
          }}
        >
          <IconBrandGithub size={16} />
          Sign in with GitHub
        </button>
      </form>
      {error && (
        <p style={{ color: 'var(--t-font-color-tertiary)', fontSize: 13 }}>
          Sign-in failed. Try again.
        </p>
      )}
    </main>
  );
}
