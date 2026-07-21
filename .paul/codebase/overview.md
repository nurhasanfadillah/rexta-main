# Codebase Overview

## What Is This Project?

**REXTA** adalah aplikasi manajemen inventaris berbasis web (PWA) untuk usaha kecil-menengah. Fitur utama: CRUD produk/bahan baku, transaksi stok IN/OUT, stock opname, laporan PDF, QR code scan/generate, dan mode publik read-only tanpa login.

## Key Stats

| Metric | Value |
|--------|-------|
| Framework | React 19.2.3 + Vite 6.2.0 |
| Language | TypeScript 5.8.2 |
| Backend | NeonDB (PostgreSQL) + Better Auth 1.6.23 |
| API Layer | Vercel Edge Functions (`api/` — 10 endpoints) |
| Total Components | 15 TSX files (~3,000 LOC) |
| Total Services | 1 active (`services/database.ts`), 3 stubs (deprecated) |
| App Entry | `index.html` → `index.tsx` → `App.tsx` |
| Lines of Code (est.) | ~5,200 LOC |
| Tests | None |

## What It Does

- **Dashboard**: Ringkasan stok, aset total, produk favorit, transaksi terkini
- **Master Data**: CRUD produk, bahan baku, kategori dengan pagination + search
- **Manajemen Stok**: Transaksi IN/OUT dengan QR code scanner
- **Stock Opname**: Penghitungan fisik stok dan rekonsiliasi (manual override)
- **Laporan**: Filter rentang tanggal, ekspor PDF (jsPDF)
- **Akses Publik**: Mode read-only tanpa login (`/api/products/public`)
- **PWA**: Offline support via Service Worker v7, installable

## Project Type

Single-page application (SPA) — tidak ada SSR. Tab-based routing (bukan React Router). React state di `App.tsx` sebagai root container, diteruskan ke children via props.

## Architecture Summary

```
Frontend (React 19 SPA)
  ↓ fetch + credentials
services/database.ts (API client)
  ↓ HTTP requests
api/ (Vercel Edge Functions — 10 endpoints)
  ↓ parameterized SQL
lib/db.ts → NeonDB PostgreSQL
```

## Main Entry Points

| File | Role |
|------|------|
| `index.html` | HTML shell, Tailwind CDN config, PWA meta |
| `index.tsx` | React DOM mount (`createRoot`) |
| `App.tsx` | Root state container, auth gate, tab routing (~429 LOC) |
| `services/database.ts` | Semua API calls frontend → backend (~319 LOC) |
| `lib/auth.ts` | Better Auth server config |
| `lib/db.ts` | NeonDB Pool + HTTP adapter |
| `types.ts` | Semua TypeScript types/interfaces domain |

## Domain Model

```
Category (1) ─── (N) Product ─── (N) Transaction
Material (1) ───────────────────── (N) Transaction

Better Auth tables: user, session, account, verification
```

## Current Phase

**Phase 03 — Auth Fix** (sedang berjalan): Fix login system Better Auth di Vercel. Phase 02 (NeonDB + Better Auth migration) sudah COMPLETE.
