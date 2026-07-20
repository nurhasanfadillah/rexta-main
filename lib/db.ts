import { Pool, neon } from '@neondatabase/serverless';

// Pool untuk Better Auth (butuh pg-compatible Pool interface).
// Connection limits wajib — NeonDB free tier max 100 connections.
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
});

// HTTP adapter untuk CRUD queries (Plan 02-02).
// Stateless — tidak maintain koneksi persisten, optimal untuk serverless.
export const sql = neon(process.env.DATABASE_URL!);
