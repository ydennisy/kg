import { desc, eq } from 'drizzle-orm';
import { ArrowLeft, Play, Plus, Shuffle } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { formatAbsolute, formatRelative } from '@/lib/date';
import { cards, db, decks } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DeckPage({ params }: PageProps<'/decks/[id]'>) {
  const { id } = await params;

  const deckId = Number(id);
  if (!deckId) {
    notFound();
  }

  const [deck] = await db.select().from(decks).where(eq(decks.id, deckId));
  if (!deck) {
    notFound();
  }

  const deckCards = await db
    .select({
      id: cards.id,
      front: cards.front,
      dueAt: cards.dueAt,
      createdAt: cards.createdAt,
    })
    .from(cards)
    .where(eq(cards.deckId, deckId))
    .orderBy(desc(cards.createdAt), desc(cards.id));

  // `new Date()` rather than `Date.now()`: the page is force-dynamic so either
  // reads the request-time clock, but react-hooks/purity rejects the latter.
  const now = new Date();
  const dueCount = deckCards.filter((card) => card.dueAt <= now).length;
  const sessionStart = Math.floor(now.getTime() / 1000);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="-ml-2 self-start"
          nativeButton={false}
          render={<Link href="/" />}
        >
          <ArrowLeft />
          All decks
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{deck.name}</h1>
        <p className="text-sm text-muted-foreground">
          {deckCards.length === 0
            ? 'No cards yet.'
            : `${dueCount} due now · ${deckCards.length} ${
                deckCards.length === 1 ? 'card' : 'cards'
              }`}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={`/decks/${deck.id}/new`} />}
        >
          <Plus />
          Add card
        </Button>
        {dueCount > 0 && (
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/drill?deck=${deck.id}`} />}
          >
            <Play />
            Drill {dueCount} due
          </Button>
        )}
        {deckCards.length > 0 && (
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/drill?deck=${deck.id}&all=${sessionStart}`} />
            }
          >
            <Shuffle />
            Drill all {deckCards.length}
          </Button>
        )}
      </div>

      {deckCards.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium">Cards</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="pb-1 text-left font-normal">
                  Card
                </th>
                <th scope="col" className="pb-1 text-right font-normal">
                  Added
                </th>
                <th scope="col" className="pb-1 text-right font-normal">
                  Due
                </th>
              </tr>
            </thead>
            <tbody>
              {deckCards.map((card) => (
                <tr
                  key={card.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2">{card.front}</td>
                  <td
                    className="py-2 text-right whitespace-nowrap text-muted-foreground"
                    title={formatAbsolute(card.createdAt)}
                  >
                    {formatRelative(card.createdAt, now)}
                  </td>
                  <td
                    className="py-2 text-right whitespace-nowrap text-muted-foreground"
                    title={formatAbsolute(card.dueAt)}
                  >
                    {card.dueAt <= now
                      ? 'due now'
                      : formatRelative(card.dueAt, now)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
