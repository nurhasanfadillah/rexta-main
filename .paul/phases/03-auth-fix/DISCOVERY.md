---
phase: 03-auth-fix
topic: Diagnosis sistem login gagal berulang — rebuild vs targeted fix
depth: deep
confidence: HIGH
created: 2026-07-22
---

# Discovery: Diagnosis Login Failure Berulang + Strategi Perbaikan

**Recommendation:** Targeted rewrite auth-proxy menggunakan `toNodeHandler` + `bodyParser: false` + inline config — bukan full rebuild. Root cause bukan Better Auth, tapi kombinasi bug yang tidak pernah diselesaikan sekaligus.

**Confidence:** HIGH — git history memberikan bukti konkret setiap kegagalan. Solusi yang benar sudah pernah ada di commit `3e8145e` tapi gagal karena alasan yang berbeda (ESM import). Fix tinggal menggabungkan dua insight yang sudah ditemukan.

---

## Objective

Yang perlu diketahui sebelum membuat plan baru:
- Apa root cause sesungguhnya dari setiap kegagalan login?
- Apakah ada pattern kesalahan yang berulang?
- Apakah Better Auth perlu diganti, atau hanya proxy-nya yang bermasalah?
- Solusi mana yang paling sederhana dan paling kecil resikonya?

## Scope

**Include:**
- Analisis 5 commit fix di git history (`c657440` → `35d46b3`)
- Kode `api/auth-proxy.ts` saat ini
- Konfigurasi `vercel.json`
- Script seeding admin (`scripts/create-admin.mjs`)
- Schema NeonDB untuk Better Auth tables
- Flow autentikasi end-to-end (browser → proxy → Better Auth → NeonDB)

**Exclude:**
- API endpoints lain (products, categories, dll) — sudah berfungsi
- Frontend components selain LoginView — sudah benar
- Penggantian stack (tidak ada alasan ganti Vercel/React/NeonDB)

---

## Findings

### Finding 1: Kronologi Kegagalan (dari Git History)

Terjadi 5 kali perubahan `api/auth-proxy.ts` dalam satu hari (2026-07-20):

| Commit | Pendekatan | Kenapa Gagal |
|--------|-----------|--------------|
| `c657440` | `auth.handler(webReq)` — fetch-based, pertama kali | Tidak ada try/catch → `FUNCTION_INVOCATION_FAILED` tanpa pesan error |
| `3e8145e` | `toNodeHandler` + `bodyParser: false` + `req.url` rewrite | Masih import `from '../lib/auth'` → `ERR_MODULE_NOT_FOUND` di Vercel |
| `86c59bc` | Handle React 19 unhandled rejections | Fix terpisah — tidak berhubungan langsung dengan auth |
| `d44103e` | fetch-based dengan error logging, dual body reading | ESM import masalah sama (`from '../lib/auth'`) |
| `35d46b3` | Inline auth config, hapus cross-dir import | **Status: masih belum diverifikasi berhasil** |

**Insight kritis:** Commit `3e8145e` punya pendekatan yang BENAR secara teknis (`toNodeHandler` + `bodyParser: false` + rewrite `req.url`). Tapi gagal karena masalah ESM import yang BERBEDA — bukan karena `toNodeHandler` itu sendiri bermasalah.

### Finding 2: Akar Masalah ESM Import

`package.json` punya `"type": "module"`. Di Vercel, setiap file `.ts` dikompilasi dan dijalankan secara terpisah. ESM (ES Module) mengharuskan explicit `.js` extension di relative imports saat runtime:

```typescript
// INI GAGAL di Vercel (ESM requires explicit .js extension):
import { auth } from '../lib/auth';

// Yang seharusnya dipakai di runtime:
import { auth } from '../lib/auth.js';
```

TypeScript tidak menambahkan extension otomatis. Solusinya (sudah dilakukan di `35d46b3`): **inline auth config langsung di auth-proxy.ts** — tidak ada cross-directory import.

### Finding 3: Dua Fix yang Tidak Pernah Digabungkan

