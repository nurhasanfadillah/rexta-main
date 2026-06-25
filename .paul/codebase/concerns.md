# Concerns & Technical Debt

## 🔴 HIGH — Security

### 1. Hardcoded Supabase Credentials
**File**: `services/supabaseClient.ts` (lines 8, 12)  
**Issue**: Supabase URL dan JWT anon key hardcoded sebagai fallback values di source code yang ter-commit ke git.

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wrggkbacornocdgamwkj.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGci...FULL_JWT...';
```

**Impact**: Siapapun yang punya akses repo bisa akses Supabase dengan anonymous privileges.  
**Fix**: Hapus hardcoded fallback, wajibkan env vars, tambahkan validation.

---

### 2. Gemini API Key Exposed ke Client
**File**: `vite.config.ts` (lines 14-15)  
**Issue**: `GEMINI_API_KEY` di-inject ke client bundle via Vite `define`:

```typescript
define: { 'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY) }
```

**Impact**: API key terlihat jelas di bundle JavaScript production → theft dan abuse.  
**Fix**: Gemini harus dipanggil dari server-side (atau tidak perlu karena geminiService.ts kosong).

---

### 3. Tidak Ada Input Validation
**Files**: `components/MasterDataView.tsx`, `components/StockManageView.tsx`  
**Issue**: Input dari form (nama, qty, harga) langsung dikirim ke API tanpa validasi.  
**Impact**: Stok negatif, nama kosong, angka negatif bisa tersimpan ke database.  
**Fix**: Validasi di handler sebelum API call.

---

## 🔴 HIGH — Missing Infrastructure

### 4. Tidak Ada Error Boundary
**Issue**: Tidak ada `ErrorBoundary` component di App.tsx atau di mana pun.  
**Impact**: Unhandled React error (misal: null dereference di render) crash seluruh aplikasi → blank white screen.  
**Fix**: Wrap App dengan ErrorBoundary sederhana.

---

### 5. Tidak Ada Tests
**Issue**: Zero test coverage. Lihat `testing.md` untuk detail.  
**Impact**: Tidak ada safety net saat refactor atau bug fix.

---

## 🟡 MEDIUM — Code Quality

### 6. File Terlalu Besar
| File | LOC |
|------|-----|
| `components/StockManageView.tsx` | 596 |
| `components/MasterDataView.tsx` | 592 |
| `App.tsx` | 440 |
| `services/database.ts` | 426 |
| `components/Layout.tsx` | 264 |
| `components/DashboardView.tsx` | 261 |

**Fix**: Pecah menjadi komponen dan hooks yang lebih kecil.

---

### 7. Pervasive `any` Type (40+ occurrences)
**Files**: `services/database.ts`, `App.tsx`, semua komponen besar  

```typescript
// Contoh dari database.ts
const logError = (context: string, error: any) => { ... }
const mapProductFromDB = (data: any): Product => { ... }

// Dari App.tsx (setiap catch block)
} catch (err: any) { ... }
```

**Impact**: Kehilangan type safety, IDE autocomplete tidak optimal, bug runtime sulit terdeteksi.  
**Fix**: Ganti `any` dengan tipe spesifik, tambah `PostgrestError` type dari Supabase SDK.

---

### 8. ID Generation Lemah
**File**: `App.tsx` (lines 65, 253, 280, 331)  

```typescript
const id = Date.now().toString() + Math.random().toString();
const id = 'CAT-${Date.now()}-${Math.floor(Math.random() * 1000)}';
```

**Impact**: Collision-prone, tidak cryptographically secure.  
**Fix**: Gunakan `crypto.randomUUID()` (built-in browser API) atau Supabase auto-generated UUID.

---

### 9. Console Statements di Production
**Files**: 12+ lokasi (App.tsx, database.ts, Layout.tsx, LoginView.tsx, dll.)  

```typescript
console.error(`[DB Error] ${context}:`, msg);  // database.ts
console.log('Service Worker registered');       // Layout.tsx
console.error(err);                             // LoginView.tsx
```

**Fix**: Gunakan logger library (atau hapus debug logs) untuk production build.

---

## 🟡 MEDIUM — Architecture

### 10. Prop Drilling dalam di App.tsx
**Issue**: App.tsx meneruskan puluhan props dan handlers ke Layout → View components.  
**Impact**: Sulit menambah fitur baru, setiap perubahan interface mempengaruhi banyak file.  
**Fix**: Pertimbangkan React Context atau Zustand untuk state yang sering diakses.

---

### 11. Tailwind via CDN (bukan npm)
**File**: `index.html`  
**Issue**: Tailwind diload dari `cdn.tailwindcss.com` — tidak bisa tree-shake, dependent internet untuk initial load, bundle lebih besar.  
**Fix**: Install Tailwind via npm + PostCSS untuk production build yang optimal.

---

### 12. Debouncing Tidak Konsisten
**Files**: `PublicStockView.tsx`, `StockManageView.tsx`, `StockOpnameView.tsx`  
**Issue**: Implementasi debounce 500ms dengan `setTimeout` diulang di 3 tempat.  
**Fix**: Extract ke custom hook `useDebounce`.

---

## 🟢 LOW — Dead Code

### 13. File Deprecated Masih Ada di Repo
| File | Status |
|------|--------|
| `components/AiAssistantView.tsx` | File isi hanya komentar: "FILE INI SUDAH DIHAPUS" |
| `services/geminiService.ts` | File isi hanya komentar (kosong) |
| `services/storageService.ts` | File isi hanya migration note (kosong) |

**Fix**: Hapus ketiga file ini.

---

### 14. Browser API Tanpa Feature Detection
**File**: `components/QrScannerModal.tsx` (lines 52, 83)  

```typescript
navigator.vibrate(200); // Tidak ada check 'vibrate' in navigator
```

**Fix**: `if ('vibrate' in navigator) navigator.vibrate(200);`

---

## Priority Fix Order

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | Hapus hardcoded Supabase credentials | Low | High |
| 2 | Hapus Gemini key dari client bundle | Low | High |
| 3 | Tambah Error Boundary | Low | High |
| 4 | Validasi input form | Medium | High |
| 5 | Ganti `any` dengan proper types | Medium | Medium |
| 6 | Ganti ID generation ke crypto.randomUUID() | Low | Medium |
| 7 | Hapus file deprecated | Low | Low |
| 8 | Install Tailwind via npm | Medium | Medium |
| 9 | Tambah tests (mulai dari database.ts) | High | High |
| 10 | Pecah file besar | High | Medium |
