import { db, sql } from '../../lib/db.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    const [countResult, dataResult, categories] = await Promise.all([
      db.query(`SELECT COUNT(*) as total FROM products ${where}`, params),
      db.query(
        `SELECT id, name, stock, category_id FROM products ${where} ORDER BY name ASC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      sql`SELECT id, name FROM categories ORDER BY name ASC`,
    ]);

    return res.json({
      data: dataResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        stock: Number(row.stock) || 0,
        categoryId: row.category_id,
      })),
      categories,
      count: parseInt(countResult.rows[0].total),
    });
  } catch (error) {
    console.error('[products/public] GET error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
