import { db } from '../lib/db.js';
import { requireSession } from '../lib/auth-middleware.js';

const mapProductFromDB = (row: any) => ({
  id: row.id,
  name: row.name,
  categoryId: row.category_id,
  priceCMT: Number(row.price_cmt) || 0,
  hpp: Number(row.hpp) || 0,
  stock: Number(row.stock) || 0,
  updatedAt: row.updated_at,
  isFavorite: row.is_favorite || false,
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
      const categoryId = req.query.categoryId || '';
      const onlyFavorites = req.query.onlyFavorites === 'true';
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (search) {
        params.push(`%${search}%`);
        conditions.push(`name ILIKE $${idx++}`);
      }
      if (categoryId && categoryId !== 'SEMUA') {
        params.push(categoryId);
        conditions.push(`category_id = $${idx++}`);
      }
      if (onlyFavorites) {
        conditions.push(`is_favorite = true`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const [countResult, dataResult] = await Promise.all([
        db.query(`SELECT COUNT(*) as total FROM products ${where}`, params),
        db.query(
          `SELECT * FROM products ${where} ORDER BY name ASC LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, offset]
        ),
      ]);

      return res.json({
        data: dataResult.rows.map(mapProductFromDB),
        count: parseInt(countResult.rows[0].total),
      });
    } catch (error) {
      console.error('[products] GET error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, name, category_id, price_cmt, hpp, stock, is_favorite } = req.body;
      const result = await db.query(
        `INSERT INTO products (id, name, category_id, price_cmt, hpp, stock, is_favorite, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
        [id, name, category_id, price_cmt || 0, hpp || 0, stock || 0, is_favorite || false]
      );
      return res.json(mapProductFromDB(result.rows[0]));
    } catch (error) {
      console.error('[products] POST error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const { name, category_id, price_cmt, hpp, stock, is_favorite } = req.body;
      const result = await db.query(
        `UPDATE products SET name=$1, category_id=$2, price_cmt=$3, hpp=$4, stock=$5, is_favorite=$6, updated_at=NOW()
         WHERE id=$7 RETURNING *`,
        [name, category_id, price_cmt || 0, hpp || 0, stock || 0, is_favorite || false, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
      return res.json(mapProductFromDB(result.rows[0]));
    } catch (error) {
      console.error('[products] PUT error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await db.query(`DELETE FROM products WHERE id = $1`, [id]);
      return res.json({ success: true });
    } catch (error) {
      console.error('[products] DELETE error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
