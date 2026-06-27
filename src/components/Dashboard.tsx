/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { User, IncomeRecord, ExpenseRecord, BKashRecord, QuickReminder, ServiceType, SystemSettings } from '../types';
import { SERVICE_METADATA, EXPENSE_METADATA } from '../data/mockData';
import { getDailyIncomeMetrics, getIncomeSum, getTodayStr, getYesterdayStr } from '../utils/finance';
import { 
  TrendingUp, TrendingDown, ArrowUpRight, DollarSign, 
  Wallet, Layers, ArrowDownRight, Clock, CalendarDays, 
  Sparkles, PlusCircle, BookOpen, BellRing, ClipboardCheck, ArrowUp,
  Edit, Check, Undo2
} from 'lucide-react';

interface DashboardProps {
  incomeList: IncomeRecord[];
  expenseList: ExpenseRecord[];
  bkashList: BKashRecord[];
  reminders: QuickReminder[];
  currentUser: User;
  onNavigate: (tab: string) => void;
  onToggleReminder: (id: string) => void;
  onAddIncome?: (record: Omit<IncomeRecord, 'id'>) => void;
  activeServiceTypes?: ServiceType[];
  settings: SystemSettings;
  servicesMetadata?: Record<string, { bangla: string; english: string; color: string; defaultPrice: number }>;
  onUpdateSettings?: (newSettings: Partial<SystemSettings>) => void;
}

