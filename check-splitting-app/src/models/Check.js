import db from './database.js';
import { nanoid } from 'nanoid';

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000; // 2 weeks in milliseconds

class Check {
  static create() {
    const id = nanoid();
    const shareCode = nanoid(8).toUpperCase();
    const now = Date.now();
    const expiresAt = now + TWO_WEEKS;

    const stmt = db.prepare(`
      INSERT INTO checks (id, share_code, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, shareCode, now, expiresAt);

    return this.findById(id);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM checks WHERE id = ?');
    return stmt.get(id);
  }

  static findByShareCode(shareCode) {
    const stmt = db.prepare('SELECT * FROM checks WHERE share_code = ?');
    return stmt.get(shareCode.toUpperCase());
  }

  static updateTip(checkId, tipAmount) {
    const stmt = db.prepare(`
      UPDATE checks SET tip_amount = ? WHERE id = ?
    `);
    stmt.run(tipAmount, checkId);
    return this.findById(checkId);
  }

  static finalize(checkId) {
    const now = Date.now();
    const stmt = db.prepare(`
      UPDATE checks SET finalized = 1, finalized_at = ? WHERE id = ?
    `);
    stmt.run(now, checkId);
    return this.findById(checkId);
  }

  static unlock(checkId) {
    const stmt = db.prepare(`
      UPDATE checks SET finalized = 0, finalized_at = NULL WHERE id = ?
    `);
    stmt.run(checkId);
    return this.findById(checkId);
  }

  static delete(checkId) {
    const stmt = db.prepare('DELETE FROM checks WHERE id = ?');
    stmt.run(checkId);
  }

  static cleanupExpired() {
    const now = Date.now();
    const stmt = db.prepare('DELETE FROM checks WHERE expires_at < ?');
    const result = stmt.run(now);
    return result.changes;
  }
}

export default Check;
