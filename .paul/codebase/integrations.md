# External Integrations

## Supabase (Primary Backend)

**Version**: 2.39.3  
**File**: `services/supabaseClient.ts`, `services/database.ts`

### Config

```typescript
// services/supabaseClient.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wrggkbacornocdgamwkj.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGci...'; // ⚠️ HARDCODED
```

> **SECURITY**: Credentials hardcoded sebagai fallback. Lihat `concerns.md`.

### Database Tables

| Table | Purpose |
|-------|---------|
| `categories` | Kategori produk |
| `products` | Inventaris produk dengan stok, harga |
| `materials` | Bahan baku dengan stok dan harga |
| `transactions` | Riwayat transaksi IN/OUT/OPNAME |
| `auth.users` | Managed oleh Supabase Auth |

### Features Used

- **Supabase Auth**: Email/password login via `signIn()`, `signOut()`, `getCurrentSession()`
- **Row Level Security (RLS)**: Aktif pada semua tabel
- **RPC**: `process_inventory_transaction` — atomic stock update + transaction record
- **Realtime**: Tidak digunakan
- **Storage**: Tidak digunakan (ada `storageService.ts` yang deprecated)

### Schema Files

- `db_schema.sql` — definisi tabel dan index
- `db_config.sql` — konfigurasi awal database

---

## Supabase Auth

**Method**: Email/password  
**Session**: Managed otomatis oleh Supabase SDK  
**No OAuth**: Tidak ada Google/GitHub login  

```typescript
// services/database.ts
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  ...
};
```

---

## Google Gemini AI (Placeholder)

**Status**: BELUM DIIMPLEMENTASI  
**File**: `services/geminiService.ts` (file kosong, hanya komentar)  
**Config**: `GEMINI_API_KEY` di `vite.config.ts` (exposed ke client — security risk)

Planned tapi tidak ada implementasi aktual. `AiAssistantView.tsx` juga deprecated.

---

## PDF Generation (jsPDF)

**Libraries**: `jspdf` 2.5.1 + `jspdf-autotable` 3.8.2  
**File**: `components/ReportsView.tsx`  
**Usage**: Export laporan transaksi ke PDF dengan tabel

---

## QR Code

### Scanner (jsQR)
**Library**: `jsqr` 1.4.0  
**File**: `components/QrScannerModal.tsx`  
**Usage**: Scan QR code via kamera device → auto-fill produk di form transaksi  
**Performance note** (line 48): "PERFORMANCE FIX: Hanya scan setiap 500ms agar HP tidak panas/lag"

### Generator (qrcode)
**Library**: `qrcode` 1.5.3  
**File**: `components/QrLabelModal.tsx`  
**Usage**: Generate QR label untuk produk/material, bisa di-print

---

## Tailwind CSS (CDN)

**Source**: `https://cdn.tailwindcss.com`  
**Config**: Inline di `index.html` (lines 27-66)  

Custom theme colors:
```javascript
primary: '#0891b2'    // Cyan 600
success: '#10b981'    // Emerald 500
danger: '#f43f5e'     // Rose 500
warning: '#f59e0b'    // Amber 500
darkSurface: '#020617'
darkCard: '#0f172a'
```

> **Note**: Menggunakan CDN (bukan npm install) artinya tidak bisa tree-shake, dan ada dependency ke internet untuk load CSS.

---

## Google Fonts

**Source**: `https://fonts.googleapis.com`  
**Font**: Inter (weights 400, 500, 600, 700)  
**Usage**: Font utama seluruh aplikasi  

---

## Flaticon CDN

**Source**: `https://cdn-icons-png.flaticon.com`  
**Usage**: App icon untuk PWA (`manifest.json`)

---

## Lucide React

**Version**: 0.562.0  
**Usage**: Semua icon di UI (sidebar, buttons, modals)  
**Installation**: npm package (tidak via CDN)

---

## Browser APIs

| API | Used In | Usage |
|-----|---------|-------|
| `MediaDevices.getUserMedia` | QrScannerModal.tsx | Akses kamera untuk scan QR |
| `navigator.vibrate()` | QrScannerModal.tsx (L52, L83) | Haptic feedback saat scan berhasil |
| `localStorage` | Layout.tsx, App.tsx | Simpan preferensi dark mode (`rexta_theme`) |
| `ServiceWorker` | Layout.tsx | Registrasi SW untuk PWA |
| `Canvas API` | QrScannerModal.tsx | Process frame kamera untuk jsQR |

> **Issue**: `navigator.vibrate()` dipanggil tanpa feature detection (`'vibrate' in navigator`).

---

## Service Worker

**File**: `sw.js` (v7)  
**Registration**: `components/Layout.tsx`  

Cache strategies:
- Navigation requests → Network first, fallback ke cache
- CDN assets (Tailwind, Lucide) → Cache first (performance)
- Image requests → Stale while revalidate
- API calls ke Supabase → Network only (tidak di-cache)
