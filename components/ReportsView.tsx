import React, { useState, useEffect, useCallback } from 'react';
import { InventoryData, ItemType, NotificationType, Transaction } from '../types';
import { FileDown, Loader2, Calendar, Scissors, TrendingUp, TrendingDown, PackageCheck, ListFilter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getTransactionsByDateRange, getProductsPaginated, getMaterialsPaginated } from '../services/database';

interface ReportsViewProps {
  data: InventoryData;
  onNotify: (message: string, type: NotificationType) => void;
}

type PeriodType = 'ALL' | 'CUSTOM';

const ReportsView: React.FC<ReportsViewProps> = ({ data, onNotify }) => {
  const [activeTab, setActiveTab] = useState<ItemType>(ItemType.PRODUCT);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>('CUSTOM');
  
  const getLocalDate = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return getLocalDate(d);
  });
  const [endDate, setEndDate] = useState<string>(() => getLocalDate(new Date()));

  const [reportItems, setReportItems] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0, distinctItems: 0 });

  const handlePeriodChange = (type: PeriodType) => {
    setPeriodType(type);
    const today = new Date(); const todayStr = getLocalDate(today);
    if (type === 'ALL') { setStartDate('2000-01-01'); setEndDate(todayStr); } 
    else { const start = new Date(); start.setDate(today.getDate() - 7); setStartDate(getLocalDate(start)); setEndDate(todayStr); }
  };

  const handleManualDateChange = (isStart: boolean, value: string) => {
    if (isStart) setStartDate(value); else setEndDate(value);
    setPeriodType('CUSTOM');
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const trans = await getTransactionsByDateRange(startDate, endDate);
      const movementMap = new Map<string, { in: number, out: number }>();
      let grandTotalIn = 0; let grandTotalOut = 0;

      trans.forEach(t => {
        if (t.itemType !== activeTab) return; 
        const current = movementMap.get(t.itemId) || { in: 0, out: 0 };
        const absQty = Math.abs(t.qty);

        if (t.type === 'IN') { current.in += absQty; grandTotalIn += absQty; } 
        else if (t.type === 'OUT') { current.out += absQty; grandTotalOut += absQty; } 
        else if (t.type === 'OPNAME') {
            if (t.qty > 0) { current.in += t.qty; grandTotalIn += t.qty; } 
            else { current.out += absQty; grandTotalOut += absQty; }
        }
        movementMap.set(t.itemId, current);
      });

      let items: any[] = [];
      if (activeTab === ItemType.PRODUCT) { const res = await getProductsPaginated(1, 2000); items = res.data || []; } 
      else { const res = await getMaterialsPaginated(1, 2000); items = res.data || []; }

      const processed = items.map(item => {
        const move = movementMap.get(item.id);
        if (!move) return null;
        return {
          id: item.id, name: item.name, in: move.in, out: move.out, balance: item.stock, 
          unit: activeTab === ItemType.PRODUCT ? 'pcs' : (item as any).unit,
          category: activeTab === ItemType.PRODUCT ? data.categories.find(c => c.id === (item as any).categoryId)?.name || '-' : '-',
          priceCMT: activeTab === ItemType.PRODUCT ? (item as any).priceCMT : 0
        };
      }).filter(Boolean); 

      setReportItems(processed);
      setSummary({ totalIn: grandTotalIn, totalOut: grandTotalOut, distinctItems: processed.length });

    } catch (e) { onNotify('Gagal memuat data laporan', 'error'); } finally { setIsLoading(false); }
  }, [startDate, endDate, activeTab, data.categories, onNotify]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportPDF = async () => {
    if (reportItems.length === 0) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.setTextColor(8, 145, 178); doc.text(`Laporan Mutasi ${activeTab === ItemType.PRODUCT ? 'Produk' : 'Bahan'}`, 14, 20);
      doc.setFontSize(10); doc.setTextColor(100); doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 33);

      doc.setDrawColor(200); doc.setFillColor(248, 250, 252); doc.roundedRect(14, 38, 180, 20, 3, 3, 'FD');
      doc.setFontSize(9); doc.setTextColor(50);
      doc.text(`Total Masuk: +${summary.totalIn}`, 20, 50); doc.text(`Total Keluar: -${summary.totalOut}`, 80, 50); doc.text(`Item Bergerak: ${summary.distinctItems}`, 140, 50);

      autoTable(doc, {
        startY: 65, head: [['No', 'Item', activeTab === ItemType.PRODUCT ? 'Kategori' : 'Satuan', 'Masuk', 'Keluar', 'Stok Kini']],
        body: reportItems.map((r, i) => [i + 1, r.name, activeTab === ItemType.PRODUCT ? r.category : r.unit, r.in > 0 ? `+${r.in}` : '-', r.out > 0 ? `-${r.out}` : '-', r.balance]),
        theme: 'grid', headStyles: { fillColor: [8, 145, 178], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 3: { textColor: [16, 185, 129], fontStyle: 'bold', halign: 'center' }, 4: { textColor: [244, 63, 94], fontStyle: 'bold', halign: 'center' }, 5: { halign: 'right', fontStyle: 'bold' } }
      });
      doc.save(`Laporan_${activeTab}_${startDate}.pdf`); onNotify('PDF Berhasil diunduh', 'success');
    } catch (e) { onNotify('Gagal ekspor PDF', 'error'); } finally { setIsExporting(false); }
  };

  const handleExportCMTReport = async () => {
    setIsExporting(true);
    try {
      const cmtData = reportItems.map(item => ({ ...item, priceCMT: item.priceCMT || 0, totalCost: item.in * (item.priceCMT || 0) })).filter(i => i.in > 0);
      if (cmtData.length === 0) { onNotify("Tidak ada data masuk (IN) untuk laporan CMT.", 'warning'); setIsExporting(false); return; }

      const grandTotal = cmtData.reduce((sum, item) => sum + item.totalCost, 0);
      const doc = new jsPDF();
      doc.setFontSize(16); doc.text(`Laporan Biaya CMT (Produk Masuk)`, 14, 20); doc.setFontSize(10); doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28);

      const tableBody = cmtData.map((r, i) => [i + 1, r.name, r.category, r.in, `Rp ${r.priceCMT.toLocaleString('id-ID')}`, `Rp ${r.totalCost.toLocaleString('id-ID')}`]);
      tableBody.push(['', '', '', '', { content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: `Rp ${grandTotal.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold' } }]);

      autoTable(doc, { startY: 35, head: [['No', 'Produk', 'Kategori', 'Qty Masuk', 'Harga CMT', 'Total Biaya']], body: tableBody as any, headStyles: { fillColor: [13, 148, 136] }, styles: { fontSize: 9 }, columnStyles: { 5: { fontStyle: 'bold' } } });
      doc.save(`Laporan_CMT_${startDate}.pdf`); onNotify('Laporan CMT berhasil diunduh', 'success');
    } catch (e) { onNotify("Gagal membuat laporan CMT", 'error'); } finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8 h-full overflow-y-auto no-scrollbar">
      {/* Header & Tab Switcher */}
      <div className="sticky top-0 z-20 bg-surface/95 dark:bg-darkSurface/95 backdrop-blur-sm pt-1 pb-2">
        <div className="flex bg-slate-100/50 dark:bg-darkCard p-1 rounded-2xl border border-transparent dark:border-slate-800 max-w-sm">
          <button className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === ItemType.PRODUCT ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-600'}`} onClick={() => setActiveTab(ItemType.PRODUCT)}>Produk Jadi</button>
          <button className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === ItemType.MATERIAL ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-600'}`} onClick={() => setActiveTab(ItemType.MATERIAL)}>Bahan Baku</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Filter Section */}
        <div className="bg-white dark:bg-darkCard rounded-3xl p-5 shadow-soft border border-slate-50 dark:border-slate-800 space-y-4 col-span-1 lg:col-span-1 h-fit">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Calendar size={18} className="text-primary" /><h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Filter Periode</h3></div>
            {periodType === 'ALL' && <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Semua Data</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => handlePeriodChange('CUSTOM')} className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-2 ${periodType === 'CUSTOM' ? 'bg-primary border-primary text-white shadow-glow' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><ListFilter size={14} /> Reset (7 Hari)</button>
            <button onClick={() => handlePeriodChange('ALL')} className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-2 ${periodType === 'ALL' ? 'bg-primary border-primary text-white shadow-glow' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><Calendar size={14} /> Semua Periode</button>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase ml-1">Dari</label><input type="date" value={startDate} onChange={(e) => handleManualDateChange(true, e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary transition-colors" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase ml-1">Sampai</label><input type="date" value={endDate} onChange={(e) => handleManualDateChange(false, e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary transition-colors" /></div>
          </div>
          
          {/* Action Buttons for Desktop (Moved here) */}
          <div className="hidden lg:grid grid-cols-2 gap-2 pt-2">
             <button onClick={handleExportPDF} disabled={isExporting || reportItems.length === 0} className="flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-primary text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all disabled:opacity-50"><FileDown size={14} /> Download PDF</button>
             <button onClick={handleExportCMTReport} disabled={isExporting || activeTab !== ItemType.PRODUCT || reportItems.length === 0} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all disabled:opacity-50 ${activeTab === ItemType.PRODUCT ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}><Scissors size={14} /> Laporan CMT</button>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 space-y-4">
           {/* Summary Cards */}
           {!isLoading && reportItems.length > 0 && (
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 text-center">
                    <div className="flex justify-center mb-1 text-emerald-600 dark:text-emerald-400"><TrendingDown size={18} /></div>
                    <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Masuk</p>
                    <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">+{summary.totalIn}</p>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/50 text-center">
                    <div className="flex justify-center mb-1 text-rose-600 dark:text-rose-400"><TrendingUp size={18} /></div>
                    <p className="text-[10px] text-rose-600/70 font-bold uppercase">Keluar</p>
                    <p className="text-sm font-extrabold text-rose-700 dark:text-rose-300">-{summary.totalOut}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-center">
                    <div className="flex justify-center mb-1 text-blue-600 dark:text-blue-400"><PackageCheck size={18} /></div>
                    <p className="text-[10px] text-blue-600/70 font-bold uppercase">Item Aktif</p>
                    <p className="text-sm font-extrabold text-blue-700 dark:text-blue-300">{summary.distinctItems}</p>
                  </div>
              </div>
           )}

            {/* Report Table */}
            <div className="bg-white dark:bg-darkCard rounded-3xl shadow-soft border border-slate-50 dark:border-slate-800 overflow-hidden min-h-[200px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 text-[10px] uppercase font-bold tracking-wider sticky top-0 backdrop-blur-sm">
                    <tr>
                      <th className="px-5 py-4">Item Details</th>
                      <th className="px-2 py-4 text-center text-success bg-emerald-50/50 dark:bg-emerald-900/10">IN</th>
                      <th className="px-2 py-4 text-center text-danger bg-rose-50/50 dark:bg-rose-900/10">OUT</th>
                      <th className="px-5 py-4 text-right">Stok Kini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {isLoading ? (<tr><td colSpan={4} className="px-5 py-20 text-center"><div className="flex flex-col items-center gap-3"><Loader2 className="animate-spin text-primary" size={24} /><span className="text-xs text-slate-400 font-medium">Menganalisa data transaksi...</span></div></td></tr>) : reportItems.length === 0 ? (<tr><td colSpan={4} className="px-5 py-16 text-center"><div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300"><FileDown size={24} /></div><p className="text-xs text-slate-400 italic">Tidak ada pergerakan stok pada periode ini</p></td></tr>) : (reportItems.map(row => (<tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"><td className="px-5 py-3"><p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{row.name}</p><p className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">{activeTab === ItemType.PRODUCT ? row.category : row.unit}</p></td><td className="px-2 py-3 text-center bg-emerald-50/20 dark:bg-emerald-900/5">{row.in > 0 ? (<span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{row.in}</span>) : <span className="text-slate-300">-</span>}</td><td className="px-2 py-3 text-center bg-rose-50/20 dark:bg-rose-900/5">{row.out > 0 ? (<span className="text-xs font-bold text-rose-500">-{row.out}</span>) : <span className="text-slate-300">-</span>}</td><td className="px-5 py-3 text-right"><span className={`text-xs font-bold px-2 py-1 rounded-lg ${row.balance < 10 ? 'bg-rose-50 dark:bg-rose-900/20 text-danger' : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800'}`}>{row.balance}</span></td></tr>)))}
                  </tbody>
                </table>
              </div>
            </div>
        </div>
      </div>

      {/* Floating Action Buttons (Mobile Only) */}
      <div className="grid grid-cols-2 gap-3 fixed bottom-20 left-4 right-4 max-w-md mx-auto z-10 lg:hidden">
        <button onClick={handleExportPDF} disabled={isExporting || reportItems.length === 0} className="flex flex-col items-center justify-center gap-1 py-3 bg-slate-900 dark:bg-primary text-white rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">{isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />} <span className="text-[10px] uppercase tracking-wider">Download PDF</span></button>
        <button onClick={handleExportCMTReport} disabled={isExporting || activeTab !== ItemType.PRODUCT || reportItems.length === 0} className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 ${activeTab === ItemType.PRODUCT ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>{isExporting ? <Loader2 className="animate-spin" size={18} /> : <Scissors size={18} />}<span className="text-[10px] uppercase tracking-wider">Laporan CMT</span></button>
      </div>
    </div>
  );
};

export default ReportsView;