
import React, { useEffect, useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

interface QrLabelModalProps {
  item: {
    id: string;
    name: string;
    subtitle: string;
  };
  onClose: () => void;
}

const QrLabelModal: React.FC<QrLabelModalProps> = ({ item, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    QRCode.toDataURL(item.id, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then(url => { setQrDataUrl(url); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [item.id]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [50, 50] });
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    const splitName = doc.splitTextToSize(item.name.toUpperCase(), 40);
    doc.text(splitName, 25, 8, { align: 'center' });
    if (qrDataUrl) doc.addImage(qrDataUrl, 'PNG', 5, 12, 40, 40);
    doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
    doc.text(item.id, 25, 48, { align: 'center' });
    doc.save(`Label_${item.name}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div onClick={onClose} className="absolute inset-0"></div>
      <div className="bg-white dark:bg-darkCard w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 border dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Label QR Code</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 dark:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-8 flex flex-col items-center">
          <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">{item.subtitle}</p>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 line-clamp-1">{item.name}</h4>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              {loading ? <Loader2 className="animate-spin text-primary" size={24} /> : <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />}
            </div>
            <p className="mt-4 text-[10px] font-mono text-slate-400 dark:text-slate-600">{item.id}</p>
          </div>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs">Tutup</button>
          <button onClick={handleDownloadPDF} disabled={loading} className="flex-1 py-3 bg-slate-900 dark:bg-primary text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
            <Download size={16} /> Cetak
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrLabelModal;
