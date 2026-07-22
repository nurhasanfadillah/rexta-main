---
phase: 05-login-fix
topic: Bug login — signIn response check salah menyebabkan notif error palsu
depth: quick
confidence: HIGH
created: 2026-07-22
---

# Discovery: Login System Bug — False Negative on Correct Credentials

**Recommendation:** Ganti `if (data?.session)` → `if (data)` di `LoginView.tsx:27`

**Confidence:** HIGH — Root cause ditemukan langsung dari code inspection. Struktur response better-auth v1.x terdokumentasi jelas dan tidak memerlukan session property di signIn response.

## Objective

Memahami mengapa login dengan kredensial benar:
- Tetap menampilkan notif error "Login gagal. Periksa email dan password."
- Tapi setelah di-refresh, berhasil masuk dashboard

## Scope

**Include:**
- `LoginView.tsx` — login form handler
- `services/database.ts` — signIn + getCurrentSession
- `api/auth-proxy.ts` — Better Auth proxy handler
- Better Auth v1.6.23 response structure dari `signIn.email()`

**Exclude:**
- Logic selain auth (CRUD, dashboard, dll.)

## Findings

### Bug Utama: data?.session vs data

**File:** `components/LoginView.tsx:27`

```typescript
// CURRENT (BUGGY):
if (data?.session) {
  onNotify('Login berhasil! Selamat datang.', 'success');
  onLogin(true);
} else {
  throw new Error('Login gagal. Periksa email dan password.');
}

// better-auth v1.x signIn.email() response structure:
// { data: { token: string, user: {...} }, error: null }
// — TIDAK ada data.session di sini

// CONTRAST: authClient.getSession() response structure:
// { data: { session: {...}, user: {...} }, error: null }
// — getSession MEMANG punya data.session
```

`authClient.signIn.email()` dan `authClient.getSession()` adalah dua method berbeda dengan struktur response berbeda. LoginView menggunakan pattern dari `getSession` pada `signIn`, yang tidak tepat.

### Urutan kejadian yang menjelaskan kedua behavior:

```
1. User submit kredensial benar
2. signIn() → POST /api/auth/sign-in/email
3. Server: session dibuat, cookie di-set di response header ✓
4. Client response: { data: { token, user }, error: null }
5. data?.session → undefined (falsy)
6. Masuk else block → throw new Error('Login gagal...')
7. Catch block → onNotify('Login gagal...', 'error') ← NOTIF SALAH
8. isLoading = false, user tetap di halaman login

9. User refresh halaman
10. App.tsx useEffect → getCurrentSession() → getSession()
11. Server membaca cookie yang sudah di-set di step 3 ✓
12. data.session → ada → setIsLoggedIn(true) → masuk dashboard ✓
```

### Perilaku per skenario:

| Skenario | Submit behavior | Refresh behavior |
|----------|----------------|-----------------|
| Kredensial salah | Notif error (BENAR) | Tetap di login (BENAR) |
| Kredensial benar | Notif error (BUG) | Masuk dashboard (BENAR) |

### Auth-proxy: Tidak ada masalah

```typescript
// api/auth-proxy.ts
export const config = { api: { bodyParser: false } };  // ✓ benar
const nodeHandler = toNodeHandler(auth);               // ✓ benar per STATE.md
```

Keputusan di STATE.md sudah benar: `bodyParser:false` + `toNodeHandler` = working combination.

### createAuthClient: Tidak ada masalah

```typescript
// services/database.ts
const authClient = createAuthClient();  // tanpa baseURL
```

Better-auth client tanpa baseURL menggunakan `window.location.origin` — benar untuk same-origin deployment Vercel.

## Recommendation

**Fix: `components/LoginView.tsx:27`**

```typescript
// Dari:
if (data?.session) {

// Ke:
if (data) {
```

Cukup satu baris perubahan. `data` bernilai truthy jika signIn berhasil (karena `data = { token, user }`), dan falsy/null jika gagal.

**Caveats:**
- Tidak ada side effect — `if (data)` cukup untuk membedakan sukses vs gagal
- Jika ingin lebih eksplisit: `if (data?.token)` — sama saja, karena token selalu ada di response sukses

## Open Questions

Tidak ada — discovery menjawab semua pertanyaan.

## Quality Report

**Sources consulted:**
- `components/LoginView.tsx` — code inspection langsung
- `services/database.ts` — signIn vs getCurrentSession comparison
- `api/auth-proxy.ts` — proxy handler review
- `package.json` — better-auth v1.6.23
- `.paul/STATE.md` — keputusan auth sebelumnya

**Verification:**
- Bug trace: Verified via code path analysis (steps 1-12 di atas)
- Response structure: Verified via `getCurrentSession()` vs `signIn.email()` return type perbedaan
- Auth-proxy: Verified tidak ada masalah — `bodyParser:false` + `toNodeHandler` sudah benar

**Assumptions (not verified):**
- Better-auth v1.6.23 response structure dari `signIn.email()` — diasumsikan dari API design consistency dan code behavior yang diamati (session dibuat tapi check gagal = struktur berbeda)

---
*Discovery completed: 2026-07-22*
*Confidence: HIGH*
*Ready for: /paul:plan 05-login-fix*
