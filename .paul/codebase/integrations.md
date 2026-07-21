# External Integrations

## NeonDB (Primary Database)

**Client**: `@neondatabase/serverless` 1.1.0  
**File**: `lib/db.ts`

```typescript
// Pool untuk Better Auth + CRUD queries
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
});

// HTTP adapter untuk queries stateless (categories GET)
export const sql = neon(process.env.DATABASE_URL!);
```

**Tables**: `categories`, `products`, `materials`, `transactions`  
**Schema**: `db_schema_neon.sql`  
**Env**: `DATABASE_URL=postgresql://...?sslmode=require`

---

## Better Auth (Authentication)

**Version**: 1.6.23  
**Files**: `lib/auth.ts`, `lib/auth-middleware.ts`, `api/auth-proxy.ts`, `services/database.ts`

### Server Config (`lib/auth.ts`)
```typescript
export const auth = betterAuth({
  database: Pool (NeonDB),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL],
});
```

### Client Config (`services/database.ts`)
```typescript
const authClient = createAuthClient({ baseURL: window.location.origin });
export const signIn = (email, password) => authClient.signIn.email({ email, password });
export const signOut = () => authClient.signOut();
export const getCurrentSession = () => authClient.getSession();
```

### Auth Flow
- Login → `POST /api/auth/sign-in/email` → rewritten ke `/api/auth-proxy?p=sign-in/email`
- Session disimpan sebagai httpOnly cookie
- Setiap API request proteksi via `requireSession(req)` di `lib/auth-middleware.ts`

**Auth Tables**: `user`, `session`, `account`, `verification` (di NeonDB)  
**Env**: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

---

## Vercel (Deployment)

**Project ID**: `prj_jwobHvlhwhVP4SxfvzyJS3Yaffai`  
**File**: `vercel.json`, `.vercel/project.json`

```json
{
  "rewrites": [
    { "source": "/api/auth/:path*", "destination": "/api/auth-proxy?p=:path*" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

---

## PDF Generation (jsPDF)

**Libraries**: `jspdf` 2.5.1 + `jspdf-autotable` 3.8.2  
**File**: `components/ReportsView.tsx`  
**Usage**: Export laporan transaksi ke PDF dengan tabel formatted

---

## QR Code

### Scanner (jsQR)
**Library**: `jsqr` 1.4.0  
**File**: `components/QrScannerModal.tsx`  
**Usage**: Scan QR code via kamera device → auto-fill produk di form transaksi  
**Performance**: Scan throttled setiap 500ms agar device tidak panas

### Generator (qrcode)
**Library**: `qrcode` 1.5.3  
**File**: `components/QrLabelModal.tsx`  
**Usage**: Generate QR label untuk produk/material, printable

---

## PWA — Service Worker

**File**: `sw.js` (v7)  
**Registration**: `components/Layout.tsx`

Cache strategies:
- **`rexta-app-v7`**: Pre-cache critical shell (`/, /index.html, /manifest.json`)
- **`rexta-runtime-v7`**: Cache-first untuk CDN (Tailwind, esm.sh, fonts)
- **`rexta-images-v7`**: Stale-while-revalidate untuk gambar CDN
- **API calls**: Network only (tidak di-cache)

**Manifest** (`manifest.json`):
- `name`: "REXTA Inventory Management"
- `short_name`: "REXTA"
- `display`: standalone
- `theme_color`: #020617

---

## Tailwind CSS (CDN)

**Source**: `https://cdn.tailwindcss.com`  
**Config**: Inline di `index.html` (tidak di-install via npm)

Custom theme colors:
```javascript
primary: '#0891b2'      // Cyan 600
success: '#10b981'      // Emerald 500
danger: '#f43f5e'       // Rose 500
warning: '#f59e0b'      // Amber 500
darkSurface: '#020617'
darkCard: '#0f172a'
```

---

## Google Fonts

**Source**: `https://fonts.googleapis.com`  
**Font**: Inter (weights 300–700)  
**Usage**: Font utama seluruh aplikasi

---

## Flaticon CDN

**Source**: `https://cdn-icons-png.flaticon.com`  
**Usage**: App icon untuk PWA manifest (192x192, 512x512)

---

## Lucide React

**Version**: 0.562.0  
**Usage**: Semua icon di UI (sidebar, buttons, modals, notifications)  
**Install**: npm package

---

## Browser APIs

| API | Used In | Usage |
|-----|---------|-------|
| `MediaDevices.getUserMedia` | `QrScannerModal.tsx` | Akses kamera untuk scan QR |
| `navigator.vibrate()` | `QrScannerModal.tsx` | Haptic feedback saat scan berhasil |
| `localStorage` | `Layout.tsx` | Simpan preferensi dark mode (`rexta_theme`) |
| `ServiceWorker` | `Layout.tsx` | Registrasi SW untuk PWA |
| `Canvas API` | `QrScannerModal.tsx` | Process frame kamera untuk jsQR |

> **Issue**: `navigator.vibrate()` dipanggil tanpa feature detection (`'vibrate' in navigator`).

---

## Deprecated Integrations

| Integration | Status | Replaced By |
|-------------|--------|-------------|
| Supabase Auth | REMOVED | Better Auth 1.6.23 |
| Supabase PostgreSQL | REMOVED | NeonDB + @neondatabase/serverless |
| Netlify | REMOVED | Vercel Edge Functions |
| Google Gemini AI | NEVER IMPLEMENTED | N/A (placeholder saja) |

File sisa (stubs kosong): `services/supabaseClient.ts`, `services/geminiService.ts`, `services/storageService.ts`