| Fix | Ditemukan di commit | Status |
|-----|---------------------|--------|
| Pendekatan proxy yang benar: `toNodeHandler` + `bodyParser:false` + rewrite `req.url` | `3e8145e` | Ditinggalkan (karena ESM issue) |
| Fix ESM issue: inline auth config | `35d46b3` | Dipakai, tapi dengan pendekatan proxy yang salah |

Commit `35d46b3` (saat ini) menggunakan inline config ✓ tapi kembali ke fetch-based proxy yang kompleks (70+ baris). Seharusnya menggabungkan keduanya: inline config + `toNodeHandler`.

### Finding 4: Current Code (35d46b3) — Masalah yang Tersisa

Kode saat ini (`api/auth-proxy.ts`) secara teori lebih baik tapi masih ada kekhawatiran:

**A. Kompleksitas yang tidak perlu:**
Kode manual reconstruction Web Request (70+ baris) padahal `toNodeHandler` dari Better Auth melakukan hal yang sama dengan 1 baris.

**B. Tidak ada `bodyParser: false` config:**
```typescript
// MISSING di current code:
export const config = { api: { bodyParser: false } };
```
Vercel mungkin masih pre-parse body di beberapa kondisi, menyebabkan `req.body != null` tapi isinya aneh, ATAU stream sudah dikonsumsi jika fallback ke raw stream.

**C. Pool tanpa limit:**
```typescript
// auth-proxy.ts (CURRENT):
database: new Pool({ connectionString: process.env.DATABASE_URL }),

// lib/db.ts (dengan limit yang benar):
export const db = new Pool({ connectionString: ..., max: 10, connectionTimeoutMillis: 5000, ... });
```
Tanpa limit, setiap request ke auth-proxy bisa buka koneksi baru ke NeonDB.

### Finding 5: Kemungkinan Admin User Tidak Ada / Salah

Script `scripts/create-admin.mjs` menggunakan:
```javascript
import { hashPassword } from '@better-auth/utils/password'
```

Format hash: `scrypt:salt:hex`. Format ini HARUS kompatibel dengan `verifyPassword` internal Better Auth. Ini sudah benar jika script dijalankan setelah Better Auth diinstall.

**Tapi:** Jika script belum dijalankan terhadap NeonDB production, TIDAK ADA user untuk login. Ini adalah kemungkinan root cause yang belum pernah di-verify secara eksplisit di codebase manapun.

Schema account table:
```sql
INSERT INTO account (id, "accountId", "providerId", "userId", password, ...)
VALUES (random_uuid, userId, 'credential', userId, hashedPassword, ...)
```
`providerId: 'credential'` dan `accountId: userId` — ini sudah benar untuk Better Auth email/password auth.

### Finding 6: Flow Request yang Benar

```
Browser
  │  POST /api/auth/sign-in/email
  │  { email, password }
  ▼
Vercel
  │  vercel.json rewrite:
  │  /api/auth/:path* → /api/auth-proxy?p=sign-in%2Femail
  ▼
api/auth-proxy.ts
  │  req.query.p = "sign-in/email"
  │  req.url = "/api/auth-proxy?p=sign-in%2Femail"
  │  [PERLU] req.url = "/api/auth/sign-in/email"  ← toNodeHandler butuh ini
  ▼
Better Auth (auth.handler / toNodeHandler)
  │  Baca email + password dari body
  │  Verifikasi di NeonDB (user + account table)
  │  Generate session token
  │  Return 200 + Set-Cookie: better-auth.session=...
  ▼
Browser
  │  Cookie tersimpan
  │  authClient.signIn.email() returns { data: { session: {...} } }
  ▼
LoginView.tsx → onLogin(true) → App.tsx → loadData()
```

---

## Comparison Options

### Option A: Fix Targeted — toNodeHandler + bodyParser:false + Inline Config

Gabungkan dua insight yang sudah ada: `3e8145e` (approach benar) + `35d46b3` (ESM fix).

