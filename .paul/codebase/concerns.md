# Concerns & Technical Debt

## 🔴 HIGH — Security

### 1. GEMINI_API_KEY Exposed ke Client Bundle
**File**: `vite.config.ts` (lines 14-15)

```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

**Impact**: API key ter-embed di bundle JavaScript production — siapapun bisa steal key dari browser.  
**Fix**: Hapus dari `vite.config.ts`. Gemini belum diimplementasi jadi tidak ada yang rusak jika dihapus.

---

### 2. Hardcoded Seed Passwords di Git
**Files**: 
- `scripts/create-admin.mjs` (line 6: `Admin123!`)
- `scripts/seed-user.mjs` (line 6: `admin123`)

**Impact**: Default credentials yang mudah ditebak hardcoded di repository.  
**Fix**: Gunakan prompt interaktif atau env vars untuk password saat seeding.

---

### 3. Input Validation Tidak Ada di API Endpoints
**Files**: Semua file di `api/` — products, materials, categories, transactions

**Impact**: 
- POST `/api/products` — tidak ada validasi bahwa `name`, `categoryId` ada atau valid
- POST `/api/transactions` — tidak ada validasi bahwa `qty` adalah angka positif
- Bisa menyebabkan DB constraint violations dengan error messages yang tidak clean
- Data korup (nama kosong, stok negatif) bisa tersimpan

---

## 🔴 HIGH — Architecture

### 4. Multiple Pool Instances — Connection Exhaustion Risk
**Files**: `lib/db.ts` (max 10), `lib/auth.ts` (Pool), `api/auth-proxy.ts` (Pool inline)

**Impact**: ~25-30 koneksi per cold start. NeonDB free tier limit 100 connections. Under load, bisa exhaustion.  
**Fix**: Single exported Pool di `lib/db.ts`, re-import di `lib/auth.ts` dan `api/auth-proxy.ts`.

---

### 5. Missing apiToggleProductFavorite Request Body
**File**: `services/database.ts` (line ~210)

```typescript
// Bug: _isFavorite parameter tidak dikirim ke API
export const apiToggleProductFavorite = async (id: string, _isFavorite: boolean) => {
  await apiFetch(`/api/products/${id}/favorite`, { method: 'PATCH' });
  // Missing: body: JSON.stringify({ isFavorite: _isFavorite })
};
```

**Impact**: `api/products/[id]/favorite.ts` expects `isFavorite` di request body tapi tidak pernah dikirim.

---

## 🟠 HIGH — Auth System (Phase 03 Active)

### 6. Duplicate Auth Config (auth-proxy.ts vs lib/auth.ts)
**Files**: `api/auth-proxy.ts` (lines 7-18), `lib/auth.ts`

**Issue**: `auth-proxy.ts` buat inline betterAuth config sendiri, duplikat dari `lib/auth.ts`. Ditambahkan sebagai workaround untuk Vercel ESM resolution issue (`ERR_MODULE_NOT_FOUND`).

**Status**: Phase 03 Plan 03-02 sedang address ini. ESM `.js` extension fix di `472997c` seharusnya memungkinkan consolidation.

---

### 7. Tidak Ada Error Boundary
**File**: `App.tsx`

**Impact**: Jika ada child component throw saat render (null dereference, dll.) → blank white screen untuk user.  
**Fix**: Wrap `<App>` dengan `ErrorBoundary` class component sederhana.

---

## 🟡 MEDIUM — Code Quality

### 8. Pervasive `any` Type (40+ occurrences)
**Files**: Semua API handlers (`req: any, res: any`), `App.tsx`, semua komponen besar

```typescript
// API handlers
export default async function handler(req: any, res: any) { ... }

// Catch blocks
} catch (err: any) { onNotify(err.message || '...', 'error'); }

// Transformation functions
const mapProductFromDB = (row: any) => ({ ... })
```

**Impact**: Kehilangan type safety, IDE autocomplete tidak optimal, bug runtime sulit terdeteksi.

---

### 9. File Terlalu Besar

| File | LOC |
|------|-----|
| `components/StockManageView.tsx` | 596 |
| `components/MasterDataView.tsx` | 592 |
| `App.tsx` | ~429 |
| `services/database.ts` | ~319 |
| `components/Layout.tsx` | 264 |
| `components/DashboardView.tsx` | 261 |

**Fix**: Extract ke custom hooks dan sub-components.

---

### 10. Debouncing Tidak Konsisten (Manual setTimeout di 3 Tempat)
**Files**: `PublicStockView.tsx`, `StockManageView.tsx`, `StockOpnameView.tsx`

Implementasi manual `setTimeout` diulang di 3 komponen.  
**Fix**: Extract ke custom hook `useDebounce`.

---

### 11. Console Statements di Production Code
**Files**: 12+ lokasi (App.tsx, database.ts, Layout.tsx, api/ handlers)

```typescript
console.error('[products] GET error:', error);  // api/products.ts
console.log('Service Worker registered');       // Layout.tsx
```

**Fix**: Remove debug logs atau gunakan conditional logging (dev only).

---

## 🟡 MEDIUM — API Design

### 12. HTTP Status Codes Tidak Sesuai Standar
- `POST` create → mengembalikan 200 (seharusnya 201 Created)
- `DELETE` → mengembalikan 200 `{success: true}` (seharusnya 204 No Content)
- Validation errors → langsung 500 (seharusnya 400 Bad Request)

---

## 🟢 LOW — Dead Code

### 13. File Deprecated Masih Ada di Repo

| File | Status |
|------|--------|
| `services/supabaseClient.ts` | Stub kosong — migration note saja |
| `services/geminiService.ts` | Stub kosong |
| `services/storageService.ts` | Stub kosong |
| `db_schema.sql` | Legacy Supabase schema (sudah ada `db_schema_neon.sql`) |

**Fix**: Hapus file-file ini.

---

### 14. Deprecated Env Vars di .env.example

```
VITE_SUPABASE_URL=     # Deprecated
VITE_SUPABASE_ANON_KEY=  # Deprecated
```

**Fix**: Hapus dari `.env.example` agar tidak membingungkan.

---

### 15. navigator.vibrate() Tanpa Feature Detection
**File**: `components/QrScannerModal.tsx`

```typescript
navigator.vibrate(200);  // Crash di desktop/browser yang tidak support
```

**Fix**: `if ('vibrate' in navigator) navigator.vibrate(200);`

---

### 16. Tidak Ada Lazy Loading untuk Views
**File**: `App.tsx`

Semua view components diimport dan dirender upfront. Bundle size bisa dikurangi dengan `React.lazy()` + Suspense.

---

## Priority Fix Order

| # | Issue | Effort | Impact | Phase |
|---|-------|--------|--------|-------|
| 1 | Fix duplicate Pool instances | Low | High | Now |
| 2 | Fix apiToggleProductFavorite missing body | Low | High | Now |
| 3 | Hapus GEMINI_API_KEY dari vite.config.ts | Low | High | Now |
| 4 | Resolve duplicate auth config (auth-proxy vs lib/auth) | Medium | High | Phase 03 |
| 5 | Tambah Error Boundary | Low | High | Next |
| 6 | Tambah input validation di API endpoints | Medium | High | Next |
| 7 | Hapus hardcoded seed passwords | Low | Medium | Next |
| 8 | Ganti `any` dengan proper types | Medium | Medium | Later |
| 9 | Hapus file deprecated (supabaseClient, geminiService, storageService) | Low | Low | Later |
| 10 | Extract debounce ke useDebounce hook | Low | Low | Later |
| 11 | Add lazy loading untuk views | Medium | Low | Later |
