import type { Client } from '@libsql/client';

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
      // Legacy tags are flat, so only a top-level tag can be their twin.
      const existing = await tx.execute({
        sql: 'SELECT id FROM tags WHERE user_id = ? AND name = ? AND parent_id IS NULL',
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
