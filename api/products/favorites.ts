import { db } from '../../lib/db.js';
import { products } from '../../lib/schema.js';
import { eq, asc } from 'drizzle-orm';
import { requireSession } from '../../lib/auth-middleware.js';

const mapProduct = (row: typeof products.$inferSelect) => ({
  id: row.id,
  name: row.name,
  categoryId: row.categoryId,
  priceCMT: Number(row.priceCmt) || 0,
  hpp: Number(row.hpp) || 0,
  stock: Number(row.stock) || 0,
  updatedAt: row.updatedAt,
  isFavorite: row.isFavorite ?? false,
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
    const rows = await db.select().from(products)
      .where(eq(products.isFavorite, true)).orderBy(asc(products.name));
    return res.json(rows.map(mapProduct));
  } catch (error) {
    console.error('[products/favorites] GET error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
