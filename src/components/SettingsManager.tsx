/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, SystemSettings, QuickReminder } from '../types';
import { api } from '../api/client';
import {
  Settings, Key, AlertTriangle, ShieldAlert, ShieldCheck,
  CloudLightning, RefreshCw, CalendarDays, Plus, Trash2,
  Sun, Moon, Users, CheckCircle2, UserPlus, Pencil, X, Save, UserCheck
} from 'lucide-react';

interface SettingsManagerProps {
  settings: SystemSettings;
  currentUser: User;
  reminders: QuickReminder[];
  onUpdateSettings: (settings: Partial<SystemSettings>) => void;
  onAddReminder: (title: string, date: string) => void;
  onDeleteReminder: (id: string) => void;
  onResetData: () => void;
  activeServiceTypes: string[];
  onUpdateServiceTypes: (newList: string[]) => void;
  servicesMetadata: Record<string, { bangla: string; english: string; color: string; defaultPrice: number }>;
  onUpdateServicesMetadata: (newMetadata: Record<string, { bangla: string; english: string; color: string; defaultPrice: number }>) => void;
}

export default function SettingsManager({
  settings,
  currentUser,
  reminders,
  onUpdateSettings,
  onAddReminder,
  onDeleteReminder,
  onResetData,
  activeServiceTypes,
  onUpdateServiceTypes,
  servicesMetadata,
  onUpdateServicesMetadata
}: SettingsManagerProps) {
  const isOwner = currentUser.role === 'OWNER_ONE';
  const isViewOnly = currentUser.role === 'OWNER_TWO';
  const isPrimaryOwner = currentUser.role === 'OWNER_ONE';

  // Custom service type configurations variables
  const [newServiceBangla, setNewServiceBangla] = useState<string>('');
  const [newServiceEnglish, setNewServiceEnglish] = useState<string>('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [serviceActionMsg, setServiceActionMsg] = useState<string>('');

  const handleAddServiceType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceBangla.trim() || !newServiceEnglish.trim() || !newServicePrice.trim()) {
      alert('সবগুলো ইনপুট ফিল্ড পূরণ করুন দয়া করে।');
      return;
    }

    const priceNum = parseFloat(newServicePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('অনুগ্রহ করে সঠিক ডিফল্ট রেট বা টাকার পরিমাণ দিন।');
      return;
    }

    // Sanitize key (uppercase English letters and underscores)
    const rawKey = newServiceEnglish.replace(/[^a-zA-Z\s_-]/g, '').trim();
    const serviceKey = rawKey.toUpperCase().replace(/[\s-]/g, '_');

    if (!serviceKey) {
      alert('ইংরেজিতে একটি সঠিক ইউনিক আইডি দিন দয়া করে।');
      return;
    }

    if (activeServiceTypes.includes(serviceKey)) {
      alert('এই ইউনিক আইডির সার্ভিসটি ইতিমধ্যে তালিকায় সচল রয়েছে!');
      return;
    }

    // Nice visual backgrounds from Tailwind
    const gradients = [
      'from-emerald-500 to-teal-600',
      'from-cyan-500 to-blue-600',
      'from-indigo-500 to-purple-600',
      'from-amber-500 to-orange-655',
      'from-violet-500 to-fuchsia-600',
      'from-rose-500 to-pink-650',
      'from-sky-500 to-cyan-600',
      'from-teal-500 to-emerald-600'
    ];
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

    const updatedMetadata = {
      ...servicesMetadata,
      [serviceKey]: {
        bangla: newServiceBangla.trim(),
        english: rawKey,
        color: randomGradient,
        defaultPrice: priceNum
      }
    };

    onUpdateServicesMetadata(updatedMetadata);
    onUpdateServiceTypes([...activeServiceTypes, serviceKey]);

    setNewServiceBangla('');
    setNewServiceEnglish('');
    setNewServicePrice('');
    setServiceActionMsg('নতুন সার্ভিসটি সফলভাবে যুক্ত করা হয়েছে!');
    setTimeout(() => setServiceActionMsg(''), 3000);
  };

  const handleDeleteServiceType = (key: string) => {
    if (activeServiceTypes.length <= 1) {
      alert('নূন্যতম একটি সার্ভিস টাইপ সচল থাকা বাধ্যতামূলক।');
      return;
    }
    if (confirm(`আপনি কি নিশ্চিত যে তালিকা থেকে "${servicesMetadata[key]?.bangla || key}" সার্ভিসটি সরিয়ে দিতে চান?`)) {
      const updatedList = activeServiceTypes.filter(s => s !== key);
      onUpdateServiceTypes(updatedList);
      setServiceActionMsg('সার্ভিসটি সফলভাবে তালিকা থেকে অপসারিত হয়েছে।');
      setTimeout(() => setServiceActionMsg(''), 3000);
    }
  };

  // Local helper states definitions
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('2026-06-10');
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddReminder(newTitle.trim(), newDate);
    setNewTitle('');
    setSuccessMsg('রিমাইন্ডার সঠিকভাবে যুক্ত করা হয়েছে।');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const triggerBackupSimulate = async () => {
    setBackupStatus('backing_up');
    try {
      const data = await api.backup.export();
      const backupText = JSON.stringify(data, null, 2);
      const blob = new Blob([backupText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bhumiseva-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setBackupStatus('done');
      setTimeout(() => setBackupStatus(''), 2000);
    } catch (err) {
      console.error('Backup error:', err);
      setBackupStatus('');
    }
  };

  return (
    <>
      <div id="settings-manager-tab" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* COLUMN 1: GENERAL SYSTEM & PREFERENCES */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md h-fit">
        <h3 className="text-base font-bold text-white mb-4 flex items-center">
          <Settings className="w-4.5 h-4.5 text-emerald-450 mr-2" />
          সিস্টেম সেটিংস প্রেফারেন্স (Preferences)
        </h3>

        {successMsg && (
          <div className="mb-4 bg-emerald-950/40 border border-emerald-850 text-emerald-355 p-2.5 rounded-xl text-xs flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          
          {/* Theme Switch option */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-850 rounded-2xl">
            <div>
              <span className="block text-xs font-semibold text-slate-200">থিম মোড পরিবর্তন</span>
              <span className="text-[10px] text-slate-500">ডার্ক এবং লাইট ভিজ্যুয়াল ইন্টারফেস</span>
            </div>
            <button
              id="btn-toggle-dark-mode"
              onClick={() => onUpdateSettings({ isDarkMode: !settings.isDarkMode })}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-slate-105 rounded-xl border border-slate-700 cursor-pointer transition"
            >
              {settings.isDarkMode ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>

          {/* PIN configuration info */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-850 rounded-2xl">
            <div>
              <span className="block text-xs font-semibold text-slate-200">নিরাপদ পিন লক সিস্টেম</span>
              <span className="text-[10px] text-slate-500">লগইন স্ক্রিনে পিন ভেরিফিকেশন সক্রিয় রাখুন</span>
            </div>
            <button
              id="btn-toggle-pin-lock"
              onClick={() => !isViewOnly && onUpdateSettings({ pinLockEnabled: !settings.pinLockEnabled })}
              disabled={isViewOnly}
              className={`w-11 h-6 rounded-full p-1 transition ${isViewOnly ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${
                settings.pinLockEnabled ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div className={`bg-slate-900 w-4 h-4 rounded-full transition-transform ${
                settings.pinLockEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Alert Threshold warning (Only accessible to owners) */}
          {isOwner ? (
            <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-2xl space-y-2">
              <div>
                <span className="block text-xs font-semibold text-slate-200">সর্বোচ্চ খরচ লিমিট (Warning Indicator)</span>
                <span className="text-[9.5px] text-slate-500">এই টাকার বেশি ডিক্লেয়ার করলে লাইভ অ্যালার্ট দিবে</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold select-none text-xs">৳</span>
                <input
                  id="input-alert-threshold"
                  type="number"
                  value={settings.expenseAlertThreshold}
                  onChange={(e) => onUpdateSettings({ expenseAlertThreshold: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1.5 px-3 pl-8 text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-950/30 border border-slate-850/40 rounded-2xl text-xs text-slate-500 italic">
              * দোকানের খরচ সতর্কবার্তা লিমিট শুধুমাত্র মোডালিটি মালিকের দ্বারা কনফিগার করা সম্ভব।
            </div>
          )}

          {/* Motivational Slogan Input */}
          {isOwner && (
            <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-2xl space-y-1.5">
              <span className="block text-xs font-semibold text-slate-200">আজকের বাণী (৪৮ ঘণ্টায় না লিখলে অটো পরিবর্তন হবে)</span>
              <textarea
                id="input-slogan-text"
                rows={2}
                value={settings.dailyReminderText}
                onChange={(e) => onUpdateSettings({ dailyReminderText: e.target.value, lastQuoteUpdatedAt: Date.now() })}
                className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1.5 px-3 text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* MONTHLY FIXED EXPPENSES SETTING (Owner Only) */}
          {isOwner && (
            <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-2xl space-y-3">
              <div>
                <span className="block text-xs font-semibold text-slate-200">মাসিক স্থায়ী খরচ নির্ধারণ (Monthly Fixed Cost)</span>
                <span className="text-[10px] text-slate-500">মালিকের প্রকৃত মুনাফা হিসাবের জন্য এই ভ্যালু ব্যবহার হবে (২ তারিখের অটো কর্তন)</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {/* Shop Rent */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">ঘর ভাড়া (৳)</label>
                  <input
                    type="number"
                    value={settings.monthlyRent ?? 6000}
                    onChange={(e) => onUpdateSettings({ monthlyRent: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1 px-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 animate-fade-in"
                  />
                </div>

                {/* Electricity Bill */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">বিদ্যুৎ বিল (৳)</label>
                  <input
                    type="number"
                    value={settings.monthlyElectricity ?? 1850}
                    onChange={(e) => onUpdateSettings({ monthlyElectricity: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1 px-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 animate-fade-in"
                  />
                </div>

                {/* Internet Bill */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">নেট বিল (৳)</label>
                  <input
                    type="number"
                    value={settings.monthlyInternet ?? 800}
                    onChange={(e) => onUpdateSettings({ monthlyInternet: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1 px-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 animate-fade-in"
                  />
                </div>

                {/* Staff Salary */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">কর্মচারী বেতন (৳)</label>
                  <input
                    type="number"
                    value={settings.monthlySalary ?? 8000}
                    onChange={(e) => onUpdateSettings({ monthlySalary: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1 px-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 animate-fade-in"
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* COLUMN 2: REMINDERS & SCHEDULER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-col justify-between">
        
        <div>
          <h3 className="text-base font-bold text-white mb-3.5 flex items-center">
            <CalendarDays className="w-4.5 h-4.5 text-emerald-450 mr-2" />
            আগামী দিনের রিমাইন্ডার যুক্ত করুন
          </h3>

          {!isViewOnly && <form onSubmit={handleReminderSubmit} className="space-y-3 mb-5">
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 font-semibold font-sans">কাজের সংক্ষিপ্ত টাইটেল</label>
              <input
                id="input-reminder-title"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="যেমন: মৌ মৌ জমির নকশা সংগ্রহ"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5 items-end">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400 font-semibold font-sans">কার্যকারী তারিখ</label>
                <input
                  id="input-reminder-date"
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-1.5 px-2.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                id="btn-add-reminder"
                type="submit"
                className="py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-xs rounded-xl text-slate-950 cursor-pointer flex items-center justify-center space-x-1 text-center"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>রিমাইন্ডার যুক্ত করুন</span>
              </button>
            </div>
          </form>}

          {/* Current listing list */}
          <div className="text-xs text-slate-400 mb-2 font-bold select-none uppercase tracking-wider">রিমাইন্ডার তালিকা</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {reminders.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">কোনো নোটিশ রানিং নেই।</p>
            ) : (
              reminders.map(rem => (
                <div key={rem.id} className="flex justify-between items-center p-2.5 bg-slate-955 bg-slate-950/80 border border-slate-850 rounded-xl text-xs">
                  <div className="flex items-center space-x-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${rem.isCompleted ? 'bg-slate-500' : 'bg-emerald-400'}`}></span>
                    <span className={`text-slate-300 font-medium ${rem.isCompleted ? 'line-through text-slate-500' : ''}`} title={rem.title}>
                      {rem.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-mono text-[9px] text-slate-500">{rem.date}</span>
                    {!isViewOnly && <button
                      id={`btn-delete-rem-${rem.id}`}
                      onClick={() => onDeleteReminder(rem.id)}
                      className="text-slate-500 hover:text-red-400 p-0.5 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-850 pt-3 mt-3 font-medium select-none">
          * কাজের নোটিশগুলো সরাসরি হোম ড্যাশবোর্ডে সচল অ্যালার্ট আকারে মালিক ও কর্মচারীদের সামনে ভেসে উঠবে।
        </p>

      </div>

      {/* COLUMN 3: BACKUP, AUTRESTORE & USER PROFILES */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-col justify-between">
        
        <div>
          <h3 className="text-base font-bold text-white mb-3 flex items-center">
            <CloudLightning className="w-4.5 h-4.5 text-emerald-450 mr-2 animate-pulse" />
            ব্যাকআপ ও ডেটা পুনরুদ্ধার (Cloud Sync)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            দোকানের প্রতিদিনের হিসাব সুরক্ষিত রাখতে ব্যাকআপ ফাইল ডাউনলোড করে অন্য ডিভাইসে সহজেই পুনরুদ্ধার বা রিস্টোর করতে পারবেন।
          </p>

          <div className="space-y-3">
            
            {/* Backup Button */}
            <button
              id="btn-trigger-backup"
              onClick={triggerBackupSimulate}
              disabled={backupStatus === 'backing_up'}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-2xl cursor-pointer text-xs font-semibold text-slate-200 transition"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 shrink-0 ${backupStatus === 'backing_up' ? 'animate-spin' : ''}`} />
              <span>{backupStatus === 'backing_up' ? 'ক্লাউড ব্যাকআপ ফাইল তৈরি হচ্ছে...' : 'নতুন সেভ ব্যাকআপ (.JSON) ডাউনলোড'}</span>
            </button>

            {/* Reset Button (Only Primary Owner with PIN) */}
            {isPrimaryOwner ? (
              <ResetWithPinVerify onResetData={onResetData} />
            ) : (
              <div className="text-[10px] text-slate-500 text-center py-2 italic">
                * ডাটাবেজ রিসেট করার অধিকার শুধুমাত্র প্রধান মালিকের।
              </div>
            )}

          </div>
        </div>

        {/* Current Active User Profile Card */}
        <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl mt-5">
          <div className="flex items-center space-x-2.5">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full border border-emerald-500 object-cover" 
            />
            <div>
              <div className="text-xs font-bold text-slate-200">{currentUser.name}</div>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400">
                রোল: {currentUser.role}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>

    {/* SERVICE TYPE MANAGEMENT SECTION (FOR OWNER ACCESS) */}
    {isOwner && (
      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="border-b border-slate-800 pb-4 mb-6">
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full animate-pulse">
            সার্ভিস সেটিং প্যানেল (Service Types Controller)
          </span>
          <h3 className="text-base font-black text-white mt-1.5 flex items-center">
            <Settings className="w-4.5 h-4.5 text-emerald-400 mr-2 shrink-0" />
            সার্ভিসের ধরন ও ডিফল্ট রেট কনফিগারেশন (Add & Delete Services)
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">এখানে নতুন কোনো সার্ভিস আইটেম যুক্ত করলে তা ড্যাশবোর্ড, ইনকাম প্যানেল এবং রিপোর্ট তালিকায় সচল হবে।</p>
        </div>

        {serviceActionMsg && (
          <div className="mb-4 bg-emerald-950/45 border border-emerald-800 text-emerald-300 p-3 rounded-2xl flex items-center space-x-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{serviceActionMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* List of current service types (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-950/50 border border-slate-850 rounded-2xl p-4.5">
            <span className="text-slate-400 text-xs font-semibold block mb-3 font-sans">সচল সার্ভিসের তালিকা ও ডিফল্ট মূল্য</span>
            
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {activeServiceTypes.map(key => {
                const meta = servicesMetadata[key] || { bangla: key, english: key, color: 'from-slate-500 to-slate-600', defaultPrice: 0 };
                return (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 bg-slate-900 border border-slate-850 rounded-xl hover:border-slate-700 transition">
                    <div className="flex items-center space-x-3.5">
                      <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${meta.color} shrink-0 shadow-sm`} />
                      <div>
                        <span className="text-xs font-bold text-slate-200">{meta.bangla}</span>
                        <span className="block text-[9.5px] text-slate-500 font-mono">{key}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 justify-end">
                      {/* Price configuration */}
                      <div className="flex items-center space-x-1 themes-price">
                        <span className="text-[10px] text-slate-400 font-semibold block">রেট: ৳</span>
                        <input
                          type="number"
                          value={meta.defaultPrice}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const price = isNaN(val) ? 0 : val;
                            const updatedMetadata = {
                              ...servicesMetadata,
                              [key]: {
                                ...meta,
                                defaultPrice: price
                              }
                            };
                            onUpdateServicesMetadata(updatedMetadata);
                          }}
                          className="w-20 bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-indigo-500 text-center"
                        />
                      </div>

                      <button
                        id={`btn-delete-service-${key}`}
                        onClick={() => handleDeleteServiceType(key)}
                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-xl cursor-pointer transition shrink-0"
                        title="ডিলিট করুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form to Add Dynamic Service (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-950/50 border border-slate-850 rounded-2xl p-4.5">
            <span className="text-slate-400 text-xs font-semibold block mb-4 font-sans">নতুন সার্ভিস যোগ করুন</span>
            
            <form onSubmit={handleAddServiceType} className="space-y-3.5">
              
              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] text-slate-400 font-bold">সার্ভিসের নাম (বাংলায়)</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ই-নামজারি জরুরি"
                  value={newServiceBangla}
                  onChange={(e) => setNewServiceBangla(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] text-slate-400 font-bold">সার্ভিস কি-ওয়ার্ড (ইংরেজিতে ইউনিক আইডি)</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: EMUTATION_URGENT"
                  value={newServiceEnglish}
                  onChange={(e) => setNewServiceEnglish(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1.5 px-3 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] text-slate-400 font-bold">ডিফল্ট রেট বা সরকারি ফি (টাকা ৳)</label>
                <input
                  type="number"
                  required
                  placeholder="যেমন: ১২০০"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1.5 px-3 text-white font-mono text-xs focus:outline-none focus:border-indigo-505 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-xs rounded-xl text-slate-950 cursor-pointer flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>সার্ভিস যোগ করুন (Add Service)</span>
              </button>

            </form>
          </div>

        </div>

      </div>
    )}

    {/* USER MANAGEMENT SECTION (OWNER_ONE ONLY) */}
    {currentUser.role === 'OWNER_ONE' && (
      <UserManagementPanel />
    )}

    </>
  );
}

function ResetWithPinVerify({ onResetData }: { onResetData: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!pin.trim()) {
      setError('পিন দিন।');
      return;
    }
    setIsResetting(true);
    setError('');
    try {
      const res = await api.auth.login('owner1', pin.trim());
      if (res.token) {
        localStorage.setItem('authToken', res.token);
        await onResetData();
        window.location.reload();
      }
    } catch {
      setError('ভুল পিন! রিসেট বাতিল হয়েছে।');
      setIsResetting(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center justify-center space-x-2 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-400/40 rounded-2xl cursor-pointer text-xs font-semibold transition"
      >
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>সম্পূর্ণ ডাটা মুছে ফেলুন (Reset)</span>
      </button>
    );
  }

  return (
    <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center space-x-2 text-rose-400">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span className="text-xs font-bold">সতর্কতা! সমস্ত ডাটা চিরতরে মুছে যাবে।</span>
      </div>
      <p className="text-[10px] text-rose-300/70 leading-relaxed">
        এই অ্যাকশন রিভার্ট করা যাবে না। সমস্ত ইনকাম, ব্যয়, বিকাশ, রিমাইন্ডার এবং অন্যান্য ব্যবহারকারী মুছে যাবে।
      </p>
      {error && (
        <div className="bg-red-950/50 border border-red-800/50 rounded-xl p-2 text-[11px] text-red-300">{error}</div>
      )}
      <div>
        <label className="text-[10px] text-rose-300/80 font-semibold block mb-1">নিশ্চিত করতে আপনার পিন দিন</label>
        <input
          type="password"
          maxLength={20}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="আপনার পিন"
          className="w-full bg-slate-950 border border-rose-500/30 rounded-xl py-2 px-3 text-white text-xs font-mono focus:outline-none focus:border-rose-500"
        />
      </div>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => { setShowConfirm(false); setPin(''); setError(''); }}
          className="flex-1 py-2 text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer transition"
        >
          বাতিল
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className={`flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer transition flex items-center justify-center space-x-1 ${isResetting ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{isResetting ? 'মুছে ফেলা হচ্ছে...' : 'নিশ্চিত, মুছে ফেলুন'}</span>
        </button>
      </div>
    </div>
  );
}

function UserManagementPanel() {
  interface ManagedUser {
    id: string;
    name: string;
    role: string;
    avatar: string;
    phone: string;
  }

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'OWNER_TWO' | 'STAFF'>('STAFF');
  const [newPin, setNewPin] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'OWNER_TWO' | 'STAFF'>('STAFF');
  const [editPin, setEditPin] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.users.getAll();
      setUsers(data);
    } catch (err) {
      console.error('Load users error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showMsg = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 3000);
    } else {
      setActionMsg(msg);
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPin.trim()) {
      showMsg('নাম এবং পিন আবশ্যক।', true);
      return;
    }

    try {
      const created = await api.users.create({
        name: newName.trim(),
        role: newRole,
        pin: newPin.trim(),
        phone: newPhone.trim() || undefined,
      });
      setUsers(prev => [...prev, created]);
      setNewName('');
      setNewPin('');
      setNewPhone('');
      setShowAddForm(false);
      showMsg(`"${created.name}" সফলভাবে যুক্ত করা হয়েছে!`);
    } catch (err: any) {
      showMsg(err.message || 'ব্যবহারকারী তৈরি ব্যর্থ।', true);
    }
  };

  const startEdit = (user: ManagedUser) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditRole(user.role as 'OWNER_TWO' | 'STAFF');
    setEditPin('');
    setEditPhone(user.phone || '');
  };

  const handleUpdateUser = async () => {
    if (!editingId || !editName.trim()) {
      showMsg('নাম আবশ্যক।', true);
      return;
    }

    try {
      const updateData: any = {
        name: editName.trim(),
        role: editRole,
        phone: editPhone.trim(),
      };
      if (editPin.trim()) {
        updateData.pin = editPin.trim();
      }

      const updated = await api.users.update(editingId, updateData);
      setUsers(prev => prev.map(u => u.id === editingId ? updated : u));
      setEditingId(null);
      showMsg(`"${updated.name}" সফলভাবে আপডেট হয়েছে!`);
    } catch (err: any) {
      showMsg(err.message || 'আপডেট ব্যর্থ।', true);
    }
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    if (!confirm(`আপনি কি নিশ্চিত "${user.name}" এর অ্যাকাউন্ট মুছে ফেলতে চান?`)) return;

    try {
      await api.users.delete(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showMsg(`"${user.name}" সফলভাবে মুছে ফেলা হয়েছে।`);
    } catch (err: any) {
      showMsg(err.message || 'ডিলিট ব্যর্থ।', true);
    }
  };

  const getRoleBangla = (role: string) => {
    if (role === 'OWNER_ONE') return 'প্রধান মালিক';
    if (role === 'OWNER_TWO') return 'মালিক';
    return 'কর্মচারী';
  };

  const getRoleColor = (role: string) => {
    if (role === 'OWNER_ONE') return 'text-emerald-400 bg-emerald-500/10';
    if (role === 'OWNER_TWO') return 'text-amber-400 bg-amber-500/10';
    return 'text-blue-400 bg-blue-500/10';
  };

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-left">
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="border-b border-slate-800 pb-4 mb-6">
        <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
          ব্যবহারকারী ব্যবস্থাপনা (User Management)
        </span>
        <h3 className="text-base font-black text-white mt-1.5 flex items-center">
          <Users className="w-4.5 h-4.5 text-indigo-400 mr-2 shrink-0" />
          অ্যাকাউন্ট তৈরি, সম্পাদনা ও মুছে ফেলুন
        </h3>
        <p className="text-[11px] text-slate-500 mt-1">এখান থেকে কর্মচারী বা অন্য মালিকের অ্যাকাউন্ট তৈরি করুন। প্রধান মালিকের পিন .env ফাইল থেকে নির্ধারিত হয়।</p>
      </div>

      {actionMsg && (
        <div className="mb-4 bg-emerald-950/45 border border-emerald-800 text-emerald-300 p-3 rounded-2xl flex items-center space-x-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 bg-red-950/45 border border-red-800 text-red-300 p-3 rounded-2xl text-xs">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-slate-950/50 border border-slate-850 rounded-2xl p-4.5">
            <span className="text-slate-400 text-xs font-semibold block mb-3">সকল ব্যবহারকারীর তালিকা</span>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {users.map(user => (
                <div key={user.id} className="bg-slate-900 border border-slate-850 rounded-xl hover:border-slate-700 transition">
                  {editingId === user.id ? (
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold">নাম</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold">ফোন</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="01XXX-XXXXXX"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold">ভূমিকা</label>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as 'OWNER_TWO' | 'STAFF')}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                          >
                            <option value="OWNER_TWO">মালিক</option>
                            <option value="STAFF">কর্মচারী</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold">নতুন পিন <span className="text-slate-600">(ফাঁকা রাখলে আগেরটাই থাকবে)</span></label>
                          <input
                            type="text"
                            value={editPin}
                            onChange={(e) => setEditPin(e.target.value)}
                            placeholder="নতুন পিন"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition flex items-center space-x-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>বাতিল</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdateUser}
                          className="px-3 py-1.5 text-xs text-slate-950 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-lg cursor-pointer transition flex items-center space-x-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>সংরক্ষণ</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2">
                      <div className="flex items-center space-x-3">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full border border-slate-700 object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <UserCheck className="w-4.5 h-4.5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-bold text-slate-200">{user.name}</span>
                          <div className="flex items-center space-x-2 mt-0.5">
                            {user.role === 'OWNER_ONE' ? (
                              <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${getRoleColor(user.role)}`}>
                                <ShieldCheck className="w-3 h-3" />
                                অ্যাডমিন
                              </span>
                            ) : (
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getRoleColor(user.role)}`}>
                                {getRoleBangla(user.role)}
                              </span>
                            )}
                            {user.phone && <span className="text-[9px] text-slate-500 font-mono">{user.phone}</span>}
                          </div>
                        </div>
                      </div>

                      {user.id !== 'owner1' && (
                        <div className="flex items-center space-x-2 justify-end shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(user)}
                            className="text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 p-1.5 rounded-xl cursor-pointer transition"
                            title="সম্পাদনা"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-xl cursor-pointer transition"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-950/50 border border-slate-850 rounded-2xl p-4.5">
            {showAddForm ? (
              <form onSubmit={handleAddUser} className="space-y-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 text-xs font-semibold">নতুন অ্যাকাউন্ট তৈরি</span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-500 hover:text-white p-1 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold">নাম (বাংলায়)</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: সুজন হোসাইন"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold">ভূমিকা নির্বাচন</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'OWNER_TWO' | 'STAFF')}
                    className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="STAFF">কর্মচারী</option>
                    <option value="OWNER_TWO">মালিক</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold">লগইন পিন</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: 1234"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1.5 px-3 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold">ফোন নম্বর <span className="text-slate-600">(ঐচ্ছিক)</span></label>
                  <input
                    type="text"
                    placeholder="01XXX-XXXXXX"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-820 rounded-xl py-1.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 font-bold text-xs rounded-xl text-white cursor-pointer flex items-center justify-center space-x-1"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>অ্যাকাউন্ট তৈরি করুন</span>
                </button>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-xs text-slate-400 mb-4">কর্মচারী বা অন্য মালিকের জন্য নতুন অ্যাকাউন্ট তৈরি করুন</p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 font-bold text-xs rounded-xl text-white cursor-pointer flex items-center justify-center space-x-1 mx-auto"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>নতুন অ্যাকাউন্ট যোগ করুন</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
