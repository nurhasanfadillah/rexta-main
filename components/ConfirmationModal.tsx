
import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onCancel}></div>
      <div className="bg-white dark:bg-darkCard rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-800">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-50 dark:bg-rose-900/30 text-danger' : 'bg-primaryLight/30 dark:bg-cyan-900/30 text-primary'}`}>
          {isDanger ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">{cancelLabel}</button>
          <button onClick={onConfirm} className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-lg active:scale-95 transition-all ${isDanger ? 'bg-danger' : 'bg-slate-800 dark:bg-primary'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
