# Deployment follow-up

_Last updated 2026-10-17._

## Completed

- Vercel deployment at `https://kg1.io` with GitHub sign-in and remote Turso
  storage.
- Production baseline migration applied; sign-in verified by Dennis.
- Legacy collection imported and attached to Dennis: 31 cards, 44 reviews, 2
  tags and 2 decks. Imported records, ownership and references verified; Dennis
  confirmed the collection is visible.
- Original local database preserved. One-off import tooling retired; local seed
  owner assignment remains available.

## Remaining checks

- Verify whether the previously noted Turso token rotation was completed.
- Test deployed private collections with two accounts.
- Decide whether to supplement Turso backups with a scheduled external dump.
- Review the preferred Vercel function region (`dub1` was proposed).

See README for ongoing development, deployment and migration commands.
