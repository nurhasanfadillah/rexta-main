
import React, { useState, useEffect, useCallback } from 'react';
import { InventoryData, ItemType, NotificationType, Product, Material } from '../types';
import { Search, QrCode, Loader2, ArrowDown, PackageCheck } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import QrScannerModal from './QrScannerModal';
import PaginationControl from './PaginationControl';
import { getProductsPaginated, getMaterialsPaginated } from '../services/database';

interface StockOpnameViewProps {
  data: InventoryData;
  onOpname: (itemId: string, itemType: ItemType, realQty: number, notes: string, currentSysStock: number) => void;
  onNotify: (message: string, type: NotificationType) => void;
}

const StockOpnameView: React.FC<StockOpnameViewProps> = ({ data, onOpname, onNotify }) => {
  const [activeTab, setActiveTab] = useState<ItemType>(ItemType.PRODUCT);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  const [opnameItem, setOpnameItem] = useState<{id: string, name: string, sysStock: number, unit: string} | null>(null);
  const [realQty, setRealQty] = useState('');
  const [notes, setNotes] = useState('');

  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; action: () => void; isDanger: boolean; }>({ isOpen: false, title: '', message: '', action: () => {}, isDanger: false });

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
  useEffect(() => { setCurrentPage(1); }, [activeTab, debouncedSearch]);

  const currentItems = activeTab === ItemType.PRODUCT ? products : materials;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleQrScan = (code: string) => { setIsScannerOpen(false); setSearch(code); onNotify('Mencari ID Item: ' + code, 'success'); };

  const handleStartOpname = (item: any, type: ItemType) => {
    setOpnameItem({
      id: item.id, name: item.name, sysStock: item.stock,
      unit: type === ItemType.PRODUCT ? 'pcs' : item.unit
    });
    setRealQty(item.stock.toString());
    setNotes('Stok Opname Rutin');
  };

  const difference = opnameItem ? Number(realQty) - opnameItem.sysStock : 0;

  const triggerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (opnameItem && realQty !== '') {
      const performOpname = async () => {
        await onOpname(opnameItem.id, activeTab, Number(realQty), notes, opnameItem.sysStock);
        setOpnameItem(null); setConfirmState(prev => ({ ...prev, isOpen: false })); fetchItems();
      };
      setConfirmState({
        isOpen: true, title: 'Konfirmasi Opname',
        message: `Ubah stok "${opnameItem.name}" menjadi ${realQty} ${opnameItem.unit}?`,
        isDanger: difference < 0, action: performOpname
      });
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col overflow-hidden pb-24 md:pb-8">
      {/* Header Sticky */}
      <div className="sticky top-0 bg-surface/95 dark:bg-darkSurface/95 backdrop-blur-sm pt-1 pb-2 z-10 space-y-3 shrink-0">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Stok Opname</h2>
        <div className="flex flex-col md:flex-row gap-2">
           <div className="flex bg-slate-100/50 dark:bg-darkCard p-1 rounded-2xl border border-transparent dark:border-slate-800 shrink-0">
            <button className={`flex-1 px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === ItemType.PRODUCT ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-600'}`} onClick={() => setActiveTab(ItemType.PRODUCT)}>Produk</button>
            <button className={`flex-1 px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === ItemType.MATERIAL ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-600'}`} onClick={() => setActiveTab(ItemType.MATERIAL)}>Bahan</button>
          </div>
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
              <input type="text" placeholder="Cari item untuk opname..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white dark:bg-darkCard border border-transparent dark:border-slate-800 shadow-soft rounded-2xl text-sm dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <button onClick={() => setIsScannerOpen(true)} className="w-12 h-12 flex items-center justify-center bg-slate-900 dark:bg-primary text-white rounded-2xl shadow-lg shrink-0 hover:bg-slate-800"><QrCode size={20} /></button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center">
             <Loader2 className="animate-spin text-primary mb-2" size={32} />
             <p className="text-xs text-slate-400">Memuat data item...</p>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl mx-4">
             <PackageCheck size={48} className="mb-2 opacity-50" />
             <p className="text-sm font-medium">Data tidak ditemukan.</p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW (MD Up) */}
            <div className="hidden md:block bg-white dark:bg-darkCard rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-4">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/90 backdrop-blur-md">
                     <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 w-16 text-center">No</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Item Detail</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-center">Kategori / Unit</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-center">Stok Sistem</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-right">Aksi</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {currentItems.map((item: any, index: number) => (
                        <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                           <td className="px-6 py-4 text-center">
                              <span className="text-xs font-bold text-slate-400">{(currentPage - 1) * itemsPerPage + index + 1}</span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <span className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{item.name}</span>
                                 <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                                 {activeTab === ItemType.PRODUCT ? 'Produk' : item.unit}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">{item.stock}</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleStartOpname(item, activeTab)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-primary text-white rounded-xl text-xs font-bold hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
                              >
                                 <PackageCheck size={14} /> Opname
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* MOBILE GRID VIEW (MD Down) */}
            <div className="md:hidden grid grid-cols-1 gap-3 pb-20">
              {currentItems.map((item: any) => (
                <div key={item.id} className="bg-white dark:bg-darkCard p-4 rounded-2xl shadow-sm border border-transparent dark:border-slate-800/50 active:scale-[0.98] transition-all flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 truncate">{item.name}</h4>
                    <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">Sistem</span>
                      <strong className="text-slate-700 dark:text-slate-300 text-sm">{item.stock}</strong>
                    </div>
                  </div>
                  <button onClick={() => handleStartOpname(item, activeTab)} className="px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-700">Opname</button>
                </div>
              ))}
            </div>
          </>
        )}
        
        <div className="pb-4">
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

      {isScannerOpen && <QrScannerModal onScan={handleQrScan} onClose={() => setIsScannerOpen(false)} />}

      {opnameItem && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-50 flex items-end md:items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
          <div onClick={() => setOpnameItem(null)} className="absolute inset-0"></div>
          <div className="bg-white dark:bg-darkCard rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300 relative border-t border-white/5 dark:border-slate-800">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6 md:hidden"></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">Penyesuaian Stok</h3>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-6 text-center border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item Terpilih</p>
              <p className="font-bold text-lg text-slate-800 dark:text-slate-200 mt-1">{opnameItem.name}</p>
            </div>
            <form onSubmit={triggerSubmit} className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-1 opacity-75">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-600 uppercase mb-2 text-center">Sistem</label>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 text-xl font-bold text-center text-slate-500">{opnameItem.sysStock}</div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-primary uppercase mb-2 text-center tracking-wide">Fisik (Real)</label>
                  <input type="number" required min="0" value={realQty} onChange={e => setRealQty(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className="w-full bg-white dark:bg-slate-800 border-2 border-primary rounded-2xl p-4 text-xl font-bold text-center text-primary outline-none shadow-glow" autoFocus />
                </div>
              </div>
              <div className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold transition-all ${difference === 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 text-success' : 'bg-rose-50 dark:bg-rose-900/10 text-danger'}`}>
                {difference === 0 ? 'Sesuai' : `Selisih: ${difference > 0 ? '+' : ''}${difference}`}
              </div>
              <button type="submit" className="w-full py-4 bg-slate-800 dark:bg-primary text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">Simpan Perubahan</button>
            </form>
            <button onClick={() => setOpnameItem(null)} className="hidden md:block absolute top-4 right-4 text-slate-400 hover:text-slate-600"><div className="bg-slate-100 dark:bg-slate-800 rounded-full p-2"><ArrowDown size={16} className="rotate-45" /></div></button>
          </div>
        </div>
      )}

      <ConfirmationModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.action} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} isDanger={confirmState.isDanger} />
    </div>
  );
};

export default StockOpnameView;
