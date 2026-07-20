import { betterAuth } from 'better-auth';
import { Pool } from '@neondatabase/serverless';

// Inline auth config — menghindari cross-directory ESM import issue di Vercel
const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL as string],
});

export default async function handler(req: any, res: any) {
  try {
    const p = req.query.p;
    const pathStr = Array.isArray(p) ? p.join('/') : String(p || '');
    const path = decodeURIComponent(pathStr);

    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string);
    const url = new URL(`/api/auth/${path}`, `${proto}://${host}`);

    for (const [k, v] of Object.entries(req.query as Record<string, string>)) {
      if (k !== 'p' && k !== 'path') url.searchParams.set(k, v);
    }

    let bodyString: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body != null) {
        bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buf = Buffer.concat(chunks);
        if (buf.length > 0) bodyString = buf.toString('utf8');
      }
    }

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers as Record<string, string | string[]>)) {
      if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    }
    if (bodyString != null) {
      headers.set('content-type', 'application/json');
      headers.set('content-length', String(Buffer.byteLength(bodyString)));
    }

    const webReq = new Request(url.toString(), {
      method: req.method || 'GET',
      headers,
      body: bodyString,
    });

    const webRes = await auth.handler(webReq);

    res.status(webRes.status);
    webRes.headers.forEach((v: string, k: string) => {
      if (k.toLowerCase() !== 'set-cookie') res.setHeader(k, v);
    });

    const setCookies = (webRes.headers as any).getSetCookie?.() ?? [];
    if (setCookies.length > 0) res.setHeader('set-cookie', setCookies);

    res.end(await webRes.text());
  } catch (err: any) {
    console.error('[auth-proxy] CRASH:', err?.message || String(err));
    if (!res.headersSent) {
      res.status(500).json({ error: 'auth-proxy internal error', detail: err?.message });
    }
  }
}
