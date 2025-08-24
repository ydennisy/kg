# TODO.md

## Todos

### Features

- setup project to run dev mode and prod mode

### Random

- rename title to label (?)
- check out open deep wiki for drawing graphs using LLMs
- seed DB with a script

## Questions

- do edges need `metadata`?
- do edges need to `types`?
  - if edges need types, should edges be nodes?
  - or maybe edges need to be their own type of entity in the domain?

## Performance

- add more indices to edges table:

```ts
const edgesTable = sqliteTable(
  'edges',
  {
    id: text('id').primaryKey(),
    fromId: text('from_id') // renamed
      .notNull()
      .references(() => nodesTable.id, { onDelete: 'cascade' }),
    toId: text('to_id') // renamed
      .notNull()
      .references(() => nodesTable.id, { onDelete: 'cascade' }),
    type: text('type', {
      enum: [
        'references',
        'contains',
        'tagged_with',
        'similar_to',
        'responds_to',
      ],
    }),
    isBidirectional: integer('is_bidirectional', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    // For directed edges, prevents duplicates
    unique('edges_unique_directed').on(
      t.fromId,
      t.toId,
      t.type,
      t.isBidirectional
    ),

    // Helpful indexes
    index('edges_from_idx').on(t.fromId),
    index('edges_to_idx').on(t.toId),
    index('edges_type_idx').on(t.type),
  ]
);
```
