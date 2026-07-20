import { db } from '../lib/db';

export default async function handler(req: any, res: any) {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[health] DB connection failed:', error);
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
}
