import { createAuthClient } from 'better-auth/client';
import { InventoryData, Product, Material, Category, Transaction, ItemType } from '../types';

const authClient = createAuthClient();

const apiFetch = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || 'Request failed'), { status: res.status });
  }
  return res.json();
};

const logError = (context: string, error: any) => {
  console.error(`[DB Error] ${context}:`, error?.message || JSON.stringify(error));
  return { error };
};

// --- AUTHENTICATION ---

export const signIn = async (email: string, password: string) => {
  return await authClient.signIn.email({ email, password });
};

export const signOut = async () => {
  return await authClient.signOut();
};

export const getCurrentSession = async () => {
  const { data } = await authClient.getSession();
  return data?.session || null;
};

// --- FETCH INITIAL DATA ---

export const fetchAllData = async (): Promise<InventoryData> => {
  try {
    const categories = await apiFetch('/api/categories');
    return { products: [], materials: [], categories: categories || [], transactions: [] };
  } catch (error) {
    logError('fetchAllData', error);
    return { products: [], materials: [], categories: [], transactions: [] };
  }
};

// --- PUBLIC DATA FETCHING ---

export const getPublicProductsPaginated = async (page: number, limitCount: number, search = '') => {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limitCount) });
    if (search) params.set('search', search);
    const result = await apiFetch(`/api/products/public?${params}`);
    return { data: result.data || [], categories: result.categories || [], error: null, count: result.count || 0 };
  } catch (error) {
    logError('getPublicProductsPaginated', error);
    return { data: [], categories: [], error, count: 0 };
  }
};

// --- DASHBOARD QUERIES ---

export const getDashboardSummary = async () => {
  try {
    const result = await apiFetch('/api/dashboard');
    return {
      totalAssetValue: result.totalAssetValue,
      productAssets: result.productAssetValue,
      materialAssets: result.materialAssetValue,
      productCount: result.totalProducts,
      materialCount: result.totalMaterials,
      lowStockCount: 0,
    };
  } catch (error) {
    logError('getDashboardSummary', error);
    return null;
  }
};

export const getFavoriteProducts = async () => {
  try {
    const data = await apiFetch('/api/products/favorites');
    return data || [];
  } catch (error) {
    logError('getFavoriteProducts', error);
    return [];
  }
};

export const getRecentTransactionsPaginated = async (page: number, limitCount: number) => {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limitCount) });
    const result = await apiFetch(`/api/transactions?${params}`);
    return { data: result.data || [], error: null, count: result.count || 0 };
  } catch (error) {
    logError('getRecentTransactionsPaginated', error);
    return { data: [], error, count: 0 };
  }
};

// --- HISTORY & REPORT QUERIES ---

export const getTransactionHistory = async (itemId: string, page = 1, limitCount = 10) => {
  if (!itemId) return { data: [], count: 0 };
  try {
    const params = new URLSearchParams({ itemId, page: String(page), limit: String(limitCount) });
    const result = await apiFetch(`/api/transactions?${params}`);
    return { data: result.data || [], count: result.count || 0 };
  } catch (error) {
    logError('getTransactionHistory', error);
    return { data: [], count: 0 };
  }
};

export const getTransactionsByDateRange = async (startDate: string, endDate: string) => {
  try {
    if (!startDate || !endDate) return [];
    const startParts = startDate.split('-').map(Number);
    const endParts = endDate.split('-').map(Number);
    const startObj = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
    const endObj = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
    const params = new URLSearchParams({
      dateFrom: startObj.toISOString(),
      dateTo: endObj.toISOString(),
      limit: '1000',
    });
    const result = await apiFetch(`/api/transactions?${params}`);
    return result.data || [];
  } catch (error) {
    logError('getTransactionsByDateRange', error);
    return [];
  }
};

// --- SERVER-SIDE PAGINATION ---

export const getProductsPaginated = async (page: number, limitCount: number, search = '', categoryId = '', onlyFavorites = false) => {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limitCount) });
    if (search) params.set('search', search);
    if (categoryId && categoryId !== 'SEMUA') params.set('categoryId', categoryId);
    if (onlyFavorites) params.set('onlyFavorites', 'true');
    const result = await apiFetch(`/api/products?${params}`);
    return { data: result.data || [], error: null, count: result.count || 0 };
  } catch (error) {
    logError('getProductsPaginated', error);
    return { data: [], error, count: 0 };
  }
};

export const getMaterialsPaginated = async (page: number, limitCount: number, search = '') => {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limitCount) });
    if (search) params.set('search', search);
    const result = await apiFetch(`/api/materials?${params}`);
    return { data: result.data || [], error: null, count: result.count || 0 };
  } catch (error) {
    logError('getMaterialsPaginated', error);
    return { data: [], error, count: 0 };
  }
};

// --- CRUD OPERATIONS ---

export const apiAddProduct = async (product: Product) => {
  try {
    const data = await apiFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        id: product.id,
        name: product.name,
        category_id: product.categoryId,
        price_cmt: product.priceCMT,
        hpp: product.hpp,
        stock: product.stock,
        is_favorite: product.isFavorite || false,
      }),
    });
    return { data: [data], error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const apiUpdateProduct = async (product: Product) => {
  try {
    const data = await apiFetch(`/api/products?id=${product.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: product.name,
        category_id: product.categoryId,
        price_cmt: product.priceCMT,
        hpp: product.hpp,
        stock: product.stock,
        is_favorite: product.isFavorite || false,
      }),
    });
    return { data: [data], error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const apiToggleProductFavorite = async (id: string, _isFavorite: boolean) => {
  try {
    await apiFetch(`/api/products/${id}/favorite`, { method: 'PATCH' });
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const apiDeleteProduct = async (id: string) => {
  try {
    await apiFetch(`/api/products?id=${id}`, { method: 'DELETE' });
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const apiAddMaterial = async (material: Material) => {
  try {
    const data = await apiFetch('/api/materials', {
      method: 'POST',
      body: JSON.stringify({
        id: material.id,
        name: material.name,
        unit: material.unit,
        price: material.price,
        stock: material.stock,
      }),
    });
    return { data: [data], error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const apiUpdateMaterial = async (material: Material) => {
  try {
    const data = await apiFetch(`/api/materials?id=${material.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: material.name,
        unit: material.unit,
        price: material.price,
        stock: material.stock,
      }),
    });
    return { data: [data], error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const apiDeleteMaterial = async (id: string) => {
  try {
    await apiFetch(`/api/materials?id=${id}`, { method: 'DELETE' });
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const apiAddCategory = async (category: Category) => {
  try {
    const data = await apiFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ id: category.id, name: category.name }),
    });
    return { data: [data], error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const apiDeleteCategory = async (id: string) => {
  try {
    await apiFetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// --- TRANSACTION WITH ATOMIC STOCK UPDATE ---

export const apiAddTransactionAndUpdateStock = async (
  transaction: Transaction,
  itemId: string,
  itemType: ItemType,
  manualStock: number | null = null
): Promise<{ newStock: number; error: any }> => {
  try {
    const data = await apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        id: transaction.id,
        item_id: itemId,
        item_type: itemType,
        type: transaction.type,
        qty: Number(transaction.qty),
        date: transaction.date,
        notes: transaction.notes || null,
        manual_stock: manualStock ?? null,
      }),
    });
    return { newStock: data.newStock, error: null };
  } catch (error) {
    logError('apiAddTransactionAndUpdateStock', error);
    return { newStock: 0, error };
  }
};
