# kg

A personal knowledge base for flashcards, notes, and links, organized with tags
and search. Spaced-repetition reviews schedule when you next see each card.

## Running it

Use Node.js 22.12+, 24, or 26+ (the supported Vitest 5 runtime lines).

```bash
pnpm install
cp .env.example .env.development.local   # fill in the auth variables
pnpm db:reset       # create data/dev.db and fill it with sample cards, notes and links
pnpm dev            # http://localhost:3000
```

Development signs in with GitHub like production does, so it needs its own
GitHub OAuth app (callback `http://localhost:3000/api/auth/callback/github`).
Anyone can sign in with GitHub; each account has a private collection.

## Deploying

Production is Vercel serving the app, with the data in a hosted
[Turso](https://turso.tech) database. Vercel needs these environment variables —
`.env.example` says what each one is:

`DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

Migrations are not run by the deploy. Put the Turso URL and token in
`.env.production.local` and apply them from your machine, before deploying code
that needs them:

```bash
pnpm db:migrate:prod
```

## Private collections and existing data

Cards, notes, links, tags, and legacy decks belong to a user. Every application
read and mutation is scoped to the signed-in account. Reviews and scheduling
belong to the card. Tag names are unique within a user's collection.

The pre-deployment migrations have been squashed into
`drizzle/0000_initial_schema.sql`. **Apply this baseline only to a fresh
database.** Do not run it against an existing database with the old migrations,
or copy the old migration journal into the new database.

To move the existing local collection to a fresh Turso database:

1. Keep `data/prod.db` intact and take a separate backup.
2. Run `pnpm db:migrate:prod` against the empty Turso database.
3. Run `pnpm db:import-legacy:prod data/prod.db`. This reads the source without
   modifying it, copies content and review history in one transaction, preserves
   IDs and schedules, and refuses a destination that already has content. Auth
   records and migration history are not copied.
4. Deploy and sign in with GitHub. Your collection is initially empty.
5. Look up your user ID using this read-only query in the database console:
   `SELECT user.id, user.email, account.account_id FROM user JOIN account ON account.user_id = user.id WHERE account.provider_id = 'github';`
   Verify the account is yours, then run `pnpm db:assign-owner:prod <user-id>`.

Assignment atomically attaches all unassigned content to that existing GitHub
user and merges duplicate tag names. It leaves already-owned content alone.
Unassigned records are preserved but invisible and cannot be edited through the
app; there is no automatic first-user claim. Reviews retain their card links.
Nullable ownership exists only for this import/assignment stage and dev seeds;
new records created by the app always have an owner.

For development, `pnpm db:reset` recreates the scratch database from the
baseline. After signing in, run `pnpm db:assign-owner <user-id>` to attach the
sample data. The commands without `:prod` refuse remote databases. Existing
production data must be imported into a fresh baseline, never reset.

## What a card can hold

Card text is markdown, with math and syntax-highlighted code. You write it in an
editor that formats as you type — `# ` opens a heading, `- ` a list, ` ``` ` a
code block, `$x^2$` inline math, `$$…$$` on its own line display math. There is
no toolbar and nothing to click; the markers are consumed as you type them.

What gets stored is still markdown. The rich text is only how editing feels, so
a card stays greppable, portable, and readable straight out of SQLite:

```
$ sqlite3 data/dev.db "select front from cards limit 1"
# hello
```

Reading and writing deliberately use different machinery pointed at the same
format. The editor is [Tiptap](https://tiptap.dev) and runs in the browser; the
drill and deck pages render markdown to HTML on the server, so **the drill page
ships none of the editor**. Both sides highlight code with the same highlight.js
grammars and set math with the same KaTeX, so a card looks the same being
written as it does being reviewed.

Untrusted-input handling lives in `src/lib/markdown.ts`: content is sanitized
_before_ KaTeX and the highlighter run, so their generated markup never has to
be waved through a sanitizer, and KaTeX runs with `trust: false` so `\href` and
friends cannot emit links. `src/lib/markdown.test.ts` holds it to that.

Cards are editable from the deck list and from the pencil in the top corner of a
card mid-drill; editing returns you to whichever you came from. Editing sets
`cards.updated_at` and deliberately leaves the scheduling alone — fixing a typo
is not a review.

## The two databases

|             | where                 | what it holds                             |
| ----------- | --------------------- | ----------------------------------------- |
| development | `data/dev.db`, a file | scratch. Reset it, break it, no one cares |
| production  | Turso, remote         | **the real cards and review history**     |

So "is this production?" is "is this remote?" — a `file:` URL is development,
anything else is production. Two guards in
[`src/lib/db/config.ts`](src/lib/db/config.ts) hang off that, and
[`src/lib/db/config.test.ts`](src/lib/db/config.test.ts) holds them to it:

**Development can't reach production.** The app refuses to start against a
remote database unless `NODE_ENV` is `production`, and `drizzle.config.ts`
refuses the same for drizzle-kit outside the `:prod` scripts. The easy way to
get this wrong is Turso credentials in `.env.local`, which Next loads in _both_
environments — keep them in `.env.production.local`.

**`push` can't reach production.** `drizzle-kit push` diffs the schema straight
onto the database and will drop a column, and its data, with nothing to review.
Schema changes reach production only as a named migration:

```bash
pnpm db:generate --name add_something   # writes drizzle/NNNN_add_something.sql
pnpm db:migrate                         # try it on dev.db first
pnpm db:migrate:prod                    # then production
```

Backups of production are Turso's: it keeps point-in-time history, and
`turso db shell <db> .dump > backup.sql` takes a copy you hold yourself.

### Database commands

|                                          |                                                     |
| ---------------------------------------- | --------------------------------------------------- |
| `pnpm db:generate --name <what_changed>` | write a named migration from the schema             |
| `pnpm db:migrate`                        | apply migrations to `dev.db`                        |
| `pnpm db:migrate:prod`                   | apply migrations to production                      |
| `pnpm db:studio`                         | browse `dev.db`                                     |
| `pnpm db:studio:prod`                    | browse production — it can edit, so mind your hands |
| `pnpm db:seed`                           | replace `dev.db`'s contents with the sample data    |
| `pnpm db:reset`                          | rebuild `dev.db` from migrations and seed it        |

The seed (in [`scripts/db.ts`](scripts/db.ts)) contains twenty-one cards,
deliberately spread across the states a card can be in — some brand new, some
mid-learning, several already due, one that has been forgotten twice — so that
the deck list, the drill queue and a full-deck pass all have something real to
show without any clicking.

## Toolchain

Database utilities are TypeScript files in `scripts/`, executed by `tsx` through
the `pnpm db:*` commands. `pnpm typecheck` checks these files too; `tsx` runs
them without typechecking.

The scripts have distinct jobs: `dev` / `build` / `start` run the application;
`test` watches while `test:run` runs once; `format` writes while `format:check`
checks. Database generation, migration, inspection, seeding, and reset remain
separate. Import and owner assignment are still needed for first deployment; the
`:prod` variants explicitly select production configuration. The `db:push`
shortcut was removed so schema changes follow the named-migration workflow.

Dependency updates retain ESLint 9 for the React lint plugin's peer range and
the TypeScript 6 compiler API alias for typescript-eslint. KaTeX is pinned to
0.18.10 across the editor and Markdown renderer: Tiptap's math extension does
not yet support 0.19, and 0.18.11 was deprecated for accidental breaking
changes.

The dependency audit still reports two transitive advisories: an older esbuild
inside drizzle-kit's legacy loader (moderate), and braces inside Next's ESLint
plugin (high, no patched release reported). These are upstream tooling
limitations; no incompatible major-version overrides are applied to silence
them.

```bash
pnpm typecheck   # tsc --noEmit, on TypeScript 7
pnpm lint        # eslint
pnpm test        # vitest, watch mode
```

Unit tests live beside the modules they test as `*.test.ts` / `*.test.tsx`.
Cross-module database and ownership tests live in `tests/integration/`, with
their fixtures. Vitest runs in Node.

The two TypeScripts in `package.json` are not a mistake. TypeScript 7 is the
native compiler and ships no JavaScript compiler API, which tools that
`require('typescript')` — typescript-eslint among them — still need. So the
project uses
[the arrangement the TypeScript team recommends](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0):

| in `package.json`    | resolves to               | who uses it                                                      |
| -------------------- | ------------------------- | ---------------------------------------------------------------- |
| `typescript`         | `@typescript/typescript6` | anything importing `typescript`: eslint, Next's build-time check |
| `@typescript/native` | `typescript@7`            | the `tsc` that `pnpm typecheck` runs                             |

Because TypeScript 6 ships its CLI as `tsc6` rather than `tsc`, Next's build
check is pointed at the compiler API instead — that is the lone
`experimental.useTypeScriptCli: false` in `next.config.ts`. Type errors still
fail `pnpm build`. Drop both entries for a plain `"typescript": "^7"` once
typescript-eslint supports it
([issue #10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)).

## Scheduling

Anki's four-button take on SM-2, in [`lib/srs.ts`](lib/srs.ts). Original
[SM-2](https://super-memory.com/english/ol/sm2.htm) grades recall on a 0–5 scale
and derives the ease change from it; Anki collapses that to four buttons and
fixed multipliers, which is what this implements.

Each card carries an **interval** (days until it's next due) and an **ease
factor** (its own difficulty multiplier, starting at 2.5 and floored at 1.3),
plus counters for reps and lapses. A card is _learning_ until a passing answer
graduates it; after that each answer multiplies the interval:

| Grade     | Ease  | While learning      | Once graduated          |
| --------- | ----- | ------------------- | ----------------------- |
| **Again** | −0.2  | back in 10 minutes  | 10 minutes, and a lapse |
| **Hard**  | −0.15 | back in 10 minutes  | `interval × 1.2`        |
| **Good**  | ±0    | graduates at 1 day  | `interval × ease`       |
| **Easy**  | +0.15 | graduates at 4 days | `interval × ease × 1.3` |

`Again` sends a graduated card back to relearning: the interval resets, reps go
to zero and a lapse is recorded. Intervals are rounded to whole days, and a
passing answer always lands at least a day beyond the previous interval — so a
run of `Hard` can't stall a card on one interval forever.

From a new card at the default ease, always answering **Good** gives 1, 3, 8,
20, 50 days; **Easy** runs away at 4, 15, 58, 234, 989 as the ease climbs;
**Hard** crawls at 1, 2, 3, 4, 5 as it falls.

`review()` is pure: it takes the card's current state and returns the next one,
with the clock passed in. That's what makes it testable
([`src/lib/srs.test.ts`](src/lib/srs.test.ts)) and keeps the database out of the
algorithm.

### What you get asked

The drill queue holds cards whose due date has passed. A deck can also be
drilled in full, ignoring due dates — that pass uses each card's
`lastReviewedAt` against the timestamp the session started, so every card comes
up exactly once and the pass ends. Grading during such a pass still moves the
real schedule.
