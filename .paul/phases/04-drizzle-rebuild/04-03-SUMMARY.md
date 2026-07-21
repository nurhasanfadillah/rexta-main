---
phase: 04-drizzle-rebuild
plan: 03
subsystem: api
tags: [drizzle-orm, crud, pagination, filtering, ilike, count]

requires:
  - phase: 04-drizzle-rebuild/04-01
    provides: lib/db.ts (Drizzle instance), lib/schema.ts (8 tabel + TypeScript types)
  - phase: 04-drizzle-rebuild/04-02
    provides: lib/auth.ts (single auth instance), requireSession() via auth-middleware

provides:
  - api/categories.ts — Drizzle select/insert/delete
  - api/products.ts — Drizzle CRUD + pagination + filtering (search, categoryId, onlyFavorites)
  - api/products/favorites.ts — Drizzle select (isFavorite=true)
  - api/products/[id]/favorite.ts — Drizzle update toggle + 404 guard
  - api/products/public.ts — Drizzle select + pagination + categories (no auth)
  - api/materials.ts — Drizzle CRUD + pagination + search filtering

affects: [04-04-transactions, frontend yang konsumsi semua endpoint ini]

tech-stack:
  added: []
  patterns: [Drizzle pagination (count+data Promise.all), conditions array untuk dynamic filtering, mapper function $inferSelect → response shape]

key-files:
  created: []
  modified: [api/categories.ts, api/products.ts, api/materials.ts, api/products/public.ts, api/products/favorites.ts, api/products/[id]/favorite.ts]

key-decisions:
  - "conditions.length > 0 ? and(...conditions) : undefined — and() dengan 0 args error"
  - "updatedAt: new Date() di setiap PUT — Drizzle tidak auto-update timestamp"
  - "Numeric fields pakai String() saat insert/update — schema column type numeric"
  - "Body request POST/PUT tetap snake_case (category_id, price_cmt) — konsisten dengan keputusan STATE.md"

patterns-established:
  - "Pagination: Promise.all([db.select({value:count()}), db.select().limit().offset()])"
  - "Dynamic filter: push ke conditions array, spread ke and() hanya jika ada isi"
  - "Mapper fn ($inferSelect → response): camelCase DB field → response shape yang frontend harapkan"
  - "404 guard: check result.length === 0 atau !row setelah .returning()"

duration: ~20min
started: 2026-07-22T00:00:00Z
completed: 2026-07-22T00:20:00Z
---

# Phase 04 Plan 03: CRUD API Rewrite Summary

**6 API handlers dimigrasi dari raw db.query()/sql template ke Drizzle ORM — semua CRUD, pagination, dan filtering sekarang type-safe dengan zero raw SQL.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Started | 2026-07-22 |
| Completed | 2026-07-22 |
| Tasks | 3/3 completed |
| Files modified | 6 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Categories API via Drizzle | Pass | GET select orderBy, POST insert returning, DELETE where eq — tanpa sql`` atau db.query() |
| AC-2: Products semua endpoint via Drizzle | Pass | main CRUD + pagination + filtering, public + categories, favorites list, toggle favorite |
| AC-3: Materials API via Drizzle | Pass | CRUD + pagination + ilike search — pola identik dengan products |
| AC-4: TypeScript bersih di 6 file | Pass | Tidak ada error baru; error yang tersisa hanya di api/transactions.ts dan api/dashboard.ts (expected, Plan 04-04) |

## Accomplishments

- Semua raw `db.query()` dan `sql\`\`` dihapus dari 6 file — zero legacy DB patterns tersisa di file-file ini
- Pagination pattern konsisten dipakai: `Promise.all([count query, data query])` di products, products/public, dan materials
- Dynamic filtering via conditions array + `and(...conditions)` — aman untuk 0 kondisi (undefined fallback)
- Response shapes identik dengan sebelumnya — frontend tidak butuh perubahan

## Task Commits

Tidak ada atomic commits per task — APPLY dieksekusi sebagai continuous rewrite tanpa commit per task.

| Task | Status | Files |
|------|--------|-------|
| Task 1: categories + favorites + toggle | DONE | api/categories.ts, api/products/favorites.ts, api/products/[id]/favorite.ts |
| Task 2: products + public | DONE | api/products.ts, api/products/public.ts |
| Task 3: materials | DONE | api/materials.ts |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `api/categories.ts` | Rewritten | Drizzle select/insert/delete — hapus semua sql`` |
| `api/products/favorites.ts` | Rewritten | Drizzle select where isFavorite=true — hapus sql`` |
| `api/products/[id]/favorite.ts` | Rewritten | Drizzle update + returning + 404 guard — hapus db.query() |
| `api/products.ts` | Rewritten | Drizzle CRUD + pagination (count/ilike/and) + mapper — hapus db.query() |
| `api/products/public.ts` | Rewritten | Drizzle select + categories + pagination (no auth) — hapus db.query()+sql`` |
| `api/materials.ts` | Rewritten | Drizzle CRUD + pagination + ilike search — hapus db.query() |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `conditions.length > 0 ? and(...conditions) : undefined` | `and()` tanpa argumen throw error di Drizzle | Dynamic filter aman untuk 0 kondisi |
| `updatedAt: new Date()` di setiap PUT | Drizzle tidak auto-update timestamp columns | Semua PUT update updatedAt secara eksplisit |
| `String(val \|\| 0)` untuk numeric fields | Schema column type `numeric` butuh string value | Konsisten dengan schema definition di Plan 04-01 |
| Body snake_case dipertahankan di POST/PUT | Keputusan di STATE.md: hindari double mapping di API layer | Frontend tidak perlu berubah cara kirim data |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 0 | — |
| Deferred | 0 | — |
| No atomic commits | 1 | Tasks tidak di-commit per task — semua changes masih unstaged |

**Total impact:** Plan dieksekusi sesuai spec; satu-satunya deviasi adalah tidak ada atomic commit per task (best practice PAUL — perlu dilakukan sebelum Plan 04-04 atau saat fase commit).

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| 6 file masih unstaged di git | APPLY selesai tapi belum ada commit — perlu di-commit sebelum move ke Plan 04-04 |

## Next Phase Readiness

**Ready:**
- 6 API handlers sepenuhnya Drizzle — type-safe, no raw SQL
- Pagination pattern established dan konsisten (products, materials, products/public)
- Response shapes tidak berubah — frontend kompatibel
- Foundation untuk Plan 04-04: transactions dan dashboard aggregate queries

**Concerns:**
- `api/transactions.ts` dan `api/dashboard.ts` masih menggunakan raw db.query() / sql — expected, Plan 04-04
- Git belum ada commit untuk Phase 04 work — semua changes di 6 file masih unstaged
- `npm install` masih diperlukan untuk drizzle-orm tersedia di node_modules (untuk production build)

**Blockers:**
- None untuk Plan 04-04

---
*Phase: 04-drizzle-rebuild, Plan: 03*
*Completed: 2026-07-22*
