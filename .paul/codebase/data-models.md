# Data Models

**Source**: `types.ts` — semua TypeScript types  
**Database schema**: `db_schema.sql` — PostgreSQL tables

## Core Types

### Product

```typescript
export interface Product {
  id: string;
  name: string;
  categoryId: string;    // FK ke Category
  priceCMT: number;      // Harga jual (price per unit CMT?)
  hpp: number;           // Harga Pokok Penjualan
  stock: number;
  updatedAt?: string;    // ISO datetime dari Supabase
  isFavorite?: boolean;  // Produk favorit di dashboard
}
```

DB mapping: `categoryId` ↔ `category_id`, `priceCMT` ↔ `price_cmt`, `isFavorite` ↔ `is_favorite`

### Material

```typescript
export interface Material {
  id: string;
  name: string;
  unit: string;      // Satuan: kg, liter, pcs, dll.
  price: number;     // Harga per unit
  stock: number;
  updatedAt?: string;
}
```

### Category

```typescript
export interface Category {
  id: string;
  name: string;
}
```

### Transaction

```typescript
export interface Transaction {
  id: string;
  itemId: string;           // FK ke Product atau Material
  itemType: ItemType;       // PRODUK | BAHAN_BAKU
  type: TransactionType;    // IN | OUT | OPNAME
  qty: number;              // Jumlah transaksi
  date: string;             // ISO datetime
  notes?: string;
  balanceAfter: number;     // Stok setelah transaksi (snapshot)
}
```

DB mapping: `itemId` ↔ `item_id`, `itemType` ↔ `item_type`, `balanceAfter` ↔ `balance_after`

### InventoryData (Aggregate State)

```typescript
export interface InventoryData {
  products: Product[];
  materials: Material[];
  categories: Category[];
  transactions: Transaction[];
}
```

Ini adalah root state object yang di-hold di `App.tsx`.

## Enums & Unions

```typescript
// Item type enum
export enum ItemType {
  PRODUCT = 'PRODUK',
  MATERIAL = 'BAHAN_BAKU'
}

// Transaction direction
export type TransactionType = 'IN' | 'OUT' | 'OPNAME';

// Active tab routing
export type TabView = 'DASHBOARD' | 'MASTER' | 'STOCK' | 'OPNAME' | 'REPORT';
```

## UI Types

```typescript
export interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
}
```

## Entity Relationships

```
Category (1) ──── (N) Product
                         │
                         └── (N) Transaction (itemType: PRODUK)

Material (1) ──────────────── (N) Transaction (itemType: BAHAN_BAKU)
```

## camelCase ↔ snake_case Mapping

Supabase menggunakan `snake_case`, TypeScript menggunakan `camelCase`. Konversi dilakukan di `services/database.ts`:

| TypeScript | PostgreSQL |
|-----------|------------|
| `categoryId` | `category_id` |
| `priceCMT` | `price_cmt` |
| `isFavorite` | `is_favorite` |
| `updatedAt` | `updated_at` |
| `itemId` | `item_id` |
| `itemType` | `item_type` |
| `balanceAfter` | `balance_after` |

## Database Operations

Key Supabase operations di `services/database.ts`:

| Function | Operation |
|---------|-----------|
| `fetchAllData()` | Load semua data awal |
| `getProductsPaginated(page, limit, search)` | Paginated products |
| `getMaterialsPaginated(page, limit, search)` | Paginated materials |
| `getDashboardSummary()` | Aggregate stats (aset total) |
| `getFavoriteProducts()` | Filter `is_favorite: true` |
| `apiAddProduct(product)` | INSERT products |
| `apiUpdateProduct(id, product)` | UPDATE products |
| `apiDeleteProduct(id)` | DELETE products |
| `apiAddTransactionAndUpdateStock(...)` | RPC: atomic transaction + stock update |
| `signIn(email, password)` | Supabase auth |
| `signOut()` | Supabase auth |

Atomic transaction menggunakan Supabase RPC: `process_inventory_transaction` — stored procedure yang update stok dan insert transaction dalam satu database transaction.
