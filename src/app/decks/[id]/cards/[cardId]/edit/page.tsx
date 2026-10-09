import { and, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { updateCard } from '@/app/actions';
import { CardForm } from '@/components/card-form';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatAbsolute, formatRelative } from '@/lib/date';
import { cards, db, decks } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function EditCardPage({
  params,
  searchParams,
}: PageProps<'/decks/[id]/cards/[cardId]/edit'>) {
  const { id, cardId } = await params;
  const { from, error } = await searchParams;

  const deckId = Number(id);
  const cardKey = Number(cardId);
  if (!deckId || !cardKey) {
    notFound();
  }

  const [row] = await db
    .select({
      id: cards.id,
      front: cards.front,
      back: cards.back,
      updatedAt: cards.updatedAt,
      deckName: decks.name,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(eq(cards.id, cardKey), eq(cards.deckId, deckId)));

  if (!row) {
    notFound();
  }

  // Where "Cancel" and a successful save go back to — the drill you were in the
  // middle of, or the deck. `updateCard` re-checks it before redirecting.
  const returnTo =
    typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
      ? from
      : `/decks/${deckId}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="-ml-2 self-start"
          nativeButton={false}
          render={<Link href={returnTo} />}
        >
          <ArrowLeft />
          Back
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Edit card</h1>
        <p className="text-sm text-muted-foreground">
          in {row.deckName}
          {row.updatedAt && (
            <>
              {' · '}
              <span title={formatAbsolute(row.updatedAt)}>
                edited {formatRelative(row.updatedAt)}
              </span>
            </>
          )}
        </p>
      </header>

      <CardForm
        action={updateCard}
        fields={{ cardId: row.id, deckId, returnTo }}
        defaultFront={row.front}
        defaultBack={row.back}
        submitLabel="Save changes"
      >
        <Link
          href={returnTo}
          className={buttonVariants({ variant: 'ghost', size: 'lg' })}
        >
          Cancel
        </Link>
        {typeof error === 'string' && (
          <span className="text-sm text-destructive">{error}</span>
        )}
      </CardForm>
    </main>
  );
}
