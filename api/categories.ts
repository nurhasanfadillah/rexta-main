import { sql } from '../lib/db';
import { requireSession } from '../lib/auth-middleware';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT id, name FROM categories ORDER BY name ASC`;
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
      const rows = await sql`INSERT INTO categories (id, name) VALUES (${id}, ${name}) RETURNING *`;
      return res.json(rows[0]);
    } catch (error) {
      console.error('[categories] POST error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await sql`DELETE FROM categories WHERE id = ${id}`;
      return res.json({ success: true });
    } catch (error) {
      console.error('[categories] DELETE error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
