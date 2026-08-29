'use client';

import { useEffect, useState } from 'react';

import { gradeCard } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function DrillCard({
  cardId,
  deck,
  front,
  back,
}: {
  cardId: number;
  deck: string;
  front: string;
  back: string;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setRevealed(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [revealed]);

  return (
    <form action={gradeCard} className="flex flex-col gap-4">
      <input type="hidden" name="cardId" value={cardId} />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {deck}
          </span>
          <p className="text-xl font-medium whitespace-pre-wrap">{front}</p>

          <div className="flex min-h-20 items-center border-t border-border pt-4">
            {revealed ? (
              <p className="whitespace-pre-wrap">{back}</p>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="w-full rounded-md border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                Press{' '}
                <kbd className="rounded border border-border bg-muted px-1 font-mono text-xs">
                  Enter
                </kbd>{' '}
                to reveal
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="grade"
          value="again"
          variant="destructive"
          disabled={!revealed}
        >
          Again
        </Button>
        <Button
          type="submit"
          name="grade"
          value="hard"
          variant="secondary"
          disabled={!revealed}
        >
          Hard
        </Button>
        <Button
          type="submit"
          name="grade"
          value="good"
          variant="outline"
          disabled={!revealed}
        >
          Good
        </Button>
        <Button type="submit" name="grade" value="easy" disabled={!revealed}>
          Easy
        </Button>
      </div>
    </form>
  );
}
