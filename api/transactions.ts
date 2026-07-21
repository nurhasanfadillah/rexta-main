import { db } from '../lib/db.js';
import { requireSession } from '../lib/auth-middleware.js';

const mapTransactionFromDB = (row: any) => ({
  id: row.id,
  itemId: row.item_id,
  itemType: row.item_type,
  type: row.type,
  qty: Number(row.qty),
  date: row.date,
  notes: row.notes || null,
  balanceAfter: Number(row.balance_after),
});

export default async function handler(req: any, res: any) {
  try {
    await requireSession(req);
  } catch (e: any) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const { itemId, itemType, dateFrom, dateTo } = req.query;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (itemId) {
        params.push(itemId);
        conditions.push(`item_id = $${idx++}`);
      }
      if (itemType) {
        params.push(itemType);
        conditions.push(`item_type = $${idx++}`);
      }
      if (dateFrom) {
        params.push(dateFrom);
        conditions.push(`date >= $${idx++}`);
      }
      if (dateTo) {
        params.push(dateTo);
        conditions.push(`date <= $${idx++}`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [countResult, dataResult] = await Promise.all([
        db.query(`SELECT COUNT(*) as total FROM transactions ${where}`, params),
        db.query(
          `SELECT * FROM transactions ${where} ORDER BY date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, offset]
        ),
      ]);

      return res.json({
        data: dataResult.rows.map(mapTransactionFromDB),
        count: parseInt(countResult.rows[0].total),
      });
    } catch (error) {
      console.error('[transactions] GET error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, item_id, item_type, type, qty, date, notes, manual_stock } = req.body;

      const rpcResult = await db.query(
        `SELECT process_inventory_transaction($1,$2,$3,$4,$5,$6,$7,$8) as new_stock`,
        [id, item_id, item_type, type, qty, date, notes || null, manual_stock ?? null]
      );

      const newStock = Number(rpcResult.rows[0].new_stock);

      const txResult = await db.query(
        `SELECT * FROM transactions WHERE id = $1`,
        [id]
      );

      return res.json({
        transaction: mapTransactionFromDB(txResult.rows[0]),
        newStock,
      });
    } catch (error) {
      console.error('[transactions] POST error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
