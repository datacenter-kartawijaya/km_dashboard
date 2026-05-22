import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Shield, KeyRound, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { KMUser } from '../types';

interface LoginScreenProps {
  users: KMUser[];
  onLoginSuccess: (user: KMUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setErrorMsg('Harap masukkan username Anda');
      return;
    }
    if (!password) {
      setErrorMsg('Harap masukkan password Anda');
      return;
    }

    setLoading(true);

    // Simulate small transition
    setTimeout(() => {
      const match = users.find(
        u => u.username.toLowerCase() === cleanUsername && u.password === password
      );

      if (match) {
        onLoginSuccess(match);
      } else {
        setErrorMsg('Username atau password salah! Silakan coba lagi.');
        setLoading(false);
      }
    }, 600);
  };

  const handleQuickLogin = (usr: string, pass: string) => {
    setUsername(usr);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background radial highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#28B8A6]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/12 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-gray-150 relative z-10"
      >
        {/* Core Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-44 h-44 mb-5 flex items-center justify-center">
            <img src="/logo-kwm.png" alt="KWM Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
            KM DASHBOARD
          </h1>
          <p className="text-[11px] text-[#28B8A6] font-black uppercase tracking-widest">
            Sistem Monitoring Produksi & Verval
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-3 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold rounded-2xl flex items-center gap-2.5"
            >
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 pl-1">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username anda..."
                autoFocus
                className="w-full bg-gray-50/50 border border-gray-200 focus:border-[#28B8A6] rounded-2xl py-3 px-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#28B8A6] font-mono lowercase"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 pl-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password anda..."
                className="w-full bg-gray-50/50 border border-gray-200 focus:border-[#28B8A6] rounded-2xl py-3 px-4 pr-10 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#28B8A6] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e293b] text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-gray-200 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={14} /> Masuk ke Dashboard
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Footer Credential Label */}
      <div className="mt-6 text-center text-slate-500 text-[10px] uppercase font-bold tracking-widest z-10 opacity-70">
        Kartawijaya Mandiri &copy; {new Date().getFullYear()} &bull; Stable Release
      </div>
    </div>
  );
};
