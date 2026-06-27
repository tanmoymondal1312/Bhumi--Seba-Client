/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, IncomeRecord, ExpenseRecord, BKashRecord, QuickReminder, SystemSettings, ServiceType } from './types';
import { getTodayStr, formatBanglaDate } from './utils/finance';
import { api } from './api/client';

// Component Imports
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import IncomeManager from './components/IncomeManager';
import ExpenseManager from './components/ExpenseManager';
import BKashManager from './components/bKashManager';
import ReportsManager from './components/ReportsManager';
import SettingsManager from './components/SettingsManager';

// Lucide icon imports
import {
  FolderLock, LayoutDashboard, Landmark, Coins,
  CreditCard, TrendingUp, Settings, LogOut, CheckCircle,
  HelpCircle, ShieldCheck, Sun, Moon, CalendarDays, Globe, UserCheck
} from 'lucide-react';

export default function App() {
  // 1. SYSTEM STATES
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [incomeList, setIncomeList] = useState<IncomeRecord[]>([]);
  const [expenseList, setExpenseList] = useState<ExpenseRecord[]>([]);
  const [bkashList, setBkashList] = useState<BKashRecord[]>([]);
  const [reminders, setReminders] = useState<QuickReminder[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    isDarkMode: true,
    pinLockEnabled: true,
    dailyReminderText: 'সাফল্য নিয়ে কোনো শর্টকাট নেই, সত্যতা ও সঠিক গ্রাহক সেবাই ব্যবসার আসল মূলধন।',
    expenseAlertThreshold: 5000,
    monthlyRent: 6000,
    monthlyElectricity: 1850,
    monthlyInternet: 800,
    monthlySalary: 8000
  });
  const [activeServiceTypes, setActiveServiceTypes] = useState<ServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Services metadata state
  const [servicesMetadata, setServicesMetadata] = useState<Record<string, { bangla: string; english: string; color: string; defaultPrice: number }>>({
    NAMJARI: { bangla: 'নামজারি আবেদন', english: 'Mutation Service', color: 'from-emerald-500 to-teal-600', defaultPrice: 300 },
    KHOTIYAN: { bangla: 'খতিয়ান উত্তোলন', english: 'Khotiyan copy', color: 'from-cyan-500 to-blue-600', defaultPrice: 200 },
    PORCHA: { bangla: 'পর্চা সংগ্রহ', english: 'Porcha copy', color: 'from-indigo-500 to-purple-600', defaultPrice: 200 },
    DOLIL: { bangla: 'দলিল লিখন / যাচাই', english: 'Deed Writing', color: 'from-amber-500 to-orange-655', defaultPrice: 2000 },
    LAND_APP: { bangla: 'ভূমি আবেদন', english: 'Land Online Application', color: 'from-violet-500 to-fuchsia-600', defaultPrice: 500 },
    DCR: { bangla: 'ডিসিআর পেমেন্ট', english: 'DCR Payment', color: 'from-blue-500 to-indigo-600', defaultPrice: 200 },
    OTHERS: { bangla: 'অন্যান্য সার্ভিস', english: 'Other General Work', color: 'from-slate-500 to-slate-700', defaultPrice: 300 }
  });

  const updateServicesMetadata = (newMetadata: Record<string, { bangla: string; english: string; color: string; defaultPrice: number }>) => {
    const oldKeys = Object.keys(servicesMetadata);
    const newKeys = Object.keys(newMetadata);

    // Detect new services and create them via API
    for (const key of newKeys) {
      const meta = newMetadata[key];
      if (!oldKeys.includes(key)) {
        api.services.create({ serviceKey: key, bangla: meta.bangla, english: meta.english, color: meta.color, defaultPrice: meta.defaultPrice })
          .catch(err => console.error('Service create error:', err));
      } else {
        const old = servicesMetadata[key];
        if (old.defaultPrice !== meta.defaultPrice || old.bangla !== meta.bangla || old.english !== meta.english || old.color !== meta.color) {
          api.services.update(key, { bangla: meta.bangla, english: meta.english, color: meta.color, defaultPrice: meta.defaultPrice })
            .catch(err => console.error('Service update error:', err));
        }
      }
    }

    // Detect deleted services
    for (const key of oldKeys) {
      if (!newKeys.includes(key)) {
        api.services.delete(key).catch(err => console.error('Service delete error:', err));
      }
    }

    setServicesMetadata(newMetadata);
  };

  // Clock ticker state
  const [timeStr, setTimeStr] = useState<string>('07:39:04 AM');

  // 2. LOAD ALL DATA FROM API AFTER LOGIN
  async function loadAllData() {
    try {
      const [incomeData, expenseData, bkashData, reminderData, settingsData, servicesData] = await Promise.all([
        api.income.getAll(),
        api.expenses.getAll(),
        api.bkash.getAll(),
        api.reminders.getAll(),
        api.settings.get(),
        api.services.getAll(),
      ]);

      setIncomeList(incomeData.map((r: any) => ({ ...r, amount: Number(r.amount) })));
      setExpenseList(expenseData.map((r: any) => ({ ...r, amount: Number(r.amount) })));
      setBkashList(bkashData.map((r: any) => ({ ...r, amount: Number(r.amount), fee: r.fee != null ? Number(r.fee) : undefined })));
      setReminders(reminderData.map((r: any) => ({ ...r, isCompleted: !!r.isCompleted })));

      const mergedSettings = {
        monthlyRent: 6000,
        monthlyElectricity: 1850,
        monthlyInternet: 800,
        monthlySalary: 8000,
        ...settingsData,
      };
      setSettings(mergedSettings);

      // Build services metadata and active types from DB
      const metadataObj: Record<string, any> = {};
      const activeTypes: string[] = [];
      for (const s of servicesData) {
        metadataObj[s.serviceKey] = {
          bangla: s.bangla,
          english: s.english,
          color: s.color,
          defaultPrice: Number(s.defaultPrice),
        };
        if (s.isActive) {
          activeTypes.push(s.serviceKey);
        }
      }
      if (Object.keys(metadataObj).length > 0) {
        setServicesMetadata(metadataObj);
      }
      setActiveServiceTypes(activeTypes.length > 0 ? activeTypes : ['NAMJARI', 'KHOTIYAN', 'PORCHA', 'DOLIL', 'LAND_APP', 'DCR', 'OTHERS']);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  // 3. INITIALIZATION ON COMPONENT MOUNT
  useEffect(() => {
    // Sync time ticker
    const interval = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    // Check for existing session
    const token = localStorage.getItem('authToken');
    if (token) {
      api.auth.me()
        .then(({ user }) => {
          setCurrentUser(user);
          return loadAllData();
        })
        .catch(() => {
          localStorage.removeItem('authToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    return () => clearInterval(interval);
  }, []);

  // 4. STATE UPDATE FUNCTIONS (sync to API)
  const updateIncomeState = (newList: IncomeRecord[]) => {
    setIncomeList(newList);
  };

  const updateExpenseState = (newList: ExpenseRecord[]) => {
    setExpenseList(newList);
  };

  const updateBkashState = (newList: BKashRecord[]) => {
    setBkashList(newList);
  };

  const updateReminderState = (newList: QuickReminder[]) => {
    setReminders(newList);
  };

  const updateSettingsState = (newSettings: Partial<SystemSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    api.settings.update(newSettings).catch(err => console.error('Settings sync error:', err));
  };

  const handleUpdateServiceTypes = (newList: ServiceType[]) => {
    setActiveServiceTypes(newList);
    // Sync active status to DB
    const allKeys = Object.keys(servicesMetadata);
    for (const key of allKeys) {
      const isActive = newList.includes(key);
      api.services.toggle(key, isActive).catch(err => console.error('Service toggle error:', err));
    }
  };

  // 5. CORE HANDLERS
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    loadAllData();
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      // Ignore logout errors
    }
    localStorage.removeItem('authToken');
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // ADD NEW INCOME RECORD
  const handleAddIncome = async (record: Omit<IncomeRecord, 'id'>) => {
    try {
      const result = await api.income.create(record);
      const newRecord: IncomeRecord = { ...result.income, amount: Number(result.income.amount) };
      setIncomeList(prev => [newRecord, ...prev]);

      if (result.bkash) {
        const bkRecord: BKashRecord = { ...result.bkash, amount: Number(result.bkash.amount), fee: result.bkash.fee != null ? Number(result.bkash.fee) : undefined };
        setBkashList(prev => [bkRecord, ...prev]);
      }
    } catch (err) {
      console.error('Add income error:', err);
    }
  };

  // DELETE INCOME RECORD
  const handleDeleteIncome = async (id: string) => {
    try {
      await api.income.delete(id);
      setIncomeList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Delete income error:', err);
    }
  };

  // UPDATE INCOME RECORD
  const handleUpdateIncome = async (id: string, updatedFields: Partial<IncomeRecord>) => {
    try {
      await api.income.update(id, updatedFields);
      setIncomeList(prev => prev.map(item => item.id === id ? { ...item, ...updatedFields } : item));
    } catch (err) {
      console.error('Update income error:', err);
    }
  };

  // ADD NEW EXPENSE RECORD
  const handleAddExpense = async (record: Omit<ExpenseRecord, 'id'>) => {
    try {
      const newRecord = await api.expenses.create(record);
      setExpenseList(prev => [{ ...newRecord, amount: Number(newRecord.amount) }, ...prev]);
    } catch (err) {
      console.error('Add expense error:', err);
    }
  };

  // DELETE EXPENSE RECORD
  const handleDeleteExpense = async (id: string) => {
    try {
      await api.expenses.delete(id);
      setExpenseList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Delete expense error:', err);
    }
  };

  // ADD NEW BKASH RECORD MANUALLY
  const handleAddBkashRecord = async (record: Omit<BKashRecord, 'id'>) => {
    try {
      const newRecord = await api.bkash.create(record);
      setBkashList(prev => [{ ...newRecord, amount: Number(newRecord.amount), fee: newRecord.fee != null ? Number(newRecord.fee) : undefined }, ...prev]);
    } catch (err) {
      console.error('Add bkash error:', err);
    }
  };

  // DELETE BKASH RECORD
  const handleDeleteBkashRecord = async (id: string) => {
    try {
      await api.bkash.delete(id);
      setBkashList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Delete bkash error:', err);
    }
  };

  // UPDATE/EDIT BKASH RECORD
  const handleUpdateBkashRecord = async (updatedRecord: BKashRecord) => {
    try {
      await api.bkash.update(updatedRecord.id, updatedRecord);
      setBkashList(prev => prev.map(item => item.id === updatedRecord.id ? updatedRecord : item));
    } catch (err) {
      console.error('Update bkash error:', err);
    }
  };

  // ADD NEW REMINDER AT CALENDAR
  const handleAddReminder = async (title: string, date: string) => {
    try {
      const newReminder = await api.reminders.create({ title, date });
      setReminders(prev => [{ ...newReminder, isCompleted: false }, ...prev]);
    } catch (err) {
      console.error('Add reminder error:', err);
    }
  };

  // DELETE REMINDER
  const handleDeleteReminder = async (id: string) => {
    try {
      await api.reminders.delete(id);
      setReminders(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Delete reminder error:', err);
    }
  };

  // TOGGLE REMINDER PROGRESS
  const handleToggleReminder = async (id: string) => {
    try {
      await api.reminders.toggle(id);
      setReminders(prev => prev.map(rem => rem.id === id ? { ...rem, isCompleted: !rem.isCompleted } : rem));
    } catch (err) {
      console.error('Toggle reminder error:', err);
    }
  };

  // SOFT DATABASE RESET TO SEED DATA INITIAL STATE
  const handleResetData = async () => {
    try {
      await api.backup.reset();
      localStorage.removeItem('authToken');
      setCurrentUser(null);
      setIncomeList([]);
      setExpenseList([]);
      setBkashList([]);
      setReminders([]);
      setSettings({
        isDarkMode: true,
        pinLockEnabled: true,
        dailyReminderText: 'সাফল্য নিয়ে কোনো শর্টকাট নেই, সত্যতা ও সঠিক গ্রাহক সেবাই ব্যবসার আসল মূলধন।',
        expenseAlertThreshold: 5000,
        monthlyRent: 6000,
        monthlyElectricity: 1850,
        monthlyInternet: 800,
        monthlySalary: 8000
      });
      setActiveServiceTypes(['NAMJARI', 'KHOTIYAN', 'PORCHA', 'DOLIL', 'LAND_APP', 'OTHERS']);
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mx-auto mb-4 animate-pulse">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <p className="text-slate-400 text-sm">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // IF USER IS NOT LOGGED IN, RENDER SPLASH LOGIN KEYPAD SCREEN
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLogin} />;
  }

  // ACTIVE THEME CLASSES
  const isDarkMode = settings.isDarkMode;
  const themeAccentStyle = isDarkMode
    ? 'dark bg-slate-900 text-slate-100 min-h-screen'
    : 'bg-slate-50 text-slate-900 min-h-screen';

  return (
    <div id="app-root-container" className={themeAccentStyle}>

      {/* 1. MASTER RESPONSIVE BANNER HEADER */}
      <header className={`border-b ${isDarkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-white border-slate-200 shadow-xs'} sticky top-0 z-30 backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Logo Brand / Desk link */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base tracking-tight">ভূমি সেবা হিসাব</h1>
              <p className="text-[10px] text-slate-400 font-medium">সহায়তা কেন্দ্র এন্ট্রি ভল্ট</p>
            </div>
          </div>

          {/* Center Info Tickers: Clock & Location info */}
          <div className="hidden md:flex items-center space-x-4 text-xs">
            <div className="bg-slate-950/70 border border-slate-850 px-3 py-1 rounded-full text-slate-400 flex items-center font-mono">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              <span>{formatBanglaDate(getTodayStr())}</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-850 px-3 py-1 rounded-full text-emerald-400 flex items-center font-mono">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-ping"></span>
              <span>{timeStr}</span>
            </div>
          </div>

          {/* Right Header: Active User badge with dropdown simulation and logout */}
          <div className="flex items-center space-x-3.5">

            {/* Quick theme change */}
            <button
              id="btn-quick-theme-switch"
              onClick={() => updateSettingsState({ isDarkMode: !isDarkMode })}
              className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-800 border border-transparent transition cursor-pointer"
              title="থিম পরিবর্তন"
            >
              {isDarkMode ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Active User Label */}
            <div className="flex items-center space-x-2 bg-slate-950/50 border border-slate-850/60 p-1.5 pl-2.5 pr-2.5 rounded-full text-xs">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-6.5 h-6.5 rounded-full object-cover border border-emerald-400"
              />
              <div className="hidden sm:inline-block">
                <span className="font-bold text-slate-200 block max-w-[80px] truncate leading-none">
                  {currentUser.name}
                </span>
                <span className="text-[9px] text-emerald-400 block mt-0.5 leading-none">
                  {currentUser.role === 'STAFF' ? 'কর্মচারী' : 'মালিক'}
                </span>
              </div>
            </div>

            {/* Logout Trigger button */}
            <button
              id="btn-global-logout"
              onClick={handleLogout}
              className="p-2 ml-1 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-850 transition cursor-pointer border border-transparent hover:border-slate-800"
              title="লগআউট করুন"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>

          </div>

        </div>
      </header>

      {/* 2. THE CHASSIS BODY WITH DUAL NAVIGATION (Mobile bottom buttons, Desktop elegant side panels) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 flex flex-col md:flex-row gap-6">

        {/* DESKTOP SIDEBAR PANEL */}
        <aside className="hidden md:block w-64 shrink-0">
          <nav className="space-y-1.5 sticky top-22">
            {[
              { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
              { id: 'income', label: 'সার্ভিস ইনকাম', icon: Landmark },
              { id: 'expenses', label: 'দোকান ব্যয়', icon: Coins },
              { id: 'bkash', label: 'বিকাশ ফিন্যান্স', icon: CreditCard },
              { id: 'reports', label: 'স্মার্ট রিপোর্টস', icon: TrendingUp },
              { id: 'settings', label: 'সেটিংস', icon: Settings }
            ].map(tab => {
              const IconComp = tab.icon;
              const isAct = activeTab === tab.id;

              // Hide reports tab for staff
              if (tab.id === 'reports' && currentUser.role === 'STAFF') {
                return null;
              }

              return (
                <button
                  key={tab.id}
                  id={`sidebar-tab-btn-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-xs font-semibold cursor-pointer text-left transition ${
                    isAct
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <IconComp className="w-4.5 h-4.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ACTIVE MAIN SCREEN CONTAINER */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <Dashboard
              incomeList={incomeList}
              expenseList={expenseList}
              bkashList={bkashList}
              reminders={reminders}
              currentUser={currentUser}
              onNavigate={setActiveTab}
              onToggleReminder={handleToggleReminder}
              onAddIncome={handleAddIncome}
              activeServiceTypes={activeServiceTypes}
              settings={settings}
              servicesMetadata={servicesMetadata}
              onUpdateSettings={updateSettingsState}
            />
          )}

          {activeTab === 'income' && (
            <IncomeManager
              incomeList={incomeList}
              currentUser={currentUser}
              onAddIncome={handleAddIncome}
              onDeleteIncome={handleDeleteIncome}
              onUpdateIncome={handleUpdateIncome}
              activeServiceTypes={activeServiceTypes}
              onUpdateServiceTypes={handleUpdateServiceTypes}
              servicesMetadata={servicesMetadata}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpenseManager
              expenseList={expenseList}
              currentUser={currentUser}
              expenseAlertThreshold={settings.expenseAlertThreshold}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 'bkash' && (
            <BKashManager
              bkashList={bkashList}
              currentUser={currentUser}
              onAddBKashRecord={handleAddBkashRecord}
              onDeleteBKashRecord={handleDeleteBkashRecord}
              onUpdateBKashRecord={handleUpdateBkashRecord}
              settings={settings}
              onUpdateSettings={updateSettingsState}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsManager
              incomeList={incomeList}
              expenseList={expenseList}
              bkashList={bkashList}
              currentUser={currentUser}
              servicesMetadata={servicesMetadata}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsManager
              settings={settings}
              currentUser={currentUser}
              reminders={reminders}
              onUpdateSettings={updateSettingsState}
              onAddReminder={handleAddReminder}
              onDeleteReminder={handleDeleteReminder}
              onResetData={handleResetData}
              activeServiceTypes={activeServiceTypes}
              onUpdateServiceTypes={handleUpdateServiceTypes}
              servicesMetadata={servicesMetadata}
              onUpdateServicesMetadata={updateServicesMetadata}
            />
          )}
        </main>

      </div>

      {/* 3. FLOATING MOBILE TAB BOTTOM ACTION NAVIGATION BAR */}
      <footer className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white shadow-lg border-slate-200'
      } pb-safe shadow-[0_-8px_20px_rgba(0,0,0,0.1)]`}>
        <div className="flex h-16 justify-around items-center px-2">
          {[
            { id: 'dashboard', label: 'হোম', icon: LayoutDashboard },
            { id: 'income', label: 'আয়', icon: Landmark },
            { id: 'expenses', label: 'ব্যয়', icon: Coins },
            { id: 'bkash', label: 'বিকাশ', icon: CreditCard },
            { id: 'settings', label: 'সেটিংস', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`footer-tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition ${
                  isAct
                    ? 'text-indigo-400 font-bold scale-105'
                    : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                <Icon className={`w-5 h-5 ${isAct ? 'text-indigo-400 stroke-2' : 'stroke-1.5'}`} />
                <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </footer>

    </div>
  );
}
