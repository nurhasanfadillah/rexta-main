# Coding Conventions

## File Naming

| Type | Convention | Examples |
|------|-----------|---------|
| React components | PascalCase | `DashboardView.tsx`, `ConfirmationModal.tsx` |
| API handlers | kebab-case | `auth-proxy.ts`, `auth-middleware.ts` |
| Services/utilities | camelCase | `database.ts` |
| Lib files | camelCase | `auth.ts`, `db.ts` |
| Scripts | kebab-case.mjs | `create-admin.mjs`, `seed-user.mjs` |
| SQL schemas | kebab-case.sql | `db_schema_neon.sql` |

> **Note**: Komponen menggunakan PascalCase (berbeda dari CLAUDE.md yang mewajibkan kebab-case untuk semua file). Pattern ini sudah ada sebelum CLAUDE.md diapply.

## Component Naming Suffixes

| Suffix | Usage | Examples |
|--------|-------|---------|
| `View` | Page-level components | `DashboardView`, `LoginView`, `ReportsView` |
| `Modal` | Dialog components | `QrScannerModal`, `ConfirmationModal` |
| `Panel` | Sidebar/panel | `NotificationPanel` |
| `Toast` | Toast notifications | `NotificationToast` |
| `Control` | Reusable UI controls | `PaginationControl` |

## Props Interface Naming

**Pattern**: `{ComponentName}Props`

```typescript
interface LoginViewProps { onLogin: (status: boolean) => void; ... }
interface DashboardViewProps { data: InventoryData; ... }
interface PaginationControlProps { currentPage: number; totalPages: number; ... }
```

## Export Patterns

| Type | Pattern | Example |
|------|---------|---------|
| React components | Default export | `export default DashboardView;` |
| Service functions | Named export | `export const signIn = async ...` |
| Types/interfaces | Named export | `export interface Product { ... }` |
| Enums | Named export | `export enum ItemType { ... }` |

> **Note**: Berbeda dari CLAUDE.md yang mewajibkan named exports. Proyek ini menggunakan default exports untuk komponen.

## TypeScript Patterns

```typescript
// Interface untuk props dan data structures
interface Product {
  id: string;
  name: string;
  categoryId: string;
  priceCMT: number;
  stock: number;
}

// Type union untuk domain values
export type TransactionType = 'IN' | 'OUT' | 'OPNAME';
export type TabView = 'DASHBOARD' | 'MASTER' | 'STOCK' | 'OPNAME' | 'REPORT';

// Enum untuk item type
export enum ItemType { PRODUCT = 'PRODUK', MATERIAL = 'BAHAN_BAKU' }

// React.FC dengan TypeScript generics
const LoginView: React.FC<LoginViewProps> = ({ onLogin, onNotify }) => { ... }
```

**Known issue**: Pervasive `any` usage (40+ occurrences) di API handlers (`req: any, res: any`) dan catch blocks (`catch (err: any)`).

## Variable Naming Prefixes

| Prefix | Usage | Examples |
|--------|-------|---------|
| `is` | Boolean state | `isLoading`, `isLoggedIn`, `isDarkMode` |
| `handle` | Event handlers | `handleSubmit`, `handleTabChange`, `handleLogout` |
| `on` | Callback props | `onLogin`, `onNotify`, `onAddProduct` |
| `api` | API mutation functions | `apiAddProduct`, `apiUpdateProduct` |
| `get` | Data fetch functions | `getProductsPaginated`, `getDashboardSummary` |
| `map` | Data transformation | `mapProductFromDB`, `mapMaterialToDB` |
| `SCREAMING_SNAKE` | Constants | `ADMIN_EMAIL`, `ADMIN_PASSWORD` |

## Import Patterns

### Relative imports (primary pattern)
```typescript
// Components
import { fetchAllData } from './services/database';
import { Product, Material } from './types';

// API handlers (explicit .js extension — required for Vercel ESM)
import { db } from '../lib/db.js';
import { requireSession } from '../lib/auth-middleware.js';
```

### ESM extension rule
**API handlers dan lib/ HARUS pakai `.js` extension** pada relative imports:
```typescript
// ✅ Correct (in api/)
import { auth } from '../lib/auth.js';

// ❌ Wrong — Vercel ESM runtime tidak resolve .ts
import { auth } from '../lib/auth';
```

Fix ini dilakukan di commit `472997c` (Add .js extension to all relative imports).

## Component Structure Pattern

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { IconName } from 'lucide-react';
import { Product } from '../types';
import { apiAddProduct } from '../services/database';

// 2. Props interface
interface ComponentProps {
  data: Product[];
  onAdd: (product: Product) => void;
}

// 3. Component function
const ComponentName: React.FC<ComponentProps> = ({ data, onAdd }) => {
  // State
  const [isLoading, setIsLoading] = useState(false);

  // Effects
  useEffect(() => { ... }, []);

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onAdd(formData);
    } catch (err: any) {
      onNotify(err.message || 'Error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Render
  return ( ... );
};

export default ComponentName;
```

## API Handler Pattern (Vercel Serverless)

```typescript
export default async function handler(req: any, res: any) {
  // 1. Auth check
  try {
    await requireSession(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Method routing
  if (req.method === 'GET') {
    try {
      // Query params
      const { search, page = '1', limit = '20' } = req.query;
      // Parameterized query
      const result = await db.query(`SELECT ... WHERE name ILIKE $1`, [`%${search}%`]);
      return res.json({ data: result.rows.map(mapFromDB), count: total });
    } catch (error) {
      console.error('[endpoint] GET error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

## Database Mapping Layer

```typescript
// snake_case (DB) → camelCase (TypeScript)
const mapProductFromDB = (row: any) => ({
  id: row.id,
  name: row.name,
  categoryId: row.category_id,
  priceCMT: Number(row.price_cmt) || 0,
  hpp: Number(row.hpp) || 0,
  stock: Number(row.stock) || 0,
  updatedAt: row.updated_at,
  isFavorite: row.is_favorite || false,
});
```

## SQL Query Pattern

```typescript
// Dynamic filter building (indexed params: $1, $2, ...)
const conditions: string[] = [];
const params: any[] = [];
let idx = 1;

if (search) {
  params.push(`%${search}%`);
  conditions.push(`name ILIKE $${idx++}`);
}

const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
const result = await db.query(`SELECT * FROM products ${where} LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]);
```

## Error Handling

```typescript
// API layer — console.error dengan prefix endpoint
try { ... }
catch (error) {
  console.error('[products] GET error:', error);
  return res.status(500).json({ error: 'Internal Server Error' });
}

// Auth middleware — throw dengan status code
export async function requireSession(req: any) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    const err = new Error('Unauthorized') as any;
    err.status = 401;
    throw err;
  }
  return session;
}

// Frontend service layer — logError helper
const logError = (context: string, error: any) => {
  console.error(`[DB Error] ${context}:`, error?.message || JSON.stringify(error));
  return { error };
};
```

## Debouncing Pattern (Manual)

Dipakai di 3 komponen (`PublicStockView`, `StockManageView`, `StockOpnameView`):

```typescript
useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

Belum di-extract ke custom hook `useDebounce`.

## Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);
setIsLoading(true);
try { ... } finally { setIsLoading(false); }

// Render:
{isLoading ? <SkeletonComponent /> : <ActualContent />}
```

## Localization

- UI text: **Bahasa Indonesia**
- Number format: IDR (`id-ID` locale)
- Date format: ISO strings dari NeonDB
- Comments: campuran Indonesia dan Inggris
