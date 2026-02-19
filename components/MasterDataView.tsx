
import React, { useState, useEffect, useCallback } from 'react';
import { InventoryData, Product, Material, ItemType, Category } from '../types';
import { Plus, Trash2, Edit2, Search, ChevronDown, Settings, X, PackageOpen, FileDown, Loader2, QrCode, Wallet, Package, Star } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import QrLabelModal from './QrLabelModal';
import PaginationControl from './PaginationControl';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getProductsPaginated, getMaterialsPaginated, apiToggleProductFavorite, getDashboardSummary } from '../services/database';

interface MasterDataViewProps {
  data: InventoryData;
  categories: Category[];
  onAddProduct: (p: Product) => void;
  onAddMaterial: (m: Material) => void;
  onUpdateProduct: (p: Product) => void;
  onUpdateMaterial: (m: Material) => void;
  onDeleteProduct: (id: string) => void;
  onDeleteMaterial: (id: string) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  onNotify: (message: string, type: 'success' | 'error' | 'warning') => void;
}

const MasterDataView: React.FC<MasterDataViewProps> = ({ 
  data, categories, onAddProduct, onAddMaterial, onUpdateProduct, onUpdateMaterial, onDeleteProduct, onDeleteMaterial,
  onAddCategory, onDeleteCategory, onNotify
}) => {
  const [activeTab, setActiveTab] = useState<ItemType>(ItemType.PRODUCT);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  
  // State untuk Total Aset Global
  const [globalAssetValue, setGlobalAssetValue] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedQrItem, setSelectedQrItem] = useState<{id: string, name: string, subtitle: string} | null>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price1, setPrice1] = useState(''); 
  const [price2, setPrice2] = useState(''); 
  const [unit, setUnit] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string; action: () => void; isDanger: boolean;
  }>({ isOpen: false, title: '', message: '', action: () => {}, isDanger: false });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Paginated Data
      if (activeTab === ItemType.PRODUCT) {
        const { data, count } = await getProductsPaginated(currentPage, itemsPerPage, searchQuery, '', showFavoritesOnly);
        setProducts(data || []);
        setTotalItems(count || 0);
      } else {
        const { data, count } = await getMaterialsPaginated(currentPage, itemsPerPage, searchQuery);
        setMaterials(data || []);
        setTotalItems(count || 0);
      }

      // 2. Fetch Global Summary untuk Header (agar Total Rp Akurat)
      // Kita panggil ini agar angka di header mencerminkan total database, bukan hanya page ini
      const summary = await getDashboardSummary();
      if (summary) {
        setGlobalAssetValue(activeTab === ItemType.PRODUCT ? summary.productAssets : summary.materialAssets);
      }

    } catch (e) {
      onNotify('Gagal memuat data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, itemsPerPage, searchQuery, showFavoritesOnly, onNotify]);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  // Reset pagination when filter changes
  useEffect(() => { 
    setCurrentPage(1); 
  }, [activeTab, searchQuery, showFavoritesOnly]);

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Umum';

  const resetForm = () => {
    setName(''); setCategoryId(''); setPrice1(''); setPrice2(''); setUnit('');
    setEditingId(null); setIsFormOpen(false);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    if (activeTab === ItemType.PRODUCT) {
      setCategoryId(item.categoryId);
      setPrice1(item.priceCMT.toString());
      setPrice2(item.hpp.toString());
    } else {
      setUnit(item.unit);
      setPrice1(item.price.toString());
    }
    setIsFormOpen(true);
  };

  const handleToggleFavorite = async (item: Product) => {
    const newStatus = !item.isFavorite;
    try {
      await apiToggleProductFavorite(item.id, newStatus);
      
      // Update local state
      setProducts(prev => {
        if (showFavoritesOnly && !newStatus) {
           return prev.filter(p => p.id !== item.id);
        }
        return prev.map(p => p.id === item.id ? { ...p, isFavorite: newStatus } : p);
      });

      if (showFavoritesOnly && !newStatus) {
         setTotalItems(prev => Math.max(0, prev - 1));
      }

      onNotify(`${item.name} ${newStatus ? 'ditambahkan ke' : 'dihapus dari'} favorit`, 'success');
    } catch (e) {
      onNotify('Gagal mengubah status favorit', 'error');
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const headers = activeTab === ItemType.PRODUCT
        ? [['No', 'Produk', 'Kategori', 'CMT', 'HPP', 'Stok']]
        : [['No', 'Bahan', 'Satuan', 'Harga', 'Stok']];
      
      const currentData = activeTab === ItemType.PRODUCT ? products : materials;
      
      const body = activeTab === ItemType.PRODUCT
        ? (currentData as Product[]).map((p, i) => [i+1, p.name, getCategoryName(p.categoryId), p.priceCMT, p.hpp, p.stock])
        : (currentData as Material[]).map((m, i) => [i+1, m.name, m.unit, m.price, m.stock]);

      autoTable(doc, { head: headers, body });
      doc.save(`Data_${activeTab}_${Date.now()}.pdf`);
      onNotify('PDF Halaman ini berhasil dibuat', 'success');
    } catch (e) {
      onNotify('Gagal ekspor PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const triggerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (Number(price1) < 0 || (price2 && Number(price2) < 0)) {
        onNotify('Harga tidak boleh negatif', 'error'); return;
    }

    const performSave = async () => {
      const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      let currentStock = 0;
      let currentFav = false;

      if (editingId) {
         const item = activeTab === ItemType.PRODUCT 
           ? products.find(p => p.id === editingId)
           : materials.find(m => m.id === editingId);
         currentStock = item?.stock || 0;
         if (activeTab === ItemType.PRODUCT) {
           currentFav = (item as Product).isFavorite || false;
         }
      }

      try {
        if (activeTab === ItemType.PRODUCT) {
          const p: Product = {
            id: editingId || generateId('PRD'), name: name.trim(), categoryId,
            priceCMT: Number(price1), hpp: Number(price2), stock: currentStock,
            isFavorite: currentFav
          };
          editingId ? await onUpdateProduct(p) : await onAddProduct(p);
        } else {
          const m: Material = {
            id: editingId || generateId('MAT'), name: name.trim(), unit,
            price: Number(price1), stock: currentStock
          };
          editingId ? await onUpdateMaterial(m) : await onAddMaterial(m);
        }
        fetchData(); resetForm(); setConfirmState(prev => ({ ...prev, isOpen: false }));
      } catch (err) { onNotify('Gagal menyimpan data', 'error'); }
    };

    setConfirmState({
      isOpen: true, title: editingId ? 'Simpan Perubahan?' : 'Tambah Data?',
      message: `Anda akan menyimpan data "${name}".`, isDanger: false, action: performSave
    });
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true, title: 'Hapus Data?', message: `Hapus item ini? Tindakan tidak dapat dibatalkan.`, isDanger: true,
      action: async () => {
        try {
          activeTab === ItemType.PRODUCT ? await onDeleteProduct(id) : await onDeleteMaterial(id);
          fetchData(); setConfirmState(p => ({...p, isOpen: false}));
        } catch (e) { onNotify('Gagal menghapus', 'error'); }
      }
    });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentDataList = activeTab === ItemType.PRODUCT ? products : materials;

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    onAddCategory(newCategoryName.trim());
    setNewCategoryName('');
  };

  // Desktop Table Row Renderer
  const renderTableRow = (item: any, index: number) => {
    const cost = activeTab === ItemType.PRODUCT ? item.hpp : item.price;
    const assetValue = cost * item.stock;
    const isLowStock = item.stock < 10;
    
    return (
      <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-3">
             <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${activeTab === ItemType.PRODUCT ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                {index + 1 + ((currentPage - 1) * itemsPerPage)}
             </div>
             <div>
                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{item.id}</div>
             </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
           {activeTab === ItemType.PRODUCT ? (
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
               {getCategoryName(item.categoryId)}
             </span>
           ) : (
             <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{item.unit}</span>
           )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
           <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Rp {cost.toLocaleString('id-ID')}</div>
           {activeTab === ItemType.PRODUCT && (
             <div className="text-[10px] text-slate-400">CMT: Rp {item.priceCMT.toLocaleString('id-ID')}</div>
           )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
           <div className="flex items-center gap-2">
              <div className="flex-1 h-2 w-16 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div className={`h-full rounded-full ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(item.stock, 100)}%` }}></div>
              </div>
              <span className={`text-sm font-bold ${isLowStock ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{item.stock}</span>
           </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
           <div className="text-sm font-bold text-primary">Rp {assetValue.toLocaleString('id-ID')}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
           <div className="flex items-center justify-end gap-1">
              {activeTab === ItemType.PRODUCT && (
                <button onClick={() => handleToggleFavorite(item)} className={`p-2 rounded-lg transition-colors ${item.isFavorite ? 'text-amber-400 hover:text-amber-500' : 'text-slate-300 hover:text-amber-400'}`} title={item.isFavorite ? "Hapus dari Favorit" : "Jadikan Favorit"}>
                  <Star size={16} fill={item.isFavorite ? "currentColor" : "none"} />
                </button>
              )}
              <button onClick={() => setSelectedQrItem({id: item.id, name: item.name, subtitle: activeTab === ItemType.PRODUCT ? getCategoryName(item.categoryId) : item.unit})} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="QR Code">
                <QrCode size={16}/>
              </button>
              <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Edit">
                <Edit2 size={16}/>
              </button>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Hapus">
                <Trash2 size={16}/>
              </button>
           </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto pb-safe">
      <div className="shrink-0 mb-6">
          <div className="bg-white dark:bg-darkCard rounded-3xl p-1 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="p-4 md:p-5 flex flex-col gap-6">
              {/* Top Row */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Master Data</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><Package size={14}/> {totalItems} Item</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        {/* Menampilkan Total Global Asset Value (bukan per page) */}
                        <span className="flex items-center gap-1"><Wallet size={14}/> Rp {globalAssetValue.toLocaleString('id-ID')} (Total)</span>
                    </div>
                  </div>
                  
                  {/* Button Group - Fixed height and equal sizing */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      className="flex-1 md:flex-none h-11 flex items-center justify-center gap-2 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                      <span className="hidden md:inline">Export</span> PDF
                    </button>
                    <button 
                      onClick={() => { resetForm(); setIsFormOpen(true); }}
                      className="flex-1 md:flex-none h-11 flex items-center justify-center gap-2 px-5 bg-slate-900 dark:bg-primary text-white rounded-xl shadow-lg active:scale-95 hover:shadow-xl transition-all text-sm font-bold"
                    >
                      <Plus size={18} /> Tambah Data
                    </button>
                  </div>
              </div>

              {/* Bottom Row: Tabs & Search */}
              <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl">
                  <div className="flex w-full md:w-auto bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setActiveTab(ItemType.PRODUCT)} className={`flex-1 md:w-32 px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === ItemType.PRODUCT ? 'bg-slate-900 dark:bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>Produk</button>
                    <button onClick={() => setActiveTab(ItemType.MATERIAL)} className={`flex-1 md:w-32 px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === ItemType.MATERIAL ? 'bg-slate-900 dark:bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>Bahan</button>
                  </div>

                  <div className="flex flex-1 w-full gap-2">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                      <input 
                        placeholder={`Cari nama ${activeTab === ItemType.PRODUCT ? 'produk' : 'bahan'} atau ID...`}
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-darkCard border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm" 
                      />
                    </div>
                    {activeTab === ItemType.PRODUCT && (
                      <button 
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border transition-all ${showFavoritesOnly ? 'bg-amber-100 border-amber-200 text-amber-500' : 'bg-white dark:bg-darkCard border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-400'}`}
                        title="Tampilkan Favorit Saja"
                      >
                        <Star size={20} fill={showFavoritesOnly ? "currentColor" : "none"} />
                      </button>
                    )}
                  </div>
              </div>
            </div>
          </div>
      </div>

      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary mb-3" size={40} />
            <p className="text-sm text-slate-400 font-medium">Memuat database...</p>
          </div>
        ) : currentDataList.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white dark:bg-darkCard rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 py-20">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-300">
               <PackageOpen size={32} />
            </div>
            <p className="text-slate-500 font-medium">{showFavoritesOnly ? 'Tidak ada produk favorit' : 'Tidak ada data ditemukan'}</p>
            <p className="text-xs text-slate-400 mt-1">{showFavoritesOnly ? 'Tandai produk dengan bintang untuk melihatnya di sini.' : 'Coba kata kunci lain atau tambah data baru.'}</p>
          </div>
        ) : (
          <>
            {/* DESKTOP VIEW - PAGE SCROLL */}
            <div className="hidden md:flex flex-col bg-white dark:bg-darkCard rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
               <div className="w-full">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-10 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
                       <tr>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Item Detail</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">{activeTab === ItemType.PRODUCT ? 'Kategori' : 'Satuan'}</th>
                          <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Harga / Cost</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 w-32">Stok</th>
                          <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Total Aset</th>
                          <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 w-32">Aksi</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {currentDataList.map((item, index) => renderTableRow(item, index))}
                    </tbody>
                 </table>
               </div>
               
               <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-darkCard p-2 rounded-b-3xl">
                  <PaginationControl 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                    totalItems={totalItems}
                  />
               </div>
            </div>

            {/* MOBILE VIEW */}
            <div className="md:hidden flex-1 pb-24">
              <div className="grid grid-cols-1 gap-3">
                {currentDataList.map((item: any) => {
                  const cost = activeTab === ItemType.PRODUCT ? item.hpp : item.price;
                  const assetValue = cost * item.stock;
                  
                  return (
                    <div key={item.id} className="bg-white dark:bg-darkCard p-5 rounded-3xl shadow-soft border border-slate-50 dark:border-slate-800/50 flex flex-col gap-4 active:scale-[0.98] transition-transform relative">
                      {/* FIX: Removed Absolute positioned star to prevent double star issue */}
                      
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-4 min-w-0">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-tight mb-1 truncate">{item.name}</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate">{item.id}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {activeTab === ItemType.PRODUCT && (
                            <button onClick={() => handleToggleFavorite(item)} className={`p-1.5 ${item.isFavorite ? 'text-amber-400' : 'text-slate-300'}`}><Star size={16} fill={item.isFavorite ? "currentColor" : "none"} /></button>
                          )}
                          <button onClick={() => setSelectedQrItem({id: item.id, name: item.name, subtitle: activeTab === ItemType.PRODUCT ? getCategoryName(item.categoryId) : item.unit})} className="p-1.5 text-slate-300 hover:text-slate-800 dark:hover:text-slate-200"><QrCode size={16}/></button>
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-300 hover:text-primary"><Edit2 size={16}/></button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-300 hover:text-danger"><Trash2 size={16}/></button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Cost</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Rp {cost.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="bg-primary/5 dark:bg-primary/10 p-2.5 rounded-xl border border-primary/10">
                          <p className="text-[9px] font-bold text-primary/70 uppercase mb-1">Asset</p>
                          <p className="text-xs font-bold text-primary">Rp {assetValue.toLocaleString('id-ID')}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50 dark:border-slate-800/50">
                        <div className="flex items-center bg-slate-50 dark:bg-slate-800/40 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 max-w-[70%]">
                          <span className="px-2 py-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-700 uppercase truncate">
                            {activeTab === ItemType.PRODUCT ? getCategoryName(item.categoryId) : item.unit}
                          </span>
                          <span className="px-2 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">
                            {activeTab === ItemType.PRODUCT ? `CMT: ${item.priceCMT.toLocaleString('id-ID')}` : item.unit}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-[15px] font-extrabold text-slate-700 dark:text-slate-200 leading-none">{item.stock}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 tracking-tight">Stok</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                 <div className="py-2">
                    <PaginationControl 
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      itemsPerPage={itemsPerPage}
                      onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                      totalItems={totalItems}
                    />
                 </div>
              </div>
            </div>
          </>
        )}
      </div>

      <button 
        onClick={() => { resetForm(); setIsFormOpen(true); }} 
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-slate-900 dark:bg-primary text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 hover:scale-105 transition-all z-40 border-4 border-white dark:border-darkSurface"
      >
        <Plus size={28} />
      </button>

      {/* Modals */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4">
          <div onClick={() => setIsCategoryModalOpen(false)} className="absolute inset-0"></div>
          <div className="bg-white dark:bg-darkCard w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border dark:border-slate-800 relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Daftar Kategori</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 dark:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddCategorySubmit} className="mb-6 flex gap-2">
              <input placeholder="Kategori baru..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl text-sm outline-none border border-transparent focus:border-primary dark:text-slate-100" />
              <button type="submit" className="bg-primary text-white p-2 rounded-xl"><Plus size={20}/></button>
            </form>
            <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar">
              {categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                  <button onClick={() => onDeleteCategory(cat.id)} className="p-1.5 text-slate-300 hover:text-danger"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
            <button onClick={() => setIsCategoryModalOpen(false)} className="w-full mt-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl">Tutup</button>
          </div>
        </div>
      )}

      {selectedQrItem && <QrLabelModal item={selectedQrItem} onClose={() => setSelectedQrItem(null)} />}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-0 md:p-6">
          <div onClick={() => setIsFormOpen(false)} className="absolute inset-0"></div>
          <div className="bg-white dark:bg-darkCard w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300 relative border dark:border-slate-800">
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6 md:hidden"></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{editingId ? 'Ubah Data' : 'Tambah Baru'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 dark:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={triggerSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Nama Item</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-sm border-0 focus:ring-1 focus:ring-primary outline-none dark:text-slate-100" />
              </div>
              {activeTab === ItemType.PRODUCT ? (
                <>
                  <div className="flex gap-4">
                    <div className="flex-[2] space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Kategori</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                           <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 pr-8 rounded-xl text-sm border-0 outline-none dark:text-slate-100 appearance-none focus:ring-1 focus:ring-primary">
                            <option value="">Pilih</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                           <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                        <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="aspect-square bg-slate-100 dark:bg-slate-800 p-3 rounded-xl text-slate-500 hover:text-primary flex items-center justify-center shrink-0"><Settings size={18}/></button>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Satuan</label>
                      <input type="text" value="PCS" readOnly disabled className="w-full bg-slate-100 dark:bg-slate-800/30 p-3 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-500 border-0 outline-none cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Harga CMT</label>
                      <input type="number" min="0" required value={price1} onChange={e => setPrice1(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-sm outline-none border-0 dark:text-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Estimasi HPP</label>
                      <input type="number" min="0" required value={price2} onChange={e => setPrice2(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-sm outline-none border-0 dark:text-slate-100" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Satuan</label>
                      <input placeholder="kg/m/roll" required value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-sm outline-none border-0 dark:text-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Harga Beli</label>
                      <input type="number" min="0" required value={price1} onChange={e => setPrice1(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-sm outline-none border-0 dark:text-slate-100" />
                    </div>
                </div>
              )}
              <button className="w-full bg-slate-900 dark:bg-primary text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-slate-200 dark:shadow-black/20 mt-4 active:scale-95 transition-transform">Simpan Data</button>
            </form>
          </div>
        </div>
      )}
      
      <ConfirmationModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} isDanger={confirmState.isDanger} onConfirm={confirmState.action} onCancel={() => setConfirmState(p => ({...p, isOpen: false}))} />
    </div>
  );
};

export default MasterDataView;
