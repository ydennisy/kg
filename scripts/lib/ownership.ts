import type { Client } from '@libsql/client';

const contentTables = [
  'decks',
  'cards',
  'notes',
  'tags',
  'reviews',
  'card_tags',
  'note_tags',
] as const;

/** Copy legacy content into a fresh baseline. Never copy auth or migration history.
 */
export async function importLegacy(source: Client, target: Client) {
  const read = await source.transaction('read');
  const write = await target.transaction('write');
  try {
    for (const table of contentTables) {
      const result = await write.execute(`SELECT count(*) AS n FROM ${table}`);
      if (Number(result.rows[0].n))
        throw new Error(
          'Destination content must be empty; nothing was imported.',
        );
    }
    const counts: Partial<Record<(typeof contentTables)[number], number>> = {};
    for (const table of contentTables) {
      const result = await read.execute(`SELECT * FROM ${table}`);
      if (result.rows.some((row) => row.user_id != null)) {
        throw new Error(
          'Source contains owned data; this command only imports legacy collections.',
        );
      }
      // Ownership is deliberately assigned separately, after GitHub sign-in.
      const columns = result.columns.filter((column) => column !== 'user_id');
      if (columns.some((column) => !/^[a-z_]+$/.test(column)))
        throw new Error('Unexpected source column');
      for (const row of result.rows) {
        await write.execute({
          sql: `INSERT INTO ${table} (${columns.map((column) => `"${column}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
          args: columns.map((column) => row[column]),
        });
      }
      counts[table] = result.rows.length;
    }
    const violations = await write.execute('PRAGMA foreign_key_check');
    if (violations.rows.length)
      throw new Error('Imported data has broken references');
    await write.commit();
    return counts;
  } finally {
    read.close();
    write.close();
  }
}

/** Assign only unowned content to an existing GitHub user, atomically.
 */
export async function assignOwner(client: Client, userId: string) {
  const tx = await client.transaction('write');
  try {
    const account = await tx.execute({
      sql: "SELECT user.id FROM user JOIN account ON account.user_id = user.id WHERE user.id = ? AND account.provider_id = 'github'",
      args: [userId],
    });
    if (!account.rows.length)
      throw new Error('Sign in with GitHub first and supply that user ID.');
    // Merge legacy tag names with any tags this user has already created.
    const legacyTags = await tx.execute(
      'SELECT id, name FROM tags WHERE user_id IS NULL',
    );
    for (const tag of legacyTags.rows) {
      const existing = await tx.execute({
        sql: 'SELECT id FROM tags WHERE user_id = ? AND name = ?',
        args: [userId, tag.name],
      });
      if (existing.rows.length) {
        for (const [table, parent] of [
          ['card_tags', 'card_id'],
          ['note_tags', 'note_id'],
        ]) {
          await tx.execute({
            sql: `INSERT OR IGNORE INTO ${table} (${parent}, tag_id) SELECT ${parent}, ? FROM ${table} WHERE tag_id = ?`,
            args: [existing.rows[0].id, tag.id],
          });
          await tx.execute({
            sql: `DELETE FROM ${table} WHERE tag_id = ?`,
            args: [tag.id],
          });
        }
        await tx.execute({
          sql: 'DELETE FROM tags WHERE id = ?',
          args: [tag.id],
        });
      } else {
        await tx.execute({
          sql: 'UPDATE tags SET user_id = ? WHERE id = ?',
          args: [userId, tag.id],
        });
      }
    }
    const counts: Record<string, number> = { tags: legacyTags.rows.length };
    for (const table of ['decks', 'cards', 'notes']) {
      const result = await tx.execute({
        sql: `UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`,
        args: [userId],
      });
      counts[table] = result.rowsAffected;
    }
    await tx.commit();
    return counts;
  } finally {
    tx.close();
  }
}
