# Phase 04 Context — Drizzle ORM + Auth Rebuild

## Phase Identity

| Field | Value |
|-------|-------|
| Phase | 04 |
| Name | drizzle-rebuild |
| Supersedes | Phase 03 (auth-fix — abandoned, quick-fix bukan solusi proper) |
| Status | Discussion complete — ready for planning |

## What We Want to Accomplish

Rebuild database layer dan auth integration secara proper:

1. **Drizzle ORM sebagai database layer** — ganti semua raw `db.query()` di `api/` dengan Drizzle queries yang type-safe. `lib/schema.ts` jadi source of truth menggantikan `db_schema_neon.sql`.

2. **Better Auth + Drizzle adapter** — gunakan `better-auth/adapters/drizzle` agar auth dan app data pakai satu `db` instance. Fix auth yang selama ini gagal karena masalah Pool dan ESM imports.

3. **Single Pool, zero duplication** — satu `Pool` di `lib/db.ts`, tidak ada duplikat di `lib/auth.ts` atau `api/auth-proxy.ts`. Fix connection exhaustion risk.

4. **Atomic transactions via `db.transaction()`** — ganti stored procedure `process_inventory_transaction()` dengan Drizzle transaction. Atomicity tetap terjaga, semuanya TypeScript.

5. **Schema migrations via drizzle-kit** — `drizzle-kit push` atau `drizzle-kit migrate` untuk manage schema changes going forward.

## Success Looks Like

- Login berfungsi di production (email/password via Better Auth)
- Semua 10 API endpoints berjalan dengan Drizzle queries (tidak ada raw `db.query()` tersisa)
- Transaksi stok IN/OUT/OPNAME atomic dan benar
- Schema TypeScript di `lib/schema.ts` mencerminkan seluruh domain model
- Tidak ada TypeScript `any` di query results (Drizzle inference)
- Single `db` instance dipakai oleh auth dan semua API handlers

## Domain yang Dipertahankan

Schema domain **tidak berubah** — hanya cara akses ke DB yang diganti:

```
categories → products → transactions (IN/OUT/OPNAME)
materials → transactions

user / session / account / verification (Better Auth managed)
```

Logika bisnis kritis:
- Transaksi stok: `IN` (tambah), `OUT` (kurang), `OPNAME` (override manual)
- `balanceAfter` disimpan di setiap transaksi sebagai snapshot stok
- Pagination di semua list endpoints (`limit`, `offset`, `count`)
- Auth guard: `requireSession()` wajib di semua endpoint kecuali public

## Approach & Constraints

### Stack
```
@neondatabase/serverless  → Pool (tetap)
drizzle-orm               → query builder + type inference
drizzle-orm/neon-serverless → Drizzle adapter untuk Neon
drizzle-kit               → CLI untuk schema migrations
better-auth/adapters/drizzle → Drizzle adapter untuk Better Auth
```

### File yang berubah
- `lib/schema.ts` — BARU: Drizzle schema definitions
- `lib/db.ts` — REWRITE: export `db` (Drizzle instance), bukan Pool raw
- `lib/auth.ts` — REWRITE: pakai `drizzleAdapter(db, { provider: 'pg' })`
- `lib/auth-middleware.ts` — MINOR: mungkin tidak perlu berubah
- `api/auth-proxy.ts` — REWRITE: fix menggunakan `toNodeHandler` dengan shared `auth`
- `api/products.ts` — REWRITE: Drizzle queries
- `api/materials.ts` — REWRITE: Drizzle queries
- `api/categories.ts` — REWRITE: Drizzle queries
- `api/transactions.ts` — REWRITE: Drizzle transaction (replace RPC)
- `api/dashboard.ts` — REWRITE: Drizzle aggregate queries
- `api/products/public.ts` — REWRITE: Drizzle query
- `api/products/favorites.ts` — REWRITE: Drizzle query
- `api/products/[id]/favorite.ts` — REWRITE: Drizzle update
- `drizzle.config.ts` — BARU: drizzle-kit config
- `package.json` — tambah `drizzle-orm`, `drizzle-kit`

### File yang TIDAK berubah
- Semua komponen React (`components/*.tsx`)
- `services/database.ts` (API client frontend)
- `types.ts` (domain TypeScript types)
- `vercel.json` (routing sudah benar)
- `index.html`, `App.tsx`, `index.tsx`
- `sw.js`, `manifest.json`

### Drizzle + Neon pattern
```typescript
// lib/db.ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL as string],
});
```

### Atomic transaction pattern (replace stored procedure)
```typescript
// api/transactions.ts — replace RPC process_inventory_transaction
await db.transaction(async (tx) => {
  // 1. Read current stock
  const item = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, itemId));
  // 2. Calculate new stock
  const newStock = type === 'IN' ? current + qty : type === 'OUT' ? current - qty : manualStock;
  // 3. Update stock
  await tx.update(products).set({ stock: newStock }).where(eq(products.id, itemId));
  // 4. Insert transaction record
  await tx.insert(transactions).values({ ...txData, balanceAfter: newStock });
  return newStock;
});
```

## Open Questions untuk Planning

1. **Apakah data NeonDB yang ada perlu di-reset atau dipertahankan?** Drizzle schema push akan sync schema tanpa drop data — tapi Better Auth schema mungkin perlu disesuaikan.

2. **`drizzle-kit push` vs `drizzle-kit migrate`?** Untuk project ini yang masih development, `push` lebih praktis (langsung sync tanpa migration files). Bisa switch ke `migrate` saat production-stable.

3. **Auth tables Better Auth** — apakah di-generate ulang via Drizzle schema atau biarkan Better Auth yang manage?

## Prior Context

- Phase 02 (NeonDB migration) COMPLETE — schema SQL sudah ada di `db_schema_neon.sql`, bisa jadi referensi untuk Drizzle schema
- Phase 03 (auth-fix) ABANDONED — digantikan oleh Phase 04 ini
- Auth issue root cause: multiple Pool instances + ESM import failures di Vercel
- Existing NeonDB schema: `db_schema_neon.sql` — reference untuk Drizzle table definitions