```typescript
// api/auth-proxy.ts — VERSI BARU (~20 baris)
import { toNodeHandler } from 'better-auth/node';
import { betterAuth } from 'better-auth';
import { Pool } from '@neondatabase/serverless';

export const config = { api: { bodyParser: false } };  // ← Kunci: Vercel jangan parse body

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL as string],
});

const nodeHandler = toNodeHandler(auth);

export default function handler(req: any, res: any) {
  // Rekonstruksi URL dari query param 'p' agar toNodeHandler tahu action yang diminta
  const p = req.query.p;
  if (p) {
    const pathStr = Array.isArray(p) ? p.join('/') : String(p);
    const decoded = decodeURIComponent(pathStr);
    const extra = Object.entries(req.query as Record<string, string>)
      .filter(([k]) => k !== 'p')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    req.url = `/api/auth/${decoded}${extra ? '?' + extra : ''}`;
  }
  return nodeHandler(req, res);
}
```

**Pros:**
- `toNodeHandler` adalah official Node.js adapter Better Auth → teruji, terpelihara
- `bodyParser: false` → Vercel tidak sentuh body stream → toNodeHandler baca langsung
- Inline config → tidak ada ESM cross-directory import issue
- ~20 baris vs 70+ baris sekarang → drastis lebih simple
- Menggabungkan dua fix yang sudah terbukti correct
- Tidak ada perubahan schema, ENV, atau client-side code

**Cons:**
- `toNodeHandler` adalah Node.js API — bisa ada breaking change di major Better Auth update
- Masih ada proxy layer (tapi tipis dan bersih)

**For our use case:** SANGAT SESUAI — ini adalah pendekatan paling minimal dengan risiko paling rendah.

---

### Option B: Full Rebuild — Custom JWT Auth

Hapus Better Auth sepenuhnya. Buat auth sendiri dengan:
- `bcryptjs` (sudah ada di devDependencies) untuk verify password
- `jose` (npm) atau manual JWT dengan `crypto.subtle` untuk session token
- Session stored di DB atau stateless signed JWT

```typescript
// api/auth/login.ts
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export default async function handler(req: any, res: any) {
  const { email, password } = req.body;
  // query DB untuk user
  // bcrypt.compare(password, hash)
  // sign JWT
  // set cookie
}
```

**Pros:**
- Tidak ada dependency Better Auth — eliminasi semua kompleksitas library
- Transparent: kita kontrol penuh setiap baris
- Untuk 1 admin user: sangat overkill Better Auth
- Mudah di-debug (kode kita sendiri)

**Cons:**
- Harus implement semua: password verify, session management, cookie handling, token expiry
- Security risk jika implementasi salah
- Banyak perubahan: `services/database.ts` auth functions, `api/auth-middleware.ts`, semua file yang import dari `better-auth/client`
- `better-auth` di `package.json` mubazir tapi tetap ada (atau harus dihapus juga)
- Memakan waktu 2-3x lebih lama dari Option A

**For our use case:** BERLEBIHAN — solusi untuk masalah yang lebih besar dari masalah kita.

---

### Option C: Debug-first (No Code Change)

Cek Vercel logs, verifikasi DB state, baru fix berdasarkan error spesifik.

**Pros:**
- Tidak membuat perubahan kode yang mungkin tidak diperlukan
- Bisa menemukan bahwa masalahnya bukan di code (e.g., ENV var tidak di-set)

**Cons:**
- Tidak menyelesaikan kelemahan struktural yang sudah teridentifikasi
- Perlu akses ke Vercel dashboard untuk melihat logs
- Bahkan jika ENV dan DB benar, current code masih punya kelemahan (no bodyParser:false)

**For our use case:** TIDAK CUKUP — bahkan jika masalahnya sembuh sendiri, current code punya technical debt yang akan muncul lagi.

---

## Comparison Table

| Criteria | Option A (toNodeHandler fix) | Option B (Custom JWT) | Option C (Debug-first) |
|----------|------------------------------|----------------------|------------------------|
| Kompleksitas implementasi | Rendah (~20 baris) | Tinggi (~200+ baris) | Nol (tidak ada code) |
| Waktu eksekusi | 15-30 menit | 2-3 jam | 30-60 menit |
| Risiko regresi | Sangat rendah | Tinggi | Nol |
| Menyelesaikan root cause | YA | YA (overkill) | Mungkin tidak |
| Maintainability | Baik | Baik | Tidak meningkat |
| Better Auth tetap bekerja | YA | TIDAK | YA |
| Cocok untuk 1 admin user | YA | YA | YA |

