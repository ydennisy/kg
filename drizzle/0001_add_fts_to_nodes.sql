-- Create a standalone FTS index (not using external content)
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  id UNINDEXED,
  title, 
  data,
  tokenize='porter unicode61 remove_diacritics 2',
  prefix='2 3'
);--> statement-breakpoint

-- Keep the FTS index in sync with nodes table
CREATE TRIGGER nodes_after_insert AFTER INSERT ON nodes BEGIN
  INSERT INTO nodes_fts(id, title, data) VALUES (new.id, new.title, new.data);
END;--> statement-breakpoint

CREATE TRIGGER nodes_after_delete AFTER DELETE ON nodes BEGIN
  DELETE FROM nodes_fts WHERE id = old.id;
END;--> statement-breakpoint

CREATE TRIGGER nodes_after_update AFTER UPDATE ON nodes BEGIN
  DELETE FROM nodes_fts WHERE id = old.id;
  INSERT INTO nodes_fts(id, title, data) VALUES (new.id, new.title, new.data);
END;
