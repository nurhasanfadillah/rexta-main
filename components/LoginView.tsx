
import React, { useState } from 'react';
import { Lock, User, ArrowRight, Eye, EyeOff, ShieldCheck, Box, Loader2, Globe } from 'lucide-react';
import { signIn } from '../services/database';

interface LoginViewProps {
  onLogin: (status: boolean) => void;
  onNotify: (message: string, type: 'success' | 'error' | 'warning') => void;
  onPublicAccess: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onNotify, onPublicAccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await signIn(email, password);

      if (error) throw error;

      if (data) {
        onNotify('Login berhasil! Selamat datang.', 'success');
        onLogin(true);
      } else {
        throw new Error('Login gagal. Periksa email dan password.');
      }
    } catch (err: any) {
      console.error(err);
      onNotify(String(err?.message || 'Gagal login. Periksa email dan password.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-darkSurface flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-sm z-10 flex flex-col min-h-[80vh]">
        <div className="text-center mb-10 mt-auto">
          <div className="w-20 h-20 bg-gradient-to-tr from-primary to-primaryDark rounded-3xl mx-auto flex items-center justify-center shadow-glow mb-4 rotate-3">
             <Box className="text-white" size={40} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-1">REXTA</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">(Redone Extended Asset)</p>
        </div>

        <div className="bg-white dark:bg-darkCard p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 backdrop-blur-sm">
          <div className="mb-6 text-center">
             <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Login Akses</p>
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">
                <ShieldCheck size={12} />
                <span>Gunakan Akun REXTA</span>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-11 pr-12 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                  placeholder="Masukkan password"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-slate-900 dark:bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-200 dark:shadow-black/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Masuk Aplikasi'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="relative mt-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white dark:bg-darkCard px-2 text-slate-400">Atau</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={onPublicAccess}
            className="w-full mt-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Globe size={18} className="text-primary" />
            Cek Stok Publik
          </button>

        </div>
        
        <div className="mt-auto pt-8 text-center space-y-1">
           <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Powered By</p>
           <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
             PT. REDONE BERKAH MANDIRI UTAMA
           </p>
           <p className="text-[10px] text-slate-400 dark:text-slate-600">v1.1.0 (Production Ready)</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
