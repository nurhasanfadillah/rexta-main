
import React from 'react';
import { X, CheckCircle2, AlertCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onClear: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, notifications, onClear }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="w-full max-w-[320px] bg-white dark:bg-darkCard h-full shadow-2xl relative animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-100 dark:border-slate-800">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-none">Notifikasi</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 tracking-wider">Aktivitas Terakhir</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <Clock size={48} className="text-slate-300 mb-2" />
              <p className="text-xs font-medium">Belum ada riwayat</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-3">
                <div className="shrink-0 mt-0.5">
                  {n.type === 'success' && <CheckCircle2 size={16} className="text-success" />}
                  {n.type === 'error' && <XCircle size={16} className="text-danger" />}
                  {n.type === 'warning' && <AlertCircle size={16} className="text-warning" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug">{n.message}</p>
                </div>
              </div>
            )).reverse() // Terbaru di atas
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
            <button 
              onClick={onClear}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-slate-400 hover:text-danger transition-colors"
            >
              <Trash2 size={14} /> Bersihkan Riwayat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
