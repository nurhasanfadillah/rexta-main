

import { supabase } from './supabaseClient';
import { InventoryData, Product, Material, Category, Transaction, ItemType } from '../types';

// --- HELPER LOGGING ---
const logError = (context: string, error: any) => {
  const msg = error?.message || JSON.stringify(error);
  console.error(`[DB Error] ${context}:`, msg);
  return { error }; // Return original error object for throwing
};

// --- AUTHENTICATION ---
export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

// --- MAPPING HELPERS (CamelCase <-> Snake_Case) ---
const mapProductFromDB = (row: any): Product => ({
  id: row.id,
  name: row.name,
  categoryId: row.category_id || '', 
  priceCMT: Number(row.price_cmt) || 0,
  hpp: Number(row.hpp) || 0,
  stock: Number(row.stock) || 0,
  updatedAt: row.updated_at,
  isFavorite: row.is_favorite || false
});

const mapProductToDB = (p: Product) => ({
  id: p.id,
  name: p.name,
  category_id: p.categoryId,
  price_cmt: p.priceCMT,
  hpp: p.hpp,
  stock: p.stock,
  is_favorite: p.isFavorite || false,
  updated_at: new Date().toISOString() // Force update timestamp on client save
});

const mapMaterialFromDB = (row: any): Material => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  price: Number(row.price) || 0,
  stock: Number(row.stock) || 0,
  updatedAt: row.updated_at
});

const mapMaterialToDB = (m: Material) => ({
  id: m.id,
  name: m.name,
  unit: m.unit,
  price: m.price,
  stock: m.stock,
  updated_at: new Date().toISOString()
});

const mapTransactionFromDB = (row: any): Transaction => ({
  id: row.id,
  itemId: row.item_id,
  itemType: row.item_type,
  type: row.type,
  qty: Number(row.qty) || 0,
  date: row.date,
  notes: row.notes || '',
  balanceAfter: Number(row.balance_after) || 0
});

// --- FETCH INITIAL DATA ---

export const fetchAllData = async (): Promise<InventoryData> => {
  try {
    const { data: categories, error } = await supabase.from('categories').select('*');

    if (error) {
      logError('Categories Fetch', error);
      throw error;
    }

    // Kita tidak fetch products/materials semua di awal untuk performa (pindah ke pagination)
    return {
      products: [], 
      materials: [],
      categories: categories || [],
      transactions: [],
    };
  } catch (error) {
    logError('fetchAllData', error);
    return { products: [], materials: [], categories: [], transactions: [] };
  }
};

// --- PUBLIC DATA FETCHING ---
export const getPublicProductsPaginated = async (page: number, limitCount: number, search: string = '') => {
  try {
    const from = (page - 1) * limitCount;
    const to = from + limitCount - 1;

    // Fetch Categories for mapping name (Public Read)
    const { data: categories } = await supabase.from('categories').select('id, name');

    // Fetch Products (Public Read - Restricted Columns)
    // Hanya ambil id, name, stock, category_id
    let query = supabase
      .from('products')
      .select('id, name, stock, category_id', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query;
    
    if (error) {
      logError('getPublicProductsPaginated', error);
      return { data: [], categories: [], error, count: 0 };
    }

    // Mapping sederhana untuk view publik
    const mappedData = data ? data.map((row: any) => ({
      id: row.id,
      name: row.name,
      stock: Number(row.stock) || 0,
      categoryId: row.category_id
    })) : [];
    
    return { data: mappedData, categories: categories || [], error, count };
  } catch (error) {
    logError('getPublicProductsPaginated Exception', error);
    return { data: [], categories: [], error, count: 0 };
  }
};

// --- DASHBOARD QUERIES ---

export const getDashboardSummary = async () => {
  try {
    const [productsRes, materialsRes] = await Promise.all([
      supabase.from('products').select('stock, hpp'), 
      supabase.from('materials').select('stock, price')
    ]);

    if (productsRes.error) throw productsRes.error;
    if (materialsRes.error) throw materialsRes.error;

    const products = productsRes.data || [];
    const materials = materialsRes.data || []; 

    const productAssets = products.reduce((acc, curr: any) => acc + (Number(curr.stock || 0) * Number(curr.hpp || 0)), 0);
    const materialAssets = materials.reduce((acc, curr: any) => acc + (Number(curr.stock || 0) * Number(curr.price || 0)), 0);

    return {
      totalAssetValue: productAssets + materialAssets,
      productAssets,
      materialAssets,
      productCount: products.length,
      materialCount: materials.length,
      lowStockCount: products.filter((p: any) => Number(p.stock) < 10).length
    };
  } catch (error) {
    logError('getDashboardSummary', error);
    return null;
  }
};

export const getFavoriteProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_favorite', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapProductFromDB);
  } catch (error) {
    logError('getFavoriteProducts', error);
    return [];
  }
};

