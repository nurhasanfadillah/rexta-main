import { sql } from '../../lib/db';
import { requireSession } from '../../lib/auth-middleware';

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await requireSession(req);
  } catch (e: any) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rows = await sql`SELECT * FROM products WHERE is_favorite = true ORDER BY name ASC`;
    return res.json(rows.map(mapProductFromDB));
  } catch (error) {
    console.error('[products/favorites] GET error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
