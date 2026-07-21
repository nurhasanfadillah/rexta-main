# Technology Stack

## Summary Table

| Layer | Technology | Version | File |
|-------|-----------|---------|------|
| UI Framework | React | 19.2.3 | `package.json` |
| Build Tool | Vite | 6.2.0 | `vite.config.ts` |
| Language | TypeScript | 5.8.2 | `tsconfig.json` |
| Database | NeonDB (PostgreSQL) | — | `lib/db.ts` |
| DB Client | @neondatabase/serverless | 1.1.0 | `package.json` |
| Auth | Better Auth | 1.6.23 | `lib/auth.ts`, `api/auth-proxy.ts` |
| Styling | Tailwind CSS (CDN) | v4 | `index.html` (inline config) |
| Icons | lucide-react | 0.562.0 | `package.json` |
| PDF Export | jsPDF + jspdf-autotable | 2.5.1 + 3.8.2 | `components/ReportsView.tsx` |
| QR Generate | qrcode | 1.5.3 | `components/QrLabelModal.tsx` |
| QR Scan | jsqr | 1.4.0 | `components/QrScannerModal.tsx` |
| Deployment | Vercel Edge Functions | — | `vercel.json`, `api/` |
| PWA | Service Worker | v7 | `sw.js`, `manifest.json` |

## Frontend

### React 19.2.3
- Uses `createRoot()` API (React 19 concurrent)
- Entry: `index.tsx` → mounts ke `#root`
- Semua komponen: functional dengan hooks (useState, useEffect, useCallback)
- **No React Router** — tab routing via `useState<TabView>` di `App.tsx`
- **No Context API, Redux, Zustand** — state diteruskan lewat props

### Vite 6.2.0
- Config: `vite.config.ts`
- Dev server: `http://0.0.0.0:3000`
- Path alias: `@` → root directory (`.`)
- Build output: `dist/`
- Module type: `"module"` (ESM) di `package.json`

### TypeScript 5.8.2
- Target: ES2022, module: ESNext
- `strict: false` (strict mode OFF)
- `noEmit: true` (hanya type-check, build via Vite)
- Path alias `@/*` → `./`
- `allowImportingTsExtensions: true`

### Tailwind CSS (CDN)
- Dimuat via `<script src="https://cdn.tailwindcss.com">` di `index.html`
- Inline config di `index.html` (lines 27–66): custom colors, dark mode via `class`
- Custom theme: primary cyan (#0891b2), danger rose, success emerald, warning amber
- **Tidak diinstall via npm** — CDN only, tidak ada tree-shaking

## Backend

### NeonDB (@neondatabase/serverless 1.1.0)
- File: `lib/db.ts`
- **2 adapter terpisah**:
  1. `db` — `Pool` (max 10, connectionTimeout 5s) — untuk CRUD queries + Better Auth
  2. `sql` — `neon()` HTTP adapter — untuk queries stateless (categories GET)
- Env var: `DATABASE_URL`
- ⚠️ Multiple Pool instances: `lib/db.ts`, `lib/auth.ts`, dan `api/auth-proxy.ts` masing-masing buat Pool sendiri

### Better Auth 1.6.23
- File server config: `lib/auth.ts`
- File middleware: `lib/auth-middleware.ts`
- File proxy handler: `api/auth-proxy.ts`
- Mode: email/password saja (tidak ada OAuth/social login)
- Auth tables di NeonDB: `user`, `session`, `account`, `verification`
- Env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`

### Vercel Edge Functions
- Semua file di `api/` di-deploy sebagai serverless functions
- Routing via `vercel.json`:
  - `/api/auth/*` → `/api/auth-proxy?p=:path*`
  - `/((?!api/).*)`→ `/index.html` (SPA fallback)
- Vercel project: `prj_jwobHvlhwhVP4SxfvzyJS3Yaffai`

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Dev server |
| `npm run build` | `vite build` | Production build |
| `npm run preview` | `vite preview` | Preview build |
| `npm run seed:admin` | `node --env-file=.env scripts/create-admin.mjs` | Buat admin user |

## Environment Variables

| Var | Used By | Status |
|-----|---------|--------|
| `DATABASE_URL` | `lib/db.ts`, `lib/auth.ts` | Required |
| `BETTER_AUTH_SECRET` | `lib/auth.ts` | Required |
| `BETTER_AUTH_URL` | `lib/auth.ts` | Required |
| `GEMINI_API_KEY` | `vite.config.ts` (exposed to client bundle!) | ⚠️ Security risk |
| `VITE_SUPABASE_URL` | — | Deprecated |
| `VITE_SUPABASE_ANON_KEY` | — | Deprecated |

## Tooling Status

| Tool | Status |
|------|--------|
| ESLint | NOT configured |
| Prettier | NOT configured |
| Testing (Vitest/Jest) | NOT configured |
| CI/CD (GitHub Actions) | NOT configured |

## CDN Dependencies (Runtime)

| CDN | URL | Purpose |
|-----|-----|---------|
| Tailwind CSS | cdn.tailwindcss.com | Styling |
| Google Fonts | fonts.googleapis.com | Inter font |
| Flaticon | cdn-icons-png.flaticon.com | App icons (PWA) |
| esm.sh | esm.sh | Browser-based module imports |

## Deprecated (Removed)
- **Supabase** (`@supabase/supabase-js`) — Fully replaced oleh NeonDB + Better Auth di Phase 02
- File sisa (stubs kosong): `services/supabaseClient.ts`, `services/geminiService.ts`, `services/storageService.ts`
