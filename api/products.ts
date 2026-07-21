import { db } from '../lib/db.js';
import { products } from '../lib/schema.js';
import { eq, ilike, and, asc, count } from 'drizzle-orm';
import { requireSession } from '../lib/auth-middleware.js';

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

      const conditions = [];
      if (search) conditions.push(ilike(products.name, `%${search}%`));
      if (categoryId && categoryId !== 'SEMUA') conditions.push(eq(products.categoryId, categoryId as string));
      if (onlyFavorites) conditions.push(eq(products.isFavorite, true));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [[{ value: total }], data] = await Promise.all([
        db.select({ value: count() }).from(products).where(where),
        db.select().from(products).where(where).orderBy(asc(products.name)).limit(limit).offset(offset),
      ]);

      return res.json({ data: data.map(mapProduct), count: Number(total) });
    } catch (error) {
      console.error('[products] GET error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, name, category_id, price_cmt, hpp, stock, is_favorite } = req.body;
      const [row] = await db.insert(products).values({
        id,
        name,
        categoryId: category_id || null,
        priceCmt: String(price_cmt || 0),
        hpp: String(hpp || 0),
        stock: String(stock || 0),
        isFavorite: is_favorite || false,
      }).returning();
      return res.json(mapProduct(row));
    } catch (error) {
      console.error('[products] POST error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const { name, category_id, price_cmt, hpp, stock, is_favorite } = req.body;
      const [row] = await db.update(products).set({
        name,
        categoryId: category_id || null,
        priceCmt: String(price_cmt || 0),
        hpp: String(hpp || 0),
        stock: String(stock || 0),
        isFavorite: is_favorite || false,
        updatedAt: new Date(),
      }).where(eq(products.id, id as string)).returning();
      if (!row) return res.status(404).json({ error: 'Product not found' });
      return res.json(mapProduct(row));
    } catch (error) {
      console.error('[products] PUT error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await db.delete(products).where(eq(products.id, id as string));
      return res.json({ success: true });
    } catch (error) {
      console.error('[products] DELETE error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
