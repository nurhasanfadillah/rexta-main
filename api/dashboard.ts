import { db } from '../lib/db.js';
import { products, materials, transactions } from '../lib/schema.js';
import { count, desc, sql } from 'drizzle-orm';
import { requireSession } from '../lib/auth-middleware.js';

const mapTransaction = (row: typeof transactions.$inferSelect) => ({
  id: row.id,
  itemId: row.itemId,
  itemType: row.itemType,
  type: row.type,
  qty: Number(row.qty),
  date: row.date,
  notes: row.notes || null,
  balanceAfter: Number(row.balanceAfter),
});

export default async function handler(req: any, res: any) {
  try {
    await requireSession(req);
  } catch (e: any) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [
      [{ value: totalProducts }],
      [{ value: totalMaterials }],
      [{ value: productAssetRaw }],
      [{ value: materialAssetRaw }],
      recentTxs,
    ] = await Promise.all([
      db.select({ value: count() }).from(products),
      db.select({ value: count() }).from(materials),
      db.select({
        value: sql<string>`COALESCE(SUM(${products.stock}::numeric * ${products.priceCmt}::numeric), 0)`,
      }).from(products),
      db.select({
        value: sql<string>`COALESCE(SUM(${materials.stock}::numeric * ${materials.price}::numeric), 0)`,
      }).from(materials),
      db.select().from(transactions).orderBy(desc(transactions.date)).limit(10),
    ]);

    const productAssetValue = Number(productAssetRaw);
    const materialAssetValue = Number(materialAssetRaw);

    return res.json({
      totalProducts: Number(totalProducts),
      totalMaterials: Number(totalMaterials),
      productAssetValue,
      materialAssetValue,
      totalAssetValue: productAssetValue + materialAssetValue,
      recentTransactions: recentTxs.map(mapTransaction),
    });
  } catch (error) {
    console.error('[dashboard] GET error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
