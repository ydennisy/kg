import { and, eq, sql } from 'drizzle-orm';

import { db, tags } from '@/lib/db';

import {
  ancestors,
  leaf,
  normalizeTagPath,
  parentOf,
  tagPaths,
  within,
  withoutImplied,
} from './tags';

/**
 * The tag tree in the database. Everything above this file speaks in paths;
 * this is where a path turns into `tags` rows and back.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function pathIndex(tx: Tx, userId: string): Promise<Map<string, number>> {
  const rows = await tx
    .select({ id: tags.id, parentId: tags.parentId, name: tags.name })
    .from(tags)
    .where(eq(tags.userId, userId));
  return new Map([...tagPaths(rows)].map(([id, path]) => [path, id]));
}

/** The id for `path`, creating it and any missing ancestors on the way. */
async function ensurePath(
  tx: Tx,
  userId: string,
  index: Map<string, number>,
  path: string,
): Promise<number> {
  let parentId: number | null = null;
  for (const step of [...ancestors(path), path]) {
    let id = index.get(step);
    if (id === undefined) {
      [{ id }] = await tx
        .insert(tags)
        .values({ userId, parentId, name: leaf(step) })
        .returning({ id: tags.id });
      index.set(step, id);
    }
    parentId = id;
  }
  return parentId!;
}

/**
 * Ids for these tag paths, creating whatever does not exist yet. Ancestors
 * a more specific tag implies are dropped, so an item is never filed twice.
 */
export async function tagIds(
  userId: string,
  paths: string[],
): Promise<number[]> {
  const wanted = withoutImplied(paths.map(normalizeTagPath).filter(Boolean));
  if (wanted.length === 0) {
    return [];
  }
  return db.transaction(async (tx) => {
    const index = await pathIndex(tx, userId);
    const ids = [];
    for (const path of wanted) {
      ids.push(await ensurePath(tx, userId, index, path));
    }
    return ids;
  });
}

/**
 * Folds tag `from` into `into`: its items and its children move across, and
 * children that already exist there are folded in turn.
 */
async function merge(tx: Tx, from: number, into: number) {
  for (const [table, column] of [
    ['card_tags', 'card_id'],
    ['note_tags', 'note_id'],
  ] as const) {
    await tx.run(
      sql`INSERT OR IGNORE INTO ${sql.identifier(table)} (${sql.identifier(column)}, tag_id)
          SELECT ${sql.identifier(column)}, ${into} FROM ${sql.identifier(table)} WHERE tag_id = ${from}`,
    );
    await tx.run(
      sql`DELETE FROM ${sql.identifier(table)} WHERE tag_id = ${from}`,
    );
  }
  const children = await tx
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(eq(tags.parentId, from));
  for (const child of children) {
    const [twin] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.parentId, into), eq(tags.name, child.name)));
    if (twin) {
      await merge(tx, child.id, twin.id);
    } else {
      await tx
        .update(tags)
        .set({ parentId: into })
        .where(eq(tags.id, child.id));
    }
  }
  await tx.delete(tags).where(eq(tags.id, from));
}

export type MoveResult =
  { ok: true; path: string } | { ok: false; error: string };

/**
 * Renames or moves a tag, branch and all: `programming/sql` →
 * `programming/databases/sql`. Moving onto a tag that exists merges the two.
 */
export async function moveTag(
  userId: string,
  from: string,
  to: string,
): Promise<MoveResult> {
  const target = normalizeTagPath(to);
  if (!target) {
    return { ok: false, error: 'A tag needs a name' };
  }
  if (target === from) {
    return { ok: true, path: target };
  }
  if (within(target, from)) {
    return { ok: false, error: 'A tag cannot move inside itself' };
  }
  return db.transaction(async (tx) => {
    const index = await pathIndex(tx, userId);
    const id = index.get(from);
    if (id === undefined) {
      return { ok: false, error: 'Tag not found' };
    }
    const existing = index.get(target);
    if (existing !== undefined) {
      await merge(tx, id, existing);
    } else {
      const parent = parentOf(target);
      const parentId = parent
        ? await ensurePath(tx, userId, index, parent)
        : null;
      await tx
        .update(tags)
        .set({ parentId, name: leaf(target) })
        .where(and(eq(tags.id, id), eq(tags.userId, userId)));
    }
    return { ok: true, path: target };
  });
}
