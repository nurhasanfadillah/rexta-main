import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/auth.js';

export const config = { api: { bodyParser: false } };

const nodeHandler = toNodeHandler(auth);

export default async function handler(req: any, res: any) {
  const p = req.query.p;
  if (p) {
    const pathStr = Array.isArray(p) ? p.join('/') : String(p);
    const decoded = decodeURIComponent(pathStr);
    const extra = Object.entries(req.query as Record<string, string>)
      .filter(([k]) => k !== 'p')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    req.url = `/api/auth/${decoded}${extra ? '?' + extra : ''}`;
  }

  if (!req.headers.origin) {
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string);
    req.headers.origin = `${proto}://${host}`;
  }

  try {
    await nodeHandler(req, res);
  } catch (err: any) {
    console.error('[auth-proxy] error:', err?.message || String(err));
    if (!res.headersSent) {
      res.status(500).json({ error: 'auth-proxy error', detail: err?.message });
    }
  }
}
