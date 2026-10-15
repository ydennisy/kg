# Pick up here — deploying to Vercel

_Last updated 2026-10-15._

## Implemented

- GitHub-only Better Auth sign-in, open to any GitHub account; no email
  allowlist.
- Private collections: cards, notes, links, tags and legacy decks have owners.
  Reads and server actions enforce ownership. Reviews inherit it from cards.
- One pre-deployment baseline: `drizzle/0000_initial_schema.sql`.
- Explicit legacy import and owner assignment commands, with preservation and
  isolation tests. Existing unassigned data is invisible until assigned.
- Production targets remote Turso; development targets a scratch SQLite file.
  Development-to-remote and production schema-push guards remain in place.

## Validation

64 tests, typecheck, lint and formatting pass. The production build completes,
but reports missing `BETTER_AUTH_URL` / `BETTER_AUTH_SECRET`; configure these
before testing sign-in. Tests cover cross-user isolation, legacy import
rollback, ID/schedule/review preservation, explicit assignment, and baseline
migration reruns.

## Deployment checklist

- [ ] Back up the existing local `data/prod.db`.
- [ ] Verify Turso is still empty, then `pnpm db:migrate:prod` to apply the
      baseline.
- [ ] `pnpm db:import-legacy:prod data/prod.db` (do not copy the old migration
      journal).
- [ ] Create GitHub OAuth apps for dev and prod, with callback
      `<url>/api/auth/callback/github`.
- [ ] Configure `.env.development.local` for local sign-in.
- [ ] Create the Vercel project and configure `DATABASE_URL`,
      `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
      `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`; set function region `dub1`.
- [ ] Rotate the Turso token previously pasted into chat.
- [ ] Sign in with GitHub, verify your user ID, then run
      `pnpm db:assign-owner:prod <user-id>` (see README).
- [ ] Test deployed sign-in and private collections with two accounts.
- [ ] Decide whether to supplement Turso backups with a scheduled external dump.

The October 14 handoff recorded an empty Turso `kg1` database and local real
content in `data/prod.db` (31 cards, 44 reviews, 2 tags, 2 decks). This has not
been reverified or modified as part of the ownership work. Full OAuth sign-in
still needs real GitHub credentials and deployment testing.
