import { auth } from '../lib/auth';

export default async function handler(req: any, res: any) {
  // Reconstruct path dari query param yang dikirim vercel.json rewrite
  const p = req.query.p;
  const pathStr = Array.isArray(p) ? p.join('/') : String(p || '');
  const path = decodeURIComponent(pathStr);

  // Build URL lengkap untuk Better Auth
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string);
  const url = new URL(`/api/auth/${path}`, `${protocol}://${host}`);

  // Forward query params selain 'p'
  for (const [k, v] of Object.entries(req.query as Record<string, string>)) {
    if (k !== 'p') url.searchParams.set(k, v);
  }

  // Build Headers dari request asli
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers as Record<string, string | string[]>)) {
    if (value != null) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
  }

  // Ambil body dari req.body (sudah di-parse Vercel) — BUKAN dari stream
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.body != null;
  const bodyStr = hasBody ? JSON.stringify(req.body) : undefined;
  if (hasBody && bodyStr) {
    headers.set('content-type', 'application/json');
    headers.set('content-length', String(Buffer.byteLength(bodyStr)));
  }

  // Buat Web API Request — format yang dimengerti Better Auth
  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body: bodyStr,
  });

  // Panggil Better Auth handler
  const response = await auth.handler(request);

  // Forward status code
  res.status(response.status);

  // Forward headers — Set-Cookie harus dihandle terpisah (bisa multiple)
  response.headers.forEach((value: string, key: string) => {
    if (key.toLowerCase() === 'set-cookie') return;
    res.setHeader(key, value);
  });

  const cookies = (response.headers as any).getSetCookie?.() ?? [];
  if (cookies.length > 0) {
    res.setHeader('set-cookie', cookies);
  }

  // Kirim body response
  const body = await response.text();
  res.end(body);
}
