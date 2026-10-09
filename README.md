# fcards

A minimal spaced-repetition flashcard app. Decks hold cards; drilling a card
schedules when you next see it.

## Running it

```bash
pnpm install
pnpm db:reset       # create data/dev.db and fill it with sample decks
pnpm dev            # development, http://localhost:3000

pnpm db:migrate:prod
pnpm prod           # production, http://localhost:3000
```

`pnpm dev` is the usual Next dev server: hot reload, and a scratch database you
can do anything to. `pnpm prod` backs up the real database, applies any pending
migrations to it, builds, and serves the build — it is the mode the real cards
live in. Production is local for now; nothing here assumes it stays that way. It
starts empty: every card in it got there by being typed into the app.

Once built, `pnpm start` reboots the production server without rebuilding.

## What a card can hold

Card text is markdown, with math and syntax-highlighted code. You write it in an
editor that formats as you type — `# ` opens a heading, `- ` a list, ` ``` ` a
code block, `$x^2$` inline math, `$$…$$` on its own line display math. There is
no toolbar and nothing to click; the markers are consumed as you type them.

What gets stored is still markdown. The rich text is only how editing feels, so
a card stays greppable, portable, and readable straight out of SQLite:

```
$ sqlite3 data/prod.db "select front from cards limit 1"
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
friends cannot emit links. `__tests__/markdown.test.ts` holds it to that.

Cards are editable from the deck list and from the pencil in the top corner of a
card mid-drill; editing returns you to whichever you came from. Editing sets
`cards.updated_at` and deliberately leaves the scheduling alone — fixing a typo
is not a review.

## The two databases

Both are plain SQLite files under `data/`, spoken to through the same libSQL
client that a hosted Turso database would use.

|             | file            | what it holds                                     |
| ----------- | --------------- | ------------------------------------------------- |
| development | `data/dev.db`   | scratch. Reset it, break it, no one cares         |
| production  | `data/prod.db`  | **the real cards and review history**             |
| backups     | `data/backups/` | hourly snapshots of production, thinning with age |

Which one you get is decided by `NODE_ENV`, through Next's own env-file loading:
`.env.development` and `.env.production` are committed (they hold no secrets —
just a path each) so the split is the same for every checkout and survives a
fresh clone. `next dev` runs as `development`; `next build`, `next start` and
the `:prod` scripts run as `production`.

### Why the production data is hard to lose

Four independent things have to go wrong, not one. The first two are code, and
[`__tests__/db-guards.test.ts`](__tests__/db-guards.test.ts) holds them to it —
including the near-misses a naive string comparison would wave through: a backup
file, an absolute path, `data/../data/prod.db`. The other two are arrangement
rather than code.

**Development can't reach it.** `src/lib/db/index.ts` refuses to open the app if
`DATABASE_URL` resolves to `data/prod.db` while `NODE_ENV` isn't `production`,
and `drizzle.config.ts` refuses the same for drizzle-kit. This is worth a guard
rather than trusting configuration because there is a genuinely easy way to get
it wrong: `.env.local` is loaded in _both_ environments, so a `DATABASE_URL`
left in there would silently point development at the real cards. Put
per-environment overrides in `.env.development.local` / `.env.production.local`
instead — never `.env.local`.

**`push` can't reach it.** `drizzle-kit push` diffs the schema straight onto the
database and will drop a column, and the data in it, with nothing to review.
`drizzle.config.ts` rejects it against production outright. Schema changes reach
production only as a named migration:

```bash
pnpm db:generate --name add_something   # writes drizzle/NNNN_add_something.sql
pnpm db:migrate                         # try it on dev.db first
pnpm db:migrate:prod                    # then production, after a backup
```

**It is backed up continuously, and the backups are checked.** Covered in full
below.

**Nothing overwrites it.** `data/` is gitignored, so a checkout, a stash or a
branch switch can never touch it, and no command copies development _over_
production — `db:clone-prod` only runs the other way.

### Backups

The production server snapshots `data/prod.db` when it boots and every hour it
stays up. That covers the whole window in which the data can change, because
nothing writes to production except the production server. On top of that, every
command that is about to write takes its own snapshot first — `db:migrate:prod`,
`db:studio:prod` and `db:restore` all do.

Snapshots use SQLite's `VACUUM INTO` rather than a file copy, so they are
consistent even while the server is mid-write, and each one is opened and run
through `PRAGMA integrity_check` immediately after it is written. A backup
nobody has read is a rumour.

Retention is grandfather-father-son, because a flat "keep the newest N" is the
wrong shape once backups are hourly — a day of them would evict every copy from
before the damage you have only just noticed:

| age          | what is kept          |
| ------------ | --------------------- |
| under 2 days | every hourly snapshot |
| 2–30 days    | one per day           |
| over 30 days | one per week, forever |

