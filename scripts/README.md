# scripts

Database utilities, run by `tsx` through the `pnpm db:*` commands.

| file               | commands            | does                                                                                             |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------ |
| `db.ts`            | `reset-dev`, `seed` | Delete the local development database so migrations can rebuild it, or fill it with sample data. |
| `ownership.ts`     | `assign <user-id>`  | Attach unowned local sample content to a signed-in GitHub user. Refuses remote databases.        |
| `lib/ownership.ts` | —                   | Transactional owner assignment and tag merging, covered by integration tests.                    |

```bash
pnpm db:reset
pnpm db:seed
pnpm db:assign-owner <user-id>
```

These commands are for local development only. Production schema changes use
`pnpm db:migrate:prod`; see the root README.
