# Project State

## Current Position

Phase: 03-auth-fix — Planning
Plan: 03-01 created, awaiting approval
Status: PLAN created, ready for APPLY
Last activity: 2026-07-20 — Created .paul/phases/03-auth-fix/03-01-PLAN.md

Progress:
- Phase 02: [██████████] 100% COMPLETE
- Phase 03: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [Tasks complete, awaiting human verify checkpoint]
```

## Session Continuity

Last session: 2026-07-20
Stopped at: Plan 03-01 created
Next action: Review plan, then run /paul:apply .paul/phases/03-auth-fix/03-01-PLAN.md
Resume file: .paul/phases/03-auth-fix/03-01-PLAN.md

## Decisions

| Keputusan | Pilihan | Alasan |
|----------|---------|--------|
| Backend layer | Vercel Edge Functions (`api/`) | App sudah di Vercel, perubahan incremental |
| Auth replacement | Better Auth | Open source, PostgreSQL-native, aktif dikembangkan |
| DB client | @neondatabase/serverless Pool | Official Neon driver, optimal untuk serverless |
| Data migration | Fresh start | Supabase account tidak bisa diakses |
| Schema adaptation | Remove RLS, keep stored procedure | Stored procedure adalah standard PL/pgSQL |
| Plan 02-02 scope split | Split CRUD API menjadi 2 plan | 6+ task terlalu besar untuk 1 plan |
| requireSession() throw | Error throw bukan return null | Caller try/catch lebih clean |
| GET /categories public | Tidak perlu auth untuk GET categories | Public stock view butuh daftar categories |
| Body snake_case (POST/PUT products) | Konsisten dengan DB schema | Hindari double mapping di API layer |
| Auth proxy handler | auth.handler (fetch-based) bukan toNodeHandler | Vercel auto-parse body ke req.body, stream sudah kosong ketika toNodeHandler coba baca |

## Phase Plan

| Phase | Judul | Status |
|-------|-------|--------|
| 02-neondb-migration | NeonDB + Better Auth Migration | COMPLETE |
| 03-auth-fix | Fix Login System | Planning |
