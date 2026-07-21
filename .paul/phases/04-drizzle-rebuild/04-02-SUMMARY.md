---
phase: 04-drizzle-rebuild
plan: 02
subsystem: auth
tags: [better-auth, drizzle-adapter, pool, neon, auth-proxy]

requires:
  - phase: 04-drizzle-rebuild/04-01
    provides: lib/db.ts (Drizzle instance + single Pool), lib/schema.ts (8 tabel)

provides:
  - lib/auth.ts — betterAuth dengan drizzleAdapter, single auth instance
  - api/auth-proxy.ts — proxy handler yang pakai shared auth instance

affects: [semua api handlers yang pakai requireSession(), 04-03-crud-api, 04-04-transactions]

tech-stack:
  added: [better-auth/adapters/drizzle]
  patterns: [single auth instance via lib/auth.ts, shared across proxy + middleware]

key-files:
  created: []
  modified: [lib/auth.ts, api/auth-proxy.ts]

key-decisions:
  - "drizzleAdapter(db, { provider: 'pg' }) — bukan database: db langsung"
  - "toNodeHandler(auth) dibuat di module level (bukan per request)"
  - "auth-proxy tidak buat auth sendiri — import dari lib/auth.ts"

patterns-established:
  - "Single auth: semua consumers (middleware, proxy) import dari lib/auth.ts"
  - "Single Pool: lib/db.ts satu-satunya tempat Pool dibuat di seluruh codebase"

duration: ~10min
started: 2026-07-22T00:00:00Z
completed: 2026-07-22T00:10:00Z
---

# Phase 04 Plan 02: Auth Rebuild Summary

**Better Auth dikonfigurasi ulang dengan drizzleAdapter(db) — menghapus 2 Pool duplikat dan 2 betterAuth() terpisah menjadi satu auth instance yang dipakai oleh auth-proxy dan auth-middleware.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~10 min |
| Started | 2026-07-22 |
| Completed | 2026-07-22 |
| Tasks | 2/2 completed |
| Files modified | 2 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Single auth instance | Pass | auth-proxy import `auth` dari lib/auth.ts — konsisten dengan auth-middleware |
| AC-2: Zero duplicate Pool | Pass | `grep "new Pool"` seluruh codebase → hanya lib/db.ts:5 |
| AC-3: TypeScript bersih di file dimodifikasi | Pass | Tidak ada error baru di lib/auth.ts atau api/auth-proxy.ts |

## Accomplishments

- Duplikasi `betterAuth()` dihapus: sebelumnya ada 2 instance terpisah (lib/auth.ts dan api/auth-proxy.ts) — sekarang satu instance dari lib/auth.ts
- Duplikasi Pool dihapus: dari 3 Pool (lib/db.ts + lib/auth.ts + api/auth-proxy.ts) menjadi 1 Pool di lib/db.ts
- Better Auth sekarang pakai Drizzle untuk semua DB operations (bukan raw pg Pool) — konsisten dengan seluruh stack Phase 04

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `lib/auth.ts` | Rewritten | drizzleAdapter(db), import db dari lib/db.ts, hapus Pool lokal |
| `api/auth-proxy.ts` | Rewritten | Import shared auth, hapus Pool + betterAuth lokal, pertahankan toNodeHandler + bodyParser:false |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `drizzleAdapter(db, { provider: 'pg' })` bukan `database: db` | Better Auth butuh adapter wrapper untuk Drizzle — raw db instance tidak valid | Auth queries type-safe via Drizzle |
| `toNodeHandler(auth)` di module level | Avoid re-creating handler per request — satu handler untuk semua requests | Lebih efisien, konsisten dengan Better Auth pattern |

## Deviations from Plan

None — plan dieksekusi persis seperti yang ditulis.

## Issues Encountered

None — kedua file rewrite bersih, semua verify checks lulus.

## Next Phase Readiness

**Ready:**
- `lib/auth.ts` siap: single auth instance via drizzleAdapter
- `api/auth-proxy.ts` siap: shared auth, bodyParser:false dipertahankan
- `lib/auth-middleware.ts` tidak perlu berubah — sudah import auth dari lib/auth.ts
- Single Pool enforced di seluruh codebase

**Concerns:**
- `api/categories.ts`, `api/products/*.ts` masih import `sql` yang sudah dihapus — aplikasi belum bisa build (Plan 04-03 fix)
- `npm install` masih perlu dijalankan (drizzle-orm, drizzle-kit belum di node_modules)

**Blockers:**
- `npm install` wajib sebelum deploy/test (untuk drizzle-orm + better-auth/adapters/drizzle tersedia)

---
*Phase: 04-drizzle-rebuild, Plan: 02*
*Completed: 2026-07-22*
