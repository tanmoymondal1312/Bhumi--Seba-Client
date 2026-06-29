import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';
import {
  ShieldCheck, Eye, EyeOff, Key,
  ChevronLeft, Store, CheckCircle2, Users, UserCheck
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

interface UserListItem {
  id: string;
  name: string;
  role: string;
  avatar: string;
  phone: string;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    api.auth.usersList()
      .then(users => {
        setUsersList(users);
        if (users.length === 1) {
          setSelectedUser(users[0]);
        }
      })
      .catch(() => setErrorMsg('সার্ভারের সাথে সংযোগ করা যাচ্ছে না।'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedUser) {
      setErrorMsg('অনুগ্রহ করে আপনার অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }

    const cleanPin = pinInput.trim();
    if (!cleanPin) {
      setErrorMsg('অনুগ্রহ করে আপনার পিন দিন।');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await api.auth.login(selectedUser.id, cleanPin);
      localStorage.setItem('authToken', result.token);
      setSuccessMsg(`${result.user.name} হিসেবে সফলভাবে লগইন হয়েছে!`);
      setTimeout(() => onLoginSuccess(result.user), 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'ভুল পিন! সঠিক পিন দিয়ে আবার চেষ্টা করুন।');
      setIsSubmitting(false);
    }
  };

  const getRoleBangla = (role: string) => {
    if (role === 'OWNER_ONE') return 'প্রধান মালিক';
    if (role === 'OWNER_TWO') return 'মালিক';
    return 'কর্মচারী';
  };

  const getRoleColor = (role: string) => {
    if (role === 'OWNER_ONE') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (role === 'OWNER_TWO') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="flex flex-col items-center mb-5 relative z-10">
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
        <div className="bg-slate-950/80 p-3 border-b border-slate-850/70 flex items-center justify-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">নিরাপদ লগইন</span>
        </div>

        <div className="p-5.5">
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

          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-400">লোড হচ্ছে...</p>
            </div>
          ) : !selectedUser ? (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">আপনার অ্যাকাউন্ট নির্বাচন করুন</span>
              </div>

              {usersList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 italic">
                  কোনো অ্যাকাউন্ট পাওয়া যায়নি। সার্ভার চেক করুন।
                </p>
              ) : (
                <div className="space-y-2.5">
                  {usersList.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(user);
                        setPinInput('');
                        setErrorMsg('');
                      }}
                      className="w-full flex items-center space-x-3 p-3.5 bg-slate-950/70 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition group text-left"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full border border-slate-700 group-hover:border-emerald-500 object-cover transition"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 group-hover:border-emerald-500 flex items-center justify-center transition">
                          <UserCheck className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-slate-200 group-hover:text-white truncate">
                          {user.name}
                        </span>
                        <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border mt-0.5 ${getRoleColor(user.role)}`}>
                          {getRoleBangla(user.role)}
                        </span>
                      </div>
                      <Key className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setPinInput('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white cursor-pointer transition mb-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>অন্য অ্যাকাউন্ট</span>
              </button>

              <div className="flex items-center space-x-3 p-3.5 bg-slate-950/70 border border-emerald-500/30 rounded-2xl">
                {selectedUser.avatar ? (
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                )}
                <div>
                  <span className="block text-sm font-bold text-white">{selectedUser.name}</span>
                  <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border mt-0.5 ${getRoleColor(selectedUser.role)}`}>
                    {getRoleBangla(selectedUser.role)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                  সিক্রেট পিন <span className="text-slate-600 font-normal">(PIN)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={20}
                    placeholder="আপনার পিন দিন"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    autoFocus
                    className="w-full bg-white text-slate-900 placeholder-slate-400 font-mono font-bold tracking-widest border border-slate-300 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 pr-10 text-xs focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-650 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer transition flex items-center justify-center space-x-1 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <span>{isSubmitting ? 'অপেক্ষা করুন...' : 'লগইন করুন'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-8 text-center text-slate-500 text-[11px] font-medium leading-relaxed tracking-wide select-none">
        ভূমি সেবা সহায়তা কেন্দ্র © ২০২৬
      </div>
    </div>
  );
}
