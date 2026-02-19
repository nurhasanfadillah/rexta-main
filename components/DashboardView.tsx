

import React, { useEffect, useState } from 'react';
import { InventoryData, ItemType, Product } from '../types';
import { Package, Layers, AlertCircle, RefreshCw, Wallet, ChevronRight, Star, Box, ArrowRight, TrendingUp } from 'lucide-react';
import { getDashboardSummary, getFavoriteProducts } from '../services/database';

interface DashboardViewProps {
  data: InventoryData;
}

interface SummaryState {
  totalAssetValue: number;
  productAssets: number;
  materialAssets: number;
  productCount: number;
  materialCount: number;
  lowStockCount: number;
}

// Skeleton Component
const Skeleton = ({ className }: { className: string }) => (
  <div className={`bg-slate-200 dark:bg-slate-800/50 rounded animate-pulse ${className}`}></div>
);

const DashboardView: React.FC<DashboardViewProps> = ({ data }) => {
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavLoading, setIsFavLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    setIsFavLoading(true);

    try {
      // Fetch Summary
      const summaryResult = await getDashboardSummary();
      if (summaryResult) setSummary(summaryResult);
      
      // Fetch Favorites
      const favResult = await getFavoriteProducts();
      setFavoriteProducts(favResult);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsFavLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const formatCompactCurrency = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="h-full overflow-y-auto pb-28 md:pb-8 no-scrollbar space-y-6 animate-in fade-in duration-500">
      
      {/* Hero / Summary Section */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Assets - Wide Card on Mobile, Single on Desktop */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl border border-white/10 col-span-2 md:col-span-2 lg:col-span-2">
          {/* Background Effects */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/20 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none mix-blend-screen"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/20 rounded-full blur-[40px] -ml-10 -mb-10 pointer-events-none mix-blend-screen"></div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      <Wallet size={12} className="text-cyan-300" />
                   </div>
                   <span className="text-cyan-100/70 text-[10px] font-bold uppercase tracking-widest">Aset Bersih</span>
                </div>
                {isLoading && !summary ? (
                   <Skeleton className="h-10 w-48 bg-white/10 mt-2" />
                ) : (
                   <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter mt-1">
                     {formatCompactCurrency(summary?.totalAssetValue || 0)}
                   </h2>
                )}
              </div>
              <button 
                onClick={() => fetchData()}
                disabled={isLoading}
                className={`p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 backdrop-blur-md border border-white/5 ${isLoading ? 'animate-spin opacity-50' : ''}`}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            {isLoading ? (
               <Skeleton className="h-4 w-32 bg-white/10" />
            ) : (
              <div className="flex items-center gap-2 text-xs text-cyan-200/60 font-medium">
                 <span>Update Terakhir:</span>
                 <span className="text-white">{new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            )}
          </div>
        </div>

        {/* Product Summary */}
        <div className="bg-white dark:bg-darkCard p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow active:scale-[0.98]">
             <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                   <Package size={16} />
                </div>
                <span className="text-[10px] md:text-xs text-slate-500 font-bold uppercase truncate">Produk</span>
             </div>
             {isLoading && !summary ? (
               <div className="space-y-2">
                 <Skeleton className="h-8 w-24" />
                 <Skeleton className="h-3 w-12" />
               </div>
             ) : (
               <>
                 <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">{formatCompactCurrency(summary?.productAssets || 0)}</p>
                 <span className="text-[10px] md:text-xs text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md w-fit mt-1">{summary?.productCount} Item</span>
               </>
             )}
        </div>

        {/* Material Summary */}
        <div className="bg-white dark:bg-darkCard p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow active:scale-[0.98]">
             <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                   <Layers size={16} />
                </div>
                <span className="text-[10px] md:text-xs text-slate-500 font-bold uppercase truncate">Bahan</span>
             </div>
             {isLoading && !summary ? (
               <div className="space-y-2">
                 <Skeleton className="h-8 w-24" />
                 <Skeleton className="h-3 w-12" />
               </div>
             ) : (
               <>
                 <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">{formatCompactCurrency(summary?.materialAssets || 0)}</p>
                 <span className="text-[10px] md:text-xs text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md w-fit mt-1">{summary?.materialCount} Item</span>
               </>
             )}
        </div>
      </div>

      {/* Alert Section */}
      {!isLoading && summary && summary.lowStockCount > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-3xl p-4 flex items-center gap-4 shadow-danger-glow relative overflow-hidden group active:scale-[0.99] transition-transform">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500"></div>
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-rose-900/50 flex items-center justify-center text-rose-500 shrink-0 shadow-sm">
            <AlertCircle size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400 uppercase tracking-tight">Perhatian Stok Menipis</h4>
            <p className="text-xs text-rose-600 dark:text-rose-300 font-medium leading-relaxed mt-0.5">
              Ditemukan <span className="font-extrabold text-rose-700 dark:text-rose-200 text-lg mx-1">{summary.lowStockCount}</span> item dengan stok di bawah 10 unit.
            </p>
          </div>
          <ChevronRight className="text-rose-300 dark:text-rose-700 mr-2" />
        </div>
      )}

      {/* Produk Pilihan (Favorite Products) - Replaces Grid with List */}
      <div>
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
            <Star size={18} className="text-amber-400 fill-amber-400" /> Produk Pilihan
          </h3>
          {!isFavLoading && favoriteProducts.length > 0 && (
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
               {favoriteProducts.length} Item
            </span>
          )}
        </div>
        
        <div className="bg-white dark:bg-darkCard rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          {isFavLoading ? (
             <div className="divide-y divide-slate-100 dark:divide-slate-800">
               {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                     <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                     <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                     </div>
                     <Skeleton className="w-16 h-8 rounded-lg" />
                  </div>
               ))}
             </div>
          ) : favoriteProducts.length === 0 ? (
             <div className="p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                 <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-300 shadow-sm">
                   <Box size={32} strokeWidth={1.5} />
                 </div>
                 <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum ada produk pilihan</p>
                 <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Tandai bintang pada menu <span className="font-bold">Master Data</span> untuk menampilkan stok produk favorit di sini.</p>
             </div>
          ) : (
             <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {favoriteProducts.map((product) => {
                   const isLow = product.stock <= 10;
                   return (
                     <div key={product.id} className="group flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-default">
                        <div className="flex items-center gap-4 overflow-hidden">
                           {/* Icon Box */}
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isLow ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'bg-primary/5 text-primary dark:bg-primary/10'}`}>
                              <Box size={22} strokeWidth={isLow ? 2.5 : 2} />
                           </div>
                           
                           {/* Text Info */}
                           <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base truncate group-hover:text-primary transition-colors">{product.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                 <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate hidden md:inline-block">ID: {product.id}</span>
                                 <span className="hidden md:inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                 <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                   CMT: <span className="font-bold text-slate-700 dark:text-slate-300">{formatCompactCurrency(product.priceCMT)}</span>
                                 </span>
                              </div>
                           </div>
                        </div>

                        {/* Right Side Stats */}
                        <div className="flex flex-col items-end gap-1 shrink-0 pl-2">
                           <span className={`text-lg md:text-xl font-black tracking-tight ${isLow ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}`}>
                             {product.stock}
                           </span>
                           <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${isLow ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                              {isLow ? 'Menipis' : 'Aman'}
                           </span>
                        </div>
                     </div>
                   );
                })}
             </div>
          )}
          
          {/* Footer Action */}
          {!isFavLoading && favoriteProducts.length > 0 && (
             <div className="bg-slate-50 dark:bg-slate-800/30 p-2 text-center border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                   Menampilkan {favoriteProducts.length} item favorit
                </p>
             </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default DashboardView;
