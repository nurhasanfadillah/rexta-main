---
phase: 01-deploy-vercel
topic: Deploy Vite SPA ke Vercel dengan custom domain rexta.redone.my.id
depth: standard
confidence: HIGH
created: 2026-06-25
---

# Discovery: Deploy Rexta ke Vercel + Custom Domain

**Recommendation:** Deploy via Vercel CLI dengan 4 perubahan kode + konfigurasi DNS manual oleh user.

**Confidence:** HIGH — Vite + Vercel adalah kombinasi yang sangat well-documented, semua findings diverifikasi dari codebase aktual.

---

## Objective

Yang perlu diketahui sebelum planning:
- Apakah build Vite sudah siap untuk Vercel?
- Config apa yang dibutuhkan untuk SPA routing di Vercel?
- Bagaimana env vars harus ditangani (ada bug ditemukan)?
- Bagaimana cara menghubungkan domain `rexta.redone.my.id`?

---

## Scope

**Include:**
- Build configuration review (`vite.config.ts`, `package.json`)
- Env var handling analysis (`services/supabaseClient.ts`)
- SPA routing config untuk Vercel
- Custom domain setup steps

**Exclude:**
- Migrasi backend (Supabase tetap sama)
- Perubahan fungsionalitas aplikasi
- Setup monitoring/analytics

---

## Findings

### Finding 1: Build sudah siap untuk Vercel

**Evidence:** `package.json` line 7: `"build": "vite build"`

Vercel auto-detect Vite projects:
- Build command: `vite build` (atau `npm run build`)
- Output directory: `dist` (Vite default)
- Node version: compatible dengan semua Vercel Node tiers

**Status:** ✅ Tidak ada perubahan diperlukan di build config.

---

### Finding 2: BUG KRITIS — Env vars tidak akan terbaca di Vercel

**File:** `services/supabaseClient.ts` lines 6-12

**Bug:**
```typescript
// ❌ SALAH — process.env tidak ada di Vite browser context
const SUPABASE_URL = 
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) || 
  'https://wrggkbacornocdgamwkj.supabase.co';
```

**Kenapa bug:** Di Vite, environment variables diakses via `import.meta.env.VITE_*`, bukan `process.env`. Pattern `typeof process !== 'undefined'` akan `true` (karena Vite polyfill `process.env` sebagai `{}`), tapi `process.env.VITE_SUPABASE_URL` akan selalu `undefined`.

Efeknya: Meskipun env vars di-set di Vercel, app akan SELALU pakai hardcoded fallback.

**Fix:**
```typescript
// ✅ BENAR — Vite pattern
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wrggkbacornocdgamwkj.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGci...';
```

---

### Finding 3: SPA Routing perlu Vercel config

**File saat ini:** `_redirects` (Netlify-only, dan isinya kosong)

**Masalah:** React SPA dengan tab routing di `App.tsx` → jika user langsung akses URL atau refresh halaman, Vercel akan return 404 karena file `DASHBOARD`, `MASTER`, dll. tidak ada di `dist/`.

**Vercel solution:** File `vercel.json` dengan rewrites:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Note:** Untuk app ini yang menggunakan state-based routing (bukan URL-based), masalah ini minimal karena URL tidak berubah saat navigasi. Tapi tetap best practice untuk handle refresh dan direct link ke root.

---

### Finding 4: Env vars yang perlu di-set di Vercel

Berdasarkan `services/supabaseClient.ts` dan `vite.config.ts`:

