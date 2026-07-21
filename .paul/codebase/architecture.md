# Architecture

## Pattern

**Tab-Based SPA dengan Vercel Edge Functions sebagai Backend**

```
index.html → index.tsx → App.tsx (global state + auth gate)
                              ↓
                    Layout.tsx (navigation shell)
                              ↓
              [View Components] (feature views)
                              ↓
                   services/database.ts (API client)
                              ↓ HTTP requests (fetch + credentials)
                api/ (Vercel Edge Functions — 10 endpoints)
                              ↓ parameterized SQL
                      lib/db.ts → NeonDB PostgreSQL
```

## Folder Structure

```
rexta-main/
├── api/                    # Vercel Edge Functions (10 endpoints)
│   ├── auth-proxy.ts       # Better Auth handler
│   ├── health.ts           # DB health check
│   ├── products.ts         # Product CRUD + pagination
│   ├── categories.ts       # Category CRUD
│   ├── materials.ts        # Material CRUD + pagination
│   ├── dashboard.ts        # Aggregate stats
│   ├── transactions.ts     # Transaction history + create
│   └── products/
│       ├── public.ts       # Public listing (no auth)
│       ├── favorites.ts    # Favorite products
│       └── [id]/
│           └── favorite.ts # Toggle favorite
├── components/             # 15 React components
│   ├── DashboardView.tsx   (261 LOC)
│   ├── MasterDataView.tsx  (592 LOC)
│   ├── StockManageView.tsx (596 LOC)
│   ├── StockOpnameView.tsx (242 LOC)
│   ├── ReportsView.tsx     (216 LOC)
│   ├── PublicStockView.tsx (215 LOC)
│   ├── LoginView.tsx       (150 LOC)
│   ├── Layout.tsx          (264 LOC)
│   ├── QrScannerModal.tsx
│   ├── QrLabelModal.tsx
│   ├── NotificationPanel.tsx
│   ├── NotificationToast.tsx
│   ├── ConfirmationModal.tsx
│   ├── PaginationControl.tsx
│   └── AiAssistantView.tsx (stub kosong — deprecated)
├── lib/                    # Core infrastructure
│   ├── auth.ts             # Better Auth init (23 LOC)
│   ├── db.ts               # NeonDB Pool + HTTP adapter (14 LOC)
│   └── auth-middleware.ts  # requireSession() (11 LOC)
├── services/
│   ├── database.ts         # API client frontend (319 LOC)
│   ├── supabaseClient.ts   # (stub kosong — deprecated)
│   ├── geminiService.ts    # (stub kosong — deprecated)
│   └── storageService.ts   # (stub kosong — deprecated)
├── scripts/
│   ├── create-admin.mjs    # Seed admin user via Better Auth
│   └── seed-user.mjs       # Seed test user
├── App.tsx                 # Root state container (~429 LOC)
├── index.tsx               # React DOM entry point
├── index.html              # HTML shell + Tailwind CDN + PWA meta
├── types.ts                # TypeScript domain types
├── vercel.json             # Vercel routing rewrites
├── vite.config.ts          # Vite build config
├── tsconfig.json           # TypeScript config
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker v7
├── db_schema_neon.sql      # NeonDB schema (current)
└── db_schema.sql           # Legacy Supabase schema (reference only)
```

> **Note**: Tidak ada folder `src/` — semua file ada di root. Path alias `@/` → root.

## Routing

### Client-Side (Tab-Based)
**Tidak menggunakan React Router** — state `activeTab` di App.tsx:

```tsx
const [activeTab, setActiveTab] = useState<TabView>('DASHBOARD');
// TabView = 'DASHBOARD' | 'MASTER' | 'STOCK' | 'OPNAME' | 'REPORT'

// Auth gate:
!isLoggedIn
  ? isPublicMode ? <PublicStockView /> : <LoginView />
  : <Layout>{views}</Layout>
```

### Server-Side (Vercel rewrites di `vercel.json`)
```json
{ "source": "/api/auth/:path*", "destination": "/api/auth-proxy?p=:path*" }
{ "source": "/((?!api/).*)", "destination": "/index.html" }
```

## State Management

**Prop drilling dari App.tsx** — tidak ada Redux, Zustand, atau Context API.

```
App.tsx useState:
├── activeTab: TabView
├── inventory: InventoryData { products[], materials[], categories[], transactions[] }
├── isLoggedIn: boolean
├── isPublicMode: boolean
├── isDarkMode: boolean
├── loading: boolean
├── notifications: NotificationItem[]
└── notificationHistory: NotificationItem[]
```

