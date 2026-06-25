# Technology Stack

## Core

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| UI Framework | React | 19.2.3 | Latest, functional components only |
| Build Tool | Vite | 6.2.0 | Dev server port 3000 |
| Language | TypeScript | ~5.8.2 | ES2022 target, strict off |
| Styling | Tailwind CSS | CDN | Config inline di `index.html`, dark mode `class` |

## Backend & Data

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Backend-as-a-Service | Supabase | 2.39.3 | PostgreSQL + Auth + RPC |
| Auth | Supabase Auth | — | Email/password, session via SDK |
| Database | PostgreSQL | (Supabase managed) | RLS enabled, schema di `db_schema.sql` |
| ORM | None | — | Direct Supabase SDK queries |

## UI Libraries

| Library | Version | Usage |
|---------|---------|-------|
| lucide-react | 0.562.0 | Semua icon di UI |
| jspdf | 2.5.1 | Export laporan ke PDF |
| jspdf-autotable | 3.8.2 | Tabel dalam PDF |
| jsqr | 1.4.0 | QR code scanning dari kamera |
| qrcode | 1.5.3 | Generate QR label |

## External CDN Dependencies

| Resource | Source | Usage |
|---------|--------|-------|
| Tailwind CSS | cdn.tailwindcss.com | Styling framework |
| Google Fonts (Inter) | fonts.googleapis.com | Font utama |
| App icon | cdn-icons-png.flaticon.com | PWA icon |

## PWA

| File | Purpose |
|------|---------|
| `manifest.json` | PWA manifest (standalone, landscape) |
| `sw.js` | Service Worker v7, 3 cache strategies |

Cache strategy:
- Critical cache `rexta-app-v7`: pre-cached HTML, manifest
- Runtime cache `rexta-runtime-v7`: CDN libraries (cache-first)
- Image cache `rexta-images-v7`: gambar CDN

## Tooling

| Tool | Status | Config File |
|------|--------|-------------|
| ESLint | NOT configured | — |
| Prettier | NOT configured | — |
| Biome | NOT configured | — |
| Testing (Jest/Vitest) | NOT configured | — |
| CI/CD (GitHub Actions) | NOT configured | — |
| Docker | NOT configured | — |

## Deployment

- Target: Netlify (ada `_redirects` file)
- Package manager: npm (tidak ada lock file di repo)
- Build: `npm run build` → Vite outputs `dist/`

## Environment Variables

| Variable | Usage | Current State |
|---------|-------|---------------|
| `VITE_SUPABASE_URL` | Supabase URL | Hardcoded fallback di `services/supabaseClient.ts` |
| `VITE_SUPABASE_ANON_KEY` | Supabase key | Hardcoded fallback di `services/supabaseClient.ts` |
| `GEMINI_API_KEY` | Gemini AI | Exposed ke client via `vite.config.ts` define |

> **SECURITY ISSUE**: Credentials Supabase hardcoded di source code. Lihat `concerns.md`.

## TypeScript Config (`tsconfig.json`)

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "allowJs": true,
  "skipLibCheck": true,
  "isolatedModules": true,
  "noEmit": true,
  "paths": { "@/*": ["./*"] }
}
```

Strict mode: OFF. Path alias `@/` tersedia tapi jarang digunakan (kebanyakan relative imports).
