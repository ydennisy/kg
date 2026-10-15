'use client';

import { useSyncExternalStore } from 'react';
import { ThemeProvider } from 'twenty-ui';

const query = '(prefers-color-scheme: dark)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * The design system's tokens live under a `.light` or `.dark` class on <html>,
 * which its ThemeProvider sets. This follows the operating system's setting,
 * and our Tailwind dark variants key off the same `.dark` class.
 */
export function Theme({ children }: { children: React.ReactNode }) {
  const dark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
  return (
    <ThemeProvider colorScheme={dark ? 'dark' : 'light'}>
      {children}
    </ThemeProvider>
  );
}
