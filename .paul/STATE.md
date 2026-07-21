# Project State

## Current Position

Phase: 04-drizzle-rebuild — Discussion complete, ready for planning
Status: CONTEXT.md created, awaiting /paul:plan
Last activity: 2026-07-22 — Phase 03 superseded, Phase 04 context written

Progress:
- Phase 02: [██████████] 100% COMPLETE
- Phase 03: [✗✗✗✗✗✗✗✗✗✗] ABANDONED (superseded by Phase 04)
- Phase 04: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
DISCUSS ──▶ PLAN ──▶ APPLY ──▶ UNIFY
   ✓          ○        ○        ○     [Context ready, awaiting plan]
```

## Session Continuity

Last session: 2026-07-22
Stopped at: Phase 04 CONTEXT.md created
Next action: Run /paul:plan to create Phase 04 plan
Resume file: .paul/phases/04-drizzle-rebuild/CONTEXT.md

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
| Discovery 2026-07-22 | toNodeHandler BENAR + bodyParser:false adalah solusi | ESM import issue (bukan toNodeHandler) yang bikin 3e8145e gagal — plan 03-02 gabungkan keduanya |

## Phase Plan

| Phase | Judul | Status |
|-------|-------|--------|
| 02-neondb-migration | NeonDB + Better Auth Migration | COMPLETE |
| 03-auth-fix | Fix Login System | ABANDONED (superseded by Phase 04) |
| 04-drizzle-rebuild | Drizzle ORM + Auth Rebuild | Discussion complete — ready to plan |
