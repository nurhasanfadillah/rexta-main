
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, XCircle, X } from 'lucide-react';
import { NotificationItem, NotificationType } from '../types';

interface NotificationToastProps {
  notification: NotificationItem;
  onClose: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          border: 'border-l-4 border-emerald-500',
          icon: <CheckCircle2 size={20} className="text-emerald-500" />,
        };
      case 'error':
        return {
          border: 'border-l-4 border-rose-500',
          icon: <XCircle size={20} className="text-rose-500" />,
        };
      case 'warning':
        return {
          border: 'border-l-4 border-amber-500',
          icon: <AlertCircle size={20} className="text-amber-500" />,
        };
      default:
        return {
          border: 'border-l-4 border-slate-500',
          icon: <CheckCircle2 size={20} className="text-slate-500" />,
        };
    }
  };

  const style = getStyles(notification.type);

  return (
    <div className={`pointer-events-auto w-full max-w-sm bg-white dark:bg-darkCard ${style.border} shadow-2xl rounded-r-xl rounded-l-sm p-4 flex items-start gap-3 transform transition-all duration-500 animate-in slide-in-from-top-5 fade-in mb-3 border dark:border-slate-800`}>
      <div className="shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-semibold leading-tight text-slate-800 dark:text-slate-200">{notification.message}</p>
      </div>
      <button onClick={() => onClose(notification.id)} className="shrink-0 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors -mt-1 -mr-1 p-1"><X size={16} /></button>
    </div>
  );
};

export default NotificationToast;
