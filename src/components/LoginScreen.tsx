/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ROLE_METADATA } from '../data/mockData';
import { User } from '../types';
import { api } from '../api/client';
import {
  ShieldCheck, Eye, EyeOff, Fingerprint, Key,
  ChevronRight, Home, HelpCircle, UserPlus,
  UserCheck, Store, Lock, CheckCircle2
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Tabs active state
  const [activeTab, setActiveTab2] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Input states
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'STAFF'>('OWNER');

  // Notification and simulation states
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isBioScanning, setIsBioScanning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Submit handler for login / registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (activeTab === 'LOGIN') {
        const cleanPin = pinInput.trim();
        if (!cleanPin) {
          setErrorMsg('অনুগ্রহ করে আপনার পিন নম্বর দিন।');
          setIsSubmitting(false);
          return;
        }

        const result = await api.auth.login(cleanPin, selectedRole);
        localStorage.setItem('authToken', result.token);

        setSuccessMsg(`${result.user.name} হিসেবে সফলভাবে লগইন করা হয়েছে!`);
        setTimeout(() => {
          onLoginSuccess(result.user);
        }, 800);
      } else {
        // REGISTER SCREEN SUBMIT
        const name = usernameInput.trim();
        const email = emailInput.trim();
        const pass = pinInput.trim();

        if (!name) {
          setErrorMsg('অনুগ্রহ করে আপনার নাম টাইপ করুন।');
          setIsSubmitting(false);
          return;
        }
        if (!pass) {
          setErrorMsg('নিরাপত্তার জন্য পাসওয়ার্ড বা পিন দেওয়া আবশ্যক।');
          setIsSubmitting(false);
          return;
        }

        const result = await api.auth.register({
          name,
          phone: email || undefined,
          pin: pass,
          role: selectedRole,
        });
        localStorage.setItem('authToken', result.token);

        setSuccessMsg(`সফলভাবে অ্যাকাউন্ট তৈরি হয়েছে! "${name}" হিসেবে সিস্টেমে প্রবেশ করা হচ্ছে...`);

        setTimeout(() => {
          onLoginSuccess(result.user);
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ভুল পিন বা সঠিক একাউন্ট ধরন নির্বাচন করা হয়নি! অনুগ্রহ করে সঠিক পিন টাইপ করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerMockBiometric = async () => {
    setIsBioScanning(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const defaultPin = selectedRole === 'OWNER' ? '9999' : '1234';
      const result = await api.auth.login(defaultPin, selectedRole);
      localStorage.setItem('authToken', result.token);

      setIsBioScanning(false);
      setSuccessMsg(`${result.user.name} হিসেবে বায়োমেট্রিক অথেন্টিকেশন সফল!`);
      setTimeout(() => {
        onLoginSuccess(result.user);
      }, 600);
    } catch (err: any) {
      setIsBioScanning(false);
      setErrorMsg(err.message || 'বায়োমেট্রিক লগইন ব্যর্থ হয়েছে।');
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Dynamic background subtle neon flow */}
      <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      {/* 1. App Beautiful Vector Head Logo */}
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

      {/* 2. Main Premium Card for Tabs Login / Registration */}
      <div className="w-full max-w-[380px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative z-10 overflow-hidden">

        {/* TABS SWITCH: LOGIN vs REGISTER */}
        <div className="grid grid-cols-2 bg-slate-950/80 p-1.5 border-b border-slate-850/70">
          <button
            type="button"
            id="tab-login-btn"
            onClick={() => {
              setActiveTab2('LOGIN');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 px-3 text-center text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
              activeTab === 'LOGIN'
                ? 'bg-slate-800 text-white shadow-inner font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            লগইন (Sign In)
          </button>

          <button
            type="button"
            id="tab-register-btn"
            onClick={() => {
              setActiveTab2('REGISTER');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2 px-3 text-center text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
              activeTab === 'REGISTER'
                ? 'bg-slate-800 text-emerald-400 shadow-inner font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            নিবন্ধন (Sign Up)
          </button>
        </div>

        {/* Dynamic Interactive Panel Body */}
        <div className="p-5.5">

          {/* Notification Alerts */}
          {errorMsg && (
            <div id="login-error-msg" className="mb-4 bg-red-950/45 border border-red-800/60 rounded-xl p-3 text-xs text-red-300 leading-normal">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div id="login-success-msg" className="mb-4 bg-emerald-950/45 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* INPUT FIELD 1: NAME / USERNAME */}
            {activeTab === 'REGISTER' && (
              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                  আপনার নাম বলুন <span className="text-slate-600 font-normal">(Name)</span>
                </label>
                <input
                  id="input-login-username"
                  type="text"
                  placeholder="আপনার নাম লিখুন"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-white text-slate-900 placeholder-slate-400 font-medium border border-slate-300 focus:border-emerald-500 rounded-xl py-2 px-3.5 text-xs focus:outline-none transition"
                />
              </div>
            )}

            {/* INPUT FIELD 2: EMAIL ADDRESS (Only for registration or can be optionally filled) */}
            {activeTab === 'REGISTER' && (
              <div>
                <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                  ইমেইল অ্যাড্রেস <span className="text-slate-600 font-normal">(Email Address)</span>
                </label>
                <input
                  id="input-login-email"
                  type="email"
                  placeholder="example@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-white text-slate-900 placeholder-slate-404 font-medium border border-slate-300 focus:border-emerald-500 rounded-xl py-2 px-3.5 text-xs focus:outline-none transition"
                />
              </div>
            )}

            {/* INPUT FIELD 3: PIN OR PASSWORD */}
            <div>
              <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                {activeTab === 'LOGIN' ? '৪ সংখ্যার সিক্রেট পিন' : 'পাসওয়ার্ড বা পিন দিন'} <span className="text-slate-600 font-normal">(PIN/Password)</span>
              </label>
              <div className="relative">
                <input
                  id="input-login-pin"
                  type={showPin ? "text" : "password"}
                  maxLength={activeTab === 'LOGIN' ? 4 : 20}
                  placeholder="পাসওয়ার্ড দিন"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full bg-white text-slate-900 placeholder-slate-400 font-mono font-bold tracking-widest border border-slate-300 focus:border-emerald-500 rounded-xl py-2 px-3.5 pr-10 text-xs focus:outline-none transition"
                />
                <button
                  type="button"
                  id="toggle-pin-visibility-btn"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-2 text-slate-400 hover:text-slate-650 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* ROLE DESIGN SELECTION (Owner vs Staff) */}
            <div>
              <label className="block text-slate-400 text-[11px] font-semibold mb-1.5">
                একাউন্টের ভূমিকা নির্বাচন করুন
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="role-owner-btn"
                  onClick={() => setSelectedRole('OWNER')}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold border transition duration-150 cursor-pointer ${
                    selectedRole === 'OWNER'
                      ? 'bg-slate-950 text-white border-slate-800'
                      : 'bg-slate-950/20 text-slate-500 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>🛡️</span>
                  <span>মালিক</span>
                </button>

                <button
                  type="button"
                  id="role-staff-btn"
                  onClick={() => setSelectedRole('STAFF')}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold border transition duration-150 cursor-pointer ${
                    selectedRole === 'STAFF'
                      ? 'bg-blue-950/15 text-blue-400 border-blue-500/50 hover:border-blue-500 shadow-md shadow-blue-500/5'
                      : 'bg-slate-950/20 text-slate-500 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ কর্মচারী</span>
                </button>
              </div>
            </div>

            {/* MAIN GREEN/TEAL CTA ACTION SUBMIT BUTTON */}
            <button
              id="submit-auth-form-btn"
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer transition flex items-center justify-center space-x-1 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <span>{isSubmitting ? 'অপেক্ষা করুন...' : (activeTab === 'LOGIN' ? 'লগইন সম্পন্ন করুন' : 'অ্যাাকাউন্ট তৈরি করুন')}</span>
            </button>

          </form>

          {/* Quick Helper Pin testing prompt to maintain testability */}
          <div className="mt-4 pt-3.5 border-t border-slate-850/50">
            <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400/90 font-semibold mb-1">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>সহজে পরখ বা টেকনিক্যাল টেস্ট করতে:</span>
            </div>
            <p className="text-[9.5px] text-slate-400 leading-normal">
              মালিক একাউন্ট পিন: <strong className="text-white font-mono bg-slate-950 px-1 py-0.5 rounded">9999</strong> বা <strong className="text-white font-mono bg-slate-950 px-1 py-0.5 rounded">8888</strong>.
              কর্মচারী একাউন্ট পিন: <strong className="text-white font-mono bg-slate-950 px-1 py-0.5 rounded">1234</strong>। ওনারদের আসল নাম কর্মচারীদের কাছে গোপন থাকবে।
            </p>
          </div>

          {/* Biometrics login options underneath */}
          <div className="mt-3">
            <button
              type="button"
              id="quick-bio-auth-btn"
              onClick={triggerMockBiometric}
              className={`w-full py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-350 rounded-xl text-[10px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition ${isBioScanning ? 'animate-pulse' : ''}`}
            >
              <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isBioScanning ? 'ফিঙ্গারপ্রিন্ট রিড হচ্ছে...' : 'ওয়ান ক্লিক রিড বা বায়োমেট্রিক এন্ট্রি'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 4. Brand custom-styled elegant footer */}
      <div className="mt-8 text-center text-slate-500 text-[11px] font-medium leading-relaxed tracking-wide select-none">
        ভূমি সেবা সহায়তা কেন্দ্র © ২০২৬
      </div>
    </div>
  );
}
