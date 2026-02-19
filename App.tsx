

import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import DashboardView from './components/DashboardView';
import MasterDataView from './components/MasterDataView';
import StockManageView from './components/StockManageView';
import StockOpnameView from './components/StockOpnameView';
import ReportsView from './components/ReportsView';
import NotificationToast from './components/NotificationToast';
import NotificationPanel from './components/NotificationPanel';
import LoginView from './components/LoginView';
import PublicStockView from './components/PublicStockView';
import { InventoryData, TabView, Product, Material, Transaction, NotificationItem, ItemType, TransactionType } from './types';
import { 
  fetchAllData, 
  apiAddProduct, 
  apiUpdateProduct, 
  apiDeleteProduct,
  apiAddMaterial,
  apiUpdateMaterial,
  apiDeleteMaterial,
  apiAddCategory,
  apiDeleteCategory,
  apiAddTransactionAndUpdateStock,
  signOut,
  getCurrentSession
} from './services/database';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('DASHBOARD');
  const [inventory, setInventory] = useState<InventoryData>({ products: [], materials: [], categories: [], transactions: [] });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationItem[]>([]);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [unreadNotif, setUnreadNotif] = useState(false);
  
  // Auth & View State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPublicMode, setIsPublicMode] = useState(false);

  // Default Dark Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('rexta_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rexta_theme', 'dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#020617');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rexta_theme', 'light');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0891b2');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const addNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now().toString() + Math.random().toString();
    const newNotif = { id, message, type };
    setNotifications(prev => [...prev, newNotif]);
    setNotificationHistory(prev => [...prev, newNotif].slice(-20));
    setUnreadNotif(true);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleOpenNotifPanel = () => {
    setIsNotifPanelOpen(true);
    setUnreadNotif(false);
  };

  const handleClearHistory = () => {
    setNotificationHistory([]);
    setIsNotifPanelOpen(false);
  };

  // Load Data from Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllData();
      setInventory(data);
    } catch (e) {
      addNotification('Gagal memuat data awal', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check Auth and Initial Load
  useEffect(() => {
    const checkSession = async () => {
      const session = await getCurrentSession();
      if (session) {
        setIsLoggedIn(true);
        loadData();
      } else {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
        setIsPublicMode(false); // Reset public mode if logged in
        // Don't reload data here if it's already loading/loaded to prevent loops
        if (!isLoggedIn) loadData(); 
      } else {
        setIsLoggedIn(false);
        setInventory({ products: [], materials: [], categories: [], transactions: [] });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (status: boolean) => {
    if (status) {
      setIsLoggedIn(true);
      loadData();
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsLoggedIn(false);
    setActiveTab('DASHBOARD');
    setInventory({ products: [], materials: [], categories: [], transactions: [] });
    addNotification('Anda berhasil keluar', 'success');
  };

  // --- Handlers with Supabase Integration ---

  const handleAddProduct = async (product: Product) => {
    try {
      const { error } = await apiAddProduct(product);
      if (error) throw error;
      
      // Update local state is optional since we use pagination now, but good for cache
      setInventory(prev => ({ ...prev, products: [...prev.products, product] }));
      addNotification(`Produk ${product.name} berhasil ditambahkan`, 'success');
    } catch (e: any) {
      console.error(e);
      if (e.code === '23505') {
        addNotification(`Gagal: Nama produk "${product.name}" sudah ada.`, 'warning');
      } else {
        addNotification('Gagal menyimpan produk ke database', 'error');
      }
      throw e; // Re-throw so caller knows it failed
    }
  };

  const handleUpdateProduct = async (updated: Product) => {
    try {
      const { error } = await apiUpdateProduct(updated);
      if (error) throw error;

      setInventory(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === updated.id ? updated : p)
      }));
      addNotification(`Produk ${updated.name} diperbarui`, 'success');
    } catch (e: any) {
      console.error(e);
      if (e.code === '23505') {
        addNotification(`Gagal: Nama produk "${updated.name}" sudah digunakan item lain.`, 'warning');
      } else {
        addNotification('Gagal memperbarui produk', 'error');
      }
      throw e;
    }
  };

  const handleAddMaterial = async (material: Material) => {
    try {
      const { error } = await apiAddMaterial(material);
      if (error) throw error;

      setInventory(prev => ({ ...prev, materials: [...prev.materials, material] }));
      addNotification(`Bahan ${material.name} berhasil ditambahkan`, 'success');
    } catch (e: any) {
      console.error(e);
      if (e.code === '23505') {
        addNotification(`Gagal: Nama bahan "${material.name}" sudah ada.`, 'warning');
      } else {
        addNotification('Gagal menyimpan bahan', 'error');
      }
      throw e;
    }
  };

  const handleUpdateMaterial = async (updated: Material) => {
    try {
      const { error } = await apiUpdateMaterial(updated);
      if (error) throw error;

      setInventory(prev => ({
        ...prev,
        materials: prev.materials.map(m => m.id === updated.id ? updated : m)
      }));
      addNotification(`Bahan ${updated.name} diperbarui`, 'success');
    } catch (e: any) {
      console.error(e);
      if (e.code === '23505') {
        addNotification(`Gagal: Nama bahan "${updated.name}" sudah digunakan item lain.`, 'warning');
      } else {
        addNotification('Gagal memperbarui bahan', 'error');
      }
      throw e;
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await apiDeleteProduct(id);
      if (error) throw error;

      setInventory(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
      addNotification('Produk berhasil dihapus', 'success');
    } catch (e: any) {
      addNotification('Gagal menghapus: Item mungkin memiliki riwayat transaksi', 'error');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      const { error } = await apiDeleteMaterial(id);
      if (error) throw error;

      setInventory(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== id) }));
      addNotification('Bahan berhasil dihapus', 'success');
    } catch (e: any) {
       addNotification('Gagal menghapus: Item mungkin memiliki riwayat transaksi', 'error');
    }
  };

  const handleAddCategory = async (name: string) => {
    if (inventory.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      return addNotification('Kategori sudah ada', 'warning');
    }
    const newCat = { id: `CAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`, name };
    
    try {
      const { error } = await apiAddCategory(newCat);
      if (error) throw error;

      setInventory(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
      addNotification(`Kategori ${name} ditambahkan`, 'success');
    } catch (e) {
      addNotification('Gagal menyimpan kategori', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await apiDeleteCategory(id);
      if (error) throw error;

      setInventory(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
      addNotification('Kategori dihapus', 'success');
    } catch (e) {
      addNotification('Gagal menghapus: Kategori sedang digunakan', 'error');
    }
  };

  const handleTransaction = async (itemId: string, itemType: ItemType, type: TransactionType, qty: number, notes: string) => {
    const newTrans: Transaction = {
      id: `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      itemId, itemType, type, qty, notes,
      date: new Date().toISOString(),
      balanceAfter: 0 // Will be updated by server
    };

    try {
      // Server-Side Calc: Kita kirim null untuk manualStock karena ini IN/OUT
      const { newStock, error } = await apiAddTransactionAndUpdateStock(newTrans, itemId, itemType, null);

      if (error) {
         if (error.code === '42883') { // undefined_function
             throw new Error('Database belum dikonfigurasi (RPC missing). Jalankan script SQL.');
         }
         if (error.code === '42703') { // undefined_column
             throw new Error('Skema Database tidak cocok (Column missing). Jalankan script SQL migrasi.');
         }
         throw error;
      }

      // Update Local State with Server Response (Source of Truth)
      const items = itemType === ItemType.PRODUCT ? [...inventory.products] : [...inventory.materials];
      const index = items.findIndex(i => i.id === itemId);
      
      if (index !== -1) {
        setInventory(prev => {
            const updatedData = { ...prev };
            const updatedItem = { ...items[index], stock: newStock };
            if (itemType === ItemType.PRODUCT) updatedData.products[index] = updatedItem as Product;
            else updatedData.materials[index] = updatedItem as Material;
            
            // Perbarui data transaksi lokal untuk display langsung
            const completedTrans = { ...newTrans, balanceAfter: newStock };
            updatedData.transactions = [completedTrans, ...prev.transactions];
            return updatedData;
        });
      }
      
      addNotification(`Transaksi Berhasil: ${type} ${qty}. Stok Kini: ${newStock}`, 'success');
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.message || 'Gagal menyimpan transaksi (Error Database)';
      addNotification(errorMsg, 'error');
      throw e; 
    }
  };

  const handleOpname = async (itemId: string, itemType: ItemType, realQty: number, notes: string, currentSysStock: number) => {
    const diff = realQty - currentSysStock;

    const newTrans: Transaction = {
      id: `OPN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      itemId, itemType, type: 'OPNAME', 
      qty: diff, // Simpan selisih, bukan 0
      notes,
      date: new Date().toISOString(),
      balanceAfter: realQty
    };

    try {
      const { newStock, error } = await apiAddTransactionAndUpdateStock(newTrans, itemId, itemType, realQty);

      if (error) {
         if (error.code === '42883') {
             throw new Error('Database belum dikonfigurasi (RPC missing). Jalankan script SQL.');
         }
         if (error.code === '42703') {
             throw new Error('Skema Database tidak cocok (Column missing). Jalankan script SQL migrasi.');
         }
         throw error;
      }

      setInventory(prev => {
        const items = itemType === ItemType.PRODUCT ? [...prev.products] : [...prev.materials];
        const idx = items.findIndex(i => i.id === itemId);
        
        if (idx !== -1) {
            const updatedData = { ...prev };
            const updatedItem = { ...items[idx], stock: newStock };
            if (itemType === ItemType.PRODUCT) updatedData.products[idx] = updatedItem as Product;
            else updatedData.materials[idx] = updatedItem as Material;
            
            const completedTrans = { ...newTrans, balanceAfter: newStock };
            updatedData.transactions = [completedTrans, ...prev.transactions];
            return updatedData;
        }
        return prev;
      });

      addNotification(`Opname sukses. Selisih: ${diff > 0 ? '+' : ''}${diff}. Stok kini: ${newStock}`, 'success');
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.message || 'Gagal menyimpan opname ke database';
      addNotification(errorMsg, 'error');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-surface dark:bg-darkSurface flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <>
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center px-4 pointer-events-none">
        {notifications.map(n => <NotificationToast key={n.id} notification={n} onClose={removeNotification} />)}
      </div>

      {!isLoggedIn ? (
        isPublicMode ? (
          <PublicStockView 
             onBackToLogin={() => setIsPublicMode(false)}
             isDarkMode={isDarkMode}
             onToggleDarkMode={toggleDarkMode}
          />
        ) : (
          <LoginView 
             onLogin={handleLogin} 
             onNotify={addNotification} 
             onPublicAccess={() => setIsPublicMode(true)}
          />
        )
      ) : (
        <>
          <NotificationPanel 
            isOpen={isNotifPanelOpen} 
            onClose={() => setIsNotifPanelOpen(false)} 
            notifications={notificationHistory}
            onClear={handleClearHistory}
          />

          <Layout 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            isDarkMode={isDarkMode} 
            onToggleDarkMode={toggleDarkMode}
            notificationCount={unreadNotif ? notificationHistory.length : 0}
            onOpenNotifications={handleOpenNotifPanel}
            onLogout={handleLogout}
          >
            {activeTab === 'DASHBOARD' && <DashboardView data={inventory} />}
            {activeTab === 'MASTER' && (
              <MasterDataView 
                data={inventory} categories={inventory.categories}
                onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct}
                onAddMaterial={handleAddMaterial} onUpdateMaterial={handleUpdateMaterial} onDeleteMaterial={handleDeleteMaterial}
                onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} onNotify={addNotification}
              />
            )}
            {activeTab === 'STOCK' && <StockManageView data={inventory} onTransaction={handleTransaction} onNotify={addNotification} />}
            {activeTab === 'OPNAME' && <StockOpnameView data={inventory} onOpname={handleOpname} onNotify={addNotification} />}
            {activeTab === 'REPORT' && <ReportsView data={inventory} onNotify={addNotification} />}
          </Layout>
        </>
      )}
    </>
  );
};

export default App;
