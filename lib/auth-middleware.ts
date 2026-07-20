import { auth } from './auth';

export async function requireSession(req: any) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    const err = new Error('Unauthorized') as any;
    err.status = 401;
    throw err;
  }
  return session;
}
