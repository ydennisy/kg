import { eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createCard } from '@/app/actions';
import { CardForm } from '@/components/card-form';
import { FadingNotice } from '@/components/fading-notice';
import { SyntaxHelp } from '@/components/syntax-help';
import { Button } from '@/components/ui/button';
import { db, decks } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function NewCardPage({
  params,
  searchParams,
}: PageProps<'/decks/[id]/new'>) {
  const { id } = await params;
  const { added, error } = await searchParams;

  const deckId = Number(id);
  if (!deckId) {
    notFound();
  }

  const [deck] = await db.select().from(decks).where(eq(decks.id, deckId));
  if (!deck) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="-ml-2 self-start"
          nativeButton={false}
          render={<Link href={`/decks/${deck.id}`} />}
        >
          <ArrowLeft />
          {deck.name}
        </Button>
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Add a card</h1>
          <SyntaxHelp />
        </div>
        <p className="text-sm text-muted-foreground">to {deck.name}</p>
      </header>

      <CardForm
        action={createCard}
        fields={{ deckId: deck.id }}
        submitLabel="Add card"
      >
        {typeof added === 'string' && (
          // `added` is the redirect's timestamp, so each save remounts the
          // notice and restarts its fade.
          <FadingNotice key={added} className="text-sm text-muted-foreground">
            Card added — keep going, or head back to the deck.
          </FadingNotice>
        )}
        {typeof error === 'string' && (
          <span className="text-sm text-destructive">{error}</span>
        )}
      </CardForm>
    </main>
  );
}
