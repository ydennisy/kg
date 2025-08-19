-- Create a standalone FTS index (not using external content)
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  id UNINDEXED,
  title, 
  data,
  tokenize='porter unicode61'
);

-- Keep the FTS index in sync with nodes table
CREATE TRIGGER nodes_after_insert AFTER INSERT ON nodes BEGIN
  INSERT INTO nodes_fts(id, title, data) VALUES (new.id, new.title, new.data);
END;

CREATE TRIGGER nodes_after_delete AFTER DELETE ON nodes BEGIN
  DELETE FROM nodes_fts WHERE id = old.id;
END;

CREATE TRIGGER nodes_after_update AFTER UPDATE ON nodes BEGIN
  DELETE FROM nodes_fts WHERE id = old.id;
  INSERT INTO nodes_fts(id, title, data) VALUES (new.id, new.title, new.data);
END;
