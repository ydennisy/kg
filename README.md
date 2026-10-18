# kg

A personal knowledge base for cards, notes and links. Everything lives on one
search screen, and flashcards come back on a spaced-repetition schedule.

## Using it

- **Search everything.** The box searches titles, note bodies, link summaries,
  keywords, URLs and tags as you type, newest first. Card answers aren't
  searched, so a search doesn't give them away. `/` focuses the box, `Enter`
  opens the top result, `Esc` clears it.
- **Capture fast.** `⌘/Ctrl+Enter` turns whatever you typed into a new item. A
  URL becomes a link. `question? answer` becomes a card, split at the first `?`.
  Anything else becomes a note.
- **Write in markdown.** Cards and notes support math and highlighted code, and
  the editor formats as you type.
- **Tag things.** Tags filter the results and give items a colour.
- **Review.** _Review N_ drills the cards that are due. You can also drill the
  cards in any search or tag. Press `Space` to reveal the answer and `1`–`4` to
  grade it. A card you miss goes to the back of the queue, so the session ends
  once you've recalled every card.

## Running it

Node.js 22.12+, 24, or 26+.

```bash
pnpm install
cp .env.example .env.development.local   # fill in the auth variables
pnpm db:reset                            # create data/dev.db with sample data
pnpm dev                                 # http://localhost:3000
```

Sign-in is GitHub OAuth in both environments, so development needs its own OAuth
app (callback `http://localhost:3000/api/auth/callback/github`). Each account
gets a private collection. To attach the sample data to your account, sign in
and run `pnpm db:assign-owner <user-id>`.

```bash
pnpm typecheck   # tsc, TypeScript 7
pnpm lint        # eslint
pnpm test        # vitest (test:run for a single pass)
```

Unit tests sit beside their modules; cross-module tests live in
`tests/integration/`.

## Link enrichment

Set `TAVILY_API_KEY` and `GROQ_API_KEY` in `.env.development.local` for local
use, and in Vercel environment variables for production. Restart the dev server
after changing keys. These are server-only secrets.

New links and changed URLs use
[Tavily Extract](https://docs.tavily.com/documentation/api-reference/endpoint/extract)
then Groq's `openai/gpt-oss-20b` to create a short factual summary (up to 100
words) and search keywords. Supplied titles are preserved; missing titles use
extracted metadata, then fall back to the domain. Your note and tags remain
separate. Summaries appear when opening links; summaries and keywords are
searchable.

Saving waits for this best-effort attempt (up to 7 seconds for extraction and 12
seconds for summarisation). Missing keys, API errors and rate limits do not
prevent saving. There are no automatic retries. Ordinary edits retain existing
metadata; changing the URL replaces it. Existing links are not backfilled. Only
the URL goes to Tavily; at most 12,000 characters of extracted page content plus
its extracted title go to Groq. Personal notes and tags are not sent.

Apply `0001_add_link_enrichment.sql` through `pnpm db:migrate` locally and
`pnpm db:migrate:prod` before deploying this version.

## The two databases

|             | where                 | holds                                 |
| ----------- | --------------------- | ------------------------------------- |
| development | `data/dev.db`, a file | scratch — reset it freely             |
| production  | Turso, remote         | **the real cards and review history** |

A `file:` URL is development; anything else is production. Guards in
[`src/lib/db/config.ts`](src/lib/db/config.ts) enforce two rules:

- **Development can't reach production.** The app and drizzle-kit refuse a
  remote database outside `NODE_ENV=production`. Keep Turso credentials in
  `.env.production.local`, never `.env.local` (Next loads that in both).
- **`push` can't reach production.** Schema changes ship only as named
  migrations:

```bash
pnpm db:generate --name add_something   # writes drizzle/NNNN_add_something.sql
pnpm db:migrate                         # apply to dev.db first
pnpm db:migrate:prod                    # then production
```

| command                     | does                                      |
| --------------------------- | ----------------------------------------- |
| `pnpm db:studio[:prod]`     | browse the database (prod is editable)    |
| `pnpm db:seed`              | replace `dev.db`'s contents with samples  |
| `pnpm db:reset`             | rebuild `dev.db` from migrations and seed |
| `pnpm db:assign-owner <id>` | attach local sample content to a user     |

Backups are Turso's point-in-time history, or
`turso db shell <db> .dump > backup.sql`.

## Deploying

Vercel serves the app; data lives in Turso. Set these in Vercel (see
`.env.example`):

`DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

Deploys don't run migrations. Run `pnpm db:migrate:prod` from your machine
before shipping code that needs them.

`drizzle/0000_initial_schema.sql` is a squashed baseline — apply it only to a
fresh database. The one-off legacy production import is complete.

## Rendering

What's stored is plain markdown. The editor ([Tiptap](https://tiptap.dev))
exists only to make writing it pleasant. The server renders it for reading,
sanitizing it before KaTeX and the highlighter run
([`src/lib/markdown.ts`](src/lib/markdown.ts)). Editing an item doesn't change
its schedule.

## Scheduling

Anki's four-button SM-2, in [`src/lib/srs.ts`](src/lib/srs.ts). Each card has an
interval and an ease factor (starts at 2.5, floor 1.3):

| grade     | ease  | learning            | graduated               |
| --------- | ----- | ------------------- | ----------------------- |
| **Again** | −0.2  | 10 minutes          | 10 minutes, and a lapse |
| **Hard**  | −0.15 | 10 minutes          | `interval × 1.2`        |
| **Good**  | ±0    | graduates at 1 day  | `interval × ease`       |
| **Easy**  | +0.15 | graduates at 4 days | `interval × ease × 1.3` |

A passing answer always moves the card at least a day past its last interval.
`review()` is pure, with the clock passed in. Every grade updates the real
schedule, including grades given while drilling cards that weren't due.

## Two TypeScripts

`typescript` resolves to TypeScript 6 for tools that need the JS compiler API
(typescript-eslint, Next's build check); `@typescript/native` is TypeScript 7
for `pnpm typecheck`. Collapse to `"typescript": "^7"` once
[typescript-eslint supports it](https://github.com/typescript-eslint/typescript-eslint/issues/10940).
