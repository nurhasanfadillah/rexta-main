# Codebase Overview

## What Is This Project?

**REXTA** adalah aplikasi manajemen inventaris berbasis web (PWA) untuk mencatat stok produk dan bahan baku. Dirancang untuk usaha kecil-menengah dengan fitur transaksi masuk/keluar, stock opname, laporan, dan QR code scanning.

## Key Stats

| Metric | Value |
|--------|-------|
| Framework | React 19.2.3 + Vite 6.2.0 |
| Language | TypeScript 5.8.2 |
| Backend | Supabase (PostgreSQL) |
| Total Components | 15 TSX files |
| Total Services | 4 TS files (2 active, 2 deprecated) |
| App Entry | index.html → index.tsx → App.tsx |
| Lines of Code (est.) | ~3,500 LOC |
| Tests | None |

## What It Does

- **Dashboard**: Ringkasan stok, aset total, produk favorit
- **Master Data**: CRUD produk, bahan baku, kategori dengan pagination
- **Manajemen Stok**: Transaksi IN/OUT dengan QR code scanner
- **Stock Opname**: Penghitungan fisik stok dan rekonsiliasi
- **Laporan**: Riwayat transaksi, ekspor PDF
- **Akses Publik**: Mode read-only tanpa login untuk cek stok
- **PWA**: Offline support via service worker, installable

## Project Type

Single-page application (SPA) — tidak menggunakan Next.js, tidak ada SSR. Pure client-side React dengan Supabase sebagai backend penuh.

## Main Entry Points

| File | Role |
|------|------|
| `index.html` | HTML shell, Tailwind CDN config, PWA meta |
| `index.tsx` | React DOM mount point |
| `App.tsx` | Root state container (440 LOC) |
| `services/database.ts` | Semua Supabase API calls (426 LOC) |
| `types.ts` | Semua TypeScript types/interfaces |

## Domain Model

```
Category (1) ─── (N) Product ─── (N) Transaction
Material (1) ─────────────────── (N) Transaction
```

Types: `Product`, `Material`, `Category`, `Transaction`, `InventoryData`, `TabView`, `TransactionType`, `ItemType`
