import { db } from '../lib/db.js';
import { materials } from '../lib/schema.js';
import { eq, ilike, asc, count } from 'drizzle-orm';
import { requireSession } from '../lib/auth-middleware.js';

const mapMaterial = (row: typeof materials.$inferSelect) => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  price: Number(row.price) || 0,
  stock: Number(row.stock) || 0,
  updatedAt: row.updatedAt,
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

      const where = search ? ilike(materials.name, `%${search}%`) : undefined;

      const [[{ value: total }], data] = await Promise.all([
        db.select({ value: count() }).from(materials).where(where),
        db.select().from(materials).where(where).orderBy(asc(materials.name)).limit(limit).offset(offset),
      ]);

      return res.json({ data: data.map(mapMaterial), count: Number(total) });
    } catch (error) {
      console.error('[materials] GET error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, name, unit, price, stock } = req.body;
      const [row] = await db.insert(materials).values({
        id,
        name,
        unit,
        price: String(price || 0),
        stock: String(stock || 0),
      }).returning();
      return res.json(mapMaterial(row));
    } catch (error) {
      console.error('[materials] POST error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const { name, unit, price, stock } = req.body;
      const [row] = await db.update(materials).set({
        name,
        unit,
        price: String(price || 0),
        stock: String(stock || 0),
        updatedAt: new Date(),
      }).where(eq(materials.id, id as string)).returning();
      if (!row) return res.status(404).json({ error: 'Material not found' });
      return res.json(mapMaterial(row));
    } catch (error) {
      console.error('[materials] PUT error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await db.delete(materials).where(eq(materials.id, id as string));
      return res.json({ success: true });
    } catch (error) {
      console.error('[materials] DELETE error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
