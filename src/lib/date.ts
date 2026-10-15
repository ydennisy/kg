// Relative time, largest unit that fits. Days get `numeric: 'auto'` for
// "yesterday"/"tomorrow"; the coarser units stay numeric, since "in 1 week"
// pins a due date down better than "next week".
const numeric = new Intl.RelativeTimeFormat('en', { numeric: 'always' });
const words = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** "3 days ago", "in 2 hours", "just now". */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const magnitude = Math.abs(seconds);

  if (magnitude < 45) {
    return 'just now';
  }

  for (const [unit, size] of UNITS) {
    if (magnitude >= size) {
      const value = Math.round(seconds / size);
      const format = unit === 'day' && Math.abs(value) === 1 ? words : numeric;
      return format.format(value, unit);
    }
  }

  return numeric.format(Math.round(seconds / 60), 'minute');
}