Semua handlers (`handleAddProduct`, `handleTransaction`, dll.) ada di App.tsx dan diteruskan ke child via props.

## API Layer (`api/`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `auth-proxy` | ALL | — | Better Auth handler (login/logout/session) |
| `health` | GET | Yes | DB connection test |
| `products` | GET/POST/PUT/DELETE | Yes | Product CRUD + pagination |
| `categories` | GET | No | List categories |
| `categories` | POST/DELETE | Yes | Create/delete category |
| `materials` | GET/POST/PUT/DELETE | Yes | Material CRUD + pagination |
| `dashboard` | GET | Yes | Aggregate asset stats |
| `transactions` | GET/POST | Yes | Transaction history + create |
| `products/public` | GET | No | Public product listing |
| `products/favorites` | GET | Yes | Favorite products |
| `products/[id]/favorite` | PATCH | Yes | Toggle favorite |

Auth middleware: `requireSession()` dari `lib/auth-middleware.ts` — throw 401 jika tidak ada session.

## Data Flow

```
User action di View component
    ↓
Handler di App.tsx (e.g., handleAddProduct)
    ↓
API call di services/database.ts (e.g., apiAddProduct)
    ↓ fetch POST /api/products (with credentials: 'include')
api/products.ts (Vercel Edge Function)
    ↓ requireSession(req) → Better Auth session check
    ↓ db.query('INSERT INTO products...', params)
NeonDB PostgreSQL
    ↓ (response)
services/database.ts return result
    ↓
App.tsx update state (pessimistic update — tunggu konfirmasi API)
    ↓
Re-render View components via props
    ↓
NotificationToast feedback ke user
```

**Atomic Transaction Flow**:
```
POST /api/transactions → api/transactions.ts
    ↓
db.query('SELECT process_inventory_transaction($1,...)', params)
    ↓ RPC: reads stock → calculate new → UPDATE products → INSERT transactions (atomic)
returns { newStock: number }
```

## Component Hierarchy

```
App (state root, ~429 LOC)
├── NotificationToast[] (overlay)
├── LoginView (auth gate — 150 LOC)
├── PublicStockView (no-login mode — 215 LOC)
└── Layout (nav shell — 264 LOC)
    ├── NotificationPanel
    ├── DashboardView (261 LOC)
    ├── MasterDataView (592 LOC)
    │   ├── PaginationControl
    │   └── ConfirmationModal
    ├── StockManageView (596 LOC)
    │   ├── QrScannerModal
    │   ├── QrLabelModal
    │   └── PaginationControl
    ├── StockOpnameView (242 LOC)
    └── ReportsView (216 LOC)
```

## Database Schema (NeonDB)

### Domain Tables
| Table | Columns |
|-------|---------|
| `categories` | id (text PK), name (text UNIQUE) |
| `products` | id, name, category_id (FK), price_cmt, hpp, stock, is_favorite, updated_at |
| `materials` | id, name, unit, price, stock, updated_at |
| `transactions` | id, item_id, item_type, type, qty, date, notes, balance_after |

### Better Auth Tables
| Table | Purpose |
|-------|---------|
| `user` | id, name, email, emailVerified, createdAt, updatedAt |
| `session` | id, token, expiresAt, userId (FK) |
| `account` | id, userId (FK), password (hashed bcrypt), providerId |
| `verification` | id, identifier, value, expiresAt |

### Stored Procedure (RPC)
```sql
process_inventory_transaction(p_id, p_item_id, p_item_type, p_type, p_qty, p_date, p_notes, p_manual_stock)
→ returns numeric (new_stock)
```
Atomic: read → calculate → UPDATE products/materials → INSERT transactions dalam satu DB transaction.

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| No React Router | Tab switching cukup untuk use case ini |
| No Redux/Zustand | State di App.tsx acceptable untuk ukuran app |
| Vercel Edge Functions | Sudah di Vercel, incremental migration dari Supabase |
| NeonDB + Better Auth | Open source, PostgreSQL-native, serverless-compatible |
| Connection Pool (max 10) | NeonDB free tier limit 100 connections |
| HTTP adapter untuk categories | Stateless GET tidak butuh persistent connection |
| RPC untuk transactions | Atomic — tidak ada race condition pada stok |
| Tailwind via CDN | PWA-friendly, no build step untuk styles |
