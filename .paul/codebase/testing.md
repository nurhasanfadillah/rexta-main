# Testing

## Current State: NO TESTS

Tidak ada test apapun di codebase ini.

| Metric | Value |
|--------|-------|
| Test files | 0 |
| Test framework | None |
| Coverage | 0% |
| Test scripts in package.json | None |

## What's Missing

```
package.json devDependencies — tidak ada:
  - vitest / jest
  - @testing-library/react
  - @testing-library/user-event
  - @vitest/coverage-v8
  - playwright / cypress
  - msw (mock service worker)
```

Tidak ada file konfigurasi:
- `vitest.config.ts`
- `jest.config.ts`
- `playwright.config.ts`

## QA Saat Ini

Dilakukan secara **manual** via browser. Tidak ada automation.

## Critical Flows yang Perlu Ditest Pertama

Jika ingin menambahkan tests, prioritas berdasarkan dampak bisnis:

### Unit Tests (API layer — `api/`)

| Function | Why Critical |
|----------|-------------|
| `mapProductFromDB()` | Konversi data DB → TypeScript — bug = data rusak |
| `mapMaterialFromDB()` | Idem untuk Material |
| `requireSession()` | Auth gate semua protected endpoints |
| parameterized query builder | SQL injection prevention |

### Integration Tests

| Scenario | Why Critical |
|----------|-------------|
| Login → session valid | Auth gate untuk semua data |
| Add product → verify in DB | Core business logic |
| Transaction IN/OUT → stock updated | Stok calculation via RPC |
| Stock opname → manual override | Potential data loss jika bug |
| Better Auth session cookie | CSRF + session management |
| Public endpoint (no auth) | Akses publik tanpa login |

### E2E Tests (Playwright recommended)

| Flow | Priority |
|------|----------|
| Login → Dashboard → Add Product | HIGH |
| Stock IN → verify balance | HIGH |
| Stock OUT → verify balance | HIGH |
| Auth flow (login/logout/session persist) | HIGH |
| Generate PDF report | MEDIUM |
| QR scan → transaction | MEDIUM |
| Public mode access | LOW |

## Recommended Setup

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @vitest/coverage-v8 jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] }
  }
});
```

```json
// package.json scripts
"test": "vitest",
"test:coverage": "vitest --coverage"
```

## Notes

- Tidak ada test = risiko regresi tinggi saat refactor atau auth fix
- Phase 03 (auth fix) adalah perubahan yang paling butuh test coverage
- Critical path: `POST /api/auth/sign-in` → session cookie → `requireSession()` di setiap endpoint
- RPC `process_inventory_transaction` adalah atomic operation paling krusial — harus ditest dengan real DB
