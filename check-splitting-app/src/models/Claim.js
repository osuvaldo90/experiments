import db from './database.js';
import { nanoid } from 'nanoid';

class Claim {
  static create(itemId, participantId) {
    const id = nanoid();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        INSERT INTO claims (id, item_id, participant_id, claimed_at)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(id, itemId, participantId, now);
      return this.findById(id);
    } catch (error) {
      // Handle duplicate claim (item already claimed by this participant)
      if (error.code === 'SQLITE_CONSTRAINT') {
        return null;
      }
      throw error;
    }
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM claims WHERE id = ?');
    return stmt.get(id);
  }

  static findByItemId(itemId) {
    const stmt = db.prepare(`
      SELECT c.*, p.name as participant_name
      FROM claims c
      JOIN participants p ON c.participant_id = p.id
      WHERE c.item_id = ?
      ORDER BY c.claimed_at ASC
    `);
    return stmt.all(itemId);
  }

  static findByParticipantId(participantId) {
    const stmt = db.prepare(`
      SELECT c.*, i.name as item_name, i.price, i.quantity
      FROM claims c
      JOIN items i ON c.item_id = i.id
      WHERE c.participant_id = ?
      ORDER BY c.claimed_at ASC
    `);
    return stmt.all(participantId);
  }

  static deleteByItemAndParticipant(itemId, participantId) {
    const stmt = db.prepare(`
      DELETE FROM claims WHERE item_id = ? AND participant_id = ?
    `);
    const result = stmt.run(itemId, participantId);
    return result.changes > 0;
  }

  static deleteByParticipant(participantId) {
    const stmt = db.prepare('DELETE FROM claims WHERE participant_id = ?');
    stmt.run(participantId);
  }

  static deleteByItem(itemId) {
    const stmt = db.prepare('DELETE FROM claims WHERE item_id = ?');
    stmt.run(itemId);
  }

  static getClaimCounts(checkId) {
    const stmt = db.prepare(`
      SELECT i.id as item_id, COUNT(c.id) as claim_count
      FROM items i
      LEFT JOIN claims c ON i.id = c.item_id
      WHERE i.check_id = ?
      GROUP BY i.id
    `);
    return stmt.all(checkId);
  }
}

export default Claim;
