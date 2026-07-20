---
phase: 02-neondb-migration
plan: 01
completed: 2026-07-20
status: COMPLETE
---

# Summary: Plan 02-01 — NeonDB Schema + Better Auth Foundation

## Yang Dibangun

| File | Status | Keterangan |
|------|--------|------------|
| `db_schema_neon.sql` | ✅ Dibuat | Schema NeonDB tanpa RLS, termasuk Better Auth tables |
| `lib/db.ts` | ✅ Dibuat | Pool (untuk Better Auth) + sql/neon (untuk CRUD queries) |
| `lib/auth.ts` | ✅ Dibuat | Better Auth config dengan trustedOrigins, fail-fast env check |
| `api/auth/[...all].ts` | ✅ Dibuat | Vercel Function catch-all untuk Better Auth |
| `api/health.ts` | ✅ Dibuat | DB connectivity check endpoint |
| `vercel.json` | ✅ Diupdate | Rewrite pattern exclude /api/* |
| `.env.example` | ✅ Diupdate | Tambah DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL |
| `.gitignore` | ✅ Diupdate | Tambah .env dan .env.local |
| `package.json` | ✅ Diupdate | better-auth + @neondatabase/serverless terinstall |

## Acceptance Criteria

- ✅ AC-1: `db_schema_neon.sql` siap (menunggu user jalankan di NeonDB)
- ✅ AC-2: Better Auth dikonfigurasi dengan trustedOrigins, fail-fast, Pool limits
- ✅ AC-3: Auth endpoint + health endpoint tersedia, vercel.json dipatch
- ✅ AC-4: `.env.example` terdokumentasi dengan instruksi entropy
- ✅ AC-5: `.gitignore` melindungi `.env` dan `.env.local`

## Keputusan yang Dibuat

- `lib/db.ts` export dua adapter: `db` (Pool, untuk Better Auth) dan `sql` (neon HTTP, untuk CRUD di Plan 02-02)
- Pool limits: max 10, timeout 5s/10s — mencegah connection exhaustion di NeonDB free tier
- `auth.ts` fail-fast jika `BETTER_AUTH_URL` atau `BETTER_AUTH_SECRET` tidak di-set

## Yang BELUM Selesai (Menunggu Checkpoint)

- User perlu jalankan `db_schema_neon.sql` di NeonDB SQL Editor
- Setelah itu, set env vars di Vercel: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

## Catatan untuk Plan 02-02

- Gunakan `sql` dari `lib/db.ts` (neon HTTP adapter) untuk semua CRUD queries
- Gunakan `db` dari `lib/db.ts` hanya jika butuh Pool interface (transactions)
- Import selalu dari `../../lib/db`, bukan buat koneksi baru
