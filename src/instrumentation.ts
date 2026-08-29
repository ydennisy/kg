/**
 * Runs once when a server instance boots. Used here to keep production
 * snapshotted while it is running — see `src/lib/db/backup-schedule.ts`.
 */
export async function register(): Promise<void> {
  // Skip the edge runtime (no child processes) and development (the dev
  // database is disposable, and backing it up hourly would be noise).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production') return;

  const { scheduleBackups } = await import('./lib/db/backup-schedule');
  scheduleBackups();
}
