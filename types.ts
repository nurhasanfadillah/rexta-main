

export enum ItemType {
  PRODUCT = 'PRODUK',
  MATERIAL = 'BAHAN_BAKU'
}

export type TransactionType = 'IN' | 'OUT' | 'OPNAME';

export interface Category {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  itemType: ItemType;
  type: TransactionType;
  qty: number; 
  date: string; // ISO String
  notes?: string;
  balanceAfter: number; 
}

export interface Product {
  id: string;
  name: string;
  categoryId: string; // Menggunakan ID lebih aman daripada nama
  priceCMT: number;
  hpp: number;
  stock: number;
  updatedAt?: string; // Sesuai schema: updated_at
  isFavorite?: boolean; // New Field
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  updatedAt?: string; // Sesuai schema: updated_at
}

export interface InventoryData {
  products: Product[];
  materials: Material[];
  categories: Category[];
  transactions: Transaction[];
}

export type TabView = 'DASHBOARD' | 'MASTER' | 'STOCK' | 'OPNAME' | 'REPORT';

export type NotificationType = 'success' | 'error' | 'warning';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
}