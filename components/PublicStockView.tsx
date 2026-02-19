
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Package, LogIn, Moon, Sun, Box, AlertCircle } from 'lucide-react';
import { getPublicProductsPaginated } from '../services/database';
import PaginationControl from './PaginationControl';

interface PublicStockViewProps {
  onBackToLogin: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const PublicStockView: React.FC<PublicStockViewProps> = ({ onBackToLogin, isDarkMode, onToggleDarkMode }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25); // Naikkan jumlah item per halaman karena baris lebih kecil

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, categories: cats, count, error } = await getPublicProductsPaginated(currentPage, itemsPerPage, debouncedSearch);
      if (error) {
          console.error("Public Fetch Error:", error);
      }
      setProducts(data || []);
      setCategories(cats || []);
      setTotalItems(count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch]);

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Umum';
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className={`min-h-screen bg-surface dark:bg-darkSurface flex flex-col transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
       {/* Sticky Header */}
       <header className="bg-white/80 dark:bg-darkCard/80 backdrop-blur-md px-4 md:px-6 py-3 md:py-4 sticky top-0 z-20 border-b border-slate-200/50 dark:border-slate-800 pt-safe">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-primary to-primaryDark rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                   <Box className="text-white" size={18} strokeWidth={2} />
                </div>
                <div>
                   <h1 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">REXTA</h1>
                   <p className="text-[9px] md:text-[10px] font-bold text-primary tracking-widest uppercase">Public Stock</p>
                </div>
             </div>

             <div className="flex items-center gap-2">
                <button 
                  onClick={onToggleDarkMode}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary transition-colors active:scale-90"
                >
                   {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button 
                  onClick={onBackToLogin}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-slate-900 dark:bg-primary text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all"
                >
                   <LogIn size={14} /> <span className="hidden sm:inline">Login Staff</span>
                </button>
             </div>
          </div>
       </header>

       <main className="flex-1 w-full max-w-5xl mx-auto px-2 md:px-4 py-3 md:py-6 flex flex-col">
          {/* Search Section */}
          <div className="mb-4">
             <div className="relative group max-w-lg mx-auto">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-cyan-400 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                <div className="relative flex bg-white dark:bg-darkCard rounded-2xl shadow-sm">
                   <div className="pl-4 flex items-center pointer-events-none">
                      <Search className="text-slate-400" size={18} />
                   </div>
                   <input 
                      type="text" 
                      placeholder="Cari produk..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full p-3 bg-transparent border-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-0 text-sm font-medium"
                   />
                   {isLoading && (
                      <div className="pr-4 flex items-center">
                         <Loader2 className="animate-spin text-primary" size={18} />
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 flex flex-col">
             {products.length === 0 && !isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-60">
                   <Package size={48} className="text-slate-300 mb-4" />
                   <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Produk Tidak Ditemukan</h3>
                   <p className="text-sm text-slate-500">Coba kata kunci lain atau pastikan koneksi internet lancar.</p>
                </div>
             ) : (
                <div className="bg-white dark:bg-darkCard rounded-xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                   
                   {/* DESKTOP HEADER (Hidden on Mobile) */}
                   <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-1 text-center">No</div>
                      <div className="col-span-7">Nama Produk</div>
                      <div className="col-span-2 text-center">Kategori</div>
                      <div className="col-span-2 text-right">Stok</div>
                   </div>

                   {/* MOBILE HEADER (Minimalist) */}
                   <div className="md:hidden flex justify-between items-center px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Nama Produk</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Stok</span>
                   </div>

                   <div className="divide-y divide-slate-100 dark:divide-slate-800 md:divide-y-0">
                      {products.map((item, index) => {
                         const isLow = item.stock <= 5;
                         const itemNumber = (currentPage - 1) * itemsPerPage + index + 1;
                         const categoryName = getCategoryName(item.categoryId);
                         
                         // Zebra Striping for Mobile Readability
                         const mobileBgClass = index % 2 === 0 
                            ? 'bg-white dark:bg-darkCard' 
                            : 'bg-slate-50/80 dark:bg-slate-800/20';

                         return (
                            <div key={item.id} className={`${mobileBgClass} md:bg-transparent md:hover:bg-slate-50 md:dark:hover:bg-slate-800/50 transition-colors`}>
                               
                               {/* MOBILE VIEW (Ultra Compact - Name & Stock Only) */}
                               <div className="md:hidden flex items-center justify-between py-2.5 px-4 gap-4">
                                  {/* Left: Name */}
                                  <div className="min-w-0 flex-1">
                                     <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug line-clamp-2">
                                        {item.name}
                                     </h4>
                                  </div>

                                  {/* Right: Stock */}
                                  <div className="shrink-0 text-right">
                                     <span className={`text-base font-bold ${isLow ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                                        {item.stock}
                                     </span>
                                  </div>
                               </div>

                               {/* DESKTOP VIEW (Full Table) */}
                               <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 items-center border-b border-slate-100 dark:border-slate-800">
                                   <div className="col-span-1 text-center">
                                      <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 mx-auto">
                                         {itemNumber}
                                      </span>
                                   </div>
                                   <div className="col-span-7">
                                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.name}</h4>
                                   </div>
                                   <div className="col-span-2 text-center">
                                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                         {categoryName}
                                      </span>
                                   </div>
                                   <div className="col-span-2 text-right flex justify-end items-center">
                                      <div className={`flex items-center gap-2 ${isLow ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                         {isLow && <AlertCircle size={14} />}
                                         <span className="text-xl font-black">{item.stock}</span>
                                         <span className="text-[10px] font-bold text-slate-400 uppercase">PCS</span>
                                      </div>
                                   </div>
                               </div>

                            </div>
                         );
                      })}
                   </div>

                   <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-darkCard">
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
             )}
          </div>
       </main>
    </div>
  );
};

export default PublicStockView;