export const getRecentTransactionsPaginated = async (page: number, limitCount: number) => {
  try {
    const from = (page - 1) * limitCount;
    const to = from + limitCount - 1;

    const { data, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .range(from, to);

    if (error) {
      logError('getRecentTransactionsPaginated', error);
      return { data: [], error, count: 0 };
    }

    const mappedData = data ? data.map(mapTransactionFromDB) : [];
    return { data: mappedData, error, count: count || 0 };
  } catch (error) {
    logError('getRecentTransactionsPaginated Exception', error);
    return { data: [], error, count: 0 };
  }
};

// --- HISTORY & REPORT QUERIES ---

export const getTransactionHistory = async (itemId: string, page: number = 1, limitCount: number = 10) => {
  if (!itemId) return { data: [], count: 0 };

  try {
    const from = (page - 1) * limitCount;
    const to = from + limitCount - 1;

    const { data, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('item_id', itemId) 
      .order('date', { ascending: false })
      .range(from, to);

    if (error) {
      logError('getTransactionHistory', error);
      return { data: [], count: 0 };
    }
    
    const mappedData = (data || []).map(mapTransactionFromDB);
    return { data: mappedData, count: count || 0 };
  } catch (error) {
    logError('getTransactionHistory Exception', error);
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

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startObj.toISOString())
      .lte('date', endObj.toISOString())
      .order('date', { ascending: false });

    if (error) {
      logError('getTransactionsByDateRange', error);
      return [];
    }
    return (data || []).map(mapTransactionFromDB);
  } catch (error) {
    logError('getTransactionsByDateRange Exception', error);
    return [];
  }
};

// --- SERVER-SIDE PAGINATION ---

export const getProductsPaginated = async (page: number, limitCount: number, search: string = '', categoryId: string = '', onlyFavorites: boolean = false) => {
  try {
    const from = (page - 1) * limitCount;
    const to = from + limitCount - 1;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (categoryId && categoryId !== 'SEMUA') {
      query = query.eq('category_id', categoryId);
    }
    
    if (onlyFavorites) {
      query = query.eq('is_favorite', true);
    }

    const { data, error, count } = await query;
    
    if (error) {
      logError('getProductsPaginated', error);
      return { data: [], error, count: 0 };
    }

    const mappedData = data ? data.map(mapProductFromDB) : [];
    
    return { data: mappedData, error, count };
  } catch (error) {
    logError('getProductsPaginated Exception', error);
    return { data: [], error, count: 0 };
  }
};

export const getMaterialsPaginated = async (page: number, limitCount: number, search: string = '') => {
  try {
    const from = (page - 1) * limitCount;
    const to = from + limitCount - 1;

    let query = supabase
      .from('materials')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query;
    
    if (error) {
      logError('getMaterialsPaginated', error);
      return { data: [], error, count: 0 };
    }

    const mappedData = data ? data.map(mapMaterialFromDB) : [];

    return { data: mappedData, error, count };
  } catch (error) {
    logError('getMaterialsPaginated Exception', error);
    return { data: [], error, count: 0 };
  }
};

// --- CRUD OPERATIONS ---

export const apiAddProduct = async (product: Product) => {
  const payload = mapProductToDB(product);
  return await supabase.from('products').insert([payload]).select();
};

export const apiUpdateProduct = async (product: Product) => {
  const payload = mapProductToDB(product);
  return await supabase.from('products').update(payload).eq('id', product.id).select();
};

export const apiToggleProductFavorite = async (id: string, isFavorite: boolean) => {
  return await supabase.from('products').update({ is_favorite: isFavorite }).eq('id', id);
};

export const apiDeleteProduct = async (id: string) => {
  return await supabase.from('products').delete().eq('id', id);
};

export const apiAddMaterial = async (material: Material) => {
  const payload = mapMaterialToDB(material);
  return await supabase.from('materials').insert([payload]).select();
};

export const apiUpdateMaterial = async (material: Material) => {
  const payload = mapMaterialToDB(material);
  return await supabase.from('materials').update(payload).eq('id', material.id).select();
};

export const apiDeleteMaterial = async (id: string) => {
  return await supabase.from('materials').delete().eq('id', id);
};

export const apiAddCategory = async (category: Category) => {
  return await supabase.from('categories').insert([category]).select();
};

export const apiDeleteCategory = async (id: string) => {
  return await supabase.from('categories').delete().eq('id', id);
};

// --- TRANSACTION WITH RPC (ATOMICITY) ---
export const apiAddTransactionAndUpdateStock = async (
  transaction: Transaction,
  itemId: string,
  itemType: ItemType,
  manualStock: number | null = null // Hanya untuk Opname
): Promise<{ newStock: number; error: any }> => {
  
  // Panggil RPC yang sudah kita definisikan di SQL
  const { data, error } = await supabase.rpc('process_inventory_transaction', {
    p_id: transaction.id,
    p_item_id: itemId,
    p_item_type: itemType, 
    p_type: transaction.type, 
    p_qty: Number(transaction.qty), 
    p_date: transaction.date,
    p_notes: transaction.notes || '',
    p_manual_stock: manualStock // Akan null jika transaksi biasa (IN/OUT)
  });

  if (error) {
    console.error("RPC Failed:", JSON.stringify(error, null, 2));
    
    // Handle Ambiguous Function (PGRST203)
    if (error.code === 'PGRST203') {
       return { newStock: 0, error: { message: "Konflik Database: Hapus fungsi RPC 'process_inventory_transaction' yang lama sebelum menjalankan skrip baru." } };
    }
    
    // Handle Undefined Function (Belum dibuat)
    if (error.code === '42883') {
       return { newStock: 0, error: { message: "Database belum siap. Jalankan isi file 'db_schema.sql' di Supabase SQL Editor." } };
    }

    return { newStock: 0, error };
  }

  // RPC mengembalikan integer (stok baru)
  return { newStock: data as number, error: null };
};