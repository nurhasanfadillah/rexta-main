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

Kemungkinan dilakukan secara **manual** via browser. Tidak ada automation.

## Critical Functions yang Perlu Ditest Pertama

Jika ingin menambahkan tests, prioritas berdasarkan dampak bisnis:

### Unit Tests (services/database.ts)

| Function | Why Critical |
|----------|-------------|
| `mapProductFromDB()` | Konversi data DB ke TypeScript — bug = data rusak |
| `mapProductToDB()` | Konversi sebaliknya — bug = data tersimpan salah |
| `mapTransactionFromDB()` | Transaction data mapping |
| `getDashboardSummary()` | Kalkulasi aset total |

### Integration Tests

| Scenario | Why Critical |
|----------|-------------|
| Login / logout flow | Auth gate untuk semua data |
| Add product + update stock | Core business logic |
| Transaction IN/OUT | Stock calculation |
| Stock opname reconciliation | Potential data loss jika bug |
| Pagination (getProductsPaginated) | UX untuk dataset besar |

### E2E Tests (Playwright recommended)

| Flow | Priority |
|------|----------|
| Login → Dashboard → Add Product | HIGH |
| Stock IN → verify balance | HIGH |
| Stock OUT → verify balance | HIGH |
| Generate PDF report | MEDIUM |
| QR scan → transaction | MEDIUM |
| Public mode access | LOW |

## Recommended Setup (jika mau mulai)

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

- Tidak ada test = risiko regresi tinggi saat refactor
- Critical path: login → master data → transaction — harus ditest manual minimal setiap kali deploy
- Supabase RPC `process_inventory_transaction` adalah atomic operation yang paling krusial
