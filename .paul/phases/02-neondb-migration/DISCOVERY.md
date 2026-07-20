---
phase: 02-neondb-migration
topic: Migrasi database dari Supabase ke NeonDB
depth: standard
confidence: HIGH
created: 2026-07-20
---

# Discovery: Migrasi Database Rexta ke NeonDB

**Recommendation:** Migrasikan ke NeonDB + Vercel Edge Functions + Better Auth, bukan hanya ganti connection string.

**Confidence:** HIGH — Supabase dan NeonDB adalah PostgreSQL yang kompatibel secara schema, tapi perbedaan arsitekturalnya well-understood dan keduanya memiliki dokumentasi yang kuat.

---

## Objective

Yang perlu diketahui sebelum planning:
- Apa yang benar-benar berubah ketika pindah dari Supabase ke NeonDB?
- Bagaimana menggantikan Supabase Auth yang hilang?
- Bagaimana frontend bisa berkomunikasi dengan NeonDB (tidak ada HTTP API bawaan)?
- Apa pendekatan migrasi terbaik untuk codebase saat ini?

---

## Scope

**Include:**
- Analisis gap arsitektur Supabase vs NeonDB
- Opsi pengganti Supabase Auth
- Opsi API layer untuk menghubungkan frontend ke NeonDB
- Rencana migrasi schema dan data

**Exclude:**
- Perubahan UI/UX
- Fitur baru selain yang dibutuhkan untuk migrasi
- Monitoring dan logging lanjutan

---

## Finding Kritis: Gap Arsitektur

### Apa yang Supabase sediakan (yang NeonDB tidak punya):

| Komponen | Supabase | NeonDB |
|---------|---------|--------|
| PostgreSQL database | ✅ Managed | ✅ Serverless |
| HTTP API (PostgREST) | ✅ Built-in | ❌ Tidak ada |
| Authentication system | ✅ Built-in | ❌ Tidak ada |
| Client SDK (browser-safe) | ✅ `@supabase/supabase-js` | ❌ Hanya TCP connection |
| RLS dengan `auth.role()` | ✅ Built-in | ❌ Perlu custom |

**Implikasi kritis:** Frontend React saat ini memanggil Supabase langsung dari browser via HTTP API (PostgREST). NeonDB adalah koneksi PostgreSQL murni (TCP), **tidak bisa diakses dari browser**. Ini berarti migrasi ke NeonDB **memerlukan penambahan backend API layer**.

---

## Findings

### Option A: NeonDB + Vercel Edge Functions + Better Auth (RECOMMENDED)

**Konsep:** Tambahkan Vercel serverless functions sebagai API layer antara frontend dan NeonDB.

```
Browser (React SPA)
    ↓ fetch()
Vercel Edge Functions (api/*.ts)
    ↓ @neondatabase/serverless
NeonDB (PostgreSQL)
```

**Komponen:**
- **Database**: NeonDB (sudah ada credentials)
- **DB Client**: `@neondatabase/serverless` — driver resmi Neon, mendukung HTTP adapter khusus untuk edge/serverless
- **API Layer**: Vercel Edge Functions di direktori `api/`
- **Auth**: Better Auth v1 — open source, PostgreSQL-native, email/password support

**@neondatabase/serverless advantages:**
- Dirancang khusus untuk serverless/edge (WebSockets + HTTP adapter)
- Works di Vercel Edge Runtime (tidak perlu Node.js penuh)
- Mendukung connection pooling via pooler URL (persis seperti credentials yang diberikan)
- API mirip `node-postgres` (pg), minim learning curve

**Better Auth advantages:**
- Open source (tidak ada vendor lock-in)
- Adapts langsung ke PostgreSQL/NeonDB (tidak perlu schema tambahan yang rumit)
- Built-in session management
- Email/password support out of the box
- Aktif dikembangkan (bukan legacy)

