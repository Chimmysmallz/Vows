CREATE TABLE IF NOT EXISTS private_records (
 key TEXT PRIMARY KEY NOT NULL,
 value TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 expires INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS private_records_expiry ON private_records(expires) WHERE expires>0;
CREATE TABLE IF NOT EXISTS transaction_guards (
 id TEXT PRIMARY KEY NOT NULL,
 ok INTEGER NOT NULL CHECK(ok=1)
);
