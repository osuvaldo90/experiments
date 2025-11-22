import db from './database.js';
import { nanoid } from 'nanoid';

class Participant {
  static create(checkId, { name, sessionId }) {
    const id = nanoid();
    const now = Date.now();

    // Check for duplicate names and append number if needed
    const existingStmt = db.prepare(`
      SELECT name FROM participants WHERE check_id = ? AND name LIKE ?
    `);
    const existing = existingStmt.all(checkId, `${name}%`);

    let finalName = name;
    if (existing.length > 0) {
      const exactMatch = existing.find(p => p.name === name);
      if (exactMatch) {
        let counter = 2;
        while (existing.find(p => p.name === `${name} (${counter})`)) {
          counter++;
        }
        finalName = `${name} (${counter})`;
      }
    }

    const stmt = db.prepare(`
      INSERT INTO participants (id, check_id, name, session_id, joined_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, checkId, finalName, sessionId, now);

    return this.findById(id);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM participants WHERE id = ?');
    return stmt.get(id);
  }

  static findByCheckId(checkId) {
    const stmt = db.prepare('SELECT * FROM participants WHERE check_id = ? ORDER BY joined_at ASC');
    return stmt.all(checkId);
  }

  static findBySessionId(sessionId) {
    const stmt = db.prepare('SELECT * FROM participants WHERE session_id = ?');
    return stmt.get(sessionId);
  }

  static updateName(id, name) {
    const stmt = db.prepare('UPDATE participants SET name = ? WHERE id = ?');
    stmt.run(name, id);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM participants WHERE id = ?');
    stmt.run(id);
  }
}

export default Participant;
