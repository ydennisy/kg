'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Shows its children, then fades them out and drops them from the layout.
 * Remount it (a changing `key`) to show the message again.
 */
export function FadingNotice({
  children,
  className,
  after = 4000,
}: {
  children: React.ReactNode;
  className?: string;
  after?: number;
}) {
  const [state, setState] = useState<'shown' | 'fading' | 'gone'>('shown');

  useEffect(() => {
    const timer = setTimeout(() => setState('fading'), after);
    return () => clearTimeout(timer);
  }, [after]);

  if (state === 'gone') {
    return null;
  }

  return (
    <span
      aria-live="polite"
      onTransitionEnd={() => setState('gone')}
      className={cn(
        'transition-opacity duration-700',
        state === 'fading' && 'opacity-0',
        className,
      )}
    >
      {children}
    </span>
  );
}
