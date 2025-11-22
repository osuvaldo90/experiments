import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '../../checks.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS checks (
    id TEXT PRIMARY KEY,
    share_code TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    finalized INTEGER NOT NULL DEFAULT 0,
    tip_amount REAL NOT NULL DEFAULT 0,
    finalized_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    check_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    is_tax INTEGER NOT NULL DEFAULT 0,
    is_service_charge INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (check_id) REFERENCES checks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    check_id TEXT NOT NULL,
    name TEXT NOT NULL,
    session_id TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    FOREIGN KEY (check_id) REFERENCES checks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    claimed_at INTEGER NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    UNIQUE(item_id, participant_id)
  );

  CREATE INDEX IF NOT EXISTS idx_checks_share_code ON checks(share_code);
  CREATE INDEX IF NOT EXISTS idx_items_check_id ON items(check_id);
  CREATE INDEX IF NOT EXISTS idx_participants_check_id ON participants(check_id);
  CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);
  CREATE INDEX IF NOT EXISTS idx_claims_item_id ON claims(item_id);
  CREATE INDEX IF NOT EXISTS idx_claims_participant_id ON claims(participant_id);
`);

export default db;
