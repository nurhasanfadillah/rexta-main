# Data Models

**Source TypeScript types**: `types.ts`  
**Database schema**: `db_schema_neon.sql`

## Core Domain Types

### Product

```typescript
export interface Product {
  id: string;
  name: string;
  categoryId: string;     // FK ke Category
  priceCMT: number;       // Harga jual per unit
  hpp: number;            // Harga Pokok Penjualan
  stock: number;
  updatedAt?: string;     // ISO datetime
  isFavorite?: boolean;   // Produk favorit di dashboard
}
```

DB mapping:

| TypeScript | PostgreSQL |
|-----------|------------|
| `categoryId` | `category_id` |
| `priceCMT` | `price_cmt` |
| `isFavorite` | `is_favorite` |
| `updatedAt` | `updated_at` |

---

### Material

```typescript
export interface Material {
  id: string;
  name: string;
  unit: string;     // Satuan: kg, liter, pcs, dll.
  price: number;    // Harga per unit
  stock: number;
  updatedAt?: string;
}
```

---

### Category

```typescript
export interface Category {
  id: string;
  name: string;
}
```

---

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

DB mapping:

| TypeScript | PostgreSQL |
|-----------|------------|
| `itemId` | `item_id` |
| `itemType` | `item_type` |
| `balanceAfter` | `balance_after` |

---

### InventoryData (Aggregate State)

```typescript
export interface InventoryData {
  products: Product[];
  materials: Material[];
  categories: Category[];
  transactions: Transaction[];
}
```

Root state object di `App.tsx`. Diisi saat app load via `fetchAllData()`.

---

## Enums & Union Types

```typescript
// Item type — tentukan apakah transaksi untuk produk atau bahan baku
export enum ItemType {
  PRODUCT = 'PRODUK',
  MATERIAL = 'BAHAN_BAKU'
}

// Arah transaksi stok
export type TransactionType = 'IN' | 'OUT' | 'OPNAME';

// Tab routing aktif di App.tsx
export type TabView = 'DASHBOARD' | 'MASTER' | 'STOCK' | 'OPNAME' | 'REPORT';
```

---

## UI Types

```typescript
export interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
}
```

---

## Better Auth Tables (di NeonDB)

| Table | Key Columns |
|-------|-------------|
| `user` | id, name, email (UNIQUE), emailVerified, createdAt, updatedAt |
| `session` | id, token (UNIQUE), expiresAt, userId (FK) |
| `account` | id, userId (FK), password (bcrypt hashed), providerId |
| `verification` | id, identifier, value, expiresAt |

---

## Entity Relationships

```
Category (1) ──── (N) Product
                         │
                         └──── (N) Transaction [itemType: PRODUK]

Material (1) ─────────────── (N) Transaction [itemType: BAHAN_BAKU]

user (1) ──── (N) session [Better Auth]
user (1) ──── (1) account [password + providerId]
```

---

## Database Schema Highlights

```sql
-- Atomic transaction RPC
CREATE OR REPLACE FUNCTION process_inventory_transaction(
  p_id TEXT, p_item_id TEXT, p_item_type TEXT, p_type TEXT,
  p_qty NUMERIC, p_date TEXT, p_notes TEXT, p_manual_stock NUMERIC
) RETURNS NUMERIC AS $$
-- IN:  new_stock = current + qty
-- OUT: new_stock = current - qty  
-- OPNAME: new_stock = manual_stock (override)
-- Atomic: UPDATE products/materials + INSERT transactions
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX idx_transactions_item_id ON transactions(item_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_materials_name ON materials(name);
CREATE INDEX idx_products_favorite ON products(is_favorite);
```

---

## API Response Shapes

```typescript
// Paginated list
{ data: T[], count: number }

// Single item create/update
{ data: T }

// Transaction (returns new stock)
{ transaction: Transaction, newStock: number }

// Error
{ error: string }
```

---

## Data Transformation

Dilakukan di `api/*.ts` via `mapXFromDB()` functions:

```typescript
// DB row (snake_case) → TypeScript (camelCase)
const mapProductFromDB = (row: any): Product => ({
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

Numeric values di-cast via `Number()` karena PostgreSQL mengembalikan strings untuk NUMERIC columns via node-postgres.
