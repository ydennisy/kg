-- Create a standalone FTS index (not using external content)
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  id UNINDEXED,
  title,
  searchable_content,
  type,
  tokenize='porter unicode61 remove_diacritics 2',
  prefix='2 3'
);