**Pros:**
- Minimal changes ke frontend (hanya ubah `services/database.ts` untuk call API endpoints)
- `@neondatabase/serverless` optimal untuk Vercel Edge
- Better Auth menyimpan users di NeonDB (satu database, tidak tersebar)
- Schema PostgreSQL sama, tidak perlu refactor besar
- Stored procedure `process_inventory_transaction` tetap bisa dipakai (standard PL/pgSQL)

**Cons:**
- Perlu menulis Vercel Edge Functions untuk setiap operasi DB (~10 endpoints)
- Perlu setup auth tables tambahan untuk Better Auth
- Ada overhead HTTP request untuk setiap operasi (vs Supabase SDK yang juga HTTP tapi lebih abstrak)

**For our use case:** FIT — minimal perubahan arsitektur, Vercel sudah jadi target deploy, Better Auth + NeonDB adalah kombinasi modern yang populer.

---

### Option B: NeonDB + Migrasi ke Next.js

**Konsep:** Konversi seluruh app dari React SPA (Vite) ke Next.js, gunakan Next.js API Routes secara built-in.

**Komponen:**
- Next.js App Router
- Drizzle ORM atau Prisma untuk type-safe DB queries
- Better Auth atau Next-Auth

**Pros:**
- Full-stack framework, lebih terstruktur jangka panjang
- API routes terintegrasi, tidak perlu manage terpisah
- Ecosystem Next.js + Vercel optimal

**Cons:**
- Refactor BESAR: seluruh routing, component structure, build system berubah
- Dari Vite ke Next.js = banyak breaking changes
- Overkill untuk inventory app sederhana saat ini
- Waktu development jauh lebih lama

**For our use case:** OVERKILL saat ini — gunakan hanya jika ada rencana scale besar.

---

### Option C: Tetap di Supabase (Jangan Migrasi)

**Konsep:** Jika tujuannya hanya "fresh start database" tanpa alasan teknis kuat, pertimbangkan reset Supabase project saja.

**Pros:**
- Zero code changes
- Auth, RLS, RPC semua sudah berjalan
- Tidak ada risiko migrasi

**Cons:**
- Jika ada masalah teknis dengan Supabase (biaya, data ownership, dll), masalah tidak terselesaikan
- Jika ingin full control PostgreSQL, Supabase membatasi akses

**For our use case:** Viable HANYA jika tujuan migrasi adalah "fresh data" bukan "pindah platform."

---

## Comparison

| Kriteria | Option A (NeonDB + Vercel Fn) | Option B (Next.js) | Option C (Tetap Supabase) |
|---------|------|--------|------|
| Effort | Medium (3-5 hari) | Tinggi (1-2 minggu) | Minimal |
| Breaking changes | Rendah (hanya service layer) | Tinggi (seluruh app) | Tidak ada |
| PostgreSQL control | Penuh | Penuh | Terbatas |
| Auth complexity | Medium | Medium | Sudah jalan |
| Long-term scalability | Baik | Terbaik | Cukup |
| Biaya | NeonDB free tier sangat generous | Sama | Supabase free tier terbatas |
| Compatibility NeonDB | ✅ Native | ✅ Native | ❌ Tidak berlaku |

---

## Recommendation

**Pilih: Option A — NeonDB + Vercel Edge Functions + Better Auth**

**Rationale:**
1. **NeonDB adalah PostgreSQL** — schema `db_schema.sql` bisa dijalankan langsung, stored procedure `process_inventory_transaction` (standard PL/pgSQL) tetap kompatibel
2. **Vercel sudah jadi target deploy** — menambahkan Edge Functions di direktori `api/` adalah perubahan incremental, bukan refactor besar
3. **Better Auth** adalah solusi auth terbaik untuk PostgreSQL standalone saat ini — aktif dikembangkan, type-safe, tidak ada vendor lock-in
4. **Frontend changes minimal** — `services/database.ts` diganti dari memanggil `supabase.from()` ke `fetch('/api/...')`, logic mapping camelCase↔snake_case tetap sama
5. **`@neondatabase/serverless`** adalah pilihan official dan optimal untuk Vercel Edge — koneksi HTTP/WebSocket yang dirancang untuk serverless, tidak ada cold start masalah TCP connection