Snapshots taken before a specific write are labelled — `…Z-before-migrate.db` —
and retention never prunes those, whatever their age. Without that rule, an
hourly backup landing in the same hour as a bad migration would evict the copy
from just before it. There are only ever a handful of them.
[`__tests__/db-retention.test.ts`](__tests__/db-retention.test.ts) holds the
policy to all of this, including that a year of hourly backups still leaves
something from a year ago.

**Getting data back.** `pnpm db:backups` lists what there is, with what each one
holds, so you are choosing by content rather than by guessing at a timestamp:

```
2026-08-29T16-51-28-328Z                      0m ago    40 KB  1 decks, 1 cards, 0 reviews
2026-08-29T16-49-35-179Z-before-migrate       2m ago    40 KB  0 decks, 0 cards, 0 reviews
```

```bash
pnpm db:restore latest                     # or a timestamp from the list above
```

Restoring verifies the snapshot before trusting it, and saves the file it is
about to replace as a `-before-restore` snapshot — so restoring the wrong one is
undone by restoring again. Stop the production server first; a running server
holds an open handle to the file being swapped out.

**Getting them off this machine.** Everything above still lives on one disk. Set
`BACKUP_MIRROR_DIR` in `.env.production.local` to a synced folder and every
snapshot is copied there and pruned on the same schedule:

```bash
BACKUP_MIRROR_DIR=~/Library/Mobile Documents/com~apple~CloudDocs/fcards-backups
```

A mirror that is unavailable warns and carries on — the local snapshot is
already written, and a missing Dropbox is no reason to fail a backup.

**Backups when the server is not running.** The hourly schedule lives in
[`src/instrumentation.ts`](src/instrumentation.ts) and so only runs while
production is up — which is when the data can change, but not when the disk can
rot. If you want them regardless, `launchd` will run the same command:

```bash
cat > ~/Library/LaunchAgents/dev.fcards.backup.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>dev.fcards.backup</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(which node)</string>
    <string>$PWD/scripts/db.mjs</string>
    <string>backup</string>
  </array>
  <key>WorkingDirectory</key><string>$PWD</string>
  <key>StartInterval</key><integer>3600</integer>
</dict></plist>
PLIST
launchctl load ~/Library/LaunchAgents/dev.fcards.backup.plist
```

Undo it with `launchctl unload` and deleting the file. Nothing in the repo
installs this for you.

### Database commands

|                                          |                                                      |
| ---------------------------------------- | ---------------------------------------------------- |
| `pnpm db:generate --name <what_changed>` | write a named migration from the schema              |
| `pnpm db:migrate`                        | apply migrations to `dev.db`                         |
| `pnpm db:migrate:prod`                   | back up, then apply migrations to `prod.db`          |
| `pnpm db:push`                           | push the schema straight onto `dev.db`, no migration |
| `pnpm db:studio`                         | browse `dev.db`                                      |
| `pnpm db:studio:prod`                    | browse `prod.db` — it can edit, so mind your hands   |
| `pnpm db:backup`                         | snapshot production into `data/backups/`             |
| `pnpm db:backups`                        | list snapshots and what each one holds               |
| `pnpm db:restore <timestamp\|latest>`    | put a snapshot back, saving the current file first   |
| `pnpm db:seed`                           | replace `dev.db`'s contents with the sample decks    |
| `pnpm db:clone-prod`                     | copy production over `dev.db`, to work on real data  |
| `pnpm db:reset`                          | rebuild `dev.db` from migrations and seed it         |

`db:seed`, `db:clone-prod` and `db:reset` are what let development stay
disposable: whatever state you need is one command away, so there is never a
reason to develop against the real thing.

The seed (in [`scripts/db.mjs`](scripts/db.mjs)) is three decks of eighteen
cards, deliberately spread across the states a card can be in — some brand new,
some mid-learning, several already due, one that has been forgotten twice — so
that the deck list, the drill queue and a full-deck pass all have something real
to show without any clicking.

### Moving production off this machine

Put the Turso URL and token in `.env.production.local`, which takes precedence
over the committed `.env.production` and is gitignored. Everything above keeps
working except the commands that manipulate SQLite files directly — `db:backup`,
`db:restore` and `db:clone-prod` — which will tell you to use the Turso CLI.

## Toolchain

```bash
pnpm typecheck   # tsc --noEmit, on TypeScript 7
pnpm lint        # eslint
pnpm test        # vitest, watch mode
```

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
([`__tests__/srs.test.ts`](__tests__/srs.test.ts)) and keeps the database out of
the algorithm.

### What you get asked

The drill queue holds cards whose due date has passed. A deck can also be
drilled in full, ignoring due dates — that pass uses each card's
`lastReviewedAt` against the timestamp the session started, so every card comes
up exactly once and the pass ends. Grading during such a pass still moves the
real schedule.
