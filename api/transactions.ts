import { db } from '../lib/db.js';
import { transactions, products, materials } from '../lib/schema.js';
import { eq, gte, lte, and, desc, count } from 'drizzle-orm';
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

  if (req.method === 'GET') {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const { itemId, itemType, dateFrom, dateTo } = req.query;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (itemId) conditions.push(eq(transactions.itemId, itemId as string));
      if (itemType) conditions.push(eq(transactions.itemType, itemType as string));
      if (dateFrom) conditions.push(gte(transactions.date, new Date(dateFrom as string)));
      if (dateTo) conditions.push(lte(transactions.date, new Date(dateTo as string)));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [[{ value: total }], data] = await Promise.all([
        db.select({ value: count() }).from(transactions).where(where),
        db.select().from(transactions).where(where).orderBy(desc(transactions.date)).limit(limit).offset(offset),
      ]);

      return res.json({ data: data.map(mapTransaction), count: Number(total) });
    } catch (error) {
      console.error('[transactions] GET error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, item_id, item_type, type, qty, date, notes, manual_stock } = req.body;

      const result = await db.transaction(async (tx) => {
        let currentStock: string;

        if (item_type === 'product') {
          const [item] = await tx.select({ stock: products.stock })
            .from(products).where(eq(products.id, item_id));
          if (!item) throw new Error('ITEM_NOT_FOUND');
          currentStock = item.stock || '0';
        } else {
          const [item] = await tx.select({ stock: materials.stock })
            .from(materials).where(eq(materials.id, item_id));
          if (!item) throw new Error('ITEM_NOT_FOUND');
          currentStock = item.stock || '0';
        }

        const current = Number(currentStock);
        const newStock =
          type === 'OPNAME' ? Number(manual_stock) :
          type === 'IN'     ? current + Number(qty) :
                              current - Number(qty);

        if (item_type === 'product') {
          await tx.update(products)
            .set({ stock: String(newStock), updatedAt: new Date() })
            .where(eq(products.id, item_id));
        } else {
          await tx.update(materials)
            .set({ stock: String(newStock), updatedAt: new Date() })
            .where(eq(materials.id, item_id));
        }

        const [txRecord] = await tx.insert(transactions).values({
          id,
          itemId: item_id,
          itemType: item_type,
          type,
          qty: String(qty),
          date: new Date(date),
          notes: notes || null,
          balanceAfter: String(newStock),
        }).returning();

        return { transaction: txRecord, newStock };
      });

      return res.json({
        transaction: mapTransaction(result.transaction),
        newStock: result.newStock,
      });
    } catch (error: any) {
      if (error?.message === 'ITEM_NOT_FOUND') {
        return res.status(404).json({ error: 'Item not found' });
      }
      console.error('[transactions] POST error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
