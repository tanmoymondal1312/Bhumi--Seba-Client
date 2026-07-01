/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, BKashRecord, SystemSettings } from '../types';
import { getTodayStr } from '../utils/finance';
import { 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  PiggyBank, 
  Coins, 
  Sparkles, 
  Edit2, 
  Check, 
  X,
  PlusCircle,
  Download,
  Calendar,
  Activity,
  Printer,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

interface BKashManagerProps {
  bkashList: BKashRecord[];
  currentUser: User;
  onAddBKashRecord: (record: Omit<BKashRecord, 'id'>) => void;
  onDeleteBKashRecord?: (id: string) => void;
  onUpdateBKashRecord?: (record: BKashRecord) => void;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
}

export default function BKashManager({
  bkashList,
  currentUser,
  onAddBKashRecord,
  onDeleteBKashRecord,
  onUpdateBKashRecord,
  settings,
  onUpdateSettings
}: BKashManagerProps) {
  const isOwner = currentUser.role !== 'STAFF';
  const isViewOnly = currentUser.role === 'OWNER_TWO';

  // 1. FUND LOAD (CASH IN) FORM STATES
  const [loadAmount, setLoadAmount] = useState<string>('');
  const [loadNote, setLoadNote] = useState<string>('');

  // 2. EXPENSES FORM STATES (Direct Amount Input for each category)
  const [expenseNamjari, setExpenseNamjari] = useState<string>('');
  const [expenseDcr, setExpenseDcr] = useState<string>('');
  const [expenseKhajna, setExpenseKhajna] = useState<string>('');
  const [expenseRecord, setExpenseRecord] = useState<string>('');
  const [expensePorcha, setExpensePorcha] = useState<string>('');
  const [expenseOthers, setExpenseOthers] = useState<string>('');
  const [batchNote, setBatchNote] = useState<string>('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Status Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initial balance inline edit state
  const [isEditingInitialBalance, setIsEditingInitialBalance] = useState<boolean>(false);
  const [newInitialBalanceVal, setNewInitialBalanceVal] = useState<string>('');

  // Today's Spent override states
  const [isEditingTodaySpent, setIsEditingTodaySpent] = useState<boolean>(false);
  const [newTodaySpentVal, setNewTodaySpentVal] = useState<string>('');

  // Ledger item editing state
  const [editingRecord, setEditingRecord] = useState<BKashRecord | null>(null);
  const [editFormAmount, setEditFormAmount] = useState<string>('');
  const [editFormNote, setEditFormNote] = useState<string>('');
  const [editFormType, setEditFormType] = useState<'IN' | 'OUT' | 'PAYMENT'>('IN');
  const [editFormRefTrx, setEditFormRefTrx] = useState<string>('');
  const [editFormDate, setEditFormDate] = useState<string>('');
  const [editFormTime, setEditFormTime] = useState<string>('');

  // Dialogue Confirm Popups
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

  // Base starting balance
  const bkashBase = settings?.bkashBaseBalance ?? 12500;

  // Real-time metrics
  const metrics = useMemo(() => {
    const todayStr = getTodayStr();

    // Total Loadd/In (type IN)
    const totalIn = bkashList
      .filter(item => item.type === 'IN')
      .reduce((sum, item) => sum + item.amount, 0);

    // Cash out/withdrawn (type OUT) + associated fee
    const totalOut = bkashList
      .filter(item => item.type === 'OUT')
      .reduce((sum, item) => sum + item.amount + (item.fee || 0), 0);

    const todayActualSpent = bkashList
      .filter(item => item.date === todayStr && item.type === 'PAYMENT')
      .reduce((sum, i) => sum + i.amount, 0);

    const otherDaysPayment = bkashList
      .filter(item => item.date !== todayStr && item.type === 'PAYMENT')
      .reduce((sum, item) => sum + item.amount, 0);

    const hasOverride = settings?.bkashTodaySpentOverride !== undefined && settings?.bkashTodaySpentOverride !== null && settings?.bkashTodaySpentOverride >= 0;

    const todaySpent = hasOverride ? (settings.bkashTodaySpentOverride ?? 0) : todayActualSpent;

    const totalPayment = otherDaysPayment + todaySpent;

    const currentBalance = bkashBase + totalIn - totalPayment - totalOut;

    const todayLoad = bkashList
      .filter(item => item.date === todayStr && item.type === 'IN')
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      totalIn,
      totalPayment,
      totalOut,
      currentBalance,
      todayLoad,
      todaySpent,
      hasOverride
    };
  }, [bkashList, bkashBase, settings?.bkashTodaySpentOverride]);

  // Selected month and export simulation states for Bkash Reports
  const [selectedReportMonth, setSelectedReportMonth] = useState<string>(() => {
    return getTodayStr().substring(0, 7);
  });
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<'idle' | 'generating' | 'done'>('idle');

  const bkashMonthsList = useMemo(() => {
    const monthsSet = new Set<string>();
    bkashList.forEach(item => {
      if (item.date && item.date.length >= 7) {
        monthsSet.add(item.date.substring(0, 7));
      }
    });
    if (monthsSet.size === 0) {
      monthsSet.add(getTodayStr().substring(0, 7));
    }
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [bkashList]);

  const monthReportData = useMemo(() => {
    const monthItems = bkashList.filter(item => item.date.startsWith(selectedReportMonth));
    
    // Total Loaded (IN)
    const totalIn = monthItems
      .filter(item => item.type === 'IN')
      .reduce((sum, item) => sum + item.amount, 0);

    // Total Spent (PAYMENT)
    const totalPayment = monthItems
      .filter(item => item.type === 'PAYMENT')
      .reduce((sum, item) => sum + item.amount, 0);

    // Total Cash Out (OUT)
    const totalOut = monthItems
      .filter(item => item.type === 'OUT')
      .reduce((sum, item) => sum + item.amount + (item.fee || 0), 0);

    // Total transactions volume (total flow = IN + OUT + PAYMENT)
    const totalVolume = totalIn + totalPayment + totalOut;

    // Total Spent (PAYMENT + OUT + fee)
    const totalExpenses = totalPayment + totalOut;

    // Group expenses by date to show daily costs (24-hour cost for each day in that month)
    const dailyExpensesMap: Record<string, { payment: number; out: number; total: number; notes: string[] }> = {};
    monthItems.forEach(item => {
      if (item.type === 'PAYMENT' || item.type === 'OUT') {
        const dStr = item.date;
        if (!dailyExpensesMap[dStr]) {
          dailyExpensesMap[dStr] = { payment: 0, out: 0, total: 0, notes: [] };
        }
        const cost = item.amount + (item.fee || 0);
        if (item.type === 'PAYMENT') {
          dailyExpensesMap[dStr].payment += item.amount;
        } else {
          dailyExpensesMap[dStr].out += cost;
        }
        dailyExpensesMap[dStr].total += cost;
        if (item.note) {
          dailyExpensesMap[dStr].notes.push(`${item.time}-এ: ${item.note}`);
        }
      }
    });

    const dailyExpensesList = Object.entries(dailyExpensesMap).map(([date, data]) => {
      return {
        date,
        payment: data.payment,
        out: data.out,
        total: data.total,
        notes: data.notes
      };
    }).sort((a, b) => b.date.localeCompare(a.date));

    // Calculate current month's specific 24 hours expense (using getTodayStr())
    const todayStr = getTodayStr();
    const todayBkashItems = bkashList.filter(item => item.date === todayStr);
    const todayBkashExpense = todayBkashItems
      .filter(item => item.type === 'PAYMENT' || item.type === 'OUT')
      .reduce((sum, item) => sum + item.amount + (item.fee || 0), 0);

    // Dynamic label in Bangla for Month
    const [year, month] = selectedReportMonth.split('-');
    const monthNamesBg: Record<string, string> = {
      '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ',
      '04': 'এপ্রিল', '05': 'মে', '06': 'জুন',
      '07': 'জুলাই', '08': 'আগস্ট', '09': 'সেপ্টেম্বর',
      '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
    };
    const englishToBanglaDigits = (numStr: string): string => {
      const digits: Record<string, string> = {
        '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
        '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
      };
      return numStr.split('').map(char => digits[char] || char).join('');
    };
    const reportMonthBgLabel = `${monthNamesBg[month] || month} ${englishToBanglaDigits(year)}`;

    return {
      totalIn,
      totalPayment,
      totalOut,
      totalVolume,
      totalExpenses,
      dailyExpensesList,
      todayBkashExpense,
      reportMonthBgLabel
    };
  }, [bkashList, selectedReportMonth]);

  // Helper: generates random reference trx id
  const generateTrxId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = 'BK';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Safe parse to float
  const parseAmount = (val: string): number => {
    const p = parseFloat(val);
    return isNaN(p) || p < 0 ? 0 : p;
  };

  // Live total dynamic sum of custom categories input
  const liveExpenseSum = useMemo(() => {
    return parseAmount(expenseNamjari) +
           parseAmount(expenseDcr) +
           parseAmount(expenseKhajna) +
           parseAmount(expenseRecord) +
           parseAmount(expensePorcha) +
           parseAmount(expenseOthers);
  }, [expenseNamjari, expenseDcr, expenseKhajna, expenseRecord, expensePorcha, expenseOthers]);

  // Save base starting balance direct adjustment
  const handleSaveInitialBalance = () => {
    const targetVal = parseFloat(newInitialBalanceVal);
    if (isNaN(targetVal) || targetVal < 0) {
      alert('দয়া করে সঠিক সংখ্যা লিখুন।');
      return;
    }
    const requiredBase = targetVal - metrics.totalIn + metrics.totalPayment + metrics.totalOut;
    onUpdateSettings({ bkashBaseBalance: requiredBase });
    setIsEditingInitialBalance(false);
    triggerAlert('মূল ওয়ালেট ব্যালেন্স সফলভাবে আপডেট করা হয়েছে!');
  };

  // Save today's spent override
  const handleSaveTodaySpent = () => {
    const targetVal = parseFloat(newTodaySpentVal);
    if (isNaN(targetVal) || targetVal < 0) {
      alert('দয়া করে সঠিক সংখ্যা লিখুন।');
      return;
    }
    onUpdateSettings({ bkashTodaySpentOverride: targetVal });
    setIsEditingTodaySpent(false);
    triggerAlert('আজকের মোট সরকারি খরচ সফলভাবে আপডেট করা হয়েছে!');
  };

  // Handle saving Cash Loading Entry
  const handleAddLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseAmount(loadAmount);
    if (amt <= 0) {
      alert('দয়া করে সঠিক লোড অ্যামাউন্ট দিন।');
      return;
    }

    const now = new Date();
    const dateFormatted = getTodayStr(); // Align with baseline data dynamically
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    onAddBKashRecord({
      date: dateFormatted,
      time: timeFormatted,
      type: 'IN',
      amount: amt,
      enteredBy: currentUser.name,
      note: loadNote.trim() || `বিকাশ ফান্ড ক্যাশ-ইন রিচার্জ (৳${amt})`,
      refTrx: generateTrxId(),
      fee: 0
    });

    setLoadAmount('');
    setLoadNote('');
    triggerAlert('বিকাশে সফলভাবে টাকা ঢুকানো সেট হয়েছে!');
  };

  // Handle saving Batch Daily Expense Categories in One Click
  const handleAddBatchExpenses = (e: React.FormEvent) => {
    e.preventDefault();
    if (liveExpenseSum <= 0) {
      alert('দয়া করে অন্তত একটি খরচের অ্যামাউন্ট দিন।');
      return;
    }

    const now = new Date();
    const dateFormatted = getTodayStr(); // Maintain compatibility dynamically
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Prepare clear breakdown list for details segment
    const lines: string[] = [];
    if (parseAmount(expenseNamjari) > 0) lines.push(`নামজারি ফি ৳${expenseNamjari}`);
    if (parseAmount(expenseDcr) > 0) lines.push(`ডিসিআর ফি ৳${expenseDcr}`);
    if (parseAmount(expenseKhajna) > 0) lines.push(`খাজনা ফি ৳${expenseKhajna}`);
    if (parseAmount(expenseRecord) > 0) lines.push(`রেকর্ড ফি ৳${expenseRecord}`);
    if (parseAmount(expensePorcha) > 0) lines.push(`মাঠ পর্চা ফি ৳${expensePorcha}`);
    if (parseAmount(expenseOthers) > 0) lines.push(`অন্যান্য ৳${expenseOthers}`);

    const compiledNote = batchNote.trim() 
      ? `${batchNote.trim()} (${lines.join(' + ')})`
      : `সারাদিনের পেমেন্ট: ${lines.join(' + ')}`;

    onAddBKashRecord({
      date: dateFormatted,
      time: timeFormatted,
      type: 'PAYMENT',
      amount: liveExpenseSum,
      enteredBy: currentUser.name,
      note: compiledNote,
      refTrx: generateTrxId(),
      fee: 0
    });

    // Reset inputs
    setExpenseNamjari('');
    setExpenseDcr('');
    setExpenseKhajna('');
    setExpenseRecord('');
    setExpensePorcha('');
    setExpenseOthers('');
    setBatchNote('');

    triggerAlert('সবগুলো সরকারি খরচ একসাথে সফলভাবে সংরক্ষণ করা হয়েছে!');
  };

  // Delete wrapper
  const triggerDelete = (id: string) => {
    if (!onDeleteBKashRecord) return;
    setConfirmDialog({
      isOpen: true,
      title: 'লেনদেন বাতিল করার নিশ্চয়তা',
      message: 'আপনি কি নিশ্চিতভাবে এই বিকাশ ট্রানজেকশনটি পুরোপুরি মুছে ফেলতে চান? এটি পুনরায় ফিরিয়ে আনা সম্ভব নয়।',
      onConfirm: () => {
        onDeleteBKashRecord(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        triggerAlert('লেনদেনটি সফলভাবে মুছে ফেলা হয়েছে।');
      }
    });
  };

  // Edit triggers
  const triggerEdit = (record: BKashRecord) => {
    setEditingRecord(record);
    setEditFormAmount(record.amount.toString());
    setEditFormNote(record.note);
    setEditFormType(record.type);
    setEditFormRefTrx(record.refTrx || '');
    setEditFormDate(record.date);
    setEditFormTime(record.time);
  };

  // Handle saving the individual record edits
  const handleSaveEditForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !onUpdateBKashRecord) return;

    const amt = parseFloat(editFormAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('সঠিক অ্যামাউন্ট লিখুন।');
      return;
    }

    onUpdateBKashRecord({
      ...editingRecord,
      type: editFormType,
      amount: amt,
      note: editFormNote.trim() || 'আপডেট করা নোট',
      refTrx: editFormRefTrx.trim() || undefined,
      date: editFormDate,
      time: editFormTime
    });

    setEditingRecord(null);
    triggerAlert('লেনদেনের তথ্য সফলভাবে পরিবর্তন করা হলো!');
  };

  // Quick alert popup
  const triggerAlert = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3500);
  };

  // Search filter implementation
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bkashList;
    return bkashList.filter(item => 
      item.note.toLowerCase().includes(q) ||
      (item.refTrx && item.refTrx.toLowerCase().includes(q)) ||
      item.amount.toString().includes(q) ||
      item.enteredBy.toLowerCase().includes(q)
    );
  }, [bkashList, searchQuery]);

  // Handle bKash Report Download
  const handleExportBkashReport = () => {
    if (!isOwner) {
      alert("দুঃখিত! এই আর্থিক রিপোর্ট ডাউনলোড করার অনুমতি শুধুমাত্র দোকানের মালিকের রয়েছে।");
      return;
    }
    setExportModalOpen(true);
    setExportProgress('generating');
    setTimeout(() => {
      setExportProgress('done');
    }, 1500);
  };

  return (
    <>
      <div id="bkash-finance-tab" className="space-y-6">
        
        {/* Success alert banner */}
        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl flex items-center space-x-3 text-xs md:text-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* 1. TOP SIMPLIFIED HIGH-IMPACT METRIC DISPLAY PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Main live vault balance display */}
          <div className="bg-gradient-to-tr from-pink-900 via-pink-950 to-slate-900 border border-pink-700/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute right-0 top-0 w-36 h-36 bg-pink-500/10 rounded-full blur-2xl"></div>
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="inline-flex items-center justify-center p-3 bg-pink-500 rounded-2xl shadow-lg shadow-pink-500/20 text-white">
                  <CreditCard className="w-6 h-6 animate-pulse" />
                </div>
                {!isEditingInitialBalance && !isViewOnly && (
                  <button
                    onClick={() => {
                      setNewInitialBalanceVal(metrics.currentBalance.toString());
                      setIsEditingInitialBalance(true);
                    }}
                    className="px-3 py-1.5 text-pink-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="প্রারম্ভিক বা বর্তমান ব্যালেন্স সংশোধন"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>ব্যালেন্স সংশোধন</span>
                  </button>
                )}
              </div>

              <p className="text-pink-300 text-xs font-semibold uppercase tracking-wider">বিকাশে বর্তমানে অবশিষ্ট টাকা (Live Balance)</p>
              
              {isEditingInitialBalance ? (
                <div className="mt-2.5 space-y-2 max-w-xs">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-pink-400 font-bold font-mono">৳</span>
                    <input
                      type="number"
                      value={newInitialBalanceVal}
                      onChange={(e) => setNewInitialBalanceVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveInitialBalance();
                        if (e.key === 'Escape') setIsEditingInitialBalance(false);
                      }}
                      className="w-full bg-slate-950 border border-pink-500 rounded-xl pl-6 pr-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-pink-500 font-bold"
                      placeholder="সঠিক ব্যালেন্স লিখুন"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingInitialBalance(false)}
                      className="px-2.5 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg hover:text-white transition"
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInitialBalance}
                      className="px-3 py-1 bg-pink-600 text-white text-[10px] font-bold rounded-lg hover:bg-pink-500 transition flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>সেভ করুন</span>
                    </button>
                  </div>
                </div>
              ) : (
                <h2 className="text-4xl font-extrabold font-mono text-white mt-2 drop-shadow-sm">৳{metrics.currentBalance.toLocaleString('bn-BD')}</h2>
              )}
            </div>
            
            <p className="text-[11px] text-pink-400/80 mt-5 leading-normal">
              * সারাদিনের লেনদেন রিয়েল-টাইমে হিসাব করার পর এখন ওয়ালেটে এই পরিমাণ টাকা আছে।
            </p>
          </div>

          {/* Today's Spent Stat (Govt Paid) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-rose-500/20 transition duration-300">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 bg-rose-500/15 border border-rose-500/20 rounded-2xl text-rose-450 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-rose-450" />
                </div>
                {!isEditingTodaySpent && !isViewOnly ? (
                  <div className="flex gap-2">
                    {metrics.hasOverride && (
                      <button
                        onClick={() => {
                          onUpdateSettings({ bkashTodaySpentOverride: undefined });
                          triggerAlert('খরচের সংখ্যা অটোমেটিক হিসাবে পরিবর্তন করা হয়েছে!');
                        }}
                        className="px-2.5 py-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="অটোমেটিক লেনদেন হিসাব সেট করুন"
                      >
                        <X className="w-3 h-3 text-red-400" />
                        <span>অটো হিসাব</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setNewTodaySpentVal(metrics.todaySpent.toString());
                        setIsEditingTodaySpent(true);
                      }}
                      className="px-3 py-1.5 text-rose-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="আজকের মোট খরচ সংশোধন বা নতুন করে বসান"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>খরচ একসাথে এন্ট্রি</span>
                    </button>
                  </div>
                ) : null}
              </div>

              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                আজকের মোট সরকারি খরচ (Govt Paid)
                {metrics.hasOverride && <span className="text-[10px] text-amber-500 font-bold ml-2 bg-amber-500/10 px-1.5 py-0.5 rounded-lg">আলাদা বসানো</span>}
              </p>
              
              {isEditingTodaySpent ? (
                <div className="mt-2.5 space-y-2 max-w-xs animate-in zoom-in-95 duration-150">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-rose-450 font-bold font-mono">৳</span>
                    <input
                      type="number"
                      value={newTodaySpentVal}
                      onChange={(e) => setNewTodaySpentVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTodaySpent();
                        if (e.key === 'Escape') setIsEditingTodaySpent(false);
                      }}
                      className="w-full bg-slate-950 border border-rose-500/60 rounded-xl pl-6 pr-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-rose-500 font-bold"
                      placeholder="আজকের মোট খরচ লিখুন"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingTodaySpent(false)}
                      className="px-2.5 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg hover:text-white transition"
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTodaySpent}
                      className="px-3 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-500 transition flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>সেভ করুন</span>
                    </button>
                  </div>
                </div>
              ) : (
                <h2 className="text-3xl font-extrabold font-mono text-rose-450 mt-2">৳{metrics.todaySpent.toLocaleString()}</h2>
              )}
            </div>
            
            <p className="text-[11px] text-slate-500 mt-5 leading-normal">
              {metrics.hasOverride 
                ? "* আজকের সব পেমেন্ট/খরচ এই নির্দিষ্ট সংখ্যায় লক করা আছে। নিচে নতুন খরচ যোগ হলেও এটি আর বাড়বে না।" 
                : "* পোর্টাল পেমেন্ট হিসেবে আজকে মোট খরচ হওয়া টাকা (অটোমেটিক হিসাবকৃত)।"
              }
            </p>
          </div>

        </div>

        {/* 2. CORE DUAL-ENTRY FORMS PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* BLOCK 1: ADD LOAD (LOAD MONEY INTO BKASH) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <PiggyBank className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white font-sans">১. বিকাশ টাকা ঢুকানো (লোড করুন)</h3>
                <p className="text-[10px] text-slate-400">বিকাশের নতুন জমা বা ক্যাশ-ইন এন্ট্রি করুন</p>
              </div>
            </div>

            <form onSubmit={handleAddLoad} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-1.5">লোড টাকার পরিমাণ (Amount in ৳) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 ml-0.5 text-slate-500 font-bold select-none text-xs">৳</span>
                  <input
                    type="number"
                    required
                    value={loadAmount}
                    onChange={(e) => setLoadAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 pl-8 text-white font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-pink-500/50"
                    placeholder="উদা: ১০০০০"
                  />
                </div>
              </div>

              {/* Quick suggestion shortcuts */}
              <div>
                <label className="block text-slate-500 text-[10px] font-bold mb-1">কুইক এন্ট্রি বাটন সমূহ:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[5000, 8000, 10000, 12000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setLoadAmount(val.toString())}
                      className="py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 rounded-lg text-xs font-mono transition cursor-pointer"
                    >
                      ৳{val.toLocaleString('bn-BD')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">যেকোনো সংক্ষিপ্ত নোট (Memo / Note - ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={loadNote}
                  onChange={(e) => setLoadNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-white text-xs focus:outline-none focus:ring-1 focus:ring-pink-500/50"
                  placeholder="যেমন: মোঃ রনি ক্যাশ রিসিভ"
                />
              </div>

              <button
                type="submit"
                disabled={isViewOnly}
                title={isViewOnly ? "মালিকের অনুমতি প্রয়োজন" : undefined}
                className={`w-full py-2.5 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/15 transition flex items-center justify-center space-x-1 ${isViewOnly ? "bg-emerald-600 opacity-50 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] cursor-pointer"}`}
              >
                <Check className="w-4 h-4" />
                <span>বিকাশ ব্যালেন্স লোড করুন</span>
              </button>
            </form>
          </div>

          {/* BLOCK 2: BATCH EXPENSES TOGETHER */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-pink-500/10 text-pink-400 rounded-xl">
                  <Coins className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-sans">২. সারাদিনের বিভিন্ন খরচ একসাথে এন্ট্রি</h3>
                  <p className="text-[10px] text-slate-400 text-left">সারাদিনে যা খরচ হল তা সরাসরি অ্যামাউন্ট লিখে সেভ দিন</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setExpenseNamjari('');
                  setExpenseDcr('');
                  setExpenseKhajna('');
                  setExpenseRecord('');
                  setExpensePorcha('');
                  setExpenseOthers('');
                }}
                className="text-[10px] text-red-400 font-bold hover:underline"
              >
                সব মুছুন
              </button>
            </div>

            <form onSubmit={handleAddBatchExpenses} className="space-y-4 font-sans">
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                
                {/* 1. Namjari Fee */}
                <div className="bg-slate-950/40 p-2.5 border border-slate-850 rounded-2xl flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">নামজারি আবেদন ফি</span>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-bold font-mono">৳</span>
                    <input
                      type="number"
                      value={expenseNamjari}
                      onChange={(e) => setExpenseNamjari(e.target.value)}
                      className="w-full text-right bg-slate-950/80 border border-slate-800 rounded-lg py-1 px-2.5 pr-2.5 text-white font-mono text-xs focus:outline-none focus:border-pink-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 2. DCR Fee */}
                <div className="bg-slate-950/40 p-2.5 border border-slate-850 rounded-2xl flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">ডিসিআর ফি</span>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-bold font-mono">৳</span>
                    <input
                      type="number"
                      value={expenseDcr}
                      onChange={(e) => setExpenseDcr(e.target.value)}
                      className="w-full text-right bg-slate-950/80 border border-slate-800 rounded-lg py-1 px-2.5 pr-2.5 text-white font-mono text-xs focus:outline-none focus:border-pink-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 3. Khajna Fee */}
                <div className="bg-slate-950/40 p-2.5 border border-slate-850 rounded-2xl flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">খাজনা ফি (Land Tax)</span>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-bold font-mono">৳</span>
                    <input
                      type="number"
                      value={expenseKhajna}
                      onChange={(e) => setExpenseKhajna(e.target.value)}
                      className="w-full text-right bg-slate-950/80 border border-slate-800 rounded-lg py-1 px-2.5 pr-2.5 text-white font-mono text-xs focus:outline-none focus:border-pink-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 4. Record extraction Fee */}
                <div className="bg-slate-950/40 p-2.5 border border-slate-850 rounded-2xl flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">রেকর্ড উত্তোলন ফি</span>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-bold font-mono">৳</span>
                    <input
                      type="number"
                      value={expenseRecord}
                      onChange={(e) => setExpenseRecord(e.target.value)}
                      className="w-full text-right bg-slate-950/80 border border-slate-800 rounded-lg py-1 px-2.5 pr-2.5 text-white font-mono text-xs focus:outline-none focus:border-pink-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 5. Field Porcha copy Fee */}
                <div className="bg-slate-950/40 p-2.5 border border-slate-850 rounded-2xl flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">মাঠ পর্চা ফি</span>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-bold font-mono">৳</span>
                    <input
                      type="number"
                      value={expensePorcha}
                      onChange={(e) => setExpensePorcha(e.target.value)}
                      className="w-full text-right bg-slate-950/80 border border-slate-800 rounded-lg py-1 px-2.5 pr-2.5 text-white font-mono text-xs focus:outline-none focus:border-pink-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 6. Other Misc Fees */}
                <div className="bg-slate-950/40 p-2.5 border border-slate-850 rounded-2xl flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-300 block mb-1">অন্যান্য সব পেমেন্ট</span>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500 font-bold font-mono">৳</span>
                    <input
                      type="number"
                      value={expenseOthers}
                      onChange={(e) => setExpenseOthers(e.target.value)}
                      className="w-full text-right bg-slate-950/80 border border-slate-800 rounded-lg py-1 px-2.5 pr-2.5 text-white font-mono text-xs focus:outline-none focus:border-pink-500"
                      placeholder="0"
                    />
                  </div>
                </div>

              </div>

              {/* Memo line details */}
              <div>
                <input
                  type="text"
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  placeholder="যেকোনো কাস্টম নোট (যেমন: রফিক ভাইয়ের কাজের পেমেন্ট - ঐচ্ছিক)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Real-time sum count layout */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 bg-slate-955 border border-slate-850 rounded-2xl gap-3">
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="font-semibold">একসাথে মোট পেমেন্ট বা খরচের সমষ্টি:</span>
                  <span className="text-pink-400 font-extrabold font-mono text-[13px]">৳{liveExpenseSum.toLocaleString()}</span>
                </div>

                <div className="text-[10px] text-slate-400 font-serif">
                  * সেভ দিলে দিনশেষে অবশিষ্ট বিকাশ ব্যালেন্স অটোমেটিক কমে যাবে
                </div>
              </div>

              <button
                type="submit"
                disabled={isViewOnly}
                title={isViewOnly ? "মালিকের অনুমতি প্রয়োজন" : undefined}
                className={`w-full py-2.5 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-650/15 transition flex items-center justify-center space-x-1 ${isViewOnly ? "bg-pink-650 opacity-50 cursor-not-allowed" : "bg-pink-650 hover:bg-pink-600 active:scale-[0.98] cursor-pointer"}`}
              >
                <Check className="w-4 h-4" />
                <span>সব খরচ একসাথে সেভ করুন</span>
              </button>

            </form>
          </div>

        </div>

        {/* bKASH FINANCE REPORT & DOWNLOAD SECTION (Requested by User) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2 text-pink-400 font-bold text-xs uppercase tracking-widest font-mono mb-1">
                <Activity className="w-5 h-5 text-pink-400" />
                <span>বিকাশ ফাইনান্স রিপোর্ট হাব (bKash Financial Reports)</span>
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
                <Calendar className="w-5.5 h-5.5 text-pink-400" />
                মাসিক বিকাশ লেনদেন বিবরণী ও দৈনিক ২৪ ঘণ্টার ব্যয় খতিয়ান
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">সব লেনদেন মাস অনুযায়ী অনুসন্ধান এবং রিপোর্ট ডাউনলোড করার সুবিধা</p>
            </div>

            {/* Month selector UI */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-semibold">মাস নির্বাচন করুন:</span>
              <select
                id="bkash-report-month-select"
                value={selectedReportMonth}
                onChange={(e) => setSelectedReportMonth(e.target.value)}
                className="bg-slate-955 border border-slate-750/80 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-100 font-mono focus:outline-none focus:border-pink-500 transition cursor-pointer"
              >
                {bkashMonthsList.map(m => {
                  const [year, mNum] = m.split('-');
                  const monthNamesBg: Record<string, string> = {
                    '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ',
                    '04': 'এপ্রিল', '05': 'মে', '06': 'জুন',
                    '07': 'জুলাই', '08': 'আগস্ট', '09': 'সেপ্টেম্বর',
                    '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
                  };
                  const englishToBanglaDigits = (numStr: string): string => {
                    const digits: Record<string, string> = {
                      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
                      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
                    };
                    return numStr.split('').map(char => digits[char] || char).join('');
                  };
                  const label = mNum ? `${monthNamesBg[mNum] || mNum} ${englishToBanglaDigits(year)}` : m;
                  return (
                    <option key={m} value={m}>
                      {label} ({m})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Bento Grid Stats of Selected Month */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Total Transacted Volume */}
            <div className="bg-slate-950/65 border border-pink-500/10 p-5 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-pink-400 uppercase font-black tracking-wider block">মোট লেনদেন (Total Transacted)</span>
                <p className="text-2xl font-black font-sans text-pink-400">৳{monthReportData.totalVolume.toLocaleString('bn-BD')}</p>
                <span className="text-[10px] text-slate-500 block">ক্যাশ-ইন ও খরচের সম্মিলিত ভলিউম</span>
              </div>
              <div className="p-3.5 bg-pink-500/10 rounded-xl text-pink-400 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>

            {/* Total loaded */}
            <div className="bg-slate-950/65 border border-emerald-500/10 p-5 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase font-black tracking-wider block">মোট জমানো / ক্যাশ-ইন (Total In)</span>
                <p className="text-2xl font-black font-sans text-emerald-400">৳{monthReportData.totalIn.toLocaleString('bn-BD')}</p>
                <span className="text-[10px] text-slate-500 block">এই মাসে বিকাশ ফান্ড লোডের পরিমাণ</span>
              </div>
              <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

            {/* Total spent */}
            <div className="bg-slate-950/65 border border-rose-500/10 p-5 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-rose-400 uppercase font-black tracking-wider block">মোট খরচ / পেমেন্ট (Total Spent)</span>
                <p className="text-2xl font-black font-sans text-rose-450">৳{monthReportData.totalExpenses.toLocaleString('bn-BD')}</p>
                <span className="text-[10px] text-slate-500 block">সরকারি ও অন্যান্য বিকাশ খরচ কর্তন</span>
              </div>
              <div className="p-3.5 bg-rose-500/10 rounded-xl text-rose-455 shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Today's 24 hours expense box and download action in one line */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center p-4 bg-slate-955 border border-slate-850 rounded-2xl gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-rose-500/10 text-rose-450 rounded-xl shrink-0">
                <Activity className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className="text-slate-400 text-xs font-semibold block">আজকের ২৪ ঘণ্টার মোট বিকাশ খরচ (Govt & Misc Expenses)</span>
                <p className="text-lg font-black text-rose-450 mt-0.5">৳{monthReportData.todayBkashExpense.toLocaleString('bn-BD')}</p>
              </div>
            </div>

            {isOwner ? (
              <button
                id="btn-bkash-report-download"
                onClick={handleExportBkashReport}
                className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-600/15 transition cursor-pointer flex items-center justify-center space-x-2 shrink-0 self-start lg:self-center"
              >
                <Download className="w-4 h-4" />
                <span>{monthReportData.reportMonthBgLabel} রিপোর্টের PDF/Excel ডাউনলোড</span>
              </button>
            ) : (
              <button
                id="btn-bkash-report-download-disabled"
                disabled
                className="px-5 py-2.5 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl border border-slate-750/80 flex items-center justify-center space-x-2 shrink-0 self-start lg:self-center cursor-not-allowed"
                title="কর্মচারীদের জন্য ডাউনলোড নিষ্ক্রিয়"
              >
                <span>🔒 কর্মচারীর জন্য ডাউনলোড লক করা</span>
              </button>
            )}
          </div>

          {/* Daily 24 Hours Cost Breakdown Table / List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <span className="w-1.5 h-3 bg-pink-500 rounded"></span>
              {monthReportData.reportMonthBgLabel} মাসের দিনভিত্তিক ২৪ ঘণ্টার খরচ খতিয়ান ও কাজের মেমো
            </h4>

            {monthReportData.dailyExpensesList.length === 0 ? (
              <div className="text-center py-6 bg-slate-950/40 rounded-2xl border border-slate-850 text-xs text-slate-500 italic">
                এই মাসে এখনো পর্যন্ত কোনো সরকারি বা ক্যাশ-আউট খরচ করা হয়নি।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
                {monthReportData.dailyExpensesList.map((day, index) => (
                  <div key={day.date} className="bg-slate-950/50 border border-slate-850 hover:border-slate-800 p-4 rounded-2xl transition flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-900 mb-2">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {day.date}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">#দিন-{monthReportData.dailyExpensesList.length - index}</span>
                      </div>

                      <div className="space-y-1.5 my-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-450">সরকারি ফি (PAYMENT)</span>
                          <span className="font-mono text-slate-300">৳{day.payment.toLocaleString('bn-BD')}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-450">ক্যাশ আউট ও অন্যান্য</span>
                          <span className="font-mono text-slate-300">৳{day.out.toLocaleString('bn-BD')}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-slate-900/60 text-rose-450 font-sans">
                          <span>২৪ ঘণ্টার মোট খরচ</span>
                          <span className="font-mono">৳{day.total.toLocaleString('bn-BD')}</span>
                        </div>
                      </div>
                    </div>

                    {day.notes.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-900/80">
                        <span className="text-[9px] uppercase font-black text-slate-550 block mb-1">কাজের বিবরণ বা মেমো:</span>
                        <ul className="text-[10.5px] text-slate-400 space-y-1 leading-normal list-disc pl-3">
                          {day.notes.map((note, nIdx) => (
                            <li key={nIdx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. TRANSACTION AUDIT LOG BOOK TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white font-sans">বিকাশ ফিন্যান্সিয়াল খাতা (Ledger Logs)</h3>
              <p className="text-xs text-slate-450">টাকা ঢুকানো (IN) ও সব খরচ (PAYMENT) এর সম্পূর্ণ দৈনিক তালিকা</p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-white text-xs focus:outline-none focus:border-pink-500"
                placeholder="সার্চ ট্রানজেকশন বা মেমো..."
              />
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">
                  <th className="py-3 px-3">লেনদেনের ধরণ</th>
                  <th className="py-3 px-3">লেনদেন আইডি / অপারেটর</th>
                  <th className="py-3 px-3">মেমো বা কাজের বিবরণ</th>
                  <th className="py-3 px-3 text-right">টাকা (৳)</th>
                  <th className="py-3 px-3 text-right">কর্ম (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 mb-4">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-500 italic font-sans animate-pulse">
                      বিকাশ লেজারে কোনো লেনদেন খুঁজে পাওয়া যায়নি!
                    </td>
                  </tr>
                ) : (
                  filteredList.map(record => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-slate-850/30 transition text-xs text-slate-300"
                    >
                      <td className="py-3.5 px-3">
                        {record.type === 'IN' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                            <ArrowDownLeft className="w-2.5 h-2.5 mr-0.5" />
                            টাকা ঢুকানো (IN)
                          </span>
                        ) : record.type === 'PAYMENT' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-pink-500/10 text-pink-450 border border-pink-500/15">
                            <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                            সরকারি ফি (Expense)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-505/10 text-indigo-300 border border-indigo-500/15">
                            <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                            ক্যাশ আউট (OUT)
                          </span>
                        )}
                      </td>
                      
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-slate-200">{record.refTrx || 'N/A'}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{record.date} • {record.time} • {record.enteredBy}</div>
                      </td>

                      <td className="py-3.5 px-3 max-w-sm">
                        <div className="text-slate-200 line-clamp-2 leading-relaxed">{record.note}</div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold">
                        <span className={record.type === 'IN' ? 'text-emerald-400 font-bold' : 'text-rose-450 font-bold'}>
                          {record.type === 'IN' ? '+' : '-'}৳{record.amount.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => !isViewOnly && triggerEdit(record)}
                            disabled={isViewOnly}
                            title={isViewOnly ? "মালিকের অনুমতি প্রয়োজন" : "সম্পাদনা বা পরিবর্তন"}
                            className={`bg-slate-950/40 p-1.5 rounded-lg border border-slate-850 transition ${isViewOnly ? "text-slate-600 opacity-40 cursor-not-allowed" : "text-slate-400 hover:text-pink-400 cursor-pointer"}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => !isViewOnly && triggerDelete(record.id)}
                            disabled={isViewOnly}
                            title={isViewOnly ? "মালিকের অনুমতি প্রয়োজন" : "লেনদেনটি মুছে ফেলুন"}
                            className={`bg-slate-950/40 p-1.5 rounded-lg border border-slate-850 transition ${isViewOnly ? "text-slate-600 opacity-40 cursor-not-allowed" : "text-slate-400 hover:text-red-400 cursor-pointer"}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* INDIVIDUAL RECORD EDIT MODAL POPUP */}
      {editingRecord && (
        <div id="edit-bkash-record-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setEditingRecord(null)}
          ></div>
          
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full mx-auto shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-sans uppercase tracking-wider">
                <span className="px-2 py-0.5 bg-pink-500 rounded text-white text-[9px]">bKash</span>
                <span>লেনদেন এডিট বা পরিবর্তন বুক</span>
              </h3>
              <button 
                onClick={() => setEditingRecord(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-450 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditForm} className="space-y-4">
              
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">লেনদেনের ধরণ (Type)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditFormType('IN')}
                    className={`py-1.5 text-xs font-bold rounded-xl transition ${
                      editFormType === 'IN' 
                        ? 'bg-emerald-500/10 border border-emerald-500 text-emerald-400 font-bold' 
                        : 'bg-slate-950/50 border border-slate-800 text-slate-450 hover:text-white'
                    }`}
                  >
                    লোড বা প্রাপ্তি (IN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormType('PAYMENT')}
                    className={`py-1.5 text-xs font-bold rounded-xl transition ${
                      editFormType === 'PAYMENT' 
                        ? 'bg-pink-550/10 border border-pink-500 text-pink-400 font-bold' 
                        : 'bg-slate-950/50 border border-slate-800 text-slate-450 hover:text-white'
                    }`}
                  >
                    সরকারি বা অন্যান্য খরচ
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">টাকার পরিমাণ (৳) *</label>
                  <input
                    type="number"
                    required
                    value={editFormAmount}
                    onChange={(e) => setEditFormAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ট্রানজেকশন ID reference</label>
                  <input
                    type="text"
                    value={editFormRefTrx}
                    onChange={(e) => setEditFormRefTrx(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-pink-500"
                    placeholder="E.g. BLD78129"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">মেমো বা কাজের বিবরণী *</label>
                <textarea
                  required
                  rows={2}
                  value={editFormNote}
                  onChange={(e) => setEditFormNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">তারিখ (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={editFormDate}
                    onChange={(e) => setEditFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">সময় (Time)</label>
                  <input
                    type="text"
                    required
                    value={editFormTime}
                    onChange={(e) => setEditFormTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-pink-600/10 cursor-pointer"
                >
                  পরিবর্তন সেভ করুন
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG POPUP */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2 font-sans">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-400 leading-normal mb-5">{confirmDialog.message}</p>
            
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="py-1.5 px-3 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-705"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="py-1.5 px-4 bg-red-650 text-white text-xs font-bold rounded-xl hover:bg-red-500 shadow-lg shadow-red-500/15"
              >
                হ্যাঁ, নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED bKASH EXPORT MODAL DISPLAY */}
      {exportModalOpen && (
        <div id="bkash-export-popup" className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl max-w-lg w-full relative animate-in fade-in zoom-in duration-200 text-white">
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3.5 bg-pink-500/10 rounded-2xl text-pink-400 mb-3">
                {exportProgress === 'done' ? (
                  <CheckCircle2 className="w-8 h-8 text-pink-400 animate-bounce" />
                ) : (
                  <RefreshCw className="w-8 h-8 animate-spin text-pink-400" />
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-100 font-sans">
                {exportProgress === 'done' ? 'বিকাশ রিপোর্ট প্রস্তুত!' : 'রিপোর্ট ফাইল জেনারেট হচ্ছে...'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{monthReportData.reportMonthBgLabel} মাসের বিকাশ ফিন্যান্সিয়াল অডিট রিপোর্ট</p>
            </div>

            {/* Generated bKash Report Preview */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl text-left text-xs mb-5 font-mono select-all max-h-[250px] overflow-y-auto">
              <div className="text-center border-b border-slate-850 pb-2 mb-3">
                <div className="font-bold text-slate-300">ভূমি সেবা সহায়তা কেন্দ্র • বিকাশ ফিন্যান্স</div>
                <div className="text-[9px] text-slate-500">মাসিক ক্যাশ-ইন ও দৈনিক ২৪ ঘণ্টার ব্যয় বিবরণী</div>
              </div>
              
              <div className="space-y-1.5 text-slate-350 text-[10.5px]">
                <div className="flex justify-between">
                  <span>রিপোর্ট পিরিয়ড:</span> <span className="text-slate-100 font-bold">{monthReportData.reportMonthBgLabel} ({selectedReportMonth})</span>
                </div>
                <div className="flex justify-between">
                  <span>মোট ক্যাশ-ইন (IN):</span> <span className="text-emerald-400 font-bold">৳{monthReportData.totalIn.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>মোট খরচ (Spent):</span> <span className="text-rose-450 font-bold">৳{monthReportData.totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-1">
                  <span>মোট লেনদেন ভলিউম:</span> <span className="text-pink-400 font-bold">৳{monthReportData.totalVolume.toLocaleString()}</span>
                </div>

                <div className="text-[9px] uppercase font-bold text-slate-500 mt-2.5 block">দৈনিক ২৪ ঘণ্টার ব্যয় ব্রেকডাউন:</div>
                {monthReportData.dailyExpensesList.map(day => (
                  <div key={day.date} className="flex justify-between text-[10px] pl-1 border-l border-slate-800">
                    <span>{day.date}:</span>
                    <span className="text-slate-300">৳{day.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="text-center text-[9px] text-slate-600 mt-4 pt-1.5 border-t border-slate-900/60">
                অডিটর: {currentUser.name} • ডাউনলোডের সময়: {getTodayStr()}
              </div>
            </div>

            {/* Modal actions close */}
            <div className="flex items-center space-x-2">
              <button
                id="btn-confirm-bkash-dl"
                onClick={() => setExportModalOpen(false)}
                disabled={exportProgress !== 'done'}
                className="flex-1 py-2.5 bg-pink-600 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-pink-500 font-bold text-xs rounded-xl shadow cursor-pointer text-center text-white disabled:cursor-not-allowed"
              >
                {exportProgress === 'done' ? 'রিপোর্ট ফাইল ডাউনলোড করুন (Excel/PDF)' : 'দয়া করে অপেক্ষা করুন...'}
              </button>
              
              <button
                id="btn-close-bkash-modal"
                onClick={() => setExportModalOpen(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 cursor-pointer text-center"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
