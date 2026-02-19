import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, ArrowRightLeft, BarChart3, ClipboardCheck, Bell, Moon, Sun, Download, WifiOff, RefreshCw, LogOut, ArrowUpCircle, Menu } from 'lucide-react';
import { TabView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabView;
  onTabChange: (tab: TabView) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  notificationCount: number;
  onOpenNotifications: () => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange, 
  isDarkMode, 
  onToggleDarkMode,
  notificationCount,
  onOpenNotifications,
  onLogout
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // PWA Update State
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
            setShowUpdate(true);
          }
          registration.onupdatefound = () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.onstatechange = () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                  setShowUpdate(true);
                }
              };
            }
          };
        })
        .catch(err => console.log('SW Registration info:', err.message));

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleTabChangeWithHaptic = (tab: TabView) => {
    triggerHaptic();
    onTabChange(tab);
  };

  const handleInstallClick = () => {
    triggerHaptic();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        setDeferredPrompt(null);
      });
    }
  };

  const handleUpdateApp = () => {
    triggerHaptic();
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const SidebarItem = ({ tab, icon, label }: { tab: TabView, icon: React.ReactNode, label: string }) => (
    <button 
      onClick={() => handleTabChangeWithHaptic(tab)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === tab ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-cyan-300 font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 20, strokeWidth: activeTab === tab ? 2.5 : 2 })}
      <span>{label}</span>
      {activeTab === tab && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow"></div>}
    </button>
  );

  return (
    <div className="min-h-screen bg-surface dark:bg-darkSurface flex flex-col md:flex-row overflow-hidden relative transition-colors duration-300">
      
      {/* Offline Banner - Sticky at top */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white text-[11px] font-bold py-2 px-4 text-center flex justify-center items-center gap-2 z-[60] shadow-md pt-safe">
          <WifiOff size={14} className="text-rose-400" />
          <span>OFFLINE MODE (Fitur Terbatas)</span>
        </div>
      )}

      {/* PWA Update Notification */}
      {showUpdate && (
        <div className="fixed top-4 right-4 z-[70] w-auto pointer-events-auto">
           <div className="bg-slate-900/95 dark:bg-primary/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 animate-in slide-in-from-top-5">
              <div className="text-left">
                 <p className="text-sm font-bold">Update Tersedia</p>
                 <p className="text-[10px] opacity-80">Versi baru siap digunakan.</p>
              </div>
              <button onClick={handleUpdateApp} className="bg-white text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform">
                <RefreshCw size={12} /> Update
              </button>
           </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-darkCard/50 backdrop-blur-xl h-screen z-20">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">REXTA</h1>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide uppercase">Asset Management</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <SidebarItem tab="DASHBOARD" icon={<LayoutDashboard />} label="Dashboard" />
          <SidebarItem tab="MASTER" icon={<Database />} label="Master Data" />
          <SidebarItem tab="STOCK" icon={<ArrowRightLeft />} label="Mutasi Stok" />
          <SidebarItem tab="OPNAME" icon={<ClipboardCheck />} label="Stok Opname" />
          <SidebarItem tab="REPORT" icon={<BarChart3 />} label="Laporan" />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {deferredPrompt && (
            <button onClick={handleInstallClick} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-primary hover:bg-primary/5 transition-colors">
              <Download size={18} /> Install App
            </button>
          )}
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
            <LogOut size={18} /> Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Modern Header - Adjusted for safe area top */}
        <header className="bg-white/80 dark:bg-darkCard/80 backdrop-blur-md px-6 py-4 sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pt-safe shrink-0">
          <div className="md:hidden">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">REXTA</h1>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wide uppercase">Mobile Stock</p>
          </div>
          
          <div className="hidden md:block">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 capitalize">{activeTab.toLowerCase().replace('_', ' ')}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => { triggerHaptic(); onToggleDarkMode(); }}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary dark:hover:text-primary transition-colors active:scale-90"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => { triggerHaptic(); onOpenNotifications(); }}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary transition-colors relative active:scale-90"
            >
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white dark:border-darkCard animate-pulse"></span>
              )}
            </button>
            <button 
              onClick={onLogout}
              className="md:hidden w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors active:scale-90"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Scrollable Content Area - Modified to overflow-hidden so children handle scroll */}
        <main className="flex-1 flex flex-col overflow-hidden px-4 md:px-8 pt-6 w-full max-w-7xl mx-auto">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION - Native Feel Upgrade */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
          {/* Blur Backdrop with Gradient Fade */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-darkSurface dark:via-darkSurface/95 dark:to-transparent pointer-events-none"></div>
          
          <div className="px-4 pb-safe pt-2 relative pointer-events-auto">
             <div className="bg-white/90 dark:bg-darkCard/90 backdrop-blur-2xl border border-white/50 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-3xl flex justify-between items-center h-16 px-1 mb-2 max-w-md mx-auto">
              <NavButton active={activeTab === 'DASHBOARD'} onClick={() => handleTabChangeWithHaptic('DASHBOARD')} icon={<LayoutDashboard size={20} />} label="Home" />
              <NavButton active={activeTab === 'MASTER'} onClick={() => handleTabChangeWithHaptic('MASTER')} icon={<Database size={20} />} label="Data" />
              
              {/* Floating Action Button for Central Action */}
              <div className="relative -top-6">
                <button 
                  onClick={() => handleTabChangeWithHaptic('STOCK')}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 border-[3px] border-surface dark:border-darkSurface ${activeTab === 'STOCK' ? 'bg-slate-800 dark:bg-primary text-white scale-110' : 'bg-primary text-white'}`}
                >
                  <ArrowRightLeft size={24} strokeWidth={2.5} />
                </button>
              </div>

              <NavButton active={activeTab === 'OPNAME'} onClick={() => handleTabChangeWithHaptic('OPNAME')} icon={<ClipboardCheck size={20} />} label="Opname" />
              <NavButton active={activeTab === 'REPORT'} onClick={() => handleTabChangeWithHaptic('REPORT')} icon={<BarChart3 size={20} />} label="Laporan" />
             </div>
          </div>
        </nav>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-all duration-300 relative active:scale-90 ${active ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
  >
    <div className={`transition-all duration-300 ${active ? '-translate-y-1' : ''}`}>
      {React.cloneElement(icon as React.ReactElement<any>, { 
        strokeWidth: active ? 2.5 : 2, 
        size: 22,
        fill: active ? 'currentColor' : 'none',
        fillOpacity: 0.1
      })}
    </div>
    <span className={`text-[10px] font-semibold tracking-tight transition-all ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 hidden'}`}>{label}</span>
  </button>
);

export default Layout;