**Caveats:**
- Perlu membuat ~10 API endpoint baru di `api/`
- RLS policy yang pakai `auth.role()` tidak bisa dipakai di NeonDB — keamanan dipindah ke level API (cek session di setiap request)
- Better Auth perlu menambah beberapa tabel ke schema (`users`, `sessions`, `accounts`, dll)
- Perlu tools untuk migrasi data dari Supabase (`pg_dump` → `pg_restore`)

---

## Rencana Migrasi (High Level)

### Phase 1: Schema & Data Migration
1. Export schema dari Supabase (hapus Supabase-specific: RLS policies, `auth.role()`)
2. Jalankan schema di NeonDB (via Neon dashboard SQL editor)
3. Export data dari Supabase (`pg_dump --data-only`)
4. Import data ke NeonDB (`psql`)

### Phase 2: Backend API Layer
1. Buat direktori `api/` di root project
2. Buat endpoint untuk setiap operasi DB (mirroring `services/database.ts`)
3. Tambahkan auth middleware di setiap protected endpoint

### Phase 3: Auth System
1. Install Better Auth
2. Buat `api/auth/[...all].ts` endpoint
3. Setup Better Auth dengan NeonDB adapter
4. Buat tabel auth di NeonDB

### Phase 4: Frontend Update
1. Update `services/database.ts` — ganti Supabase SDK calls ke `fetch('/api/...')`
2. Update auth flow (`signIn`, `signOut`, `getCurrentSession`)
3. Remove `@supabase/supabase-js` dependency
4. Update env vars

---

## Open Questions

~~- Apakah ada data existing di Supabase yang perlu dimigrasikan?~~ ✅ **Fresh start** — akun Supabase tidak bisa diakses, data lama diabaikan. Langsung setup schema baru di NeonDB.

~~- Apakah users/password yang ada di Supabase Auth perlu dipindah?~~ ✅ **Tidak** — user accounts dibuat ulang di Better Auth. Password lama tidak perlu dimigrasikan.

~~- Apakah public stock view perlu tetap berjalan?~~ ✅ **Ya** — endpoint public (anonymous read untuk `products` dan `categories`) perlu dibuat tanpa auth guard.

**Semua pertanyaan terjawab — siap untuk planning.**

---

## Quality Report

**Sources consulted:**
- `db_schema.sql` — schema PostgreSQL aktual (verified: standard PL/pgSQL, compatible dengan NeonDB)
- `services/database.ts` — seluruh operasi DB aktual
- `services/supabaseClient.ts` — cara Supabase dikonfigurasi saat ini
- `.paul/codebase/integrations.md` — fitur Supabase yang digunakan
- NeonDB architecture (well-known): serverless PostgreSQL, HTTP adapter via `@neondatabase/serverless`
- Better Auth (well-known): PostgreSQL adapter, email/password, session management

**Verification:**
- Schema compatibility: Verified — `db_schema.sql` menggunakan standard PL/pgSQL, tidak ada Supabase-specific extensions selain `auth.role()` di RLS
- RPC compatibility: Verified — `process_inventory_transaction` adalah standard PL/pgSQL, berjalan di any PostgreSQL
- Frontend direct DB access: Verified dari `supabaseClient.ts` — app queries melalui HTTP API Supabase, bukan langsung TCP
- NeonDB pooler URL: Credentials yang diberikan sudah menggunakan `-pooler` endpoint (optimal untuk serverless)

**Assumptions (not verified):**
- Better Auth v1 versi terbaru sudah stable (berdasarkan knowledge cutoff Aug 2025 — perlu verify versi terkini)
- Data volume di Supabase yang perlu dimigrasikan (belum diketahui jumlahnya)
- Users yang ada di Supabase Auth (password hash tidak kompatibel antar sistem)

---

*Discovery completed: 2026-07-20*
*Confidence: HIGH*
*Ready for: /paul:plan 02-neondb-migration*
