import { db } from '../../lib/db.js';
import { products, categories } from '../../lib/schema.js';
import { ilike, asc, count } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const where = search ? ilike(products.name, `%${search}%`) : undefined;

    const [[{ value: total }], data, cats] = await Promise.all([
      db.select({ value: count() }).from(products).where(where),
      db.select({ id: products.id, name: products.name, stock: products.stock, categoryId: products.categoryId })
        .from(products).where(where).orderBy(asc(products.name)).limit(limit).offset(offset),
      db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)),
    ]);

    return res.json({
      data: data.map(row => ({
        id: row.id,
        name: row.name,
        stock: Number(row.stock) || 0,
        categoryId: row.categoryId,
      })),
      categories: cats,
      count: Number(total),
    });
  } catch (error) {
    console.error('[products/public] GET error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
