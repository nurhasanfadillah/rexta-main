import { db } from '../lib/db.js';
import { requireSession } from '../lib/auth-middleware.js';

const mapMaterialFromDB = (row: any) => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  price: Number(row.price) || 0,
  stock: Number(row.stock) || 0,
  updatedAt: row.updated_at,
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
      const search = req.query.search || '';
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (search) {
        params.push(`%${search}%`);
        conditions.push(`name ILIKE $${idx++}`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [countResult, dataResult] = await Promise.all([
        db.query(`SELECT COUNT(*) as total FROM materials ${where}`, params),
        db.query(
          `SELECT * FROM materials ${where} ORDER BY name ASC LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, offset]
        ),
      ]);

      return res.json({
        data: dataResult.rows.map(mapMaterialFromDB),
        count: parseInt(countResult.rows[0].total),
      });
    } catch (error) {
      console.error('[materials] GET error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, name, unit, price, stock } = req.body;
      const result = await db.query(
        `INSERT INTO materials (id, name, unit, price, stock, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [id, name, unit, price || 0, stock || 0]
      );
      return res.json(mapMaterialFromDB(result.rows[0]));
    } catch (error) {
      console.error('[materials] POST error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const { name, unit, price, stock } = req.body;
      const result = await db.query(
        `UPDATE materials SET name=$1, unit=$2, price=$3, stock=$4, updated_at=NOW()
         WHERE id=$5 RETURNING *`,
        [name, unit, price || 0, stock || 0, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Material not found' });
      return res.json(mapMaterialFromDB(result.rows[0]));
    } catch (error) {
      console.error('[materials] PUT error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await db.query(`DELETE FROM materials WHERE id = $1`, [id]);
      return res.json({ success: true });
    } catch (error) {
      console.error('[materials] DELETE error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