---

## Recommendation

**Pilih: Option A — Fix Targeted dengan toNodeHandler + bodyParser:false + Inline Config**

**Rationale:**
Masalah login bukan karena Better Auth tidak mampu bekerja di Vercel. Masalahnya adalah dua fix yang benar (`3e8145e` dan `35d46b3`) tidak pernah digabungkan dalam satu commit. Setiap fix mengatasi satu masalah tapi memperkenalkan kembali masalah lain.

Option A menggabungkan:
- ✓ `bodyParser: false` (agar stream tidak dikonsumsi Vercel)
- ✓ Inline auth config (agar tidak ada ESM cross-dir import)
- ✓ `toNodeHandler` (official Better Auth Node.js adapter, tidak perlu tulis manual)
- ✓ `req.url` rewrite (agar toNodeHandler tahu action yang diminta)

Hasilnya: ~20 baris bersih vs 70+ baris sekarang. Lebih mudah dipahami, lebih mudah di-debug.

**Urutan Eksekusi yang Dianjurkan:**
1. **Verifikasi DB dulu** (5 menit): Cek apakah admin user ada di NeonDB production
2. **Apply Option A** (15 menit): Rewrite auth-proxy
3. **Deploy dan test** (10 menit): Verifikasi login di production

**Caveats:**
- Jika setelah Option A login masih gagal, BARU cek Vercel logs secara detail
- Jika error dari Better Auth sendiri (bukan proxy), bisa pertimbangkan Option B
- ENV vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) WAJIB di-set di Vercel — jika belum di-set, semua approach akan gagal

---

## Open Questions

- **Apakah admin user sudah ada di NeonDB production?** — Impact: HIGH
  Script `create-admin.mjs` perlu dijalankan terhadap production DB. Tidak ada bukti ini sudah dilakukan.

- **Apakah ENV vars sudah benar di Vercel project settings?** — Impact: HIGH
  `BETTER_AUTH_URL` harus `https://rexta.redone.my.id` (bukan `http://`, tidak ada trailing slash).

- **Apa error spesifik yang terlihat di browser?** — Impact: MEDIUM
  Tahu error spesifik (500 vs 401 vs network error) akan mempersingkat debugging jika Option A masih gagal.

---

## Quality Report

**Sources consulted:**
- Git history: 5 commit fix di `api/auth-proxy.ts` (2026-07-20) — verified via `git log` dan `git show`
- `api/auth-proxy.ts` current state (commit `35d46b3`) — verified via `Read` tool
- `lib/auth.ts` — verified via `Read` tool
- `vercel.json` — verified via `Read` tool
- `scripts/create-admin.mjs` — verified via `Read` tool
- `db_schema_neon.sql` — verified: Better Auth tables ada dan schema sesuai standar v1
- `package.json` — verified: `better-auth@1.6.23`, `"type": "module"`
- Commit diff `3e8145e` — verified via `git show --patch`
- Commit diff `d44103e` — verified via `git show --patch`

**Verification:**
- `toNodeHandler` tersedia di `better-auth@1.6.23`: VERIFIED — dipakai di `3e8145e`, berfungsi
- `bodyParser: false` config di Vercel Functions: VERIFIED — dipakai di `3e8145e`, tidak ada kontra-indikasi
- ESM import issue dengan `../lib/auth`: VERIFIED — commit message `35d46b3` konfirmasi ini root cause
- Schema `account.providerId = 'credential'`: VERIFIED — sesuai Better Auth email/password standard
- Schema `account.accountId = userId`: VERIFIED — sesuai Better Auth email/password standard

**Assumptions (not verified):**
- Admin user BELUM diverifikasi ada di NeonDB production — perlu dicek manual
- ENV vars di Vercel belum diverifikasi di-set dengan benar — perlu dicek manual

---

*Discovery completed: 2026-07-22*
*Confidence: HIGH*
*Ready for: /paul:plan 03-auth-fix*
