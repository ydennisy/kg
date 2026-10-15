# scripts

Database utilities, run by `tsx` through the `pnpm db:*` commands.

| file               | commands                                   | does                                                                                                  |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `db.ts`            | `reset-dev`, `seed`                        | Delete `dev.db` so migrations can rebuild it, or fill it with sample data. Works on local files only. |
| `ownership.ts`     | `import <legacy-file>`, `assign <user-id>` | Copy a legacy database into a fresh, empty one, or attach unowned content to a GitHub user.           |
| `lib/ownership.ts` | —                                          | The import and assign logic, kept separate so the integration tests can call it.                      |

Use the `pnpm` wrappers rather than calling these directly:

```bash
pnpm db:reset                               # reset-dev, migrate, seed
pnpm db:seed
pnpm db:import-legacy[:prod] <legacy-file>
pnpm db:assign-owner[:prod] <user-id>
```

Without `:prod`, the scripts refuse a remote database.
