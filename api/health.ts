import { db } from '../lib/db.js';
import { sql } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[health] DB connection failed:', error);
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
}
