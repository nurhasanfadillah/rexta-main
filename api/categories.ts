import { db } from '../lib/db.js';
import { categories } from '../lib/schema.js';
import { eq, asc } from 'drizzle-orm';
import { requireSession } from '../lib/auth-middleware.js';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const rows = await db.select({ id: categories.id, name: categories.name })
        .from(categories).orderBy(asc(categories.name));
      return res.json(rows);
    } catch (error) {
      console.error('[categories] GET error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  try {
    await requireSession(req);
  } catch (e: any) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { id, name } = req.body;
      const [row] = await db.insert(categories).values({ id, name }).returning();
      return res.json(row);
    } catch (error) {
      console.error('[categories] POST error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await db.delete(categories).where(eq(categories.id, id as string));
      return res.json({ success: true });
    } catch (error) {
      console.error('[categories] DELETE error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
