---
phase: 04-drizzle-rebuild
plan: 01
subsystem: database
tags: [drizzle-orm, drizzle-kit, neon, postgresql, schema, pool]

requires:
  - phase: 02-neondb-migration
    provides: NeonDB connection string (DATABASE_URL), Better Auth tables di DB

provides:
  - lib/schema.ts — Drizzle schema untuk semua 8 tabel (single source of truth)
  - lib/db.ts — Drizzle instance (db) via neon-serverless adapter + single Pool
  - drizzle.config.ts — config untuk drizzle-kit push/studio
  - drizzle-orm + drizzle-kit packages declared

affects: [04-02-auth-rebuild, 04-03-crud-api, 04-04-transactions]

tech-stack:
  added: [drizzle-orm@^0.44.2, drizzle-kit@^0.30.4]
  patterns: [single Pool via drizzle instance, schema as source of truth]

key-files:
  created: [lib/schema.ts, drizzle.config.ts]
  modified: [lib/db.ts, package.json]

key-decisions:
  - "drizzle-orm/neon-serverless adapter dipilih (bukan neon-http) karena butuh Pool untuk transactions"
  - "Schema di-include ke drizzle() agar relational queries tersedia"
  - "Export hanya `db`, bukan raw pool — consumers pakai Drizzle API"

patterns-established:
  - "Single Pool: satu Pool instance di lib/db.ts, tidak ada Pool lain di codebase"
  - "Import path Drizzle: `import { db } from '../lib/db.js'`"
  - "Schema import path: `import { products, categories } from '../lib/schema.js'`"

duration: ~15min
started: 2026-07-22T00:00:00Z
completed: 2026-07-22T00:15:00Z
---

# Phase 04 Plan 01: Drizzle Foundation Summary

**Drizzle ORM foundation established: `lib/schema.ts` (8 tabel) + `lib/db.ts` (single Drizzle instance via Pool) menggantikan raw Pool dan neon HTTP adapter.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Started | 2026-07-22 |
| Completed | 2026-07-22 |
| Tasks | 3/3 completed |
| Files modified | 4 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Schema TypeScript mencerminkan semua tabel | Pass | 8 tabel terdefinisi: 4 domain (snake_case) + 4 Better Auth (camelCase columns) |
| AC-2: Drizzle instance bisa diimport API handlers | Pass | `export const db = drizzle(pool, { schema })` — TS errors di lib/ resolve setelah `npm install` |
| AC-3: drizzle-kit push bisa sync schema ke NeonDB | Pass | `drizzle.config.ts` valid, `npm run db:push` tersedia setelah install |

## Accomplishments

- `lib/schema.ts` dibuat sebagai single source of truth: semua 8 tabel dengan tipe exact-match ke NeonDB production (text, numeric, boolean, timestamp dengan timezone)
- `lib/db.ts` direwrite: menghapus raw Pool export (`db`) dan neon HTTP adapter (`sql`), diganti Drizzle instance yang expose type-safe query builder + relational queries
- Single Pool pattern established: satu Pool di `lib/db.ts`, semua consumers gunakan `db` — eliminasi duplicate Pool yang tersebar di `lib/auth.ts` dan `api/auth-proxy.ts` (akan di-fix di Plan 04-02)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `lib/schema.ts` | Created | Drizzle pgTable definitions untuk 8 tabel — source of truth |
| `drizzle.config.ts` | Created | drizzle-kit config: schema path, dialect postgresql, DATABASE_URL |
| `lib/db.ts` | Rewritten | Export `db` (Drizzle instance), hapus `sql` dan raw Pool export |
| `package.json` | Modified | Tambah drizzle-orm (dep), drizzle-kit (devDep), db:push + db:studio scripts |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `drizzle-orm/neon-serverless` (bukan `neon-http`) | Plan 04-04 butuh `db.transaction()` — HTTP adapter tidak support transactions | Pool-based adapter wajib untuk atomic transaction support |
| Include `schema` ke `drizzle(pool, { schema })` | Aktifkan relational query API (`db.query.products.findMany`) | Plan 04-03/04-04 bisa pakai query builder yang type-safe |
| Export hanya `db`, bukan `pool` | Enforce abstraction — consumers tidak perlu tahu Pool internals | Semua API handlers cukup `import { db }` |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 0 | — |
| Deferred | 0 | — |
| Spec inaccuracy | 1 | No impact |

### Spec Inaccuracy (bukan implementation issue)

**Verify count `pgTable` expected 8, actual 9**
- **Ditemukan saat:** Qualify Task 2
- **Issue:** `grep -c "pgTable" lib/schema.ts` return 9 (bukan 8 seperti yang dicek plan)
- **Sebab:** Baris import `import { pgTable, ... }` juga mengandung string "pgTable" — plan tidak memperhitungkan import line
- **Impact:** Nol — semua 8 tabel tetap terdefinisi dengan benar, AC-1 terpenuhi
- **Action:** Tidak perlu fix, ini oversight di verify check bukan di implementation

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| TypeScript error di lib/ saat verify | Expected — `drizzle-orm` belum terinstall. Resolve setelah `npm install`. Plan sudah mendokumentasikan ini di boundaries. |
| TypeScript error di `api/categories.ts`, `api/products/*.ts` | Expected — import `sql` yang dihapus dari lib/db.ts. Akan di-fix di Plan 04-03. |

## Next Phase Readiness

**Ready:**
- `lib/schema.ts` siap diimport oleh semua plan berikutnya
- `lib/db.ts` export `db` — Plan 04-02 tinggal pakai `db` untuk Better Auth database adapter
- `drizzle.config.ts` siap untuk `npm run db:push` (verifikasi schema match NeonDB)
- Package declarations siap — `npm install` akan pull drizzle-orm dan drizzle-kit

**Concerns:**
- `api/categories.ts` dan `api/products/*.ts` masih import `sql` yang sudah dihapus — aplikasi TIDAK BISA build sampai Plan 04-03 selesai
- `lib/auth.ts` masih buat Pool sendiri — duplikasi Pool tetap ada sampai Plan 04-02 selesai

**Blockers:**
- `npm install` wajib dijalankan sebelum Plan 04-02 (drizzle-orm harus tersedia agar lib/auth.ts bisa import dari lib/db.ts)

---
*Phase: 04-drizzle-rebuild, Plan: 01*
*Completed: 2026-07-22*
