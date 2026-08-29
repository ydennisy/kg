<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Migrations

Always generate **named** migrations, so `drizzle/` reads as a history rather
than a list of random codenames:

```bash
pnpm db:generate --name add_reviews_table
```

# Commits

Use [Conventional Commits](https://www.conventionalcommits.org) (`feat:`,
`fix:`, `chore:`, `refactor:`, `docs:` …). Only commit when explicitly asked —
never as a side effect of finishing a task.

# Databases

`data/dev.db` is scratch; `data/prod.db` holds real cards and must not be lost.
Guards in `src/lib/db/config.ts` enforce the split — read the README's "The two
databases" section before touching anything database-shaped. Never run
`drizzle-kit push` against production, and never reach for `--force` or an
inline `DATABASE_URL` to get past a guard that fires.