export default function Dashboard({
  incomeList,
  expenseList,
  bkashList,
  reminders,
  currentUser,
  onNavigate,
  onToggleReminder,
  onAddIncome,
  activeServiceTypes = ['NAMJARI', 'KHOTIYAN', 'PORCHA', 'DOLIL', 'LAND_APP', 'OTHERS'],
  settings,
  servicesMetadata,
  onUpdateSettings
}: DashboardProps) {
  const isOwner = currentUser.role === 'OWNER_ONE' || currentUser.role === 'OWNER_TWO';

  // English to Bangla digits conversion helper
  const toBanglaDigits = (num: number | string): string => {
    const digits: Record<string, string> = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return num.toString().split('').map(char => digits[char] || char).join('');
  };

  // 48-Hour Quote Rotation Engine
  const effectiveQuote = useMemo(() => {
    const DEFAULT_QUOTES = [
      "সাফল্য নিয়ে কোনো শর্টকাট নেই, সত্যতা ও সঠিক গ্রাহক সেবাই ব্যবসার আসল মূলধন।",
      "গ্রাহক সেবার মানই ব্যবসার পরিচয়। সবসময় হাসিমুখে সেবা দিন ও সততা বজায় রাখুন।",
      "ভূমিসেবাকে সহজ করাই আমাদের লক্ষ্য। গ্রাহকদের সঠিক ও নিখুঁত তথ্য দিয়ে সাহায্য করুন।",
      "একটি সফল ব্যবসা গড়ে ওঠে গ্রাহকের গভীর বিশ্বাস ও আমাদের আন্তরিক সেবার উপর ভিত্তি করে।",
      "সততাই ব্যবসার একমাত্র রক্ষাকবচ। আজকের সততা ও কঠোর পরিশ্রম আগামীকালের বড় সাফল্য বয়ে আনবে।"
    ];

    const lastUpdate = settings.lastQuoteUpdatedAt || 0;
    const elapsedMs = Date.now() - lastUpdate;
    const fortyEightHoursMs = 172800000; // 48 * 60 * 60 * 1000

    if (lastUpdate && elapsedMs < fortyEightHoursMs && settings.dailyReminderText) {
      return settings.dailyReminderText;
    }

    // Auto rotate every 48 hours based on timestamp
    const index = Math.floor(Date.now() / fortyEightHoursMs) % DEFAULT_QUOTES.length;
    return DEFAULT_QUOTES[index];
  }, [settings.lastQuoteUpdatedAt, settings.dailyReminderText]);

  const [dashboardQuickAmount, setDashboardQuickAmount] = React.useState<string>('');
  const [dashboardPaymentMethod, setDashboardPaymentMethod] = React.useState<'CASH' | 'BKASH'>('CASH');

  const [isEditingCash, setIsEditingCash] = React.useState<boolean>(false);
  const [cashInputAmount, setCashInputAmount] = React.useState<string>('');

  const handleSaveCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSettings) {
      alert('সিস্টেম সেটিংস আপডেট করার সুবিধা এই মুহূর্তে সচল নয়।');
      return;
    }
    const val = parseFloat(cashInputAmount);
    if (isNaN(val) || val < 0) {
      alert('অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন (অথবা ০ দিন)।');
      return;
    }
    onUpdateSettings({ cashInHandOverride: val });
    setIsEditingCash(false);
  };

  const handleClearCashOverride = () => {
    if (!onUpdateSettings) return;
    onUpdateSettings({ cashInHandOverride: undefined });
    setIsEditingCash(false);
  };

  const handleQuickIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddIncome) return;
    const cleanAmount = parseFloat(dashboardQuickAmount);
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
      serviceType: 'OTHERS',
      amount: cleanAmount,
      enteredBy: currentUser.name,
      note: 'আজকের ইনকাম (একসাথে এন্ট্রি)',
      paymentMethod: dashboardPaymentMethod
    });

    setDashboardQuickAmount('');
    alert('সফলভাবে আজকের মোট ইনকাম ৳' + cleanAmount + ' এন্ট্রি সংরক্ষণ করা হয়েছে!');
  };

  // Current Date definitions dynamically
  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();
  const currentMonthPrefix = todayStr.substring(0, 7);

  // Generate Bangla month label
  const currentMonthBgLabel = useMemo(() => {
    const [year, month] = todayStr.split('-');
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
    return `${monthNamesBg[month] || month} ${englishToBanglaDigits(year)}`;
  }, [todayStr]);

  // 1. CALCULATE CORE METRICS WITH MEMO
  const metrics = useMemo(() => {
    // Today's total income using helper
    const todayIncome = getDailyIncomeMetrics(todayStr, incomeList).total;

    // Yesterday's total income using helper
    const yesterdayIncome = getDailyIncomeMetrics(yesterdayStr, incomeList).total;

    // Today's expenses
    const todayExpense = expenseList
      .filter(e => e.date === todayStr)
      .reduce((sum, item) => sum + item.amount, 0);

    // Yesterday's expenses
    const yesterdayExpense = expenseList
      .filter(e => e.date === yesterdayStr)
      .reduce((sum, item) => sum + item.amount, 0);

    // Month's total income using helper
    const monthIncome = getIncomeSum(incomeList.filter(i => i.date.startsWith(currentMonthPrefix))).total;

    // Month's total expenses (Fixed + Variable)
    const monthExpense = expenseList
      .filter(e => e.date.startsWith(currentMonthPrefix))
      .reduce((sum, item) => sum + item.amount, 0);

    // bKash Current balance: starting base from settings + INs - OUTs - PAYMENTS
    const bkashBase = settings?.bkashBaseBalance ?? 12500;
    const bkashIn = bkashList
      .filter(b => b.type === 'IN')
      .reduce((sum, b) => sum + b.amount, 0);
    const bkashOut = bkashList
      .filter(b => b.type === 'OUT')
      .reduce((sum, b) => sum + b.amount + (b.fee || 0), 0);
    
    const hasOverride = settings?.bkashTodaySpentOverride !== undefined && settings?.bkashTodaySpentOverride !== null && settings?.bkashTodaySpentOverride >= 0;
    const bkashPayment = hasOverride
      ? (bkashList.filter(b => b.date !== todayStr && b.type === 'PAYMENT').reduce((sum, b) => sum + b.amount, 0) + (settings.bkashTodaySpentOverride ?? 0))
      : bkashList.filter(b => b.type === 'PAYMENT').reduce((sum, b) => sum + b.amount, 0);
      
    const currentBkashBalance = bkashBase + bkashIn - bkashOut - bkashPayment;

    const bkashTodaySpent = hasOverride
      ? (settings.bkashTodaySpentOverride ?? 0)
      : bkashList.filter(b => b.date === todayStr && b.type === 'PAYMENT').reduce((sum, b) => sum + b.amount, 0);

    // Cash In Hand Base of 18,000 + Cash Incomes (utilizing proper helper) - Cash out of bKash + cash expenses
    const cashIncome = getIncomeSum(incomeList).cash;
    
    // bKash Outflow that is CASHED OUT enters "Cash in Hand" (excluding the fee)
    const bKashCashedOut = bkashList
      .filter(b => b.type === 'OUT')
      .reduce((sum, b) => sum + b.amount, 0);

    const cashExpenses = expenseList
      .reduce((sum, e) => sum + e.amount, 0); // simplifying total expenses as cash out of register for cash-in-hand calculation

    const cashBase = 18000;
    const defaultCashInHand = Math.max(0, cashBase + cashIncome + bKashCashedOut - cashExpenses);

    const hasCashOverride = settings?.cashInHandOverride !== undefined && settings?.cashInHandOverride !== null && settings?.cashInHandOverride >= 0;
    const cashInHand = hasCashOverride ? (settings.cashInHandOverride ?? 0) : defaultCashInHand;

    // Calculations
    const todayCashIncome = getDailyIncomeMetrics(todayStr, incomeList).cash;
    const yesterdayCashIncome = getDailyIncomeMetrics(yesterdayStr, incomeList).cash;

    const todayNetProfit = todayCashIncome - todayExpense;
    const yesterdayNetProfit = yesterdayCashIncome - yesterdayExpense;

    // Robust timezone-neutral YYYY-MM-DD components extractor
    const parseDateSpec = (dateStr: string) => {
      if (!dateStr) return { year: 0, month: -1, day: 0 };
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          return {
            year: parseInt(parts[0], 10),
            month: parseInt(parts[1], 10) - 1,
            day: parseInt(parts[2], 10)
          };
        } else {
          // DD-MM-YYYY or MM-DD-YYYY (assume DD-MM-YYYY)
          return {
            year: parseInt(parts[2], 10),
            month: parseInt(parts[1], 10) - 1,
            day: parseInt(parts[0], 10)
          };
        }
      }
      const d = new Date(dateStr);
      return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    };

    const todaySpec = parseDateSpec(todayStr);

    // Calculate monthActualNetIncomeBeforeToday (days 1 to yesterday)
    // and monthActualNetIncomeUpToToday (days 1 to today) conforming with the user's criteria:
    // No entries on days 1..22 => 0, Today 23rd => 1260
    let monthActualNetIncomeBeforeToday = 0;
    let monthActualNetIncomeUpToToday = 0;
    let openDaysCount = 0;
    let closedDaysCount = 0;
    const closedDaysList: string[] = [];
    const openDaysList: string[] = [];

    for (let d = 1; d <= todaySpec.day; d++) {
      const dateStr = `${todaySpec.year}-${String(todaySpec.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const dayIncomeMetrics = getDailyIncomeMetrics(dateStr, incomeList);
      
      // Check if there are any income entries at all for this specific date
      const hasIncomeEntries = incomeList.some(i => {
        const spec = parseDateSpec(i.date);
        return spec.year === todaySpec.year && spec.month === todaySpec.month && spec.day === d;
      });

      if (hasIncomeEntries) {
        openDaysCount++;
        openDaysList.push(dateStr);
      } else {
        closedDaysCount++;
        closedDaysList.push(dateStr);
      }

      let dayActualProfit = 0;
      if (hasIncomeEntries) {
        const dayCashIncome = dayIncomeMetrics.cash;
        const dayExpense = expenseList
          .filter(e => {
            const spec = parseDateSpec(e.date);
            return spec.year === todaySpec.year && spec.month === todaySpec.month && spec.day === d;
          })
          .reduce((sum, item) => sum + item.amount, 0);
        
        dayActualProfit = dayCashIncome - dayExpense;
      }

      if (d < todaySpec.day) {
        monthActualNetIncomeBeforeToday += dayActualProfit;
      }
      monthActualNetIncomeUpToToday += dayActualProfit;
    }

    const monthlyNetProfit = monthActualNetIncomeUpToToday;

    // Fixed cost calculations for daily loss
    const rentVal = settings?.monthlyRent ?? 6000;
    const elecVal = settings?.monthlyElectricity ?? 1850;
    const netVal = settings?.monthlyInternet ?? 800;
    const salVal = settings?.monthlySalary ?? 8000;
    const extraVal = expenseList
      .filter(e => e.date.startsWith(currentMonthPrefix) && !['RENT', 'ELECTRICITY', 'INTERNET', 'SALARY'].includes(e.category))
      .reduce((sum, item) => sum + item.amount, 0);

    const totalDeductionsForMonth = rentVal + elecVal + netVal + salVal + extraVal;
    const dailyFixedLoss = Math.round(totalDeductionsForMonth / 30);
    const totalClosedDaysLoss = closedDaysCount * dailyFixedLoss;
    const averageIncomePerOpenDay = openDaysCount > 0 ? Math.round(monthIncome / openDaysCount) : 0;

    // Hourly profit calculation (Today's hours: morning vs afternoon)
    // 9 AM to 6 PM mapping
    const hourlyIncomeArray = Array(12).fill(0); // index 0 = 9AM, index 9 = 6PM...
    // If today is locked, distribute the total equally across hours or use real records if any; 
    // using real matching records for visual graph representation is completely fine 
    incomeList.filter(i => i.date === todayStr).forEach(item => {
      const hour = parseInt(item.time.split(':')[0], 10);
      const index = hour - 9;
      if (index >= 0 && index < 12) {
        hourlyIncomeArray[index] += item.amount;
      }
    });

    const hourlyExpenseArray = Array(12).fill(0);
    expenseList.filter(e => e.date === todayStr).forEach(item => {
      const hour = parseInt(item.time.split(':')[0], 10);
      const index = hour - 9;
      if (index >= 0 && index < 12) {
        hourlyExpenseArray[index] += item.amount;
      }
    });

    const hourlyNetProfitArray = hourlyIncomeArray.map((inc, index) => inc - hourlyExpenseArray[index]);

    return {
      todayIncome,
      todayCashIncome,
      yesterdayIncome,
      todayExpense,
      yesterdayExpense,
      monthIncome,
      monthExpense,
      currentBkashBalance,
      bkashTodaySpent,
      cashInHand,
      defaultCashInHand,
      hasCashOverride,
      todayNetProfit,
      yesterdayNetProfit,
      monthlyNetProfit,
      hourlyNetProfitArray,
      monthIncomeBeforeToday: monthActualNetIncomeBeforeToday,
      monthIncomeUpToToday: monthActualNetIncomeUpToToday,
      openDaysCount,
      closedDaysCount,
      closedDaysList,
      openDaysList,
      dailyFixedLoss,
      totalClosedDaysLoss,
      averageIncomePerOpenDay,
      totalDeductionsForMonth
    };
  }, [incomeList, expenseList, bkashList, settings]);

  // Dynamic monthly calculations based on SystemSettings (Owner Only)
  const rentSetting = settings.monthlyRent ?? 6000;
  const electricitySetting = settings.monthlyElectricity ?? 1850;
  const internetSetting = settings.monthlyInternet ?? 800;
  const salarySetting = settings.monthlySalary ?? 8000;

  // shopExpenses is the sum of any non-fixed expenses in current month
  const shopExpenses = expenseList
    .filter(e => e.date.startsWith(currentMonthPrefix) && !['RENT', 'ELECTRICITY', 'INTERNET', 'SALARY'].includes(e.category))
    .reduce((sum, item) => sum + item.amount, 0);

  const totalDeductions = rentSetting + electricitySetting + internetSetting + salarySetting + shopExpenses;
  const netProfitMonth = metrics.monthIncomeUpToToday - totalDeductions;

  // % Comparison to yesterday (Income)
  const incomeTrendPercentage = useMemo(() => {
    if (metrics.yesterdayIncome === 0) return 100;
    return Math.round(((metrics.todayIncome - metrics.yesterdayIncome) / metrics.yesterdayIncome) * 100);
  }, [metrics.todayIncome, metrics.yesterdayIncome]);

  // Daily incomes for the last 7 days (to draw elegant SVG trend graph for owners)
  const last7DaysData = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }

    return dates.map(dStr => {
      const inc = getDailyIncomeMetrics(dStr, incomeList).total;
      const exp = expenseList.filter(e => e.date === dStr).reduce((s, e) => s + e.amount, 0);
      // Format showable short date like "09 Jun"
      const parts = dStr.split('-');
      const label = parts[2] + ' ' + (parts[1] === '06' ? 'জুন' : 'মে');
      return {
        date: label,
        income: inc,
        expense: exp,
        profit: inc - exp
      };
    });
  }, [incomeList, expenseList]);

  return (
    <div id="dashboard-tab" className="space-y-6">
      
      {/* Title & Banner Grid */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl"></div>
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="text-slate-400 text-xs font-semibold">ভূমি সেবা সহায়তা কেন্দ্র • হিসাব ড্যাশবোর্ড</div>
            <h2 className="text-2xl font-bold text-white tracking-tight">আসসালামু আলাইকুম, {currentUser.name}!</h2>
            <p className="text-slate-400 text-xs mt-0.5">আপনার ব্যবসার আজকের হিসাব এবং রিপোর্ট এখানে পাবেন।</p>
          </div>
        </div>

        {/* Dynamic Greeting CTA Buttons */}
        <div className="flex items-center space-x-2.5 z-10">
          <button
            id="btn-add-income-shortcut"
            onClick={() => onNavigate('income')}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs rounded-lg transition duration-150 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>আয় এন্ট্রি</span>
          </button>
          
          <button
            id="btn-add-expense-shortcut"
            onClick={() => onNavigate('expenses')}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>ব্যয় এন্ট্রি</span>
          </button>
        </div>
      </div>

      {/* MOTIVATIONAL QUOTE BAR */}
      <div className="bg-slate-800/40 border border-slate-700/80 py-3.5 px-5 rounded-xl flex items-center space-x-3 text-indigo-300 text-xs leading-relaxed">
        <BookOpen className="w-4 h-4 shrink-0 text-indigo-400" />
        <span>
          <strong>আজকের বাণী:</strong> &ldquo;{effectiveQuote}&rdquo;
        </span>
      </div>

      {/* QUICK INCOME ENTRY WIDGET */}
      <div className="bg-slate-900 border border-emerald-500/25 rounded-2xl p-4.5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              আজকের মোট ইনকাম সংযোজন (Quick Box)
            </h3>
            <p className="text-[11px] text-slate-400">ব্যস্ত দিনে কোনো ক্যাটাগরি ছড়াই আজকে মোট কত টাকা ইনকাম করলেন তা একসাথে এখানে লিখে সেভ করুন।</p>
          </div>
          <form onSubmit={handleQuickIncomeSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs select-none">৳</span>
              <input
                id="input-dashboard-quick-income"
                type="number"
                required
                placeholder="যেমন: ১৮০০"
                value={dashboardQuickAmount}
                onChange={(e) => setDashboardQuickAmount(e.target.value)}
                className="w-full sm:w-48 bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-3 pl-7 text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            
            <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDashboardPaymentMethod('CASH')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors duration-150 ${dashboardPaymentMethod === 'CASH' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
              >
                ক্যাশ
              </button>
              <button
                type="button"
                onClick={() => setDashboardPaymentMethod('BKASH')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors duration-150 ${dashboardPaymentMethod === 'BKASH' ? 'bg-pink-500 text-slate-950' : 'text-slate-400 font-medium'}`}
              >
                বিকাশ
              </button>
            </div>

            <button
              id="btn-dashboard-quick-income-submit"
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 text-xs rounded-xl cursor-pointer transition duration-150 active:scale-95 text-center flex items-center justify-center"
            >
              ইনকাম সেভ করুন
            </button>
          </form>
        </div>
      </div>

      {/* CORE FINANCIALS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4.5">
        
        {/* Metric Card 1: Today Income */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-emerald-500/30 transition group">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition duration-200">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-semibold">আজকের মোট আয় (Revenue)</p>
          <p className="text-3xl font-bold font-mono text-white mt-1.5 font-sans">৳{metrics.todayIncome.toLocaleString('bn-BD')}</p>
          <div className="flex items-center space-x-1.5 mt-3 text-xs">
            {incomeTrendPercentage >= 0 ? (
              <span className="text-emerald-400 font-bold flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{incomeTrendPercentage}%
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {incomeTrendPercentage}%
              </span>
            )}
            <span className="text-slate-400">গতকালের তুলনায়</span>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/5 rounded-full"></div>
        </div>

        {/* Metric Card 1.5: Today Actual profit / Net Income (আজকের প্রকৃত আয়) */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-cyan-500/30 transition group">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition duration-200">
            <span className="text-[10px] font-black tracking-tighter">প্রকৃত</span>
          </div>
          <p className="text-slate-400 text-xs font-semibold">আজকের প্রকৃত আয় (Net Profit)</p>
          <p className="text-3xl font-bold font-mono text-cyan-400 mt-1.5 font-sans">৳{metrics.todayNetProfit.toLocaleString('bn-BD')}</p>
          <div className="mt-3 text-[10.5px] text-slate-400 font-medium whitespace-nowrap">
            হিসাব: ৳{metrics.todayCashIncome.toLocaleString('bn-BD')} (ক্যাশ আয়) - ৳{metrics.todayExpense.toLocaleString('bn-BD')} (ব্যয়)
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-500/5 rounded-full"></div>
        </div>

        {/* Metric Card 2: Today Expense */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-rose-500/30 transition group">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-450 group-hover:scale-110 transition duration-200">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-semibold">আজকের মোট ব্যয় (Expenses)</p>
          <p className="text-3xl font-bold font-mono text-white mt-1.5 font-sans">৳{metrics.todayExpense.toLocaleString('bn-BD')}</p>
          <div className="mt-3 text-xs text-rose-400 font-semibold flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1" />
            <span>আজকের সচল খরচ: {expenseList.filter(e => e.date === todayStr).length} টি</span>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-rose-500/5 rounded-full"></div>
        </div>

        {/* Metric Card 3: Cash In Hand */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-indigo-500/30 transition group">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition duration-200">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-semibold">ক্যাশ ইন হ্যান্ড (Cash)</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <p className="text-3xl font-bold font-mono text-white font-sans">৳{metrics.cashInHand.toLocaleString('bn-BD')}</p>
            {metrics.hasCashOverride && (
              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded-full uppercase" title="ক্যাশ ম্যানুয়ালি এন্ট্রি করা হয়েছে">ম্যানুয়াল</span>
            )}
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 select-none">ড্রয়ারে গচ্ছিত নগদ টাকা</span>
            <button 
              id="btn-edit-cash-override"
              onClick={() => {
                setCashInputAmount(metrics.cashInHand.toString());
                setIsEditingCash(true);
              }}
              className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer font-sans"
              title="ড্রয়ার ক্যাশ এন্ট্রি"
            >
              <Edit className="w-3 h-3" />
              <span>এন্ট্রি দিন</span>
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/5 rounded-full"></div>
        </div>

        {/* Metric Card 4: bKash Balance */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-pink-500/30 transition group">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition duration-200">
            <Wallet className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-semibold">বিকাশ ব্যালেন্স (bKash)</p>
          <p className="text-3xl font-bold font-mono text-amber-400 mt-1.5 font-sans">৳{metrics.currentBkashBalance.toLocaleString('bn-BD')}</p>
          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
            <span>সর্বশেষ আপডেট: ১০:৩০ AM</span>
            <span className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer font-bold" onClick={() => onNavigate('bkash')}>লেজার দেখুন</span>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-pink-500/5 rounded-full"></div>
        </div>

        {/* Metric Card 5: Today bKash Spent */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-pink-500/30 transition group">
          {/* Circular badge representing today's bKash spent ("আরেকটা গোল ঘর") */}
          <div className="absolute right-3 top-3 w-10 h-10 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition duration-200">
            <span className="text-xs font-bold">ব্যয়</span>
          </div>
          <p className="text-slate-400 text-xs font-semibold">আজকে বিকাশ ব্যয় (Spent)</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <p className="text-3xl font-bold font-mono text-pink-450 mt-1.5 font-sans">৳{metrics.bkashTodaySpent.toLocaleString('bn-BD')}</p>
            {/* Additional circular aesthetic indicator */}
            <div className="w-5 h-5 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 select-none">আজকের মোট বিকাশ পেমেন্ট</span>
            <span className="text-pink-400 hover:text-pink-300 hover:underline cursor-pointer font-bold text-[11px]" onClick={() => onNavigate('bkash')}>লেজার দেখুন</span>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-pink-500/5 rounded-full"></div>
        </div>

      </div>

      {/* ROLE RESTRICTED VIEW OR COMPREHENSIVE GRAPHS */}
      {!isOwner ? (
        /* STAFF VIEW: Motivating summary of daily tasks without revealing secret data */
        <div id="staff-restricted-warning" className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center">
            <ClipboardCheck className="w-5 h-5 text-emerald-400 mr-2" />
            আজকের ডাটা ইন্ট্রি ও রেকর্ড বুক (আপনার এন্টার করা ডাটা)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Quick Summary list of logged goods */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">আজকের পেমেন্ট ইনকাম হিস্ট্রি</div>
              <div className="space-y-2.5 max-h-56 overflow-y-auto">
                {incomeList.filter(i => i.date === todayStr).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center">আজ কোনো ইনকাম এন্ট্রি করা হয়নি।</p>
                ) : (
                  incomeList.filter(i => i.date === todayStr).map(record => {
                    const meta = (servicesMetadata && servicesMetadata[record.serviceType]) || SERVICE_METADATA[record.serviceType];
                    return (
                      <div key={record.id} className="flex justify-between items-center text-xs p-2 bg-slate-900 border border-slate-850 rounded-xl">
                        <div className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                          <div>
                            <span className="font-semibold text-slate-300">{meta?.bangla || record.serviceType}</span>
                            <span className="block text-[10px] text-slate-500">{record.time} • {record.paymentMethod}</span>
                          </div>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold">৳{record.amount}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Employee quick check of logged expenses */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">আজকের সচল খরচ এন্ট্রি</div>
              <div className="space-y-2.5 max-h-56 overflow-y-auto">
                {expenseList.filter(e => e.date === todayStr).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center">আজ কোনো খরচ এন্ট্রি করা হয়নি।</p>
                ) : (
                  expenseList.filter(e => e.date === todayStr).map(record => {
                    const meta = EXPENSE_METADATA[record.category];
                    return (
                      <div key={record.id} className="flex justify-between items-center text-xs p-2 bg-slate-900 border border-slate-850 rounded-xl">
                        <div className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                          <div>
                            <span className="font-semibold text-slate-300">{meta?.bangla || record.category}</span>
                            <span className="block text-[10px] text-slate-500">{record.time} • {record.note}</span>
                          </div>
                        </div>
                        <span className="font-mono text-indigo-400 font-bold">+৳{record.amount}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          <div className="mt-5 p-4 bg-yellow-950/20 border border-yellow-900/30 rounded-2xl text-xs text-yellow-300 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
            <p>সিকিউরিটি পলিসি অনুযায়ী কর্মচারী প্যানেলে ব্যবসায়িক মূল মোট লাভ, নেট প্রফিট ও মাসিক আর্থিক চার্ট দৃশ্যমান নয়।</p>
          </div>
        </div>
      ) : (
        /* OWNER COMPLETE HIGH-FIDELITY VIEWS (PROFITS, TRENDS, ANALYSIS) */
        <div id="owner-secret-reports" className="space-y-6">

          {/* OWNER EXCLUSIVE INCOME VS NET PROFIT CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                  মালিকের বিশেষ আর্থিক বিবরণী (Owner Statement)
                </span>
                <h3 className="text-lg font-black text-white mt-2 flex items-center">
                  <Sparkles className="w-5 h-5 text-indigo-400 mr-2 shrink-0" />
                  রিয়েল-টাইম প্রকৃত আয় ও কর্তন ট্র্যাকার ({currentMonthBgLabel})
                </h3>
              </div>
              <div className="mt-3 md:mt-0 text-slate-400 text-xs text-right font-mono">
                হিসাব চক্র: প্রতি মাস ০২ তারিখ অটো হিসাব
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Side: Gross vs Net Output */}
              <div className="lg:col-span-5 grid grid-cols-1 gap-4">
                
                {/* Net Income: Period Before Today */}
                <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-xs font-semibold block leading-relaxed">
                        ১ থেকে {parseInt(todayStr.split('-')[2], 10) - 1 >= 1 ? toBanglaDigits(parseInt(todayStr.split('-')[2], 10) - 1) : '০'} তারিখ পর্যন্ত মোট প্রকৃত আয়
                      </span>
                      <p className="text-2xl font-black text-white mt-1.5 font-sans">
                        ৳{metrics.monthIncomeBeforeToday.toLocaleString('bn-BD')}
                      </p>
                    </div>
                    {/* Circle Colorful Element */}
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition duration-200 shrink-0 shadow-lg">
                      <span className="text-[10px] font-black">{parseInt(todayStr.split('-')[2], 10) - 1 >= 1 ? `১-${toBanglaDigits(parseInt(todayStr.split('-')[2], 10) - 1)}` : '০'}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-slate-500 z-10">
                    * আজকের রাজস্ব হিসাব বাদ দিয়ে মাস শুরু থেকে গতকাল পর্যন্ত মোট প্রকৃত আয় (মোট আয় - মোট ব্যয়)।
                  </div>
                </div>

                {/* Net Income: Up To Today */}
                <div className="bg-gradient-to-br from-indigo-950/25 to-slate-900/40 border border-indigo-505/10 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-indigo-300 text-xs font-bold block leading-relaxed">
                        ১ থেকে {toBanglaDigits(parseInt(todayStr.split('-')[2], 10))} তারিখ পর্যন্ত মোট প্রকৃত আয় (চলতি মাস)
                      </span>
                      <p className="text-2xl font-black text-indigo-300 mt-1.5 font-sans">
                        ৳{metrics.monthIncomeUpToToday.toLocaleString('bn-BD')}
                      </p>
                    </div>
                    {/* Circle Colorful Element */}
                    <div className="w-12 h-12 rounded-full bg-emerald-500/15 border-2 border-emerald-500/35 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition duration-200 shrink-0 shadow-lg">
                      <span className="text-[10px] font-black">{`১-${toBanglaDigits(parseInt(todayStr.split('-')[2], 10))}`}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-slate-400 z-10">
                    * আজকের সচল আয় ও ব্যয় সহ ১ তারিখ হতে এই পর্যন্ত মোট প্রকৃত আয় (আয় - ব্যয়) হিসাব।
                  </div>
                </div>

                {/* Net Income after full deductions (প্রকৃত লাভ) */}
                <div className="bg-gradient-to-br from-emerald-950/20 to-teal-900/30 border border-emerald-500/20 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-emerald-400 text-xs font-bold flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-1" />
                      প্রকৃত আয় (Net Revenue after Cost deductions)
                    </span>
                    <p className={`text-3.5xl font-black mt-1.5 font-sans ${netProfitMonth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {netProfitMonth < 0 ? '-' : ''}৳{Math.abs(netProfitMonth).toLocaleString('bn-BD')}
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] text-emerald-500/80">
                    * ঘর ভাড়া, বিদ্যুৎ, ইন্টারনেট, স্টাফ বেতন ও অন্যান্য দোকান খরচ কর্তন করার পর প্রকৃত প্রফিট।
                  </div>
                </div>

              </div>

              {/* Right Side: Deductions Breakdown Grid */}
              <div className="lg:col-span-7 bg-slate-950/50 border border-slate-850 rounded-2xl p-5">
                <span className="text-slate-400 text-xs font-semibold block mb-4.5">মাসিক খরচের খাতসমূহ ও চলতি ব্যয় (Deductions Detail)</span>
                
                <div className="space-y-3">
                  
                  {/* Rent */}
                  <div className="flex justify-between items-center text-xs border-b border-slate-900 pb-2">
                    <span className="text-slate-400 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                      ঘর ভাড়া (Shop Rent)
                    </span>
                    <span className="font-semibold text-slate-200 font-mono">৳{rentSetting.toLocaleString('bn-BD')}</span>
                  </div>

                  {/* Electricity */}
                  <div className="flex justify-between items-center text-xs border-b border-slate-900 pb-2">
                    <span className="text-slate-400 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                      বিদ্যুৎ বিল (Electricity Bill)
                    </span>
                    <span className="font-semibold text-slate-200 font-mono">৳{electricitySetting.toLocaleString('bn-BD')}</span>
                  </div>

                  {/* Internet */}
                  <div className="flex justify-between items-center text-xs border-b border-slate-900 pb-2">
                    <span className="text-slate-400 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 mr-2"></span>
                      নেট বিল / ওয়াইফাই (Internet Bill)
                    </span>
                    <span className="font-semibold text-slate-200 font-mono">৳{internetSetting.toLocaleString('bn-BD')}</span>
                  </div>

                  {/* Employee Salary */}
                  <div className="flex justify-between items-center text-xs border-b border-slate-900 pb-2">
                    <span className="text-slate-400 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                      কর্মচারী वेतन (Staff Salary)
                    </span>
                    <span className="font-semibold text-slate-200 font-mono">৳{salarySetting.toLocaleString('bn-BD')}</span>
                  </div>

                  {/* Variable Shop/Store Expenses */}
                  <div className="flex justify-between items-center text-xs border-b border-slate-900 pb-2">
                    <span className="text-slate-400 flex items-center flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-slate-500 mr-2"></span>
                      অন্যান্য চলতি দোকান ব্যয় (Variable Shop Expenses)
                    </span>
                    <span className="font-semibold text-slate-200 font-mono">৳{shopExpenses.toLocaleString('bn-BD')}</span>
                  </div>

                  {/* Total Cost Deductions */}
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-indigo-400 font-bold">মোট কেটে নেওয়া খরচ (Total Cost Deductions)</span>
                    <span className="font-bold text-indigo-400 font-mono">৳{totalDeductions.toLocaleString('bn-BD')}</span>
                  </div>

                </div>

              </div>

            </div>

          </div>
          
          {/* SENSITIVE METRICS BLOCK */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            {/* Metric 5: Today Net Profit (Sleek slate with alert highlight) */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
              <p className="text-slate-400 text-xs font-semibold flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                আজকের নিট লাভ (Today's Net Profit)
              </p>
              <p className={`text-3xl font-black font-sans mt-2 ${metrics.todayNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                {metrics.todayNetProfit >= 0 ? '+' : ''}৳{metrics.todayNetProfit.toLocaleString('bn-BD')}
              </p>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">
                আয় ৳{metrics.todayIncome} – ব্যয় ৳{metrics.todayExpense}
              </p>
            </div>

            {/* Metric 6: Monthly Net Profit (Premium Indigo Gradient Accent from HTML specification!) */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-5 rounded-2xl shadow-xl shadow-indigo-600/20 relative overflow-hidden text-white">
              <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse"></div>
              <p className="text-indigo-100 text-xs font-semibold flex items-center">
                <CalendarDays className="w-4 h-4 mr-1.5 text-white" />
                মাসিক নেট প্রফিট (Monthly net profit)
              </p>
              <p className="text-3xl font-black mt-2">
                {metrics.monthlyNetProfit >= 0 ? '+' : ''}৳{metrics.monthlyNetProfit.toLocaleString('bn-BD')}
              </p>
              <p className="text-indigo-200 text-xs mt-2">
                মার্জিন প্রফিটাবিলিটি: {Math.round((metrics.monthlyNetProfit / Math.max(1, metrics.monthIncome)) * 100)}%
              </p>
            </div>

            {/* Metric 7: Average Transaction info */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
              <p className="text-slate-400 text-xs font-semibold flex items-center">
                <Layers className="w-4 h-4 mr-1.5 text-amber-500" />
                প্রতি সেবার গড় ফি (Average Service Fee)
              </p>
              <p className="text-3xl font-bold font-sans text-amber-400 mt-2">
                ৳{Math.round(metrics.monthIncome / Math.max(1, incomeList.length)).toLocaleString('bn-BD')}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">
                * চলতি মাসে প্রতি সেবা প্রদানের মাধ্যমে গড়ে অর্জিত ফি (মোট আয় ÷ মোট রেকর্ড)।
              </p>
            </div>
          </div>

          {/* SHOP ATTENDANCE, OPEN/CLOSED STATUS & SYSTEM LOSS ESTIMATE (Requested by User) */}
          <div id="shop-operations-loss-tracker" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-400" />
                  দোকান পরিচালনা, উপস্থিতি ও বন্ধের লস খতিয়ান
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">মাসিক খরচের সাপেক্ষে দৈনিক কার্যক্রম ও সার্ভিস ইনকাম এন্ট্রির পরিসংখ্যান</p>
              </div>
              
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono">চলতি মাস পিরিয়ড: {todayStr.substring(0, 7)}</span>
              </div>
            </div>

            {/* Today status banner */}
            {incomeList.some(i => i.date === todayStr) ? (
              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                <span>আজ দোকান খোলা আছে! ইতোমধ্যে নতুন সার্ভিস ইনকাম যোগ করা হয়েছে এবং আজ কোনো সাধারণ পরিচালনা লস নেই।</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                <span><strong>আজ দোকান বন্ধ!</strong> আজকে কোনো সার্ভিস ইনকাম এন্ট্রি দেওয়া হয়নি। আজকের মোট আনুমানিক গড় ফিক্সড লস: <strong>৳{metrics.dailyFixedLoss.toLocaleString('bn-BD')}</strong></span>
              </div>
            )}

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Card 1: Open Days */}
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block mb-1">দোকান খোলা ছিল (Days Open)</span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-3xl font-black text-white">{toBanglaDigits(metrics.openDaysCount)}</span>
                    <span className="text-xs text-slate-400">দিন</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-900/60 text-xs text-slate-400 leading-normal">
                  খোলা দিনে দৈনিক গড় ইনকাম: <strong className="text-emerald-400 font-mono">৳{metrics.averageIncomePerOpenDay.toLocaleString('bn-BD')}</strong>
                </div>
              </div>

              {/* Card 2: Closed Days */}
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-amber-500 uppercase font-bold tracking-wider block mb-1">দোকান বন্ধ ছিল (Days Closed)</span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-3xl font-black text-white">{toBanglaDigits(metrics.closedDaysCount)}</span>
                    <span className="text-xs text-slate-400">দিন</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-900/60 text-xs text-slate-400 leading-normal">
                  প্রতি বন্ধ দিনে গড় ফিক্সড লস: <strong className="text-amber-500 font-mono">৳{metrics.dailyFixedLoss.toLocaleString('bn-BD')}</strong>
                </div>
              </div>

              {/* Card 3: Total Loss on Closed Days */}
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-rose-450 uppercase font-bold tracking-wider block mb-1">বন্ধ দিনের মোট লস (Total Closed Loss)</span>
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-3xl font-black text-rose-450">৳{metrics.totalClosedDaysLoss.toLocaleString('bn-BD')}</span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-900/60 text-[10px] text-slate-400 leading-normal">
                  * ঘর ভাড়া, স্টাফ বেতন, বিদ্যুৎ ও নেট বিলের দিনভিত্তিক পুঞ্জীভূত ফিক্সড খরচ।
                </div>
              </div>
            </div>
          </div>

          {/* TWO GRAPHICAL BLOCKS: interactive custom SVG graphics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Big Trend Graph (Weekly profit comparison) */}
            <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    সাপ্তাহিক প্রফিট ও আয় বনাম ব্যয় চার্ট
                  </h3>
                  <p className="text-[11px] text-slate-400">গত ৭ দিনের বিস্তারিত রিপোর্ট</p>
                </div>
                <div className="flex items-center space-x-3 text-[10px]">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                    <span className="text-slate-400">আয় (In)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span>
                    <span className="text-slate-400">ব্যয় (Out)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
                    <span className="text-slate-400">লাভ</span>
                  </div>
                </div>
              </div>

              {/* Responsive custom HTML5/SVG Chart */}
              <div className="w-full h-56 flex items-end justify-between px-2 pt-4 border-b border-l border-slate-800 relative font-mono text-[10px]">
                {last7DaysData.map((day, idx) => {
                  // Find relative heights
                  const maxVal = Math.max(...last7DaysData.map(d => Math.max(d.income, d.expense, d.profit, 2000)), 5000);
                  const incomeHeight = `${Math.max(5, (day.income / maxVal) * 90)}%`;
                  const expenseHeight = `${Math.max(5, (day.expense / maxVal) * 90)}%`;
                  const profitHeight = `${Math.max(5, (Math.max(0, day.profit) / maxVal) * 90)}%`;

                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group relative">
                      {/* Bar Group Wrapper */}
                      <div className="flex items-end space-x-1 h-36 max-w-[50px] w-full justify-center">
                        {/* Income Bar */}
                        <div 
                          style={{ height: incomeHeight }} 
                          className="w-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-t-sm transition-all duration-300 relative cursor-pointer"
                          title={`আয়: ৳${day.income}`}
                        ></div>
                        {/* Expense Bar */}
                        <div 
                          style={{ height: expenseHeight }} 
                          className="w-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-t-sm transition-all duration-300 relative cursor-pointer"
                          title={`ব্যয়: ৳${day.expense}`}
                        ></div>
                        {/* Profit Bar */}
                        <div 
                          style={{ height: profitHeight }} 
                          className="w-2.5 bg-amber-400 hover:bg-amber-300 rounded-t-sm transition-all duration-300 relative cursor-pointer"
                          title={`লাভ: ৳${day.profit}`}
                        ></div>
                      </div>
                      
                      {/* X-axis Label */}
                      <div className="mt-2 text-slate-400 text-[10px] whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                        {day.date}
                      </div>

                      {/* Tooltip on hovering item */}
                      <div className="absolute bottom-16 bg-slate-950 border border-slate-700 p-2.5 rounded-xl hidden group-hover:block z-25 min-w-[120px] pointer-events-none text-left shadow-2xl">
                        <div className="text-slate-200 font-semibold mb-1 text-[11px]">{day.date}</div>
                        <div className="text-emerald-400 flex justify-between">
                          <span>আয়:</span> <span className="font-bold">৳{day.income}</span>
                        </div>
                        <div className="text-indigo-300 flex justify-between">
                          <span>ব্যয়:</span> <span className="font-bold">৳{day.expense}</span>
                        </div>
                        <div className="text-amber-400 flex justify-between border-t border-slate-800 mt-1 pt-1">
                          <span>লাভ:</span> <span className="font-bold">৳{day.profit}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-slate-500 text-[9px] mt-1 font-mono">
                <span>৳০</span>
                <span>৳৫,০০০ সর্বোচ্চ</span>
              </div>
            </div>

            {/* Income Distribution breakdown by Service */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-3">সার্ভিস অনুযায়ী আয় বিশ্লেষণ</h3>
                <div className="space-y-2.5">
                  {activeServiceTypes.map(s => {
                    const meta = (servicesMetadata && servicesMetadata[s]) || SERVICE_METADATA[s];
                    const amount = incomeList
                      .filter(i => i.serviceType === s)
                      .reduce((sum, item) => sum + item.amount, 0);
                    
                    const totalIncome = metrics.monthIncome || 1;
                    const percent = Math.min(100, Math.round((amount / totalIncome) * 100));

                    return (
                      <div key={s} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 flex items-center">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                            {meta?.bangla || s}
                          </span>
                          <span className="text-slate-400 font-mono">
                            <strong className="text-slate-200">৳{amount}</strong> ({percent}%)
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${percent}%` }} 
                            className="bg-indigo-500 h-1.5 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-4 pt-3.5 border-t border-slate-800/60 text-center">
                <button 
                  id="btn-goto-analytics-detail"
                  onClick={() => onNavigate('reports')} 
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center justify-center mx-auto"
                >
                  বিস্তারিত ডাটা রিপোর্ট দেখুন <ArrowUpRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* QUICK NOTIFICATIONS, REMINDERS & EXCEL REPORT BLOCK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Reminder widget */}
        <div className="md:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <BellRing className="w-4.5 h-4.5 text-indigo-400" />
                জরুরি নোটিশ ও কার্যতালিকা (Reminders)
              </h3>
              <p className="text-[11px] text-slate-400">আজকের বা আগামী দিনের গুরুত্বপূর্ণ কাজের তারিখ</p>
            </div>
            <button
              id="btn-goto-settings-for-reminders"
              onClick={() => onNavigate('settings')}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              নতুন কাজের নোটিশ
            </button>
          </div>

          <div className="space-y-2.5">
            {reminders.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-5 text-center">কোনো নোটিশ বা রিমাইন্ডার এখন যুক্ত নেই।</p>
            ) : (
              reminders.map(rem => (
                <div
                  key={rem.id}
                  id={`reminder-item-${rem.id}`}
                  onClick={() => onToggleReminder(rem.id)}
                  className={`flex items-center justify-between p-3 border rounded-2xl cursor-pointer transition-all duration-150 ${
                    rem.isCompleted
                      ? 'bg-slate-900 border-slate-800 line-through text-slate-500'
                      : 'bg-slate-800 hover:bg-slate-750/70 border-slate-705 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      rem.isCompleted 
                        ? 'bg-indigo-500 border-indigo-600 text-white' 
                        : 'border-slate-600'
                    }`}>
                      {rem.isCompleted && (
                        <svg className="w-2.5 h-2.5 stroke-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-medium">{rem.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400">
                    {rem.date}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick business status indicators */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-2.5">দোকান ঘর স্ট্যাটাস</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              ভূমি সেবা সহায়তা কেন্দ্রের ক্যাশ সিকিউরিটি লক সচল আছে। প্রতি মাসের ১ ও ১০ তারিখ গুরুত্বপূর্ণ খরচগুলো সমন্বয় করা উচিত।
            </p>
            
            <div className="space-y-2">
              {currentUser.role !== 'STAFF' && (
                <div className="flex justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">মোট ইউজার</span>
                  <span className="text-slate-200 font-mono font-bold">৩ জন নিবন্ধিত</span>
                </div>
              )}
              <div className="flex justify-between text-xs py-1.5 border-b border-slate-800">
                <span className="text-slate-450">ডাটা ব্যাকআপ</span>
                <span className="text-indigo-400 font-bold">স্বয়ংক্রিয় ক্লাউড</span>
              </div>
              <div className="flex justify-between text-xs py-1.5">
                <span className="text-slate-400">বিকাশ ট্রান্সেকশন</span>
                <span className="text-pink-400 font-bold font-mono">লাইভ ড্যাশবোর্ড</span>
              </div>
            </div>
          </div>

          {currentUser.role !== 'STAFF' && (
            <div className="mt-4">
              <button
                id="btn-quick-reports-nav"
                onClick={() => onNavigate('reports')}
                className="w-full py-2.5 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-indigo-600/10 transition cursor-pointer"
              >
                ফাইন্যান্সিয়াল অডিট রিপোর্ট
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Custom Cash Counter Modal Overlay */}
      {isEditingCash && (
        <div id="cash-override-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            onClick={() => setIsEditingCash(false)}
          ></div>
          
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl animate-in zoom-in duration-200">
            <form onSubmit={handleSaveCash} className="space-y-4 font-sans text-left">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Edit className="w-4 h-4 text-indigo-450" />
                ড্রয়ারের নগদ টাকা এন্ট্রি (Cash)
              </h3>
              
              <p className="text-xs text-slate-400 leading-relaxed">
                উক্ত অপশনের মাধ্যমে প্রতিদিন ড্রয়ারে থাকা ক্যাশ ইন হ্যান্ড ম্যানুয়ালি এন্ট্রি বা ইডিট করে সেভ করতে পারেন।
              </p>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1 uppercase">নগদ টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={cashInputAmount}
                  onChange={(e) => setCashInputAmount(e.target.value)}
                  placeholder="যেমন: ১৫০০০"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white font-mono font-bold text-xs focus:ring-0 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {metrics.hasCashOverride && (
                <div className="text-[10.5px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-2 rounded-xl">
                  ℹ️ ইতিমধ্যে ম্যানুয়াল ক্যাশ এন্ট্রি করা আছে। স্বয়ংক্রিয় গণনায় ফিরে যেতে নিচের বাটন চাপুন।
                </div>
              )}

              <div className="flex gap-2.5 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCash(false)}
                  className="flex-1 py-2 px-3 bg-slate-850 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                {metrics.hasCashOverride && (
                  <button
                    type="button"
                    onClick={handleClearCashOverride}
                    className="py-2 px-3 bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-500/20 hover:border-amber-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    title="রিসেট ড্যাশবোর্ড ক্যালকুলেটর"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>অটো হিসাব</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>সংরক্ষণ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
