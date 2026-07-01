/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { User, IncomeRecord, ServiceType } from '../types';
import { SERVICE_METADATA } from '../data/mockData';
import { getDailyIncomeMetrics, getTodayStr, formatBanglaDate } from '../utils/finance';
import { Calendar, Clock, DollarSign, FileText, Search, CreditCard, CheckCircle, Trash2, PlusCircle, Edit } from 'lucide-react';

interface IncomeManagerProps {
  incomeList: IncomeRecord[];
  currentUser: User;
  onAddIncome: (record: Omit<IncomeRecord, 'id'>) => void;
  onDeleteIncome?: (id: string) => void;
  onUpdateIncome?: (id: string, updatedFields: Partial<IncomeRecord>) => void;
  activeServiceTypes: ServiceType[];
  onUpdateServiceTypes: (types: ServiceType[]) => void;
  servicesMetadata: Record<string, { bangla: string; english: string; color: string; defaultPrice: number }>;
}

export default function IncomeManager({
  incomeList,
  currentUser,
  onAddIncome,
  onDeleteIncome,
  onUpdateIncome,
  activeServiceTypes,
  onUpdateServiceTypes,
  servicesMetadata
}: IncomeManagerProps) {
  const isOwner = currentUser.role === 'OWNER_ONE' || currentUser.role === 'OWNER_TWO';

  const todayStr = getTodayStr();

  // Find if today's rapid entry (একসাথে এন্ট্রি) already exists to bind for direct inline edits
  const existingQuickIncome = useMemo(() => {
    return incomeList.find(i => i.date === todayStr && i.note && i.note.includes('একসাথে এন্ট্রি'));
  }, [incomeList, todayStr]);

  // 1. Form state definitions
  const [serviceType, setServiceType] = useState<ServiceType>(activeServiceTypes[0] || 'NAMJARI');
  const [amount, setAmount] = useState<string>('300'); // default for NAMJARI
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH'>('CASH');
  const [successAnimation, setSuccessAnimation] = useState<boolean>(false);
  const [showServiceManagement, setShowServiceManagement] = useState<boolean>(false);
  const [recordToDelete, setRecordToDelete] = useState<IncomeRecord | null>(null);

  // States for general listing item edits (modal based)
  const [editingRecord, setEditingRecord] = useState<IncomeRecord | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'CASH' | 'BKASH'>('CASH');
  const [editServiceType, setEditServiceType] = useState<ServiceType>('OTHERS');
  const [serviceToDelete, setServiceToDelete] = useState<ServiceType | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Auto recovery if currently selected service gets deleted
  useEffect(() => {
    if (activeServiceTypes.length > 0 && !activeServiceTypes.includes(serviceType)) {
      setServiceType(activeServiceTypes[0]);
      setAmount((servicesMetadata[activeServiceTypes[0]]?.defaultPrice || SERVICE_METADATA[activeServiceTypes[0]]?.defaultPrice || 300).toString());
    }
  }, [activeServiceTypes, serviceType]);

  // Quick total income state variables
  const [quickAmount, setQuickAmount] = useState<string>('');
  const [quickMethod, setQuickMethod] = useState<'CASH' | 'BKASH'>('CASH');

  // Pre-populate quick box fields when a record already exists so the user can easily edit/update it
  useEffect(() => {
    if (existingQuickIncome) {
      setQuickAmount(existingQuickIncome.amount.toString());
      setQuickMethod(existingQuickIncome.paymentMethod);
    } else {
      setQuickAmount('');
    }
  }, [existingQuickIncome]);

  // Filters state definitions
  const [filterService, setFilterService] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');

  const getDisplayName = (name: string) => {
    if (currentUser.role === 'STAFF') {
      if (name === 'মোঃ রনি' || name === 'মোঃ রাসেল') {
        return 'মালিক';
      }
    }
    return name;
  };

  const handleQuickSubmit = () => {
    const cleanAmount = parseFloat(quickAmount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      alert('অনুগ্রহ করে সঠিক টাকার অংক দিন।');
      return;
    }

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeFormatted = `${hours}:${minutes}`;

    if (existingQuickIncome) {
      if (onUpdateIncome) {
        onUpdateIncome(existingQuickIncome.id, {
          amount: cleanAmount,
          paymentMethod: quickMethod,
          time: timeFormatted
        });
        alert('আজকের মোট ইনকাম সফলভাবে পরিবর্তন ও আপডেট করা হয়েছে!');
      }
    } else {
      onAddIncome({
        date: todayStr,
        time: timeFormatted,
        serviceType: 'OTHERS',
        amount: cleanAmount,
        enteredBy: currentUser.name,
        note: 'আজকের ইনকাম (একসাথে এন্ট্রি)',
        paymentMethod: quickMethod
      });
      alert('সফলভাবে আজকের মোট ইনকাম যুক্ত করা হয়েছে!');
    }

    setSuccessAnimation(true);
    setTimeout(() => {
      setSuccessAnimation(false);
    }, 2000);
  };

  // General Edit Modal Handler
  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const clean = parseFloat(editAmount);
    if (isNaN(clean) || clean <= 0) {
      alert('সঠিক টাকার অংক টাইপ করুন!');
      return;
    }
    
    if (onUpdateIncome) {
      onUpdateIncome(editingRecord.id, {
        amount: clean,
        note: editNote.trim() || editingRecord.note,
        paymentMethod: editPaymentMethod,
        serviceType: editServiceType
      });
      alert('রেকর্ডটি সফলভাবে পরিবর্তন বা এডিট করা হয়েছে!');
    }
    setEditingRecord(null);
  };

  // Auto set pricing whenever user changes service type
  const handleServiceChange = (s: ServiceType) => {
    setServiceType(s);
    const price = servicesMetadata[s]?.defaultPrice ?? SERVICE_METADATA[s]?.defaultPrice ?? 0;
    setAmount(price.toString());
  };

  const handleDeleteService = (s: ServiceType) => {
    if (activeServiceTypes.length <= 1) {
      alert('সিস্টেম সচল রাখতে অন্তত একটি সার্ভিসের ধরন অবশ্যই থাকতে হবে!');
      return;
    }
    setServiceToDelete(s);
  };

  const handleResetServices = () => {
    setShowResetConfirm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      alert('অনুগ্রহ করে সঠিক টাকার অংক দিন।');
      return;
    }

    const now = new Date();
    const dateFormatted = getTodayStr();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeFormatted = `${hours}:${minutes}`;

    onAddIncome({
      date: dateFormatted,
      time: timeFormatted,
      serviceType,
      amount: cleanAmount,
      enteredBy: currentUser.name,
      note: note.trim() || `${servicesMetadata[serviceType]?.bangla || SERVICE_METADATA[serviceType]?.bangla || serviceType} বাবদ চার্জ`,
      paymentMethod
    });

    // Reset Form & Show Nice Success Feedback
    setNote('');
    setSuccessAnimation(true);
    setTimeout(() => {
      setSuccessAnimation(false);
    }, 2000);
  };

  // Preset quick fill amounts
  const presetAmounts = [200, 300, 500, 1000, 2000];

  // Filter list with query
  const filteredList = incomeList.filter(item => {
    const matchesService = filterService === 'ALL' || item.serviceType === filterService;
    const matchesSearch = item.note.toLowerCase().includes(filterSearch.toLowerCase()) || 
                          item.enteredBy.toLowerCase().includes(filterSearch.toLowerCase()) ||
                          SERVICE_METADATA[item.serviceType]?.bangla.toLowerCase().includes(filterSearch.toLowerCase());
    return matchesService && matchesSearch;
  });

  const totalFilteredIncome = filteredList.reduce((sum, item) => sum + item.amount, 0);

  const dailyMetrics = getDailyIncomeMetrics(todayStr, incomeList);

  return (
    <>
      <div className="space-y-6">
        
        {/* আজকের মোট আয় (Revenue) Premium Metric Display Box */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="absolute right-0 top-0 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center space-x-4">
            <div className="inline-flex items-center justify-center p-3.5 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20 text-slate-950">
              <DollarSign className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">আজকের মোট আয় (Revenue)</p>
              <h2 className="text-4xl font-extrabold font-mono text-white mt-1 drop-shadow-sm">৳{dailyMetrics.total.toLocaleString()}</h2>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-slate-950/45 border border-slate-800 rounded-2xl px-4 py-2 flex items-center space-x-3 hover:border-emerald-500/20 transition">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">ক্যাশ ইনকাম</span>
                <span className="text-xs font-bold font-mono text-slate-200">৳{dailyMetrics.cash.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="bg-slate-950/45 border border-slate-800 rounded-2xl px-4 py-2 flex items-center space-x-3 hover:border-emerald-500/20 transition">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">বিকাশ ইনকাম</span>
                <span className="text-xs font-bold font-mono text-slate-200">৳{dailyMetrics.bkash.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-slate-950/45 border border-slate-800 rounded-2xl px-4 py-2 flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">লেনদেনের তারিখ</span>
                <span className="text-xs font-bold text-slate-350">{formatBanglaDate(todayStr)}</span>
              </div>
            </div>
          </div>
        </div>

        <div id="income-manager-tab" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* COLUMN 1: PREMIUM ENTRY PANEL */}
      <div className="lg:col-span-1 space-y-6">

        {/* QUICK INCOME ENTRY WIDGET */}
        <div className="bg-slate-900 border border-emerald-500/25 rounded-3xl p-5 shadow-md">
          <h3 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            আজকের ইনকাম একসাথে লিখুন (Quick Box)
          </h3>
          <p className="text-[11px] text-slate-400 leading-normal mb-3">
            আজকে মোট কত ইনকাম হলো তা একসাথে নিচে লিখে এক ক্লিকে সংরক্ষণ করে ফেলুন।
          </p>

          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm select-none">৳</span>
              <input
                id="input-income-quick-amt"
                type="number"
                placeholder="যেমন: ১৮০০"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 pl-8 text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setQuickMethod('CASH')}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors duration-150 ${quickMethod === 'CASH' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
              >
                ক্যাশ (Cash)
              </button>
              <button
                type="button"
                onClick={() => setQuickMethod('BKASH')}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors duration-150 ${quickMethod === 'BKASH' ? 'bg-pink-500 text-slate-950' : 'text-slate-400 font-medium'}`}
              >
                বিকাশ (bKash)
              </button>
            </div>

            <button
              id="btn-quick-income-submit"
              type="button"
              onClick={handleQuickSubmit}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 text-xs rounded-xl shadow-md cursor-pointer transition duration-155 active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <span>আজকের মোট ইনকাম যুক্ত করুন</span>
            </button>
          </div>
        </div>

        {/* DETAILED SERVICE ENTRY PANEL */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md">
          <h3 className="text-base font-bold text-white mb-4 flex items-center">
            <span className="p-1.5 bg-emerald-500/15 rounded-lg text-emerald-400 mr-2">
              <DollarSign className="w-4 h-4" />
            </span>
            নতুন আয় এন্ট্রি (Enter Service Income)
          </h3>

          {successAnimation && (
            <div id="income-success-banner" className="mb-4 bg-emerald-950/45 border border-emerald-800 text-emerald-300 p-3 rounded-2xl flex items-center space-x-2 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>সফলভাবে নতুন আয়ের ডাটা এন্ট্রি ডেটাবেজে যুক্ত করা হয়েছে!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {getDailyIncomeMetrics(todayStr, incomeList).isLocked && (
              <div className="bg-emerald-950/30 border border-emerald-800/50 p-3 rounded-xl text-[10.5px] leading-relaxed text-emerald-400">
                ℹ️ আজকের মোট ইনকাম একসাথে নিয়ে ইতিমধ্যে সংরক্ষিত করা হয়েছে। এখন অন্যান্য সার্ভিসের ধরনগুলোতে ক্লিক করে টাকা এন্ট্রি করলে তা বিবরণী তালিকায় যুক্ত হবে, কিন্তু আজকের মোট উপার্জনে কোনো পরিবর্তন আনবে না।
              </div>
            )}
            
            {/* Service Selector */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-slate-400 text-xs font-semibold">সার্ভিসের ধরন (Service Type)</label>
                <button
                  type="button"
                  id="btn-toggle-service-mgmt"
                  onClick={() => setShowServiceManagement(!showServiceManagement)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline transition cursor-pointer"
                >
                  {showServiceManagement ? 'সেটিংস বন্ধ করুন' : 'সার্ভিসের ধরন ডিলিট করুন'}
                </button>
              </div>

              {/* Service Management collapse panel */}
              {showServiceManagement && (
                <div className="mb-3 p-3 bg-slate-950 border border-slate-850 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-850">
                    <span className="text-[10.5px] font-bold text-slate-300">সার্ভিস টাইপ লিস্ট (আলাদা আলাদা ডিলিট করুন)</span>
                    <button
                      type="button"
                      id="btn-reset-services-to-default"
                      onClick={handleResetServices}
                      className="text-[8.5px] bg-indigo-500/10 text-indigo-300 hover:bg-slate-800 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-bold transition cursor-pointer"
                    >
                      রি-স্টোর / রিসেট
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {activeServiceTypes.map(s => (
                      <div key={s} className="flex justify-between items-center bg-slate-900/60 border border-slate-850 p-1.5 px-2 rounded-xl text-[11px]">
                        <span className="text-slate-300 font-medium">{SERVICE_METADATA[s]?.bangla || s}</span>
                        <button
                          type="button"
                          id={`btn-delete-service-item-${s}`}
                          onClick={() => handleDeleteService(s)}
                          className="flex items-center gap-1 p-1 px-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/25 text-red-400 text-[9px] font-semibold rounded-lg transition"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>ডিলিট</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {activeServiceTypes.map(s => {
                  const isSel = serviceType === s;
                  return (
                    <button
                      key={s}
                      id={`btn-select-srv-${s}`}
                      type="button"
                      onClick={() => handleServiceChange(s)}
                      className={`py-2 px-3 text-xs font-medium rounded-xl text-left border cursor-pointer transition ${
                        isSel 
                          ? 'bg-slate-800 text-white border-emerald-500 shadow-md' 
                          : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="block">{SERVICE_METADATA[s]?.bangla || s}</span>
                      <span className="block text-[9px] text-slate-500 mt-0.5">{SERVICE_METADATA[s]?.english || s}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount input with manual overwrite & preset selections */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">সার্ভিস ফি / টাকা (Amount in ৳)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 select-none font-bold">৳</span>
                <input
                  id="input-income-amount"
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 pl-8 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500/80"
                  placeholder="যেমন: ১৫০০"
                />
              </div>
              
              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {presetAmounts.map(val => (
                  <button
                    key={val}
                    type="button"
                    id={`btn-preset-amt-${val}`}
                    onClick={() => setAmount(val.toString())}
                    className="text-[10px] font-mono px-2 py-1 bg-slate-950 hover:bg-slate-850 rounded-lg text-slate-400 border border-slate-850 transition cursor-pointer"
                  >
                    +{val}৳
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">পেমেন্ট মাধ্যম (Payment Method)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-pay-cash"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950/40 text-slate-400 border-slate-800'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>ক্যাশ হিসাব (Cash)</span>
                </button>

                <button
                  type="button"
                  id="btn-pay-bkash"
                  onClick={() => setPaymentMethod('BKASH')}
                  className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                    paymentMethod === 'BKASH'
                      ? 'bg-pink-500/10 border-pink-500 text-pink-450'
                      : 'bg-slate-950/40 text-slate-400 border-slate-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>বিকাশ জমা (bKash)</span>
                </button>
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">বিস্তারিত নোট বা দাতা (Notes/Memo)</label>
              <textarea
                id="input-income-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-1.5 px-3 text-white text-xs focus:outline-none focus:border-emerald-500/80"
                placeholder="উদা: জমিদাতা বা খতিয়ান নাম্বার, মৌজার নাম..."
              />
            </div>

            {/* Submitting context info */}
            <div className="bg-slate-955 bg-slate-950/80 border border-slate-850 p-2.5 rounded-2xl text-[10px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> রানিং ডেটা এন্ট্রি</span>
              <span>এন্ট্রি করছেন: <strong className="text-slate-350">{currentUser.name}</strong></span>
            </div>

            <button
              id="btn-submit-income-entry"
              type="submit"
              className="w-full py-2.5 text-center bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition cursor-pointer"
            >
              সার্ভিস ইনকাম ডিক্লেয়ার করুন
            </button>

          </form>
        </div>
      </div>

      {/* COLUMN 2 & 3: DETAILS FILTER LOG TABLE */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-col justify-between">
        
        <div>
          {/* Table Header Filter Control */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">ভূমি সেবা আয়ের রেজিস্টার বুক</h3>
              <p className="text-[11px] text-slate-400">মোট তালিকাভুক্ত {filteredList.length} টি রেকর্ড পাওয়া গেছে</p>
            </div>

            {/* Quick Live Counters */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl">
                মোট আয়: <strong className="text-emerald-400 font-mono">৳{totalFilteredIncome.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* Interactive filter search controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 my-4">
            
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                id="search-income-logs"
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-1.5 pl-8 pr-3 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                placeholder="দাতা, নোট বা লেখক খুঁজুন..."
              />
            </div>

            <select
              id="filter-income-service"
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="bg-slate-950 border border-slate-850 rounded-xl py-1.5 px-3 text-slate-300 text-xs cursor-pointer focus:outline-none focus:border-emerald-500/60 font-medium"
            >
              <option value="ALL">সব সার্ভিস একসাথে ফিল্টার</option>
              {activeServiceTypes.map(s => (
                <option key={s} value={s}>
                  {SERVICE_METADATA[s]?.bangla || s}
                </option>
              ))}
            </select>

            <div className="text-[10px] text-slate-500 flex items-center justify-end font-mono">
              {formatBanglaDate(todayStr)} তারিখের রেকর্ডসমূহ
            </div>

          </div>

          {/* Complete Records Log Table */}
          <div className="overflow-x-auto">
            <table id="tbl-income-logs" className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">
                  <th className="py-2.5 px-2">সার্ভিস টাইপ</th>
                  <th className="py-2.5 px-2">বিস্তারিত নোট / নোটদাতা</th>
                  <th className="py-2.5 px-2">লেনদেন মাধ্যম</th>
                  <th className="py-2.5 px-2">টাকা (৳)</th>
                  <th className="py-2.5 px-2 text-right">ডিলিট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-500 italic">
                      খুঁজে পাওয়া যায়নি! কোনো আয় রেকর্ড যুক্ত নেই।
                    </td>
                  </tr>
                ) : (
                  filteredList.map(record => {
                    const meta = servicesMetadata[record.serviceType] || SERVICE_METADATA[record.serviceType];
                    return (
                      <tr key={record.id} className="text-xs text-slate-300 hover:bg-slate-850/30 transition">
                        {/* Service Indicator with gradient dot */}
                        <td className="py-3 px-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                            <div>
                              <span className="font-semibold text-slate-200 block">{meta?.bangla || record.serviceType}</span>
                              <span className="text-[9px] text-slate-500 leading-none">{record.date} • {record.time}</span>
                            </div>
                          </div>
                        </td>

                        {/* Customer memo details */}
                        <td className="py-3 px-2">
                          <div>
                            <span className="text-slate-300 block font-medium max-w-[200px] truncate" title={record.note}>
                              {record.note}
                            </span>
                            <span className="text-[9px] text-slate-500">লিখেছেন: {getDisplayName(record.enteredBy)}</span>
                          </div>
                        </td>

                        {/* Payment Method Badge */}
                        <td className="py-3 px-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            record.paymentMethod === 'BKASH'
                              ? 'bg-pink-950/40 text-pink-400 border border-pink-900/30'
                              : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                          }`}>
                            {record.paymentMethod === 'BKASH' ? 'বিকাশ (bKash)' : 'ক্যাশ (Cash)'}
                          </span>
                        </td>

                        {/* Price amount */}
                        <td className="py-3 px-2 font-mono font-bold text-slate-200 text-sm">
                          ৳{record.amount.toLocaleString()}
                        </td>

                        {/* Edit and Delete action buttons */}
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end space-x-1.5 whitespace-nowrap">
                            {onUpdateIncome && (
                              <button
                                onClick={() => {
                                  setEditingRecord(record);
                                  setEditAmount(record.amount.toString());
                                  setEditNote(record.note);
                                  setEditPaymentMethod(record.paymentMethod);
                                  setEditServiceType(record.serviceType);
                                }}
                                className="inline-flex items-center gap-1 p-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-[10px] font-bold transition cursor-pointer font-sans"
                                title="রেকর্ড সংশোধন"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>সংশোধন</span>
                              </button>
                            )}
                            {onDeleteIncome && (
                              <button
                                id={`btn-delete-income-${record.id}`}
                                onClick={() => setRecordToDelete(record)}
                                className="inline-flex items-center gap-1 p-1 px-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-red-500/40 rounded-lg text-[10px] font-bold transition cursor-pointer font-sans"
                                title="রেকর্ড মুছুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>ডিলিট</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Informative advice message footer */}
        <div className="mt-5 p-3.5 bg-slate-950 rounded-2xl text-[10px] text-slate-500">
          * নতুন আয় ভলিউম এন্ট্রি করার সাথে সাথে আপনার মোট ক্যাশ ইন হ্যান্ড এবং বকেয়া বিকাশ লেজারের ব্যালেন্স স্বয়ংক্রিয়ভাবে রিয়েল-টাইমে আপডেট হয়ে যাবে।
        </div>

      </div>

    </div>
  </div>

    {/* Custom Confirmation Modal Overlay for Record Delete */}
    {recordToDelete && (
      <div id="custom-confirm-modal-record" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
          onClick={() => setRecordToDelete(null)}
        ></div>
        
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl">
          <div className="text-center font-sans">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 mb-4 animate-bounce">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-bold text-white mb-2">
              রেকর্ড মুছে ফেলার নিশ্চয়তা
            </h3>
            
            <p className="text-slate-400 text-xs leading-relaxed mb-6 px-1">
              আপনি কি নিশ্চিত যে "{(servicesMetadata[recordToDelete.serviceType]?.bangla || SERVICE_METADATA[recordToDelete.serviceType]?.bangla || recordToDelete.serviceType)}" বাবদ এই ৳{recordToDelete.amount.toLocaleString()} টাকার আয়ের রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?
            </p>
            
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteIncome && recordToDelete) {
                    onDeleteIncome(recordToDelete.id);
                  }
                  setRecordToDelete(null);
                }}
                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-650 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Custom Confirmation Modal Overlay for Service Delete */}
    {serviceToDelete && (
      <div id="custom-confirm-modal-service" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
          onClick={() => setServiceToDelete(null)}
        ></div>
        
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl">
          <div className="text-center font-sans">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-bold text-white mb-2">
              সার্ভিস ডিলিট কনফার্মেশন
            </h3>
            
            <p className="text-slate-400 text-xs leading-relaxed mb-6 px-1">
              আপনি কি নিশ্চিত যে সেবা তালিকা থেকে "{(servicesMetadata[serviceToDelete]?.bangla || SERVICE_METADATA[serviceToDelete]?.bangla || serviceToDelete)}" ডিলিট করতে চান?
            </p>
            
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={() => {
                  if (serviceToDelete) {
                    const updated = activeServiceTypes.filter(t => t !== serviceToDelete);
                    onUpdateServiceTypes(updated);
                    
                    if (serviceType === serviceToDelete) {
                      const nextService = updated[0];
                      setServiceType(nextService);
                      setAmount((servicesMetadata[nextService]?.defaultPrice || SERVICE_METADATA[nextService]?.defaultPrice || 300).toString());
                    }
                  }
                  setServiceToDelete(null);
                }}
                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-650 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Custom Confirmation Modal Overlay for Reset Services */}
    {showResetConfirm && (
      <div id="custom-confirm-modal-reset" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
          onClick={() => setShowResetConfirm(false)}
        ></div>
        
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl">
          <div className="text-center font-sans">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 mb-4 animate-pulse">
              <Trash2 className="w-6 h-6 text-indigo-400" />
            </div>
            
            <h3 className="text-base font-bold text-white mb-2">
              সার্ভিস রিসেট কনফার্মেশন
            </h3>
            
            <p className="text-slate-400 text-xs leading-relaxed mb-6 px-1">
              আপনি কি সব সার্ভিসের ধরন শুরুর স্বাভাবিক অবস্থায় ফিরিয়ে আনতে চান?
            </p>
            
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaults: ServiceType[] = ['NAMJARI', 'KHOTIYAN', 'PORCHA', 'DOLIL', 'LAND_APP', 'OTHERS'];
                  onUpdateServiceTypes(defaults);
                  setServiceType(defaults[0]);
                  setAmount((servicesMetadata[defaults[0]]?.defaultPrice || SERVICE_METADATA[defaults[0]]?.defaultPrice || 1500).toString());
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                হ্যাঁ, রিসেট করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Custom Editable Record Modal Overlay */}
    {editingRecord && (
      <div id="editing-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
          onClick={() => setEditingRecord(null)}
        ></div>
        
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full mx-auto shadow-2xl animate-in zoom-in duration-200">
          <form onSubmit={handleEditSave} className="space-y-4 font-sans text-left">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2 border-b border-slate-850 pb-2">
              <Edit className="w-4 h-4 text-emerald-400" />
              রেকর্ড সংশোধন / ইডিট করুন
            </h3>
            
            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1 uppercase">সার্ভিসের ধরন</label>
              <select
                value={editServiceType}
                onChange={(e) => {
                  const s = e.target.value as ServiceType;
                  setEditServiceType(s);
                  const price = servicesMetadata[s]?.defaultPrice ?? SERVICE_METADATA[s]?.defaultPrice ?? 0;
                  setEditAmount(price.toString());
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 text-xs cursor-pointer focus:outline-none focus:border-emerald-500"
              >
                {activeServiceTypes.map(s => (
                  <option key={s} value={s}>
                    {SERVICE_METADATA[s]?.bangla || s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1 uppercase">টাকার পরিমাণ (৳)</label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono font-bold text-xs focus:ring-0 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1 uppercase">বিস্তারিত নোট</label>
              <textarea
                rows={2}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs focus:ring-0 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-semibold mb-1 uppercase">লেনদেন মাধ্যম</label>
              <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditPaymentMethod('CASH')}
                  className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold cursor-pointer transition ${
                    editPaymentMethod === 'CASH'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  ক্যাশ (Cash)
                </button>
                <button
                  type="button"
                  onClick={() => setEditPaymentMethod('BKASH')}
                  className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold cursor-pointer transition ${
                    editPaymentMethod === 'BKASH'
                      ? 'bg-pink-600 text-white shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  বিকাশ (bKash)
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="flex-1 py-2 px-4 bg-slate-850 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    </>
  );
}
