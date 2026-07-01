/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, ExpenseRecord, ExpenseCategory } from '../types';
import { EXPENSE_METADATA } from '../data/mockData';
import { api } from '../api/client';
import { getTodayStr, formatBanglaDate } from '../utils/finance';
import { Layers, AlertTriangle, HelpCircle, Check, Trash2, Calendar, DollarSign, StickyNote, ImagePlus, X, Eye, Plus } from 'lucide-react';

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
  const isViewOnly = currentUser.role === 'OWNER_TWO';

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
            disabled={isViewOnly}
            title={isViewOnly ? "মালিকের অনুমতি প্রয়োজন" : undefined}
            className={`w-full py-2.5 text-center bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 transition ${isViewOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-600 active:scale-95 cursor-pointer"}`}
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
                              disabled={isViewOnly}
                              onClick={() => {
                                if (isViewOnly) return;
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
                              title={isViewOnly ? "মালিকের অনুমতি প্রয়োজন" : "খরচ মুছুন"}
                              className={`p-1 rounded-lg transition ${isViewOnly ? "text-slate-600 opacity-40 cursor-not-allowed" : "text-slate-500 hover:text-red-400 hover:bg-slate-950 cursor-pointer"}`}
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

    {/* MEMO SECTION */}
    <MemoPanel currentUser={currentUser} isOwner={isOwner} isViewOnly={isViewOnly} />

  </>
);
}

const BANGLA_MONTHS: Record<string, string> = {
  '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ',
  '04': 'এপ্রিল',   '05': 'মে',          '06': 'জুন',
  '07': 'জুলাই',    '08': 'আগস্ট',       '09': 'সেপ্টেম্বর',
  '10': 'অক্টোবর',  '11': 'নভেম্বর',     '12': 'ডিসেম্বর',
};

function getMonthLabel(ym: string) {
  const [year, month] = ym.split('-');
  return `${BANGLA_MONTHS[month] || month} ${year}`;
}

