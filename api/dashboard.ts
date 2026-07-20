import { db } from '../lib/db';
import { requireSession } from '../lib/auth-middleware';

const mapTransactionFromDB = (row: any) => ({
  id: row.id,
  itemId: row.item_id,
  itemType: row.item_type,
  type: row.type,
  qty: Number(row.qty),
  date: row.date,
  notes: row.notes || null,
  balanceAfter: Number(row.balance_after),
});

export default async function handler(req: any, res: any) {
  try {
    await requireSession(req);
  } catch (e: any) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const [statsResult, recentResult] = await Promise.all([
        db.query(`
          SELECT
            (SELECT COUNT(*) FROM products)::int as total_products,
            (SELECT COUNT(*) FROM materials)::int as total_materials,
            (SELECT COALESCE(SUM(stock * price_cmt), 0) FROM products) as product_asset_value,
            (SELECT COALESCE(SUM(stock * price), 0) FROM materials) as material_asset_value
        `),
        db.query(`SELECT * FROM transactions ORDER BY date DESC LIMIT 10`),
      ]);

      const stats = statsResult.rows[0];
      const productAssetValue = Number(stats.product_asset_value);
      const materialAssetValue = Number(stats.material_asset_value);

      return res.json({
        totalProducts: stats.total_products,
        totalMaterials: stats.total_materials,
        productAssetValue,
        materialAssetValue,
        totalAssetValue: productAssetValue + materialAssetValue,
        recentTransactions: recentResult.rows.map(mapTransactionFromDB),
      });
    } catch (error) {
      console.error('[dashboard] GET error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