| Variable | Required | Source | Value |
|---------|----------|--------|-------|
| `VITE_SUPABASE_URL` | Yes (best practice) | Supabase dashboard | `https://wrggkbacornocdgamwkj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes (best practice) | Supabase dashboard → API keys | JWT token yang ada di kode |
| `GEMINI_API_KEY` | No | — | Kosong (feature belum implemented) |

Meski credentials sudah hardcoded sebagai fallback dan app akan tetap jalan tanpa env vars, **best practice** untuk set env vars di Vercel agar credentials tidak exposed di source code.

---

### Finding 5: Custom domain `rexta.redone.my.id`

**Domain structure:**
- Root domain: `redone.my.id` (kemungkinan milik user)
- Subdomain: `rexta.redone.my.id`

**DNS record yang diperlukan:** CNAME record di DNS provider:
```
Type:  CNAME
Name:  rexta
Value: cname.vercel-dns.com
```

Atau jika menggunakan Vercel nameservers:
```
Type:  A
Name:  rexta
Value: 76.76.21.21
```

**Steps di Vercel dashboard:**
1. Project Settings → Domains → Add `rexta.redone.my.id`
2. Vercel akan berikan DNS record yang harus ditambahkan
3. Setelah DNS propagate (max 48 jam, biasanya <1 jam), domain aktif dengan SSL otomatis

---

### Finding 6: `_redirects` file

**File:** `_redirects` (1 line, kosong)

File ini untuk Netlify SPA routing. Untuk Vercel, tidak digunakan. Bisa dibiarkan (tidak memengaruhi build) atau dihapus.

---

## Perubahan yang Diperlukan

### Yang bisa dilakukan sekarang (tanpa akses akun Vercel):

| # | File | Perubahan | Priority |
|---|------|----------|---------|
| 1 | `services/supabaseClient.ts` | Fix `process.env` → `import.meta.env` | CRITICAL |
| 2 | `vercel.json` | Buat file baru untuk SPA rewrites | HIGH |
| 3 | `.env.example` | Buat file dokumentasi env vars | MEDIUM |
| 4 | `_redirects` | Hapus (Netlify-only, tidak relevan) | LOW |

### Yang memerlukan aksi user:

| # | Aksi | Dimana | Notes |
|---|------|--------|-------|
| 1 | Login ke Vercel + deploy | Terminal / vercel.com | `vercel login` butuh browser auth |
| 2 | Set env vars di Vercel | vercel.com/project/settings/env | Copy dari supabaseClient.ts |
| 3 | Add domain di Vercel | vercel.com/project/settings/domains | Tambah `rexta.redone.my.id` |
| 4 | Set DNS record | DNS provider (Cloudflare/etc) | CNAME rexta → cname.vercel-dns.com |

---

## Deployment Options

### Option A: Vercel CLI (Recommended)

```bash
npm install -g vercel
vercel login    # buka browser untuk auth
vercel --prod   # deploy ke production
```

**Pros:** Cepat, langsung dari terminal, bisa set env vars via CLI
**Cons:** Butuh `vercel login` yang memerlukan browser interaction

### Option B: GitHub → Vercel Integration

Push repo ke GitHub → connect di vercel.com → auto-deploy setiap push.

**Pros:** CI/CD otomatis untuk setiap commit ke main
**Cons:** Perlu koneksi GitHub repo ke Vercel di dashboard

### Recommendation: Option A (CLI)

Paling cepat untuk initial deploy. Bisa ditambah GitHub integration nanti.

---

## Recommendation

**Deploy dengan Vercel CLI setelah fix 2 perubahan kode.**

**Execution plan:**
1. Saya (Claude) fix `supabaseClient.ts` + buat `vercel.json` + `.env.example`
2. User jalankan `vercel login` di terminal (butuh browser)
3. User jalankan `vercel --prod` (atau saya bisa jalankan jika user sudah login)
4. User set env vars di Vercel dashboard
5. User add domain + set DNS record

**Caveats:**
- Step login Vercel butuh browser auth — tidak bisa dilakukan otomatis
- DNS propagation setelah step 4 bisa makan waktu 5 menit - 48 jam
- Hardcoded credentials di supabaseClient.ts sebagai fallback berarti app tetap jalan meski env vars belum di-set, tapi lebih baik set env vars

---

## Open Questions

- Apakah user sudah punya akun Vercel? — Impact: low (gratis untuk buat)
- Siapa yang kontrol DNS untuk `redone.my.id`? — Impact: medium (kalau bukan user, perlu koordinasi)
- Apakah Gemini AI feature akan diimplementasi? — Impact: low (tidak blocking deploy)

---

## Quality Report

**Sources consulted:**
- `services/supabaseClient.ts` — langsung dari codebase
- `vite.config.ts` — langsung dari codebase  
- `package.json` — langsung dari codebase
- `_redirects` — langsung dari codebase (kosong)
- Vite docs pattern: `import.meta.env` adalah standard yang diketahui
- Vercel docs pattern: `vercel.json` rewrites adalah standard yang diketahui

**Verification:**
- Bug `process.env` vs `import.meta.env`: Verified via actual code di `supabaseClient.ts`
- Build command: Verified via `package.json` scripts
- `_redirects` kosong: Verified via Read tool
- Vercel SPA rewrites pattern: Standard well-known Vercel config

**Assumptions (not verified):**
- User memiliki atau punya akses ke DNS untuk `redone.my.id`
- Supabase project masih aktif dan credentials valid

---

*Discovery completed: 2026-06-25*  
*Confidence: HIGH*  
*Ready for: /paul:plan 01-deploy-vercel*
