import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../api/client';
import { ShieldCheck, Eye, EyeOff, Store, CheckCircle2, UserCircle2, KeyRound } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = username.trim();
    const cleanPin = pin.trim();

    if (!cleanUsername) {
      setErrorMsg('অনুগ্রহ করে আপনার ইউজারনেম দিন।');
      return;
    }
    if (!cleanPin) {
      setErrorMsg('অনুগ্রহ করে আপনার পিন দিন।');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await api.auth.login(cleanUsername, cleanPin);
      localStorage.setItem('authToken', result.token);
      setSuccessMsg(`${result.user.name} হিসেবে সফলভাবে লগইন হয়েছে!`);
      setTimeout(() => onLoginSuccess(result.user), 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'ভুল তথ্য! সঠিক ইউজারনেম ও পিন দিয়ে আবার চেষ্টা করুন।');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="flex flex-col items-center mb-6 relative z-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-3xl shadow-xl shadow-emerald-500/15 mb-4 relative group transition-transform duration-200 hover:scale-105">
          <div className="absolute inset-0 bg-white/10 rounded-3xl animate-pulse"></div>
          <Store className="w-10 h-10 text-white relative z-10" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1.5 font-sans">
          ভূমি সেবা সহায়তা কেন্দ্র
        </h1>
        <p className="text-xs font-medium text-slate-400 tracking-wide">
          ব্যবসায়িক হিসাব ও লাভ ব্যবস্থাপনা
        </p>
      </div>

      <div className="w-full max-w-[400px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative z-10 overflow-hidden">
        <div className="bg-slate-950/80 p-3 border-b border-slate-800/70 flex items-center justify-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">নিরাপদ লগইন</span>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 bg-red-950/45 border border-red-800/60 rounded-xl p-3 text-xs text-red-300 leading-normal">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 bg-emerald-950/45 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-[11px] font-semibold mb-1.5">
                ইউজারনেম
              </label>
              <div className="relative">
                <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="আপনার নাম লিখুন"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrorMsg(''); }}
                  autoFocus
                  autoComplete="username"
                  className="w-full bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-300 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-3.5 text-sm focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] font-semibold mb-1.5">
                সিক্রেট পিন <span className="text-slate-600 font-normal">(PIN)</span>
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={20}
                  placeholder="আপনার পিন দিন"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setErrorMsg(''); }}
                  autoComplete="current-password"
                  className="w-full bg-white text-slate-900 placeholder-slate-400 font-mono font-bold tracking-widest border border-slate-300 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-10 text-sm focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer transition flex items-center justify-center ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin mr-2"></div>
                  <span>যাচাই হচ্ছে...</span>
                </>
              ) : (
                <span>লগইন করুন</span>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 text-center select-none space-y-2">
        <div className="text-slate-500 text-[11px] font-medium tracking-wide">
          ভূমি সেবা সহায়তা কেন্দ্র © ২০২৬
        </div>
        <a
          href="https://mediaghor.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition group"
        >
          <img
            src="/mediaghor-icon.png"
            alt="Mediaghor"
            className="w-3.5 h-3.5 rounded-sm opacity-40 group-hover:opacity-80 transition"
          />
          <span>Made with <strong className="text-slate-500 group-hover:text-slate-300">Mediaghor</strong></span>
        </a>
      </div>
    </div>
  );
}
