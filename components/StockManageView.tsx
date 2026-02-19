
import React, { useState, useEffect, useCallback } from 'react';
import { InventoryData, ItemType, TransactionType, NotificationType, Product, Material, Transaction } from '../types';
import { ArrowDown, ArrowUp, Search, History, ChevronRight, ClipboardCheck, QrCode, Loader2, Package, AlertCircle, FileText, Calendar, Box, Plus, Minus, RotateCcw, Maximize } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import QrScannerModal from './QrScannerModal';
import PaginationControl from './PaginationControl';
import { getProductsPaginated, getMaterialsPaginated, getTransactionHistory } from '../services/database';

interface StockManageViewProps {
  data: InventoryData;
  onTransaction: (itemId: string, itemType: ItemType, type: TransactionType, qty: number, notes: string) => Promise<void>; 
  onNotify: (message: string, type: NotificationType) => void;
}

const StockManageView: React.FC<StockManageViewProps> = ({ data, onTransaction, onNotify }) => {
  const [activeTab, setActiveTab] = useState<ItemType>(ItemType.PRODUCT);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  // Selected Item for Transaction (Desktop & Mobile)
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; stock: number; unit: string; itemType: ItemType; } | null>(null);

  const [transType, setTransType] = useState<TransactionType>('IN');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  
  const [modalTab, setModalTab] = useState<'FORM' | 'HISTORY'>('FORM');
  const [itemHistory, setItemHistory] = useState<Transaction[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const historyLimit = 10;

  // Mobile Bottom Sheet Control
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; action: () => void; isDanger: boolean; }>({ isOpen: false, title: '', message: '', action: () => {}, isDanger: false });

  // Haptic Feedback Helper
  const haptic = () => {
    if (navigator.vibrate) navigator.vibrate(5);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === ItemType.PRODUCT) {
        const { data, count } = await getProductsPaginated(currentPage, itemsPerPage, debouncedSearch);
        setProducts(data || []);
        setTotalItems(count || 0);
      } else {
        const { data, count } = await getMaterialsPaginated(currentPage, itemsPerPage, debouncedSearch);
        setMaterials(data || []);
        setTotalItems(count || 0);
      }
    } catch (e) {
      onNotify('Gagal memuat data item', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, itemsPerPage, debouncedSearch, onNotify]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const loadHistory = useCallback(async (page: number) => {
    if (!selectedItem) return;
    setIsHistoryLoading(true);
    try {
      const { data, count } = await getTransactionHistory(selectedItem.id, page, historyLimit);
      setItemHistory(data);
      setHistoryTotal(count);
      setHistoryPage(page);
    } catch (e) {
      onNotify('Gagal memuat riwayat', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [selectedItem, onNotify]);

  useEffect(() => {
    if (selectedItem) {
      loadHistory(1);
      setQty(''); 
      setNotes(''); 
      setTransType('IN');
    }
  }, [selectedItem, loadHistory]);

  useEffect(() => { setCurrentPage(1); }, [activeTab, debouncedSearch]);

  const currentItems = activeTab === ItemType.PRODUCT ? products : materials;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const historyTotalPages = Math.ceil(historyTotal / historyLimit);

  const handleQrScan = (code: string) => { haptic(); setIsScannerOpen(false); setSearch(code); onNotify('Mencari ID Item: ' + code, 'success'); };

  const handleItemClick = (item: any) => {
    haptic();
    const newItem = { id: item.id, name: item.name, stock: item.stock, unit: activeTab === ItemType.PRODUCT ? 'pcs' : item.unit, itemType: activeTab };
    setSelectedItem(newItem);
    
    if (window.innerWidth < 768) {
      setIsMobileModalOpen(true);
      setModalTab('FORM');
    }
  };

  const adjustQty = (amount: number) => {
    haptic();
    const current = Number(qty) || 0;
    const next = Math.max(0, current + amount);
    // Jika keluar, batasi maks stok
    if (transType === 'OUT' && selectedItem && next > selectedItem.stock) {
        setQty(selectedItem.stock.toString());
    } else {
        setQty(next === 0 ? '' : next.toString());
    }
  };

  const triggerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem && qty) {
      if (Number(qty) <= 0) { onNotify('Jumlah harus lebih dari 0', 'error'); return; }
      if (transType === 'OUT' && Number(qty) > selectedItem.stock) { onNotify(`Gagal: Stok tidak cukup!`, 'error'); return; }

      const performTransaction = async () => {
        setIsSubmitting(true);
        try {
          await onTransaction(selectedItem.id, selectedItem.itemType, transType, Number(qty), notes);
          
          await fetchItems(); 
          
          let newStock = selectedItem.stock;
          if (transType === 'IN') newStock += Number(qty);
          else newStock -= Number(qty);
          
          setSelectedItem(prev => prev ? ({...prev, stock: newStock}) : null);
          
          if (isMobileModalOpen) setIsMobileModalOpen(false);
          
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          setQty(''); 
          setNotes('');
          
          loadHistory(1);

        } catch (error) { } finally { setIsSubmitting(false); }
      };

      setConfirmState({
        isOpen: true,
        title: `Konfirmasi ${transType === 'IN' ? 'Barang Masuk' : 'Barang Keluar'}`,
        message: `Catat ${transType === 'IN' ? 'penerimaan' : 'pengeluaran'} ${qty} ${selectedItem.unit} untuk "${selectedItem.name}"?`,
        isDanger: transType === 'OUT',
        action: performTransaction
      });
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });
  };

  // --- RENDER HELPERS ---

  const renderHistoryList = () => (
     <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
       {isHistoryLoading ? (
         <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
       ) : itemHistory.length === 0 ? (
         <div className="text-center py-10 text-slate-400">
           <History size={32} className="mx-auto mb-2 opacity-30" />
           <p className="text-xs">Belum ada riwayat transaksi.</p>
         </div>
       ) : (
         <div className="space-y-0">
           {itemHistory.map((t) => {
             let displayQty = t.qty;
             if (t.type === 'OUT') displayQty = -Math.abs(t.qty);
             if (t.type === 'IN') displayQty = Math.abs(t.qty);
             const isNegative = displayQty < 0;
             let colorClass = isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
             let bgClass = isNegative ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20';

             return (
              <div key={t.id} className="relative py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${bgClass} ${colorClass}`}>{t.type}</span>
                        <p className="text-[10px] text-slate-400 font-mono">{formatDate(t.date)}</p>
                     </div>
                     <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-tight line-clamp-2">{t.notes || '-'}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${colorClass}`}>{displayQty > 0 ? '+' : ''}{displayQty}</div>
                    <span className="text-[9px] text-slate-400">Saldo: {t.balanceAfter}</span>
                  </div>
                </div>
              </div>
             );
           })}
         </div>
       )}
       <div className="mt-2 py-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => { haptic(); loadHistory(historyPage - 1); }} 
            disabled={historyPage === 1 || isHistoryLoading}
            className="text-[10px] font-bold text-slate-500 disabled:opacity-30 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <ChevronRight className="rotate-180" size={14} />
          </button>
          <span className="text-[10px] text-slate-400">Hal {historyPage} / {Math.max(1, historyTotalPages)}</span>
          <button 
            onClick={() => { haptic(); loadHistory(historyPage + 1); }} 
            disabled={historyPage >= historyTotalPages || isHistoryLoading}
            className="text-[10px] font-bold text-slate-500 disabled:opacity-30 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <ChevronRight size={14} />
          </button>
      </div>
    </div>
  );

  // Dynamic Theme Colors based on Transaction Type
  const theme = transType === 'IN' 
    ? { 
        primary: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', 
        bgSoft: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-900/50',
        ring: 'focus-within:ring-emerald-500/20', icon: <ArrowDown size={18} strokeWidth={3} /> 
      }
    : { 
        primary: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-600', 
        bgSoft: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-900/50',
        ring: 'focus-within:ring-rose-500/20', icon: <ArrowUp size={18} strokeWidth={3} />
      };

  const renderTransactionForm = () => (
     <form onSubmit={triggerSubmit} className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex-1 overflow-y-auto no-scrollbar -mx-4 px-4 space-y-4 pb-2">
            {/* Transaction Type Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0">
              <button 
                type="button" 
                onClick={() => { haptic(); setTransType('IN'); }} 
                className={`relative flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all font-bold text-xs ${transType === 'IN' ? 'bg-white dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <span>Barang Masuk</span>
              </button>
              <button 
                type="button" 
                onClick={() => { haptic(); setTransType('OUT'); }} 
                className={`relative flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all font-bold text-xs ${transType === 'OUT' ? 'bg-white dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 shadow-sm ring-1 ring-rose-200 dark:ring-rose-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <span>Barang Keluar</span>
              </button>
            </div>

            {/* Main Input Area */}
            <div className={`bg-white dark:bg-darkCard border-2 ${theme.border} rounded-[2rem] p-4 text-center ${theme.ring} focus-within:ring-4 transition-all shadow-sm relative overflow-hidden shrink-0`}>
              <div className={`absolute top-0 left-0 w-full h-1.5 ${theme.primary} opacity-20`}></div>
              
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Jumlah {transType === 'IN' ? 'Diterima' : 'Keluar'}</label>
              
              <div className="flex items-center justify-center gap-3 relative z-10">
                 <button type="button" onClick={() => adjustQty(-1)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 active:scale-90 transition-all flex items-center justify-center">
                    <Minus size={20} strokeWidth={3} />
                 </button>

                 <div className="flex-1 max-w-[100px]">
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      value={qty} 
                      onChange={e => setQty(e.target.value)} 
                      className={`w-full bg-transparent text-4xl font-black text-center ${theme.text} dark:text-slate-100 outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700`} 
                      placeholder="0" 
                      autoFocus={!isMobileModalOpen}
                    />
                 </div>

                 <button type="button" onClick={() => adjustQty(1)} className={`w-10 h-10 rounded-xl ${theme.bgSoft} ${theme.text} active:scale-90 transition-all flex items-center justify-center`}>
                    <Plus size={20} strokeWidth={3} />
                 </button>
              </div>
              
              <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">{selectedItem?.unit}</p>

              {/* Quick Amounts */}
              <div className="flex justify-center flex-wrap gap-2 mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                 {[5, 10, 20].map(val => (
                    <button key={val} type="button" onClick={() => adjustQty(val)} className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all">
                       +{val}
                    </button>
                 ))}
                 {transType === 'OUT' && selectedItem && (
                    <button type="button" onClick={() => setQty(selectedItem.stock.toString())} className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold active:scale-95 transition-all flex items-center gap-1">
                      <Maximize size={10} /> MAX
                    </button>
                 )}
                 <button type="button" onClick={() => setQty('')} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 active:scale-95 transition-all">
                    <RotateCcw size={14} />
                 </button>
              </div>
           </div>

           {/* Notes Input */}
           <div className="shrink-0">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 pl-2">Catatan</label>
              <div className="relative group">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 dark:group-focus-within:text-slate-200 transition-colors" size={16} />
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-all placeholder:text-slate-400" placeholder="Keterangan transaksi (Opsional)..." />
              </div>
           </div>
        </div>

        {/* Submit Button - Fixed at Bottom */}
        <div className="pt-2 mt-auto">
            <button type="submit" disabled={isSubmitting || !qty} className={`w-full py-4 text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed ${theme.primary} ${theme.hover}`}>
              {isSubmitting ? (<><Loader2 className="animate-spin" size={18} /> Memproses...</>) : (<>{theme.icon} <span className="tracking-wide uppercase">{transType === 'IN' ? 'Terima Barang' : 'Keluarkan Barang'}</span></>)}
            </button>
        </div>
     </form>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 1. Header Section (Fixed) */}
      <div className="bg-surface/95 dark:bg-darkSurface/95 backdrop-blur-sm z-10 pb-4 pt-1 shrink-0 space-y-4 px-1">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Mutasi Stok</h2>
          {/* Desktop Tab Switcher */}
          <div className="hidden md:flex bg-white dark:bg-darkCard p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <button className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === ItemType.PRODUCT ? 'bg-slate-900 dark:bg-primary text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`} onClick={() => { haptic(); setActiveTab(ItemType.PRODUCT); }}>Produk</button>
             <button className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === ItemType.MATERIAL ? 'bg-slate-900 dark:bg-primary text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`} onClick={() => { haptic(); setActiveTab(ItemType.MATERIAL); }}>Bahan Baku</button>
          </div>
        </div>
        
        {/* Search Bar & Mobile Tabs */}
        <div className="flex flex-col md:flex-row gap-3">
           <div className="md:hidden flex bg-slate-100/50 dark:bg-darkCard p-1 rounded-2xl border border-transparent dark:border-slate-800 shrink-0">
             <button className={`flex-1 px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === ItemType.PRODUCT ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-600'}`} onClick={() => { haptic(); setActiveTab(ItemType.PRODUCT); }}>Produk</button>
             <button className={`flex-1 px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === ItemType.MATERIAL ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-600'}`} onClick={() => { haptic(); setActiveTab(ItemType.MATERIAL); }}>Bahan</button>
          </div>
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Cari nama item, kode, atau kategori..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-darkCard border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button onClick={() => { haptic(); setIsScannerOpen(true); }} className="w-12 h-12 flex items-center justify-center bg-slate-900 dark:bg-primary text-white rounded-xl shadow-lg active:scale-90 transition-transform shrink-0 hover:bg-slate-800">
              <QrCode size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area (Split View) */}
      <div className="flex-1 flex overflow-hidden gap-6 pb-20 md:pb-0">
        
        {/* LEFT PANEL: DATA LIST (Scrollable) */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-darkCard rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Table Header (Desktop Only) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
             <div className="col-span-5">Item Details</div>
             <div className="col-span-3 text-center">Status</div>
             <div className="col-span-3 text-right">Stok Tersedia</div>
             <div className="col-span-1 text-center">Aksi</div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar relative">
             {isLoading ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <Loader2 className="animate-spin text-primary mb-2" size={32} />
                 <p className="text-xs text-slate-400">Sinkronisasi data...</p>
               </div>
             ) : currentItems.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-60">
                  <Package size={48} className="text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Data tidak ditemukan.</p>
                </div>
             ) : (
               <div className="flex flex-col md:block">
                 {/* Mobile Grid View */}
                 <div className="md:hidden grid grid-cols-1 gap-3 p-4">
                    {currentItems.map((item: any) => (
                      <div 
                        key={item.id} 
                        onClick={() => handleItemClick(item)} 
                        className="bg-white dark:bg-darkCard p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all flex justify-between items-center"
                      >
                         <div className="min-w-0 pr-2">
                           <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{item.name}</h4>
                           <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.id}</p>
                         </div>
                         <div className="text-right shrink-0">
                            <span className={`text-lg font-black ${item.stock <= 5 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>{item.stock}</span>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{activeTab === ItemType.PRODUCT ? 'PCS' : item.unit}</p>
                         </div>
                      </div>
                    ))}
                 </div>

                 {/* Desktop List View */}
                 <div className="hidden md:block">
                    {currentItems.map((item: any) => {
                       const isSelected = selectedItem?.id === item.id;
                       const stockPercent = Math.min(100, (item.stock / 50) * 100); 
                       
                       return (
                         <div 
                           key={item.id}
                           onClick={() => handleItemClick(item)}
                           className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 dark:border-slate-800 items-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                         >
                            <div className="col-span-5 min-w-0">
                               <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>{item.name}</h4>
                               <p className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                 {item.id} 
                                 <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                 {activeTab === ItemType.PRODUCT ? 'Produk' : item.unit}
                               </p>
                            </div>
                            <div className="col-span-3 flex justify-center">
                               {item.stock <= 5 ? (
                                 <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-100 dark:border-rose-900/30">
                                    <AlertCircle size={10} /> Menipis
                                 </span>
                               ) : (
                                 <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/30">
                                    <ClipboardCheck size={10} /> Aman
                                 </span>
                               )}
                            </div>
                            <div className="col-span-3 text-right">
                               <div className="flex flex-col items-end gap-1">
                                 <span className={`text-sm font-black ${item.stock <= 5 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>{item.stock}</span>
                                 <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${item.stock <= 5 ? 'bg-rose-500' : 'bg-primary'}`} style={{ width: `${stockPercent}%` }}></div>
                                 </div>
                               </div>
                            </div>
                            <div className="col-span-1 flex justify-center">
                               <ChevronRight size={16} className={`text-slate-300 transition-transform ${isSelected ? 'text-primary rotate-90' : ''}`} />
                            </div>
                         </div>
                       );
                    })}
                 </div>
               </div>
             )}
          </div>
          
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-darkCard shrink-0">
             <PaginationControl 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => { haptic(); setCurrentPage(p); }}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(val) => { haptic(); setItemsPerPage(val); setCurrentPage(1); }}
              totalItems={totalItems}
            />
          </div>
        </div>

        {/* RIGHT PANEL: ACTION DOCK (Desktop Only) */}
        <div className="hidden md:flex w-[380px] flex-col bg-slate-50 dark:bg-darkCard rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden shrink-0">
           {selectedItem ? (
             <>
               {/* Selected Item Header */}
               <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                     <Box size={100} />
                  </div>
                  <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wide">
                          {selectedItem.itemType === ItemType.PRODUCT ? 'Produk Jadi' : 'Bahan Baku'}
                        </span>
                     </div>
                     <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight mb-4">{selectedItem.name}</h3>
                     <div className="flex items-end justify-between">
                        <div>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Stok Saat Ini</p>
                           <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{selectedItem.stock}</span>
                              <span className="text-xs font-bold text-slate-400">{selectedItem.unit}</span>
                           </div>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                           <button onClick={() => setModalTab('FORM')} className={`p-2 rounded-md transition-all ${modalTab === 'FORM' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`} title="Form Transaksi">
                              <ClipboardCheck size={18} />
                           </button>
                           <button onClick={() => setModalTab('HISTORY')} className={`p-2 rounded-md transition-all ${modalTab === 'HISTORY' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`} title="Riwayat">
                              <History size={18} />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Content (Form or History) */}
               <div className="flex-1 overflow-hidden p-6 flex flex-col relative">
                  {modalTab === 'FORM' ? renderTransactionForm() : (
                     <div className="animate-in slide-in-from-right fade-in duration-300 h-full flex flex-col">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 text-sm">
                           <Calendar size={16} /> Riwayat Mutasi
                        </h4>
                        {renderHistoryList()}
                     </div>
                  )}
               </div>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
                <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                   <Box size={40} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Konsol Transaksi</h3>
                <p className="text-sm text-slate-500">Pilih item dari daftar di sebelah kiri untuk melakukan transaksi masuk/keluar atau melihat riwayat.</p>
             </div>
           )}
        </div>

      </div>

      {isScannerOpen && <QrScannerModal onScan={handleQrScan} onClose={() => setIsScannerOpen(false)} />}

      {/* MOBILE BOTTOM SHEET */}
      {isMobileModalOpen && selectedItem && (
        <div className="md:hidden fixed inset-0 z-[60] flex items-end justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-[2px] animate-in fade-in" onClick={() => setIsMobileModalOpen(false)}></div>
          
          <div className="bg-white dark:bg-darkCard w-full rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom duration-300 relative max-h-[85vh] flex flex-col overflow-hidden">
            <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsMobileModalOpen(false)}>
               <div className="w-14 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mb-1"></div>
            </div>

            <div className="px-6 pb-4 pt-2 border-b border-slate-100 dark:border-slate-800">
               <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight mb-1">{selectedItem.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Stok Saat Ini</p>
                  </div>
                  <div className="text-right">
                     <span className="text-3xl font-black text-primary tracking-tight">{selectedItem.stock}</span>
                     <span className="text-xs font-bold text-slate-400 ml-1 uppercase">{selectedItem.unit}</span>
                  </div>
               </div>
               
               <div className="flex p-1 gap-1 bg-slate-100 dark:bg-slate-800/50 mt-4 rounded-xl">
                  <button onClick={() => { haptic(); setModalTab('FORM'); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${modalTab === 'FORM' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400'}`}>
                    <ClipboardCheck size={14} /> Catat Mutasi
                  </button>
                  <button onClick={() => { haptic(); setModalTab('HISTORY'); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${modalTab === 'HISTORY' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400'}`}>
                    <History size={14} /> Kartu Stok
                  </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-darkCard min-h-[350px]">
              {modalTab === 'FORM' ? renderTransactionForm() : renderHistoryList()}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.action} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} isDanger={confirmState.isDanger} />
    </div>
  );
};

export default StockManageView;
