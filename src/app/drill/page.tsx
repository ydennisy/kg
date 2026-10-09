import { and, asc, eq, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { DrillCard } from '@/components/drill-card';
import { Markdown } from '@/components/markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatAbsolute, formatRelative } from '@/lib/date';
import { cards, db, decks } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DrillPage({ searchParams }: PageProps<'/drill'>) {
  const { deck, all } = await searchParams;

  const deckId = Number(deck) || null;
  const scope: SQL | undefined = deckId ? eq(cards.deckId, deckId) : undefined;

  // `all` carries the epoch-seconds the session started. In that mode we walk
  // every card in the deck regardless of due date, and a card drops out of the
  // queue once it has been reviewed within this session — so one pass ends.
  const sessionStart = Number(all) ? new Date(Number(all) * 1000) : null;
  const queue = sessionStart
    ? or(isNull(cards.lastReviewedAt), lt(cards.lastReviewedAt, sessionStart))
    : lte(cards.dueAt, new Date());

  const [next] = await db
    .select({
      id: cards.id,
      deckId: cards.deckId,
      front: cards.front,
      back: cards.back,
      deck: decks.name,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(queue, scope))
    .orderBy(asc(cards.dueAt))
    .limit(1);

  const [{ remaining }] = await db
    .select({ remaining: sql<number>`count(*)` })
    .from(cards)
    .where(and(queue, scope));

  const [summary] = await db
    .select({
      total: sql<number>`count(*)`,
      nextDue: sql<
        number | null
      >`min(case when ${cards.dueAt} > unixepoch() then ${cards.dueAt} end)`,
    })
    .from(cards)
    .where(scope);

  const backHref = deckId ? `/decks/${deckId}` : '/';

  // Editing mid-drill should drop you back into the same drill, all-mode and
  // deck filter intact, rather than at the top of the deck.
  const drillParams = new URLSearchParams();
  if (deckId) {
    drillParams.set('deck', String(deckId));
  }
  if (sessionStart) {
    drillParams.set('all', String(all));
  }
  const drillHref = `/drill${drillParams.size ? `?${drillParams}` : ''}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between">
        <Button
          size="sm"
          variant="ghost"
          className="-ml-2"
          nativeButton={false}
          render={<Link href={backHref} />}
        >
          <ArrowLeft />
          Back
        </Button>
        <span className="text-sm tabular-nums text-muted-foreground">
          {remaining} {sessionStart ? 'left' : 'due'}
        </span>
      </header>

      {next ? (
        <DrillCard
          key={next.id}
          cardId={next.id}
          deck={next.deck}
          front={<Markdown>{next.front}</Markdown>}
          back={<Markdown>{next.back}</Markdown>}
          editHref={`/decks/${next.deckId}/cards/${next.id}/edit?from=${encodeURIComponent(drillHref)}`}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-lg font-medium">
              {summary.total === 0
                ? 'No cards here yet.'
                : sessionStart
                  ? `Done — you went through all ${summary.total} ${
                      summary.total === 1 ? 'card' : 'cards'
                    }.`
                  : 'Nothing due. Nice.'}
            </p>
            {summary.nextDue && (
              <p
                className="text-sm text-muted-foreground"
                title={formatAbsolute(new Date(summary.nextDue * 1000))}
              >
                Next card is due{' '}
                {formatRelative(new Date(summary.nextDue * 1000))}.
              </p>
            )}
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={backHref} />}
            >
              Back to {deckId ? 'deck' : 'decks'}
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
