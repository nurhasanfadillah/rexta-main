# Architecture

## Pattern

**Feature-Based SPA with Centralized State**

```
index.html → index.tsx → App.tsx (global state)
                              ↓
                    Layout.tsx (navigation shell)
                              ↓
              [View Components] (feature views)
                              ↓
                   services/database.ts (API layer)
                              ↓
                    services/supabaseClient.ts
                              ↓
                    Supabase PostgreSQL
```

## Folder Structure

```
rexta-main/
├── components/          # 15 TSX view/UI components (PascalCase)
│   ├── DashboardView.tsx
│   ├── MasterDataView.tsx   (592 LOC)
│   ├── StockManageView.tsx  (596 LOC)
│   ├── StockOpnameView.tsx
│   ├── ReportsView.tsx
│   ├── PublicStockView.tsx
│   ├── LoginView.tsx
│   ├── Layout.tsx           (264 LOC)
│   ├── QrScannerModal.tsx
│   ├── QrLabelModal.tsx
│   ├── NotificationPanel.tsx
│   ├── NotificationToast.tsx
│   ├── ConfirmationModal.tsx
│   ├── PaginationControl.tsx
│   └── AiAssistantView.tsx  (DEPRECATED — file kosong)
├── services/
│   ├── database.ts          (426 LOC — semua Supabase calls)
│   ├── supabaseClient.ts    (Supabase client init)
│   ├── geminiService.ts     (DEPRECATED — file kosong)
│   └── storageService.ts    (DEPRECATED — file kosong)
├── App.tsx                  (440 LOC — root state container)
├── index.tsx                (React DOM entry)
├── types.ts                 (semua TypeScript types)
├── index.html               (HTML shell + Tailwind config)
├── vite.config.ts
├── tsconfig.json
├── package.json
├── manifest.json
├── sw.js
├── db_schema.sql
├── db_config.sql
└── _redirects               (Netlify)
```

## Routing

**State-based tab navigation** — tidak menggunakan React Router atau file-based routing.

```tsx
// App.tsx
const [activeTab, setActiveTab] = useState<TabView>('DASHBOARD');

// Render:
{activeTab === 'DASHBOARD' && <DashboardView ... />}
{activeTab === 'MASTER'    && <MasterDataView ... />}
{activeTab === 'STOCK'     && <StockManageView ... />}
{activeTab === 'OPNAME'    && <StockOpnameView ... />}
{activeTab === 'REPORT'    && <ReportsView ... />}
```

Tab routes: `DASHBOARD | MASTER | STOCK | OPNAME | REPORT`

Auth guards: `isLoggedIn` state di App.tsx → tampilkan `LoginView` atau `PublicStockView`.

## State Management

**Prop drilling dari App.tsx** — tidak ada Redux, Zustand, atau Context API.

```
App.tsx useState:
├── activeTab: TabView
├── inventory: InventoryData { products[], materials[], categories[], transactions[] }
├── isLoggedIn: boolean
├── isPublicMode: boolean
├── isDarkMode: boolean
├── notifications: NotificationItem[]
└── notificationHistory: NotificationItem[]
```

Semua handlers (`handleAddProduct`, `handleTransaction`, dll.) ada di App.tsx dan diteruskan ke child via props.

## Data Flow

```
User action di View component
    ↓
Handler di App.tsx (e.g., handleAddProduct)
    ↓
API call di services/database.ts (e.g., apiAddProduct)
    ↓
Supabase PostgreSQL (via supabaseClient)
    ↓ (response)
App.tsx update state (pessimistic update — tunggu konfirmasi API)
    ↓
Re-render View components
    ↓
NotificationToast feedback ke user
```

## Component Hierarchy

```
App (state root)
├── NotificationToast[] (overlay)
├── LoginView (auth gate)
├── PublicStockView (public mode)
└── Layout (main scaffold)
    ├── Sidebar navigation
    ├── NotificationPanel
    ├── DashboardView
    ├── MasterDataView
    │   ├── QrLabelModal
    │   └── ConfirmationModal
    ├── StockManageView
    │   ├── QrScannerModal
    │   └── ConfirmationModal
    ├── StockOpnameView
    └── ReportsView
```

## Shared Components

| Component | Usage |
|-----------|-------|
| `ConfirmationModal.tsx` | Dialog konfirmasi hapus/aksi |
| `QrScannerModal.tsx` | Kamera scan QR di StockManage |
| `QrLabelModal.tsx` | Generate + print QR label |
| `NotificationToast.tsx` | Toast overlay (success/error/info) |
| `NotificationPanel.tsx` | History notifikasi |
| `PaginationControl.tsx` | Pagination di semua list |

## Database Layer (`services/database.ts`)

Semua Supabase calls terpisah di sini. Pattern utama:

```typescript
export const apiAddProduct = async (product: Omit<Product, 'id'>) => {
  try {
    const { data, error } = await supabase.from('products').insert(mapProductToDB(product));
    if (error) throw error;
    return mapProductFromDB(data[0]);
  } catch (error) {
    return logError('apiAddProduct', error);
  }
};
```

Mapping functions: `mapProductFromDB` / `mapProductToDB` konversi `camelCase` ↔ `snake_case`.

Server-side atomic operations via Supabase RPC: `process_inventory_transaction`.

## Key Architectural Decisions

- **Tidak ada React Router**: Tab switching cukup untuk use case ini
- **Tidak ada Context/Zustand**: State di App.tsx ditransfer via props; acceptable untuk ukuran app ini
- **Supabase sebagai full backend**: Tidak ada custom API server
- **Pagination di service layer**: `getProductsPaginated()`, `getMaterialsPaginated()` menghindari fetch semua data
- **PWA-first**: Service worker + manifest untuk offline support dan installability
