import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/auth';

const handler = toNodeHandler(auth);

export default function (req: any, res: any) {
  const p = req.query.p;
  if (p) {
    const pathStr = Array.isArray(p) ? p.join('/') : String(p);
    const decoded = decodeURIComponent(pathStr);
    const remainingQuery = Object.entries(req.query as Record<string, string>)
      .filter(([k]) => k !== 'p')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    req.url = `/api/auth/${decoded}${remainingQuery ? '?' + remainingQuery : ''}`;
  }
  return handler(req, res);
}