function MemoPanel({ currentUser, isOwner, isViewOnly }: { currentUser: User; isOwner: boolean; isViewOnly: boolean }) {
  interface MemoRecord {
    id: string; title: string; description: string;
    amount: number; image: string;
    enteredBy: string; date: string; time: string;
  }

  const [memos, setMemos] = useState<MemoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.memos.getAll()
      .then(data => {
        setMemos(data);
        // Auto-select current month if it has memos
        const currentYM = getTodayStr().substring(0, 7);
        if (data.some((m: MemoRecord) => m.date.startsWith(currentYM))) {
          setSelectedMonth(currentYM);
        }
      })
      .catch(err => console.error('Load memos error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Unique months sorted newest first
  const availableMonths: string[] = Array.from<string>(
    new Set(memos.map(m => m.date.substring(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  const filteredMemos = selectedMonth === 'ALL'
    ? memos
    : memos.filter(m => m.date.startsWith(selectedMonth));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const maxW = 800;
      const scale = img.width > maxW ? maxW / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setImagePreview(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = URL.createObjectURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const now = new Date();
    const date = getTodayStr();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    try {
      const created = await api.memos.create({
        title: title.trim(),
        description: description.trim(),
        amount: parseFloat(amount) || 0,
        image: imagePreview,
        enteredBy: currentUser.name,
        date, time,
      });
      setMemos(prev => [created, ...prev]);
      setTitle(''); setDescription(''); setAmount(''); setImagePreview('');
      setShowForm(false);
      setSelectedMonth(date.substring(0, 7));
      setSuccessMsg('মেমো সফলভাবে সংরক্ষণ করা হয়েছে!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Add memo error:', err);
    }
  };

  const handleDelete = async (memo: MemoRecord) => {
    if (!confirm(`"${memo.title}" মেমোটি মুছে ফেলতে চান?`)) return;
    try {
      await api.memos.delete(memo.id);
      setMemos(prev => prev.filter(m => m.id !== memo.id));
    } catch (err) {
      console.error('Delete memo error:', err);
    }
  };

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
            মেমো ও রিসিপ্ট বুক
          </span>
          <h3 className="text-base font-black text-white mt-1.5 flex items-center">
            <StickyNote className="w-4.5 h-4.5 text-amber-400 mr-2 shrink-0" />
            দোকান মেমো ও রিসিপ্ট সংরক্ষণ
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">যেকোনো গুরুত্বপূর্ণ মেমো, রিসিপ্ট বা ছবিসহ নোট এখানে সংরক্ষণ করুন।</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition flex items-center space-x-1.5 shrink-0"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showForm ? 'বন্ধ করুন' : 'নতুন মেমো যোগ করুন'}</span>
        </button>
      </div>

      {/* Month Filter */}
      {availableMonths.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            type="button"
            onClick={() => setSelectedMonth('ALL')}
            className={`py-1.5 px-3 rounded-xl text-xs font-medium border cursor-pointer transition flex items-center gap-1.5 ${
              selectedMonth === 'ALL'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/50'
                : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Calendar className="w-3 h-3" />
            সব মাস
            <span className="text-[9px] font-mono opacity-70">({memos.length})</span>
          </button>
          {availableMonths.map((ym: string) => {
            const count = memos.filter(m => m.date.startsWith(ym)).length;
            return (
              <button
                key={ym}
                type="button"
                onClick={() => setSelectedMonth(ym)}
                className={`py-1.5 px-3 rounded-xl text-xs font-medium border cursor-pointer transition flex items-center gap-1.5 ${
                  selectedMonth === ym
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/50'
                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {getMonthLabel(ym)}
                <span className="text-[9px] font-mono opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 bg-emerald-950/45 border border-emerald-800 text-emerald-300 p-3 rounded-2xl flex items-center space-x-2 text-xs">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-950/60 border border-slate-850 rounded-2xl p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold">মেমো শিরোনাম *</label>
              <input
                type="text" required value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: প্রিন্টার কার্টিজ ক্রয়"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold">খরচের পরিমাণ (ঐচ্ছিক)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500 font-bold text-xs">৳</span>
                <input
                  type="number" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 pl-7 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold">বিস্তারিত বিবরণ</label>
            <textarea
              rows={2} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="মেমোর বিস্তারিত বিবরণ লিখুন..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold">রিসিপ্ট / ছবি সংযুক্ত করুন</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-36 rounded-xl border border-slate-700 object-contain" />
                <button
                  type="button"
                  onClick={() => setImagePreview('')}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer text-xs hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition group"
              >
                <ImagePlus className="w-8 h-8 text-slate-600 group-hover:text-amber-400 transition" />
                <span className="text-[11px] text-slate-500 group-hover:text-slate-300 font-medium">ক্লিক করে ছবি নির্বাচন করুন</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500">ইনপুটদাতা: <strong className="text-slate-400">{currentUser.name}</strong> • {formatBanglaDate(getTodayStr())}</span>
            <button
              type="submit"
              disabled={isViewOnly}
              title={isViewOnly ? "মালিকের অনুমতি প্রয়োজন" : undefined}
              className={`px-6 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-1 ${isViewOnly ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-600 cursor-pointer"}`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>মেমো সংরক্ষণ করুন</span>
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filteredMemos.length === 0 ? (
        <div className="text-center py-12">
          <StickyNote className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          {memos.length === 0 ? (
            <>
              <p className="text-sm text-slate-500 font-medium">কোনো মেমো নেই</p>
              <p className="text-[11px] text-slate-600 mt-1">উপরের বাটনে ক্লিক করে প্রথম মেমো যোগ করুন</p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500 font-medium">{getMonthLabel(selectedMonth)} মাসে কোনো মেমো নেই</p>
              <button
                type="button"
                onClick={() => setSelectedMonth('ALL')}
                className="text-[11px] text-amber-400 hover:text-amber-300 mt-2 cursor-pointer transition"
              >
                সব মাসের মেমো দেখুন
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemos.map(memo => (
            <div key={memo.id} className="bg-slate-950/70 border border-slate-850 rounded-2xl overflow-hidden hover:border-slate-700 transition group">
              {memo.image && (
                <div
                  className="relative cursor-pointer"
                  onClick={() => setViewImage(memo.image)}
                >
                  <img src={memo.image} alt={memo.title} className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-white leading-snug">{memo.title}</h4>
                  {isOwner && (
                    <button
                      type="button"
                      disabled={isViewOnly}
                      onClick={() => !isViewOnly && handleDelete(memo)}
                      title={isViewOnly ? "মালিকের অনুমতি প্রয়োজন" : undefined}
                      className={`p-1 rounded transition shrink-0 ${isViewOnly ? "text-slate-700 opacity-40 cursor-not-allowed" : "text-slate-600 hover:text-red-400 cursor-pointer"}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {memo.description && (
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{memo.description}</p>
                )}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-850">
                  {memo.amount > 0 ? (
                    <span className="text-xs font-bold text-amber-400 font-mono">৳{memo.amount.toLocaleString()}</span>
                  ) : (
                    <span></span>
                  )}
                  <div className="text-[9px] text-slate-500 text-right">
                    <span className="block font-mono">{memo.date} • {memo.time}</span>
                    <span className="block">{memo.enteredBy}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setViewImage(null)}>
          <button
            type="button"
            onClick={() => setViewImage(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white cursor-pointer transition z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={viewImage} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
