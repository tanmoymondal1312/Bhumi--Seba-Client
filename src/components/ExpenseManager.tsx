/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, ExpenseRecord, ExpenseCategory } from '../types';
import { EXPENSE_METADATA } from '../data/mockData';
import { getTodayStr, formatBanglaDate } from '../utils/finance';
import { Layers, AlertTriangle, HelpCircle, Check, Trash2, Calendar, DollarSign } from 'lucide-react';

interface ExpenseManagerProps {
  expenseList: ExpenseRecord[];
  currentUser: User;
  expenseAlertThreshold: number;
  onAddExpense: (record: Omit<ExpenseRecord, 'id'>) => void;
  onDeleteExpense?: (id: string) => void;
}

export default function ExpenseManager({
  expenseList,
  currentUser,
  expenseAlertThreshold,
  onAddExpense,
  onDeleteExpense
}: ExpenseManagerProps) {
  const isOwner = currentUser.role === 'OWNER_ONE' || currentUser.role === 'OWNER_TWO';

  const getDisplayName = (name: string) => {
    if (currentUser.role === 'STAFF') {
      if (name === 'মোঃ রনি' || name === 'মোঃ রাসেল') {
        return 'মালিক';
      }
    }
    return name;
  };

  // State Definitions
  const [category, setCategory] = useState<ExpenseCategory>('OFFICE');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<boolean>(false);
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Trigger high expense alerts before submitting, to simulate risk check
  const isHighExpenseAlert = amount && parseFloat(amount) >= expenseAlertThreshold;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      alert('সঠিক খরচের টাকার পরিমাণ দিন দয়া করে।');
      return;
    }

    const now = new Date();
    const dateFormatted = getTodayStr();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeFormatted = `${hours}:${minutes}`;

    if (['RENT', 'ELECTRICITY', 'INTERNET', 'SALARY'].includes(category)) {
      const monthPrefix = dateFormatted.substring(0, 7); // '2026-06'
      const hasDuplicate = expenseList.some(item => item.category === category && item.date.startsWith(monthPrefix));
      if (hasDuplicate) {
        alert(`এই মাসে ইতিমধ্যে একবার "${EXPENSE_METADATA[category].bangla}" বাবদ খরচ এন্ট্রি করা হয়েছে। নিয়ম অনুযায়ী এক মাসে একবারই এই এন্ট্রি দেওয়া যাবে!`);
        return;
      }
    }

    onAddExpense({
      date: dateFormatted,
      time: timeFormatted,
      category,
      amount: cleanAmount,
      enteredBy: currentUser.name,
      note: note.trim() || `${EXPENSE_METADATA[category].bangla} বাবদ ব্যয়`
    });

    setAmount('');
    setNote('');
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
    }, 2000);
  };

  // Group list to Fixed vs Variable
  const filteredExpenses = expenseList.filter(item => {
    if (filterCat === 'ALL') return true;
    if (filterCat === 'FIXED') return EXPENSE_METADATA[item.category].isFixed;
    if (filterCat === 'VARIABLE') return !EXPENSE_METADATA[item.category].isFixed;
    return item.category === filterCat;
  });

  const totalFilteredExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <div id="expense-manager-tab" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* COLUMN 1: FORM TO INPUT NEW EXPENSE */}
      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md h-fit">
        <h3 className="text-base font-bold text-white mb-4 flex items-center">
          <span className="p-1.5 bg-indigo-500/15 rounded-lg text-indigo-400 mr-2">
            <Layers className="w-4 h-4" />
          </span>
          নতুন খরচ যুক্ত করুন (Add Store Expense)
        </h3>

        {successMsg && (
          <div className="mb-4 bg-emerald-950/45 border border-emerald-800 text-emerald-300 p-3 rounded-2xl flex items-center space-x-2 text-xs">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>খরচটি সফলভাবে তালিকাভুক্ত করা হয়েছে!</span>
          </div>
        )}

        {/* Warning if amount typed exceeds threshold alerts! */}
        {isHighExpenseAlert && (
          <div id="expense-alert-warning" className="mb-4 bg-orange-950/40 border border-orange-850 text-orange-350 p-3.5 rounded-2xl flex items-start space-x-2 text-xs leading-relaxed animate-pulse">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <strong>সতর্কতা: হাই এক্সপেন্স এলার্ট!</strong>
              <p className="text-[10px] text-orange-450 mt-1">দোকানের সিঙ্গেল খরচের লিমিট (৳{expenseAlertThreshold.toLocaleString()}) অতিক্রম করছে। অনুগ্রহ করে সঠিকতা নিশ্চিত করুন।</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Category SELECT dropdown */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5 font-sans">খরচের খাত (Expense Category)</label>
            <select
              id="input-expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-slate-200 text-xs focus:outline-none focus:border-indigo-500/85 cursor-pointer font-semibold"
            >
              <optgroup label="Fixed Expenses (স্থায়ী খরচ)">
                <option value="RENT">ঘর ভাড়া</option>
                <option value="ELECTRICITY">কারেন্ট বিল</option>
                <option value="INTERNET">ইন্টারনেট বিল</option>
                <option value="SALARY">কর্মচারী বেতন</option>
              </optgroup>
              <optgroup label="Variable Expenses (চলতি খরচ)">
                <option value="OFFICE">অফিস খরচ/চা-নাস্তা</option>
                <option value="TRAVEL">যাতায়াত খরচ</option>
                <option value="PRINT">প্রিন্ট/ফটোকপি পেপার</option>
                <option value="OTHERS">अन्यান্য কাস্টম খরচ</option>
              </optgroup>
            </select>
          </div>

          {/* Amount field */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5 font-sans">টাকার পরিমাণ (Amount in ৳)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold select-none">৳</span>
              <input
                id="input-expense-amount"
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 pl-8 text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500"
                placeholder="যেমন: ৩৫০"
              />
            </div>
            <p className="text-[9px] text-slate-500 mt-1">
              * খরচটি {EXPENSE_METADATA[category].isFixed ? 'স্থায়ী খরচ (Fixed)' : 'চলতি খরচ (Variable)'} হিসেবে গণ্য হবে।
            </p>
          </div>

          {/* Description note */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5 font-sans">রিসিপ্ট নোট / বিবরণ (Receipt Memo)</label>
            <textarea
              id="input-expense-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-1.5 px-3 text-white text-xs focus:outline-none focus:border-indigo-500"
              placeholder="যেমন: কর্মচারীর লাঞ্চ খরচ, পেপার রিম ক্রয়..."
            />
          </div>

          {/* Submitting Context */}
          <div className="bg-slate-950/80 border border-slate-850 py-2 px-3 rounded-xl text-[10px] text-slate-500 flex justify-between">
            <span>ইনপুটদাতা: <strong className="text-slate-350">{currentUser.name}</strong></span>
            <span>তারিখ: {formatBanglaDate(getTodayStr())}</span>
          </div>

          <button
            id="btn-submit-expense-entry"
            type="submit"
            className="w-full py-2.5 text-center bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 active:scale-95 transition cursor-pointer"
          >
            দোকানের খরচ লিপিবদ্ধ করুন
          </button>

        </form>
      </div>

      {/* COLUMN 2 & 3: HISTORICAL FILTER LIST */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-col justify-between">
        
        <div>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">হিসাব ও ব্যয় খাতা (Expense Ledger)</h3>
              <p className="text-[11px] text-slate-400">ব্যয়ের শ্রেণীকরণ ও আর্থিক আউটফ্লো ট্র্যাক করুন</p>
            </div>

            {/* Quick Summary label */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl">
                মোট ব্যয়: <strong className="text-indigo-400 font-mono">৳{totalFilteredExpense.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* Interactive expense category fitler */}
          <div className="flex flex-wrap gap-2 my-4">
            {[
              { id: 'ALL', label: 'সব খরচ একসাথে' },
              { id: 'FIXED', label: 'স্থায়ী খরচ (Fixed)' },
              { id: 'VARIABLE', label: 'চলতি খরচ (Variable)' },
              { id: 'RENT', label: 'দোকান ভাড়া' },
              { id: 'ELECTRICITY', label: 'কারেন্ট বিল' },
              { id: 'OFFICE', label: 'অফিস / ক্যাটারিং' },
              { id: 'PRINT', label: 'কাগজ / পেপার' }
            ].map(cat => (
              <button
                key={cat.id}
                id={`btn-filter-expense-cat-${cat.id}`}
                onClick={() => setFilterCat(cat.id)}
                className={`py-1.5 px-3 rounded-xl text-xs font-medium border cursor-pointer transition ${
                  filterCat === cat.id
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500'
                    : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Ledger Record Table */}
          <div className="overflow-x-auto">
            <table id="tbl-expense-logs" className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">
                  <th className="py-2.5 px-2">খরচের বিষয়</th>
                  <th className="py-2.5 px-2">ব্যয় ধরন</th>
                  <th className="py-2.5 px-2">রিসিপ্ট মেমো ও কোড</th>
                  <th className="py-2.5 px-2">টাকা (৳)</th>
                  {isOwner && onDeleteExpense && <th className="py-2.5 px-2 text-right">কর্ম</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={isOwner ? 5 : 4} className="py-8 text-center text-xs text-slate-500 italic">
                      খুঁজে পাওয়া যায়নি! এই ক্যাটাগরিতে কোনো ব্যয়ের রেকর্ড নেই।
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(record => {
                    const meta = EXPENSE_METADATA[record.category];
                    return (
                      <tr key={record.id} className="text-xs text-slate-300 hover:bg-slate-850/30 transition">
                        {/* Expense title element */}
                        <td className="py-3 px-2">
                          <div className="flex items-center space-x-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${meta?.color || 'bg-slate-400'}`}></span>
                            <div>
                              <span className="font-semibold text-slate-200 block">{meta?.bangla || record.category}</span>
                              <span className="text-[9px] text-slate-500 font-mono leading-none">{record.date} • {record.time}</span>
                            </div>
                          </div>
                        </td>

                        {/* Fixed or Variable type */}
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                            meta?.isFixed 
                              ? 'bg-rose-950/40 text-rose-450 border border-rose-900/40' 
                              : 'bg-purple-950/40 text-purple-450 border border-purple-900/40'
                          }`}>
                            {meta?.isFixed ? 'স্থায়ী (Fixed)' : 'চলতি (Variable)'}
                          </span>
                        </td>

                        {/* Note & Issuer details */}
                        <td className="py-3 px-2">
                          <div>
                            <span className="text-slate-300 block max-w-[150px] truncate" title={record.note}>
                              {record.note}
                            </span>
                            <span className="text-[9px] text-slate-505 font-mono">কালেক্টর: {getDisplayName(record.enteredBy)}</span>
                          </div>
                        </td>

                        {/* Price output */}
                        <td className="py-3 px-2 font-mono font-bold text-slate-200 text-sm">
                          ৳{record.amount.toLocaleString()}
                        </td>

                        {/* Allowed Delete Actions */}
                        {isOwner && onDeleteExpense && (
                          <td className="py-3 px-2 text-right">
                            <button
                              id={`btn-delete-expense-${record.id}`}
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'খরচ মুছে ফেলার নিশ্চয়তা',
                                  message: `আপনি কি নিশ্চিত যে "${record.note || EXPENSE_METADATA[record.category].bangla}" বাবদ এই ৳${record.amount.toLocaleString()} টাকার ম্যাচিং খরচের রেকর্ডটি চিরতরে মুছে ফেলতে চান?`,
                                  onConfirm: () => {
                                    onDeleteExpense(record.id);
                                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                                  }
                                });
                              }}
                              className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-slate-950 transition cursor-pointer"
                              title="খরচ মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Informative Help Alert tip */}
        <div className="mt-5 p-3.5 bg-slate-950 rounded-2xl text-[10.5px] text-slate-500 flex items-start space-x-2">
          <HelpCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <p>স্থায়ী খরচের মধ্যে ঘর ভাড়া (দোকান ভাড়া) ও কর্মচারীদের বেতন মাস শেষে একবার এন্ট্রি করাই যথেষ্ট। চলতি খরচসমূহ (টোল, খাতা, যাতায়াত) প্রতিদিনের এন্ট্রি করতে উৎসাহিত করুন।</p>
        </div>

      </div>

    </div>

    {/* Custom Confirmation Modal Overlay */}
    {confirmDialog.isOpen && (
      <div id="custom-expense-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <div 
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm transition-opacity"
          onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        ></div>
        
        {/* Modal Container */}
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 mb-4 animate-pulse">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-bold text-white mb-2">
              {confirmDialog.title}
            </h3>
            
            <p className="text-slate-400 text-xs leading-relaxed mb-6 px-1">
              {confirmDialog.message}
            </p>
            
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                id="btn-expense-confirm-cancel"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                id="btn-expense-confirm-ok"
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-red-500/10 cursor-pointer"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

  </>
);
}
