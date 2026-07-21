import { toNodeHandler } from 'better-auth/node';
import { betterAuth } from 'better-auth';
import { Pool } from '@neondatabase/serverless';

export const config = { api: { bodyParser: false } };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL as string],
});

const nodeHandler = toNodeHandler(auth);

export default function handler(req: any, res: any) {
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
  return nodeHandler(req, res);
}
