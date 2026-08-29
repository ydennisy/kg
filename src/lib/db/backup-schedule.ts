import { spawn } from 'node:child_process';
import path from 'node:path';

const HOUR = 60 * 60 * 1000;

/**
 * Runs `scripts/db.mjs backup` as its own process rather than importing it:
 * one implementation of "back up production" that the CLI and the server both
 * reach, and a backup that cannot take the server down with it if it throws.
 */
function runBackup(): void {
  const script = path.join(process.cwd(), 'scripts', 'db.mjs');
  const child = spawn(process.execPath, [script, 'backup'], {
    stdio: 'inherit',
    detached: false,
  });

  child.on('error', (error) => {
    console.error('[backup] could not start:', error.message);
  });
  child.on('exit', (code) => {
    if (code !== 0) console.error(`[backup] exited with code ${code}`);
  });
}

const scheduled = globalThis as unknown as {
  fcardsBackupTimer?: NodeJS.Timeout;
};

/**
 * Production data can only change while the production server is up, so that
 * is exactly when it is worth snapshotting: once at boot, then hourly. This is
 * the automatic layer — see the README for the launchd agent if you want
 * backups that keep running when the server does not.
 */
export function scheduleBackups(): void {
  if (scheduled.fcardsBackupTimer) return;

  runBackup();

  const timer = setInterval(runBackup, HOUR);
  timer.unref(); // never hold the process open on the backup timer's account
  scheduled.fcardsBackupTimer = timer;
}
