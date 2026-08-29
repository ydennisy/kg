import { eq, sql } from 'drizzle-orm';
import { ChevronRight, Play, Plus } from 'lucide-react';
import Link from 'next/link';

import { createDeck } from '@/app/actions';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cards, db, decks } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: PageProps<'/'>) {
  const { error } = await searchParams;

  const rows = await db
    .select({
      id: decks.id,
      name: decks.name,
      total: sql<number>`count(${cards.id})`,
      due: sql<number>`coalesce(sum(case when ${cards.dueAt} <= unixepoch() then 1 else 0 end), 0)`,
    })
    .from(decks)
    .leftJoin(cards, eq(cards.deckId, decks.id))
    .groupBy(decks.id)
    .orderBy(sql`${decks.name} collate nocase`);

  const totalCards = rows.reduce((sum, deck) => sum + deck.total, 0);
  const totalDue = rows.reduce((sum, deck) => sum + deck.due, 0);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">fcards</h1>
        <p className="text-sm text-muted-foreground">
          {totalCards === 0
            ? 'No cards yet.'
            : `${totalDue} due now · ${totalCards} ${
                totalCards === 1 ? 'card' : 'cards'
              } · ${rows.length} ${rows.length === 1 ? 'deck' : 'decks'}`}
        </p>
      </header>

      {totalDue > 0 && (
        <div>
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/drill" />}
          >
            <Play />
            Drill {totalDue} due
          </Button>
        </div>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Decks</h2>
          <Dialog>
            <DialogTrigger
              className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
              aria-label="New deck"
            >
              <Plus />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New deck</DialogTitle>
                <DialogDescription>
                  Name it now — you can add cards straight after.
                </DialogDescription>
              </DialogHeader>
              <form action={createDeck} className="flex flex-col gap-4">
                <Input name="name" placeholder="Deck name" autoFocus required />
                <DialogFooter>
                  <DialogClose
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    Cancel
                  </DialogClose>
                  <Button type="submit">Create deck</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {rows.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No decks yet — start one with the + above.
          </p>
        ) : (
          <div className="flex flex-col text-sm">
            <div className="flex items-center gap-4 border-b border-border pb-1 text-xs tracking-wide text-muted-foreground uppercase">
              <span className="flex-1">Deck</span>
              <span className="w-12 text-right">Due</span>
              <span className="w-12 text-right">Cards</span>
              <span className="w-4" />
            </div>
            {rows.map((deck) => (
              <div
                key={deck.id}
                className="border-b border-border last:border-0"
              >
                <Link
                  href={`/decks/${deck.id}`}
                  className="-mx-2 flex items-center gap-4 rounded-md px-2 py-2 hover:bg-muted"
                >
                  <span className="flex-1 truncate">{deck.name}</span>
                  <span
                    className={`w-12 text-right tabular-nums ${
                      deck.due > 0 ? 'font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {deck.due}
                  </span>
                  <span className="w-12 text-right tabular-nums text-muted-foreground">
                    {deck.total}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {typeof error === 'string' && (
        <p className="-mt-4 text-sm text-destructive">{error}</p>
      )}
    </main>
  );
}
