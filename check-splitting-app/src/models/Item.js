import db from './database.js';
import { nanoid } from 'nanoid';

class Item {
  static create(checkId, { name, price, quantity = 1, isTax = false, isServiceCharge = false }) {
    const id = nanoid();

    // Get the max position for ordering
    const posStmt = db.prepare('SELECT MAX(position) as max_pos FROM items WHERE check_id = ?');
    const { max_pos } = posStmt.get(checkId);
    const position = (max_pos || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO items (id, check_id, name, price, quantity, is_tax, is_service_charge, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, checkId, name, parseFloat(price), quantity, isTax ? 1 : 0, isServiceCharge ? 1 : 0, position);

    return this.findById(id);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM items WHERE id = ?');
    return stmt.get(id);
  }

  static findByCheckId(checkId) {
    const stmt = db.prepare('SELECT * FROM items WHERE check_id = ? ORDER BY position ASC');
    return stmt.all(checkId);
  }

  static update(id, { name, price, quantity }) {
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(parseFloat(price));
    }
    if (quantity !== undefined) {
      updates.push('quantity = ?');
      values.push(quantity);
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM items WHERE id = ?');
    stmt.run(id);
  }

  static getRegularItems(checkId) {
    const stmt = db.prepare(`
      SELECT * FROM items
      WHERE check_id = ? AND is_tax = 0 AND is_service_charge = 0
      ORDER BY position ASC
    `);
    return stmt.all(checkId);
  }

  static getTaxItems(checkId) {
    const stmt = db.prepare(`
      SELECT * FROM items
      WHERE check_id = ? AND is_tax = 1
      ORDER BY position ASC
    `);
    return stmt.all(checkId);
  }

  static getServiceChargeItems(checkId) {
    const stmt = db.prepare(`
      SELECT * FROM items
      WHERE check_id = ? AND is_service_charge = 1
      ORDER BY position ASC
    `);
    return stmt.all(checkId);
  }
}

export default Item;
