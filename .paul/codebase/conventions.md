# Coding Conventions

## File Naming

| Type | Convention | Examples |
|------|-----------|---------|
| React components | PascalCase | `DashboardView.tsx`, `ConfirmationModal.tsx` |
| Services | camelCase | `database.ts`, `supabaseClient.ts` |
| Types | camelCase | `types.ts` |
| Config | camelCase | `vite.config.ts` |

> **Note**: Ini berbeda dari konvensi CLAUDE.md yang mewajibkan `kebab-case` untuk semua file. Proyek ini menggunakan PascalCase untuk komponen.

## Component Naming

| Type | Pattern | Example |
|------|---------|---------|
| View components | `{Feature}View` | `DashboardView`, `StockManageView` |
| Modal components | `{Feature}Modal` | `QrScannerModal`, `ConfirmationModal` |
| Panel components | `{Feature}Panel` | `NotificationPanel` |
| Toast/notification | `{Feature}Toast` | `NotificationToast` |
| Utility components | Descriptive noun | `PaginationControl`, `Layout` |

## Props Interface Naming

**Pola**: `{ComponentName}Props`

```typescript
interface ConfirmationModalProps { isOpen: boolean; title: string; ... }
interface DashboardViewProps { data: InventoryData; }
interface PaginationControlProps { currentPage: number; totalPages: number; ... }
```

## Export Patterns

| Type | Pattern | Example |
|------|---------|---------|
| React components | Default export | `export default DashboardView;` |
| Service functions | Named export | `export const signIn = async ...` |
| Types/interfaces | Named export | `export interface Product { ... }` |
| Enums | Named export | `export enum ItemType { ... }` |

> **Note**: Ini berbeda dari konvensi CLAUDE.md yang mewajibkan named exports. Proyek ini menggunakan default exports untuk komponen.

## TypeScript Patterns

```typescript
// Interface untuk props dan data structures (bukan type alias)
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

// React.FC dengan TypeScript
const NotificationToast: React.FC<NotificationToastProps> = ({ ... }) => { ... }
```

## Import Organization

Relative imports digunakan (bukan `@/` alias meski tersedia):

```typescript
// App.tsx
import Layout from './components/Layout';
import { InventoryData, TabView } from './types';

// Components
import { ConfirmationModal } from '../components/ConfirmationModal';
```

## Async Patterns

**async/await exclusively** — tidak ada promise chaining:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    const result = await apiAddProduct(formData);
    if (result.error) throw result.error;
    onNotify('Produk berhasil ditambahkan', 'success');
  } catch (err: any) {
    onNotify(err.message || 'Gagal menambahkan produk', 'error');
  } finally {
    setIsLoading(false);
  }
};
```

**Promise.all** untuk operasi paralel:

```typescript
const [productsRes, materialsRes] = await Promise.all([
  supabase.from('products').select('stock, hpp'),
  supabase.from('materials').select('stock, price')
]);
```

## Component Structure Pattern

```typescript
// 1. Internal helper components (inline di file yang sama)
const Skeleton = ({ className }: { className: string }) => (
  <div className={`bg-slate-200 ... ${className}`} />
);

// 2. Main component
const DashboardView: React.FC<DashboardViewProps> = ({ data }) => {
  // State declarations
  const [isLoading, setIsLoading] = useState(false);
  
  // Effects
  useEffect(() => { ... }, []);
  
  // Handlers
  const handleRefresh = useCallback(async () => { ... }, []);
  
  // Conditional early return
  if (totalItems === 0) return null;
  
  // Render
  return ( ... );
};

export default DashboardView;
```

## Error Handling

```typescript
// Service layer — centralized logError helper
const logError = (context: string, error: any) => {
  const msg = error?.message || JSON.stringify(error);
  console.error(`[DB Error] ${context}:`, msg);
  return { error };
};

// Component layer — try/catch + user notification
try {
  await someApiCall();
} catch (err: any) {
  onNotify(err.message || 'Pesan error default', 'error');
}
```

## Styling

**Tailwind CSS utility classes** dengan dark mode support:

```tsx
// Dark mode via dark: prefix
<div className="bg-white dark:bg-darkCard rounded-3xl shadow-2xl" />

// Responsive breakpoints
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" />

// Custom colors dari config (primary, surface, card, success, danger, warning)
<button className="bg-primary hover:bg-primaryDark text-white" />
```

## Debouncing Pattern

Implementasi manual dengan `setTimeout` (500ms), dipakai di 3 komponen:

```typescript
// PublicStockView.tsx, StockManageView.tsx, StockOpnameView.tsx
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
  }, 500);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

## Localization

- UI text: **Bahasa Indonesia**
- Number format: IDR (`id-ID` locale)
- Comments: campuran Indonesia dan Inggris
- Date format: ISO strings dari Supabase

## Loading States

Pattern `isLoading` flag + kondisional render:

```typescript
const [isLoading, setIsLoading] = useState(false);

setIsLoading(true);
try { ... } finally { setIsLoading(false); }

// Render:
{isLoading ? <Skeleton className="h-10 w-full" /> : <ActualContent />}
```
