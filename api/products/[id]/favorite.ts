import { db } from '../../../lib/db';
import { requireSession } from '../../../lib/auth-middleware';

export default async function handler(req: any, res: any) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await requireSession(req);
  } catch (e: any) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id } = req.query;
    const { isFavorite } = req.body;
    const result = await db.query(
      `UPDATE products SET is_favorite = $1 WHERE id = $2`,
      [isFavorite, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json({ success: true });
  } catch (error) {
    console.error('[products/[id]/favorite] PATCH error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
