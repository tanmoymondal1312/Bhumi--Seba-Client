/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, IncomeRecord, ExpenseRecord, BKashRecord } from '../types';
import { SERVICE_METADATA, EXPENSE_METADATA } from '../data/mockData';
import { getDailyIncomeMetrics, getIncomeSum, getTodayStr, formatBanglaDate } from '../utils/finance';
import { 
  TrendingUp, TrendingDown, Clock, Award, AlertCircle, 
  Download, Printer, FileSpreadsheet, CheckCircle2, RefreshCw,
  ShieldCheck, Calendar, DollarSign, Layers, Receipt, ArrowUpRight, ArrowDownLeft, Percent
} from 'lucide-react';

interface ReportsManagerProps {
  incomeList: IncomeRecord[];
  expenseList: ExpenseRecord[];
  bkashList: BKashRecord[];
  currentUser: User;
  servicesMetadata?: Record<string, { bangla: string; english: string; color: string; defaultPrice: number }>;
}

export default function ReportsManager({ incomeList, expenseList, bkashList = [], currentUser, servicesMetadata }: ReportsManagerProps) {
  const isOwner = currentUser.role !== 'STAFF';

  // Dynamic Months List
  const sortedMonthsList = useMemo(() => {
    const monthsSet = new Set<string>();
    incomeList.forEach(inc => {
      if (inc.date && inc.date.length >= 7) {
        monthsSet.add(inc.date.substring(0, 7));
      }
    });
    expenseList.forEach(exp => {
      if (exp.date && exp.date.length >= 7) {
        monthsSet.add(exp.date.substring(0, 7));
      }
    });
    if (monthsSet.size === 0) {
      monthsSet.add('2026-06');
    }
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [incomeList, expenseList]);

  // Selected Month State for Owner Report
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7); // "2026-06"
    
    const monthsSet = new Set<string>();
    incomeList.forEach(inc => { if (inc.date && inc.date.length >= 7) monthsSet.add(inc.date.substring(0, 7)); });
    expenseList.forEach(exp => { if (exp.date && exp.date.length >= 7) monthsSet.add(exp.date.substring(0, 7)); });
    const list = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    
    if (list.includes(currentMonthStr)) return currentMonthStr;
    return list[0] || currentMonthStr;
  });

  // Calculate detailed stats for the selected active month
  const activeMonthReport = useMemo(() => {
    const mIncomes = incomeList.filter(inc => inc.date.startsWith(selectedMonth));
    const mExpenses = expenseList.filter(exp => exp.date.startsWith(selectedMonth));

    const totalIncome = mIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = mExpenses.reduce((sum, item) => sum + item.amount, 0);
    const netProfit = totalIncome - totalExpense;

    // Service wise income breakdown
    const servicesMap: Record<string, { count: number; sum: number }> = {};
    const metadataToUse = servicesMetadata || SERVICE_METADATA;

    // Initialize map
    Object.keys(metadataToUse).forEach(svc => {
      servicesMap[svc] = { count: 0, sum: 0 };
    });

    // Count
    mIncomes.forEach(inc => {
      if (!servicesMap[inc.serviceType]) {
        servicesMap[inc.serviceType] = { count: 0, sum: 0 };
      }
      servicesMap[inc.serviceType].count += 1;
      servicesMap[inc.serviceType].sum += inc.amount;
    });

    const servicesReport = Object.entries(servicesMap).map(([key, val]) => {
      const meta = metadataToUse[key] || { bangla: key, english: key, color: 'from-slate-500 to-slate-700' };
      return {
        key,
        bangla: meta.bangla,
        color: meta.color,
        count: val.count,
        sum: val.sum
      };
    }).sort((a, b) => b.sum - a.sum);

    // Expense category breakdown
    const expensesMap: Record<string, { sum: number; count: number }> = {};
    Object.keys(EXPENSE_METADATA).forEach(cat => {
      expensesMap[cat] = { sum: 0, count: 0 };
    });

    mExpenses.forEach(exp => {
      if (!expensesMap[exp.category]) {
        expensesMap[exp.category] = { sum: 0, count: 0 };
      }
      expensesMap[exp.category].sum += exp.amount;
      expensesMap[exp.category].count += 1;
    });

    const expensesReport = Object.entries(expensesMap).map(([key, val]) => {
      const meta = EXPENSE_METADATA[key] || { bangla: key, english: key, color: 'bg-slate-500' };
      return {
        key,
        bangla: meta.bangla,
        color: meta.color,
        count: val.count,
        sum: val.sum
      };
    }).sort((a, b) => b.sum - a.sum);

    const [yearValStr, monthValStr] = selectedMonth.split('-');
    const reportYear = parseInt(yearValStr, 10);
    const reportMonthNum = parseInt(monthValStr, 10);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === reportYear && (today.getMonth() + 1) === reportMonthNum;

    const daysInMonth = new Date(reportYear, reportMonthNum, 0).getDate();
    const endDay = isCurrentMonth ? today.getDate() : daysInMonth;

    let openDaysCount = 0;
    let closedDaysCount = 0;
    const closedDaysList: string[] = [];
    const openDaysList: string[] = [];

    for (let d = 1; d <= endDay; d++) {
      const dateStr = `${yearValStr}-${monthValStr}-${String(d).padStart(2, '0')}`;
      const hasIncome = incomeList.some(inc => inc.date === dateStr);
      if (hasIncome) {
        openDaysCount++;
        openDaysList.push(dateStr);
      } else {
        closedDaysCount++;
        closedDaysList.push(dateStr);
      }
    }

    const rentVal = mExpenses.filter(e => e.category === 'RENT').reduce((sum, item) => sum + item.amount, 0) || 6000;
    const elecVal = mExpenses.filter(e => e.category === 'ELECTRICITY').reduce((sum, item) => sum + item.amount, 0) || 1850;
    const netVal = mExpenses.filter(e => e.category === 'INTERNET').reduce((sum, item) => sum + item.amount, 0) || 800;
    const salVal = mExpenses.filter(e => e.category === 'SALARY').reduce((sum, item) => sum + item.amount, 0) || 8000;
    const extraVal = mExpenses
      .filter(e => !['RENT', 'ELECTRICITY', 'INTERNET', 'SALARY'].includes(e.category))
      .reduce((sum, item) => sum + item.amount, 0);

    const totalDeductions = rentVal + elecVal + netVal + salVal + extraVal;
    const dailyFixedLoss = Math.round(totalDeductions / 30);
    const totalClosedDaysLoss = closedDaysCount * dailyFixedLoss;
    const averageIncomePerOpenDay = openDaysCount > 0 ? Math.round(totalIncome / openDaysCount) : 0;

    // bKash Monthly Financial calculations
    const monthBkashItems = bkashList.filter(item => item.date.startsWith(selectedMonth));
    const totalBkashIn = monthBkashItems
      .filter(item => item.type === 'IN')
      .reduce((sum, item) => sum + item.amount, 0);
    const totalBkashPayment = monthBkashItems
      .filter(item => item.type === 'PAYMENT')
      .reduce((sum, item) => sum + item.amount, 0);
    const totalBkashOut = monthBkashItems
      .filter(item => item.type === 'OUT')
      .reduce((sum, item) => sum + item.amount + (item.fee || 0), 0);
    const totalBkashSpent = totalBkashPayment + totalBkashOut;

    const [year, mNum] = selectedMonth.split('-');
    const monthNamesBg: Record<string, string> = {
      '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ',
      '04': 'এপ্রিল', '05': 'মে', '06': 'জুন',
      '07': 'জুলাই', '08': 'আগস্ট', '09': 'সেপ্টেম্বর',
      '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
    };
    const monthLabelVal = mNum ? `${monthNamesBg[mNum] || mNum} ${year}` : selectedMonth;

    return {
      totalIncome,
      totalExpense,
      netProfit,
      servicesReport,
      expensesReport,
      monthLabel: monthLabelVal,
      openDaysCount,
      closedDaysCount,
      closedDaysList,
      openDaysList,
      dailyFixedLoss,
      totalClosedDaysLoss,
      averageIncomePerOpenDay,
      totalDeductions,
      rentVal,
      elecVal,
      netVal,
      salVal,
      extraVal,
      totalBkashIn,
      totalBkashSpent,
      totalBkashPayment,
      totalBkashOut,
      bkashItemsCount: monthBkashItems.length
    };
  }, [selectedMonth, incomeList, expenseList, bkashList, servicesMetadata]);

  // Exporting simulation state
  const [exportModal, setExportModal] = useState<boolean>(false);
  const [exportType, setExportType] = useState<'PDF' | 'EXCEL' | null>(null);
  const [successStatus, setSuccessStatus] = useState<boolean>(false);
  const [reportMonth, setReportMonth] = useState<string>('জুন ২০২৬');

  // ANALYTICAL CALCULATIONS
  const stats = useMemo(() => {
    // 1. Group income by date using daily helper
    const incomeByDate: Record<string, number> = {};
    const dates = Array.from(new Set(incomeList.map(i => i.date)));
    dates.forEach(d => {
      incomeByDate[d] = getDailyIncomeMetrics(d, incomeList).total;
    });

    let highestIncomeDay = { date: 'N/A', amount: 0 };
    let lowestIncomeDay = { date: 'N/A', amount: 9999999 };

    dates.forEach(d => {
      const amt = incomeByDate[d];
      if (amt > highestIncomeDay.amount) {
        highestIncomeDay = { date: d, amount: amt };
      }
      if (amt < lowestIncomeDay.amount) {
        lowestIncomeDay = { date: d, amount: amt };
      }
    });

    if (dates.length === 0) {
      lowestIncomeDay.amount = 0;
    }

    // 2. Hourly Income / Profit breakdown for today dynamically
    const todayStr = getTodayStr();
    const hourlyRanges = [
      { id: 'morning', label: 'সকাল ৯:০০ - সকাল ১১:০০', income: 0, expense: 0 },
      { id: 'noon', label: 'সকাল ১১:০০ - দুপুর ১:০০', income: 0, expense: 0 },
      { id: 'midday', label: 'দুপুর ১:০০ - বিকাল ৩:০০', income: 0, expense: 0 },
      { id: 'afternoon', label: 'বিকাল ৩:০০ - সন্ধ্যা ৬:০০', income: 0, expense: 0 }
    ];

    incomeList.filter(i => i.date === todayStr).forEach(item => {
      const hr = parseInt(item.time.split(':')[0], 10);
      if (hr >= 9 && hr < 11) hourlyRanges[0].income += item.amount;
      else if (hr >= 11 && hr < 13) hourlyRanges[1].income += item.amount;
      else if (hr >= 13 && hr < 15) hourlyRanges[2].income += item.amount;
      else if (hr >= 15 && hr <= 18) hourlyRanges[3].income += item.amount;
    });

    expenseList.filter(e => e.date === todayStr).forEach(item => {
      const hr = parseInt(item.time.split(':')[0], 10);
      if (hr >= 9 && hr < 11) hourlyRanges[0].expense += item.amount;
      else if (hr >= 11 && hr < 13) hourlyRanges[1].expense += item.amount;
      else if (hr >= 13 && hr < 15) hourlyRanges[2].expense += item.amount;
      else if (hr >= 15 && hr <= 18) hourlyRanges[3].expense += item.amount;
    });

    // 3. Loss Analyses: check if any days on recent history was unprofitable
    const unprofitableDays: { date: string; income: number; expense: number; loss: number }[] = [];
    const allDates = Array.from(new Set([...incomeList.map(i => i.date), ...expenseList.map(e => e.date)]));
    allDates.forEach(dateStr => {
      const inc = getDailyIncomeMetrics(dateStr, incomeList).total;
      const exp = expenseList.filter(e => e.date === dateStr).reduce((sum, item) => sum + item.amount, 0);
      if (exp > inc) {
        unprofitableDays.push({
          date: dateStr,
          income: inc,
          expense: exp,
          loss: exp - inc
        });
      }
    });

    // Sort losses descendants
    unprofitableDays.sort((a, b) => b.loss - a.loss);

    // Month totals
    const monthIncome = getIncomeSum(incomeList).total;
    const monthExpense = expenseList.reduce((sum, e) => sum + e.amount, 0);

    return {
      highestIncomeDay,
      lowestIncomeDay,
      hourlyRanges,
      unprofitableDays,
      monthIncome,
      monthExpense
    };
  }, [incomeList, expenseList]);

  const serviceBanglaNames: Record<string, string> = {
    NAMJARI: 'নামজারি আবেদন',
    KHOTIYAN: 'খতিয়ান উত্তোলন',
    PORCHA: 'পর্চা সংগ্রহ',
    DOLIL: 'দলিল লিখন / যাচাই',
    LAND_APP: 'ভূমি আবেদন',
    OTHERS: 'অন্যান্য সার্ভিস'
  };

  const expenseBanglaNames: Record<string, string> = {
    RENT: 'ঘর ভাড়া',
    ELECTRICITY: 'কারেন্ট বিল',
    INTERNET: 'ইন্টারনেট বিল',
    SALARY: 'কর্মচারী বেতন',
    OFFICE: 'অফিস খরচ/চা-নাস্তা',
    TRAVEL: 'যাতায়াত খরচ',
    PRINT: 'প্রিন্ট/ফটোকপি কাগজ ও কালার',
    OTHERS: 'অন্যান্য খরচ'
  };

  const smartMonthlyReport = useMemo(() => {
    // Collect all unique months present in both lists (YYYY-MM)
    const monthsSet = new Set<string>();
    incomeList.forEach(inc => {
      if (inc.date && inc.date.length >= 7) {
        monthsSet.add(inc.date.substring(0, 7));
      }
    });
    expenseList.forEach(exp => {
      if (exp.date && exp.date.length >= 7) {
        monthsSet.add(exp.date.substring(0, 7));
      }
    });

    const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));

    return sortedMonths.map(month => {
      const monthIncomes = incomeList.filter(inc => inc.date.startsWith(month));
      const monthExpenses = expenseList.filter(exp => exp.date.startsWith(month));

      // Group income by service type
      const serviceCounts: Record<string, number> = {};
      const serviceSums: Record<string, number> = {};

      monthIncomes.forEach(inc => {
        serviceCounts[inc.serviceType] = (serviceCounts[inc.serviceType] || 0) + 1;
        serviceSums[inc.serviceType] = (serviceSums[inc.serviceType] || 0) + inc.amount;
      });

      let topService = '';
      let topServiceRevenue = 0;
      let topServiceCount = 0;

      Object.entries(serviceSums).forEach(([svc, sum]) => {
        if (sum > topServiceRevenue) {
          topService = svc;
          topServiceRevenue = sum;
          topServiceCount = serviceCounts[svc] || 0;
        }
      });

      // Group expense by category
      const expenseSums: Record<string, number> = {};
      monthExpenses.forEach(exp => {
        expenseSums[exp.category] = (expenseSums[exp.category] || 0) + exp.amount;
      });

      let topExpenseCat = '';
      let topExpenseAmount = 0;

      Object.entries(expenseSums).forEach(([cat, sum]) => {
        if (sum > topExpenseAmount) {
          topExpenseCat = cat;
          topExpenseAmount = sum;
        }
      });

      const [year, mNum] = month.split('-');
      const monthNamesBg: Record<string, string> = {
        '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ',
        '04': 'এপ্রিল', '05': 'মে', '06': 'জুন',
        '07': 'জুলাই', '08': 'আগস্ট', '09': 'সেপ্টেম্বর',
        '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
      };
      const monthLabel = mNum ? `${monthNamesBg[mNum] || mNum} ${year}` : month;

      return {
        month,
        monthLabel,
        topService,
        topServiceRevenue,
        topServiceCount,
        topExpenseCat,
        topExpenseAmount,
        totalIncome: monthIncomes.reduce((s, x) => s + x.amount, 0),
        totalExpense: monthExpenses.reduce((s, x) => s + x.amount, 0)
      };
    });
  }, [incomeList, expenseList]);

  const handlePrintPDF = () => {
    const r = activeMonthReport;
    const profitColor = r.netProfit >= 0 ? '#059669' : '#dc2626';
    const profitLabel = r.netProfit >= 0 ? 'নিট লাভ' : 'নিট লোকসান';
    const now = new Date();
    const printTime = now.toLocaleString('bn-BD', { dateStyle: 'long', timeStyle: 'short' });

    const servicesRows = r.servicesReport.filter(s => s.count > 0).map((svc, i) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;">${svc.bangla}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:center;">${svc.count}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#059669;">৳${svc.sum.toLocaleString()}</td>
      </tr>
    `).join('');

    const expenseRows = r.expensesReport.filter(e => e.count > 0).map((exp, i) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;">${exp.bangla}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:center;">${exp.count}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#dc2626;">৳${exp.sum.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>আর্থিক প্রতিবেদন — ${r.monthLabel}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Noto Sans Bengali','Segoe UI',sans-serif; background:#f1f5f9; color:#1e293b; line-height:1.6; }
  .page { max-width:800px; margin:20px auto; background:#fff; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden; }

  .header { background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%); color:#fff; padding:36px 40px 28px; position:relative; }
  .header::after { content:''; position:absolute; bottom:0; left:0; right:0; height:4px; background:linear-gradient(90deg,#10b981,#3b82f6,#8b5cf6); }
  .logo-row { display:flex; align-items:center; gap:14px; margin-bottom:8px; }
  .logo-icon { width:48px; height:48px; background:linear-gradient(135deg,#10b981,#059669); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 4px 12px rgba(16,185,129,0.3); }
  .logo-text h1 { font-size:22px; font-weight:800; letter-spacing:-0.3px; }
  .logo-text p { font-size:11px; opacity:0.7; font-weight:500; letter-spacing:0.5px; }
  .report-badge { display:inline-block; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); padding:6px 16px; border-radius:20px; font-size:13px; font-weight:600; margin-top:12px; }

  .meta-strip { display:flex; justify-content:space-between; padding:16px 40px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:12px; color:#64748b; }
  .meta-strip span { font-weight:600; color:#334155; }

  .body { padding:32px 40px 40px; }

  .summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:32px; }
  .summary-card { border-radius:12px; padding:20px; text-align:center; border:1px solid #e2e8f0; }
  .summary-card.green { background:linear-gradient(135deg,#ecfdf5,#d1fae5); border-color:#a7f3d0; }
  .summary-card.red { background:linear-gradient(135deg,#fef2f2,#fee2e2); border-color:#fecaca; }
  .summary-card.blue { background:linear-gradient(135deg,#eff6ff,#dbeafe); border-color:#bfdbfe; }
  .summary-card .label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; margin-bottom:6px; }
  .summary-card .amount { font-size:26px; font-weight:800; }
  .summary-card.green .amount { color:#059669; }
  .summary-card.red .amount { color:#dc2626; }
  .summary-card.blue .amount { color:#2563eb; }

  .section { margin-bottom:28px; }
  .section-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:10px; border-bottom:2px solid #e2e8f0; }
  .section-num { width:28px; height:28px; background:#4f46e5; color:#fff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
  .section-title { font-size:15px; font-weight:700; color:#0f172a; }

  table { width:100%; border-collapse:collapse; font-size:13px; }
  thead th { background:#f1f5f9; padding:10px 14px; text-align:left; font-weight:700; color:#475569; border-bottom:2px solid #cbd5e1; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; }
  thead th.r { text-align:right; }
  thead th.c { text-align:center; }
  tbody tr:hover { background:#f8fafc; }
  .total-row { background:#f1f5f9 !important; }
  .total-row td { font-weight:800 !important; font-size:14px; padding:12px 14px; border-top:2px solid #cbd5e1; }

  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .info-item { display:flex; justify-content:space-between; padding:10px 14px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; font-size:13px; }
  .info-item .k { color:#64748b; font-weight:500; }
  .info-item .v { font-weight:700; color:#0f172a; }

  .bkash-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:10px; }
  .bk-card { padding:16px; border-radius:10px; text-align:center; }
  .bk-card.in { background:#ecfdf5; border:1px solid #a7f3d0; }
  .bk-card.out { background:#fef2f2; border:1px solid #fecaca; }
  .bk-card.count { background:#eff6ff; border:1px solid #bfdbfe; }
  .bk-card .bk-label { font-size:11px; color:#64748b; font-weight:600; margin-bottom:4px; }
  .bk-card .bk-val { font-size:20px; font-weight:800; }
  .bk-card.in .bk-val { color:#059669; }
  .bk-card.out .bk-val { color:#dc2626; }
  .bk-card.count .bk-val { color:#2563eb; }

  .footer { margin-top:40px; padding-top:20px; border-top:2px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; font-size:10px; color:#94a3b8; }
  .footer-left { max-width:60%; }
  .footer-seal { width:60px; height:60px; border:2px solid #cbd5e1; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:8px; color:#94a3b8; text-align:center; font-weight:700; line-height:1.2; }

  .print-bar { position:fixed; bottom:0; left:0; right:0; background:#0f172a; padding:12px 24px; display:flex; justify-content:center; gap:12px; z-index:100; box-shadow:0 -4px 20px rgba(0,0,0,0.2); }
  .print-bar button { padding:10px 28px; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Noto Sans Bengali',sans-serif; }
  .btn-print { background:linear-gradient(135deg,#10b981,#059669); color:#fff; }
  .btn-print:hover { background:linear-gradient(135deg,#059669,#047857); }
  .btn-close { background:#334155; color:#cbd5e1; }
  .btn-close:hover { background:#475569; }

  @media print {
    body { background:#fff; }
    .page { margin:0; box-shadow:none; border-radius:0; }
    .print-bar { display:none !important; }
    .header::after { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
    .summary-card, .bk-card, .info-item, thead th, .total-row, .section-num { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-row">
      <div class="logo-icon">🏛</div>
      <div class="logo-text">
        <h1>ভূমি সেবা সহায়তা কেন্দ্র</h1>
        <p>BHUMI SEVA SAHAYATA KENDRA</p>
      </div>
    </div>
    <div class="report-badge">📊 মাসিক আর্থিক প্রতিবেদন — ${r.monthLabel}</div>
  </div>

  <div class="meta-strip">
    <div>প্রস্তুতকারক: <span>${currentUser.name}</span> (${currentUser.role === 'STAFF' ? 'কর্মচারী' : 'মালিক'})</div>
    <div>প্রস্তুতের সময়: <span>${printTime}</span></div>
    <div>রিপোর্ট পিরিয়ড: <span>${selectedMonth}</span></div>
  </div>

  <div class="body">
    <div class="summary-grid">
      <div class="summary-card green">
        <div class="label">মোট সেবা রাজস্ব</div>
        <div class="amount">৳${r.totalIncome.toLocaleString()}</div>
      </div>
      <div class="summary-card red">
        <div class="label">মোট পরিচালন ব্যয়</div>
        <div class="amount">৳${r.totalExpense.toLocaleString()}</div>
      </div>
      <div class="summary-card blue">
        <div class="label">${profitLabel}</div>
        <div class="amount" style="color:${profitColor}">৳${r.netProfit.toLocaleString()}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-num">১</div>
        <div class="section-title">দোকান পরিচালনা পরিসংখ্যান</div>
      </div>
      <div class="info-grid">
        <div class="info-item"><span class="k">দোকান খোলা ছিল</span><span class="v">${r.openDaysCount} দিন</span></div>
        <div class="info-item"><span class="k">দোকান বন্ধ ছিল</span><span class="v">${r.closedDaysCount} দিন</span></div>
        <div class="info-item"><span class="k">দৈনিক গড় আয় (খোলা দিন)</span><span class="v" style="color:#059669">৳${r.averageIncomePerOpenDay.toLocaleString()}</span></div>
        <div class="info-item"><span class="k">দৈনিক স্থায়ী খরচ</span><span class="v">৳${r.dailyFixedLoss.toLocaleString()}</span></div>
        <div class="info-item"><span class="k">বন্ধ দিনে পুঞ্জীভূত লস</span><span class="v" style="color:#dc2626">৳${r.totalClosedDaysLoss.toLocaleString()}</span></div>
        <div class="info-item"><span class="k">দৈনিক গড় পরিচালন খরচ</span><span class="v">৳${Math.round(r.totalDeductions / 30).toLocaleString()}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-num">২</div>
        <div class="section-title">সেবা খাতভিত্তিক আয়ের বিশ্লেষণ</div>
      </div>
      <table>
        <thead><tr><th>ক্র.</th><th>সেবার নাম</th><th class="c">আবেদন সংখ্যা</th><th class="r">মোট রাজস্ব</th></tr></thead>
        <tbody>
          ${servicesRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8;">এই মাসে কোনো সেবা আয় নেই</td></tr>'}
          <tr class="total-row">
            <td colspan="3">সর্বমোট সেবা রাজস্ব</td>
            <td style="text-align:right;color:#059669;">৳${r.totalIncome.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-num">৩</div>
        <div class="section-title">ব্যয় খাতভিত্তিক বিশ্লেষণ</div>
      </div>
      <table>
        <thead><tr><th>ক্র.</th><th>খাতের নাম</th><th class="c">লেনদেন সংখ্যা</th><th class="r">ব্যয়ের পরিমাণ</th></tr></thead>
        <tbody>
          ${expenseRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8;">এই মাসে কোনো ব্যয় নেই</td></tr>'}
          <tr class="total-row">
            <td colspan="3">সর্বমোট পরিচালন ব্যয়</td>
            <td style="text-align:right;color:#dc2626;">৳${r.totalExpense.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-num">৪</div>
        <div class="section-title">স্থায়ী খরচ ব্রেকডাউন</div>
      </div>
      <div class="info-grid">
        <div class="info-item"><span class="k">দোকান ঘর ভাড়া</span><span class="v">৳${r.rentVal.toLocaleString()}</span></div>
        <div class="info-item"><span class="k">বিদ্যুৎ বিল</span><span class="v">৳${r.elecVal.toLocaleString()}</span></div>
        <div class="info-item"><span class="k">ইন্টারনেট বিল</span><span class="v">৳${r.netVal.toLocaleString()}</span></div>
        <div class="info-item"><span class="k">কর্মচারী বেতন</span><span class="v">৳${r.salVal.toLocaleString()}</span></div>
        <div class="info-item"><span class="k">অন্যান্য খরচ</span><span class="v">৳${r.extraVal.toLocaleString()}</span></div>
        <div class="info-item" style="background:#f1f5f9;border-color:#cbd5e1;"><span class="k" style="color:#0f172a;font-weight:700;">সর্বমোট স্থায়ী ব্যয়</span><span class="v" style="color:#dc2626;">৳${r.totalDeductions.toLocaleString()}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-num">৫</div>
        <div class="section-title">বিকাশ লেনদেন সারসংক্ষেপ</div>
      </div>
      <div class="bkash-grid">
        <div class="bk-card in"><div class="bk-label">বিকাশ ক্যাশ-ইন</div><div class="bk-val">৳${r.totalBkashIn.toLocaleString()}</div></div>
        <div class="bk-card out"><div class="bk-label">বিকাশ মোট ব্যয়</div><div class="bk-val">৳${r.totalBkashSpent.toLocaleString()}</div></div>
        <div class="bk-card count"><div class="bk-label">মোট লেনদেন</div><div class="bk-val">${r.bkashItemsCount} টি</div></div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        এই আর্থিক প্রতিবেদনটি <strong>ভূমি সেবা সহায়তা কেন্দ্র</strong> সফটওয়্যার সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে তৈরি হয়েছে।<br/>
        প্রতিবেদনটি অফিসিয়াল ব্যবসায়িক রেকর্ড সংরক্ষণ ও হিসাব নিরীক্ষার জন্য গ্রহণযোগ্য।
      </div>
      <div class="footer-seal">অডিট<br/>সিল</div>
    </div>
  </div>
</div>

<div class="print-bar">
  <button class="btn-print" onclick="window.print()">🖨️ প্রিন্ট / PDF সেভ করুন</button>
  <button class="btn-close" onclick="window.close()">✕ বন্ধ করুন</button>
</div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const generateTextReport = () => {
    const report = `=======================================================
               ভূমি সেবা সহায়তা কেন্দ্র অডিট রিপোর্ট
=======================================================
রিপোর্ট পিরিয়ড: ${activeMonthReport.monthLabel} (${selectedMonth})
প্রস্তুতকারক ইউজার: ${currentUser.name} (রোল: ${currentUser.role === 'STAFF' ? 'কর্মচারী' : 'দোকান মালিক'})
রিপোর্ট প্রস্তুতের সময়: ${new Date().toLocaleString('bn-BD')}
=======================================================

১. সামগ্রিক আয়ের সারসংক্ষেপ (Overall Summary)
-------------------------------------------------------
মোট অর্জিত সেবা রাজস্ব (Revenue): ৳${activeMonthReport.totalIncome.toLocaleString('bn-BD')}
মোট দোকান পরিচালন ব্যয় (Expense): ৳${activeMonthReport.totalExpense.toLocaleString('bn-BD')}
-------------------------------------------------------
নিট লাভ/লোকসান (Net Profit/Loss): ৳${activeMonthReport.netProfit.toLocaleString('bn-BD')} ${activeMonthReport.netProfit >= 0 ? '[নিট লাভ]' : '[নিট লোকসান]'}

২. দোকান উপস্থিতি ও পরিচালনা পরিসংখ্যান (Attendance & Loss Analysis)
-------------------------------------------------------
দোকান খোলা ছিল: ${activeMonthReport.openDaysCount} দিন
দোকান বন্ধ ছিল: ${activeMonthReport.closedDaysCount} দিন
দৈনিক ফিক্সড পরিচালন খরচ (দৈনিক গড়): ৳${activeMonthReport.dailyFixedLoss.toLocaleString('bn-BD')}
দোকান বন্ধ থাকার কারণে আনুমানিক মোট সিস্টেম লস: ৳${activeMonthReport.totalClosedDaysLoss.toLocaleString('bn-BD')}
খোলা দিনে দৈনিক গড় ইনকাম: ৳${activeMonthReport.averageIncomePerOpenDay.toLocaleString('bn-BD')}

৩. বিকাশ ফিনান্স লেনদেন হিসাব (bKash Financial Audit)
-------------------------------------------------------
বিকাশ মোট ক্যাশ এন্ট্রি (In/Load): ৳${activeMonthReport.totalBkashIn.toLocaleString('bn-BD')}
বিকাশ মোট খরচ/পেমেন্ট (Spent/Out): ৳${activeMonthReport.totalBkashSpent.toLocaleString('bn-BD')}
(এর মধ্যে ক্যাশ-আউট পেমেন্ট: ৳${activeMonthReport.totalBkashOut.toLocaleString('bn-BD')}, সরকারি ফি: ৳${activeMonthReport.totalBkashPayment.toLocaleString('bn-BD')})
মোট বিকাশ লেনদেন সংখ্যা: ${activeMonthReport.bkashItemsCount} টি ভাউচার

৪. ইউটিলিটি ও পরিচালন খরচ ব্রেকডাউন (Utilities Breakdown)
-------------------------------------------------------
ঘর ভাড়া (Rent): ৳${activeMonthReport.rentVal.toLocaleString('bn-BD')}
কারেন্ট বিল (Electricity): ৳${activeMonthReport.elecVal.toLocaleString('bn-BD')}
ইন্টারনেট বিল (Internet): ৳${activeMonthReport.netVal.toLocaleString('bn-BD')}
স্টাফ বেতন (Salary): ৳${activeMonthReport.salVal.toLocaleString('bn-BD')}
অন্যান্য সাধারণ খরচ (Office & Misc Expenses): ৳${activeMonthReport.extraVal.toLocaleString('bn-BD')}
-------------------------------------------------------
সর্বমোট মাসিক পরিচালনা বাজেট খরচ: ৳${activeMonthReport.totalDeductions.toLocaleString('bn-BD')}

৫. বিস্তারিত সেবা খাতভিত্তিক আয় (Service-wise Revenue)
-------------------------------------------------------
${activeMonthReport.servicesReport.map((svc, idx) => `${idx + 1}. ${svc.bangla}: ৳${svc.sum.toLocaleString('bn-BD')} (${svc.count} টি আবেদন)`).join('\n')}

=======================================================
       * এই হিসাবপত্রটি একটি ডিজিটাল সিস্টেম জেনারেটেড বিবরণী *
=======================================================`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bhumiseva_Smart_Report_${selectedMonth}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulate exporting report triggers
  const handleExportSimulate = (type: 'PDF' | 'EXCEL') => {
    setExportType(type);
    setExportModal(true);
    setSuccessStatus(false);

    // Mock progress delay
    setTimeout(() => {
      setSuccessStatus(true);
      if (type === 'PDF') {
        handlePrintPDF();
      } else {
        generateTextReport();
      }
    }, 1200);
  };

  if (!isOwner) {
    return (
      <div id="reports-restircted-staff" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-350">
        <h2 className="text-lg font-bold text-slate-100 mb-2">অনুমতি নেই (Access Restricted)</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
          দুঃখিত! এই ফাইন্যান্সিয়াল অডিট এবং স্মার্ট রিপোর্ট ম্যানেজার দেখার অনুমতি শুধুমাত্র দোকানের মালিকদের রয়েছে। কর্মচারী স্তরের একাউন্ট দিয়ে এগুলো দেখা সম্ভব নয়।
        </p>
        <div className="inline-flex py-1.5 px-3 rounded-lg bg-rose-950/20 text-rose-400 text-xs">
          * আপনার একাউন্ট রোল: STAFF (স্টাফ)
        </div>
      </div>
    );
  }

  return (
    <div id="reports-tab" className="space-y-6">
      
      {/* EXPORT ACTION CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
            স্মার্ট রিপোর্ট এনালাইটিক্স বোর্ড (Analytics Reports)
          </h2>
          <p className="text-xs text-slate-400">ব্যবসায়িক লাভ-লোকসান, দিন ও প্রফিট গ্রোথ ট্র্যাকিং</p>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            id="btn-export-pdf"
            onClick={() => handleExportSimulate('PDF')}
            className="flex items-center space-x-1.5 py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-xl border border-slate-705/80 cursor-pointer transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>PDF রিপোর্ট ডাউনলোড</span>
          </button>

          <button
            id="btn-export-excel"
            onClick={() => handleExportSimulate('EXCEL')}
            className="flex items-center space-x-1.5 py-2 px-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition shadow-emerald-500/10"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>Excel লেজার এক্সপোর্ট</span>
          </button>
        </div>
      </div>

      {/* THREE ANALYTICS ANALYST WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Widget 1: Highest vs Lowest Days */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center">
            <Award className="w-4 h-4 text-amber-400 mr-1.5" />
            শীর্ষ বিক্রয় ও রাজস্ব দিবস
          </h3>

          <div className="space-y-4">
            
            {/* Highest Day */}
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider font-mono">সর্বোচ্চ আয়ের দিন (Peak)</span>
              <p className="text-xl font-bold font-mono text-emerald-400/90 mt-1">৳{stats.highestIncomeDay.amount.toLocaleString()}</p>
              <div className="text-slate-450 text-[11px] mt-1 flex items-center justify-between font-mono">
                <span>তারিখ: {stats.highestIncomeDay.date}</span>
                <span className="text-emerald-500/90 font-bold">১০১% রেট</span>
              </div>
            </div>

            {/* Lowest Day */}
            <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">সর্বনিম্ন আয়ের দিন</span>
              <p className="text-xl font-bold font-mono text-slate-300 mt-1">৳{stats.lowestIncomeDay.amount === 9999999 ? 0 : stats.lowestIncomeDay.amount.toLocaleString()}</p>
              <div className="text-slate-500 text-[11px] mt-1 flex items-center justify-between font-mono">
                <span>তারিখ: {stats.lowestIncomeDay.date}</span>
                <span>বেসলাইন</span>
              </div>
            </div>

          </div>
        </div>

        {/* Widget 2: Loss & Variable Analysis */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center">
              <AlertCircle className="w-4.5 h-4.5 text-rose-450 mr-1.5" />
              লোকসান ও ভারসাম্য সতর্কতা বুক
            </h3>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {stats.unprofitableDays.length === 0 ? (
                <div className="text-center py-6 text-slate-500 italic text-xs">
                  কোনো দিন লোকসান বা ঋণাত্মক মার্জিন পাওয়া যায়নি! ব্যবসা নিরাপদ লাভ সীমানায় সচল।
                </div>
              ) : (
                stats.unprofitableDays.map(day => (
                  <div key={day.date} className="flex items-center justify-between p-2.5 bg-rose-950/20 border border-rose-900/35 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-300 block font-mono font-medium">{day.date}</span>
                      <span className="text-[10px] text-slate-500">আয় ৳{day.income} • ব্যয় ৳{day.expense}</span>
                    </div>
                    <span className="font-mono text-rose-400 font-bold">-৳{day.loss} লোকসান</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-medium leading-relaxed border-t border-slate-850/80 pt-3 mt-3">
            * যদি কোনো দিন দোকানের স্থায়ী বা চলতি খরচ মোট আয়ের থেকে বেশি হয়, তবে উপরোক্ত টেবিলে লাল রঙের এলার্ট দেখাবে।
          </p>
        </div>

        {/* Widget 3: Growth and target speed */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100 mb-2.5 flex items-center">
            <span className="p-1 px-2.5 bg-emerald-500/10 rounded text-emerald-400 font-mono text-[10px] font-bold mr-2">GROWTH</span>
            মাসিক লাভ গ্রোথ লক্ষ্য
          </h3>

          <p className="text-xs text-slate-400 mb-4 select-none leading-relaxed">
            ভূমি সেবা সহায়তা কেন্দ্রের {activeMonthReport.monthLabel} মাসের রাজস্ব লক্ষ্যমাত্রা হচ্ছে <strong className="text-emerald-400">৳৫০,০০০</strong>। লক্ষ্য অর্জনের হার:
          </p>

          <div className="space-y-3 pt-1">
            {/* target bar */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400">সংগৃহীত রেভিন্যু: <strong className="text-emerald-400 font-mono">৳{stats.monthIncome.toLocaleString()}</strong></span>
                <span className="text-slate-300 font-mono font-bold">{Math.round((stats.monthIncome / 50000) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-950 h-3 border border-slate-800 rounded-full overflow-hidden p-0.5">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full" 
                  style={{ width: `${Math.min(100, (stats.monthIncome / 50000) * 100)}%` }} 
                />
              </div>
            </div>

            <div className="text-[10.5px] text-slate-500 font-mono leading-relaxed mt-4 bg-slate-950 p-2 border border-slate-850 rounded-xl">
              বর্তমান মাসিক খরচের রেশিও: <strong className="text-indigo-400">{Math.round((stats.monthExpense / (stats.monthIncome || 1)) * 100)}%</strong> আয়ের তুলনায়।
            </div>
          </div>
        </div>

      </div>

      {/* OWNER'S MONTHLY COMPREHENSIVE FINANCIAL AUDIT REPORT */}
      <div id="owners-detailed-monthly-audit-card" className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden transition duration-300">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-96 h-20 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header containing Owner notice badge */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-widest font-mono mb-1">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>মালিকের বিশেষ অডিট এলাকা (Owner Secure Area)</span>
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5.5 h-5.5 text-emerald-400" />
              মাসিক লাভ-ক্ষতি ও খাতভিত্তিক বিস্তারিত আর্থিক খতিয়ান
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">মালিকের জন্য সব লেনদেন মাস অনুযায়ী সংরক্ষিত প্রতিবেদন</p>
          </div>

          {/* Month selector UI */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-xs font-semibold">মাস নির্বাচন করুন:</span>
            <select
              id="report-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-955 border border-slate-750/80 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-100 font-mono focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              {sortedMonthsList.map(m => {
                const [year, mNum] = m.split('-');
                const monthNamesBg: Record<string, string> = {
                  '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ',
                  '04': 'এপ্রিল', '05': 'মে', '06': 'জুন',
                  '07': 'জুলাই', '08': 'আগস্ট', '09': 'সেপ্টেম্বর',
                  '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসেম্বর'
                };
                const label = mNum ? `${monthNamesBg[mNum] || mNum} ${year}` : m;
                return (
                  <option key={m} value={m}>
                    {label} ({m})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* 1. Monthly Summary Bento Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          
          {/* Total Income Card */}
          <div className="bg-slate-950/60 border border-emerald-500/10 p-4.5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-black tracking-wider block">মোট অর্জিত আয়</span>
              <p className="text-2xl font-black font-mono text-emerald-400">৳{activeMonthReport.totalIncome.toLocaleString()}</p>
              <span className="text-[10px] text-slate-500 block">সেবা প্রদান থেকে সংগৃহীত</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          {/* Total Expense Card */}
          <div className="bg-slate-950/60 border border-rose-500/10 p-4.5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-rose-450 uppercase font-black tracking-wider block">মোট দোকান খরচ</span>
              <p className="text-2xl font-black font-mono text-rose-450">৳{activeMonthReport.totalExpense.toLocaleString()}</p>
              <span className="text-[10px] text-slate-500 block">স্থায়ী ও চলতি খরচের সমষ্টি</span>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>

          {/* Net Profit Card */}
          <div className={`p-4.5 rounded-2xl border flex items-center justify-between ${
            activeMonthReport.netProfit >= 0 
              ? 'bg-emerald-950/20 border-emerald-500/25' 
              : 'bg-rose-950/20 border-rose-500/25'
          }`}>
            <div className="space-y-1">
              <span className={`text-[10px] uppercase font-black tracking-wider block ${
                activeMonthReport.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {activeMonthReport.netProfit >= 0 ? 'নিট লাভ (Net Profit) 👑' : 'নিট লোকসান (Net Loss) ⚠️'}
              </span>
              <p className={`text-2xl font-black font-mono ${
                activeMonthReport.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'
              }`}>
                ৳{activeMonthReport.netProfit.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 block">হিসাবকৃত মূল ব্যবধান</span>
            </div>
            <div className={`p-3 rounded-xl ${
              activeMonthReport.netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* SHOP ATTENDANCE, OPEN/CLOSED STATUS & SYSTEM LOSS ESTIMATE (Requested by User) */}
        <div id="shop-operations-loss-tracker-report" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-400" />
                দোকান পরিচালনা, উপস্থিতি ও বন্ধের লস খতিয়ান ({activeMonthReport.monthLabel})
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">সব সার্ভিস ইনকাম এন্ট্রি ও পরিচালনা ফিক্সড ব্যয়ের দিনভিত্তিক অনুপাত</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono">অডিট পিরিয়ড: {selectedMonth}</span>
            </div>
          </div>

          {/* Bento Grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Card 1: Open Days */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block mb-1">দোকান খোলা ছিল (Days Open)</span>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="text-2xl font-black text-white">
                    {activeMonthReport.openDaysCount.toLocaleString('bn-BD')}
                  </span>
                  <span className="text-xs text-slate-400">দিন</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-900/60 text-xs text-slate-400 leading-normal">
                খোলা দিনে দৈনিক গড় ইনকাম: <strong className="text-emerald-400 font-mono">৳{activeMonthReport.averageIncomePerOpenDay.toLocaleString('bn-BD')}</strong>
              </div>
            </div>

            {/* Card 2: Closed Days */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-amber-500 uppercase font-bold tracking-wider block mb-1">দোকান বন্ধ ছিল (Days Closed)</span>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="text-2xl font-black text-white">
                    {activeMonthReport.closedDaysCount.toLocaleString('bn-BD')}
                  </span>
                  <span className="text-xs text-slate-400">দিন</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-900/60 text-xs text-slate-400 leading-normal">
                প্রতি বন্ধ দিনে গড় ফিক্সড লস: <strong className="text-amber-500 font-mono">৳{activeMonthReport.dailyFixedLoss.toLocaleString('bn-BD')}</strong>
              </div>
            </div>

            {/* Card 3: Total Loss on Closed Days */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-rose-450 uppercase font-bold tracking-wider block mb-1">বন্ধ দিনের মোট লস (Total Closed Loss)</span>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="text-2xl font-black text-rose-455">৳{activeMonthReport.totalClosedDaysLoss.toLocaleString('bn-BD')}</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-900/60 text-[10px] text-slate-400 leading-normal">
                * ঘর ভাড়া, স্টাফ বেতন, বিদ্যুৎ ও নেট বিলের দিনভিত্তিক পুঞ্জীভূত ফিক্সড খরচ।
              </div>
            </div>
          </div>
        </div>

        {/* bKASH & UTILITIES DETAILED FINANCIAL AUDIT (Requested by User) */}
        <div id="bkash-utility-audit-card" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 mb-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-pink-400" />
                বিকাশ ও দোকান ইউটিলিটি খরচ অডিট বিবরণী ({activeMonthReport.monthLabel})
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">বিকাশ ফান্ড লোড, চার্জসহ লেনদেন এবং দোকান পরিচালনার স্থায়ী খরচ বিবরণী</p>
            </div>
            <div className="bg-pink-950/30 border border-pink-900/30 text-pink-400 font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold">
              ডিটেইলস অডিট
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left side: bKash summary stats */}
            <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl space-y-3">
              <h5 className="text-xs font-black text-pink-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-3 bg-pink-500 rounded"></span>
                বিকাশ লেনদেন ভলিউম ও খতিয়ান
              </h5>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">বিকাশ ক্যাশ এন্ট্রি (In)</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">৳{activeMonthReport.totalBkashIn.toLocaleString('bn-BD')}</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5 font-medium">মোট ফান্ড লোড এন্ট্রি</span>
                </div>
                
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">বিকাশ মোট খরচ (Spent)</span>
                  <span className="text-sm font-black text-rose-450 font-mono">৳{activeMonthReport.totalBkashSpent.toLocaleString('bn-BD')}</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5 font-medium">লেনদেন ফি ও সরকারি পেমেন্ট</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/30 p-2.5 rounded-xl border border-slate-900/40 flex justify-between items-center">
                <span>লেনদেন আইটেম সংখ্যা:</span>
                <span className="font-bold text-slate-200">{activeMonthReport.bkashItemsCount} টি ভাউচার</span>
              </div>
            </div>

            {/* Right side: Utilities breakdown details */}
            <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl space-y-3">
              <h5 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-3 bg-indigo-500 rounded"></span>
                স্থায়ী ও ইউটিলিটি বিলের হিসাব
              </h5>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">ঘর ভাড়া:</span>
                  <span className="font-black text-slate-100 font-mono">৳{activeMonthReport.rentVal.toLocaleString()}</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">কারেন্ট বিল:</span>
                  <span className="font-black text-slate-100 font-mono">৳{activeMonthReport.elecVal.toLocaleString()}</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">ইন্টারনেট বিল:</span>
                  <span className="font-black text-slate-100 font-mono">৳{activeMonthReport.netVal.toLocaleString()}</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">কর্মচারী বেতন:</span>
                  <span className="font-black text-slate-100 font-mono">৳{activeMonthReport.salVal.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/30 p-2.5 rounded-xl border border-slate-900/40 flex justify-between items-center">
                <span>অন্যান্য সাধারণ খরচ:</span>
                <span className="font-bold text-rose-300 font-mono">৳{activeMonthReport.extraVal.toLocaleString()}</span>
              </div>
            </div>

          </div>
        </div>

        {/* 2. Side-by-Side Breakdown Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* INCOME DETAIL BREAKDOWN BY SERVICE */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                ১. সেবাভিত্তিক আয়ের প্রতিবেদন (Service-wise Revenue Breakdown)
              </h4>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-0.5 rounded-full font-bold">
                আয় প্লাস
              </span>
            </div>

            <div className="space-y-4">
              {activeMonthReport.servicesReport.map(service => {
                const percentage = activeMonthReport.totalIncome > 0 
                  ? Math.round((service.sum / activeMonthReport.totalIncome) * 100) 
                  : 0;

                return (
                  <div key={service.key} className="space-y-1.5 p-3 hover:bg-slate-900/40 rounded-xl transition">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${service.color || 'from-indigo-500 to-purple-600'}`} />
                        <span className="font-bold text-slate-200">{service.bangla}</span>
                      </div>
                      <div className="text-right flex items-center space-x-3 font-mono">
                        <span className="text-slate-400 text-[11px]">{service.count} টি আবেদন</span>
                        <span className="text-emerald-400 font-bold">৳{service.sum.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar of service percentage share */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`bg-gradient-to-r ${service.color || 'from-emerald-500 to-teal-500'} h-full rounded-full`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* EXPENSE DETAIL BREAKDOWN BY CATEGORY */}
          <div className="bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                ২. খাতভিত্তিক ব্যয়ের বিবরণী (Category-wise Expense Breakdown)
              </h4>
              <span className="text-[10px] font-mono text-rose-400 bg-rose-950/40 border border-rose-900/30 px-2.5 py-0.5 rounded-full font-bold">
                ব্যয় মাইনাস
              </span>
            </div>

            <div className="space-y-4">
              {activeMonthReport.expensesReport.map(exp => {
                const percentage = activeMonthReport.totalExpense > 0 
                  ? Math.round((exp.sum / activeMonthReport.totalExpense) * 100) 
                  : 0;

                return (
                  <div key={exp.key} className="space-y-1.5 p-3 hover:bg-slate-900/40 rounded-xl transition">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${exp.color || 'bg-rose-500'}`} />
                        <span className="font-bold text-slate-200">{exp.bangla}</span>
                      </div>
                      <div className="text-right flex items-center space-x-3 font-mono">
                        <span className="text-slate-400 text-[11px]">{exp.count} বার লেনদেন</span>
                        <span className="text-rose-400 font-bold">৳{exp.sum.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar of expense percentage share */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-rose-500 h-full rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* 3. Owner Smart Insights Area */}
        <div className="mt-6 p-4 bg-slate-950 border border-indigo-950/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-slate-900 rounded-xl text-amber-400 block shrink-0">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-black text-slate-300 block">মালিকের জন্য স্মার্ট নোটিশ ও এআই আর্থিক পর্যালোচনা (Owner Audit Insights)</span>
              <p className="text-xs text-slate-405 leading-relaxed">
                {activeMonthReport.netProfit >= 0 ? (
                  <>
                    অর্থ বছর ২০২৬ এর <strong>{activeMonthReport.monthLabel}</strong> মাসে আপনার ব্যবসায়িক প্রফিট মার্জিন দারুণ রয়েছে। 
                    মোট অর্জিত মুনাফা <strong className="text-emerald-400">৳{activeMonthReport.netProfit.toLocaleString()}</strong>। 
                    সর্বোচ্চ অবদানকারী খাত ছিল <strong className="text-indigo-400">{activeMonthReport.servicesReport[0]?.bangla || 'N/A'} (৳{activeMonthReport.servicesReport[0]?.sum?.toLocaleString()})</strong>। 
                    চলতি ব্যয়ের রেশিও নিয়ন্ত্রণ করায় লাভজনক প্রবৃদ্ধি বজায় রয়েছে।
                  </>
                ) : (
                  <>
                    লক্ষ্য করুন! <strong>{activeMonthReport.monthLabel}</strong> মাসে দোকানের মোট আয়ের চেয়ে দোকানের ভাড়া ও অন্যান্য ইউটিলিটি খরচ বেশি ছিল, যা <strong className="text-rose-450">৳{Math.abs(activeMonthReport.netProfit).toLocaleString()}</strong> ঋণাত্মক প্রফিট মার্জিন বা লোকসান নির্দেশ করছে। দয়া করে চলতি ও পরিচালন ব্যয় নিয়ন্ত্রণে নজর রাখুন।
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="text-slate-400 text-[10px] font-mono leading-none flex flex-col items-end shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-2.5 md:pt-0 md:pl-4 self-stretch justify-center">
            <span>অডিট আইডি: MUT-{selectedMonth}</span>
            <span className="mt-1 text-slate-500">আপডেট: রিয়েল-টাইম লাইভ (মালিক ভিউ)</span>
          </div>
        </div>

      </div>

      {/* SMART MONTHLY CATEGORY DEEP REPORT */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span className="p-1.5 bg-indigo-550/10 rounded-xl text-indigo-400">
                <TrendingUp className="w-4 h-4" />
              </span>
              খাতভিত্তিক মাসিক এআই স্মার্ট রিপোর্ট (Smart AI Monthly Category Analytics)
            </h3>
            <p className="text-xs text-slate-400 mt-1">সবচেয়ে বেশি আয়ের এবং ব্যয়ের খাতসমূহ মাস অনুযায়ী স্বয়ংক্রিয় সারাংশ</p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold py-1 px-2.5 rounded-full uppercase tracking-wider select-none">
            স্মার্ট এনালাইসিস
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {smartMonthlyReport.map(report => {
            const serviceLabel = report.topService ? (serviceBanglaNames[report.topService] || report.topService) : 'কোনো লেনদেন নেই';
            const expenseLabel = report.topExpenseCat ? (expenseBanglaNames[report.topExpenseCat] || report.topExpenseCat) : 'কোনো খরচ নেই';

            return (
              <div key={report.month} className="bg-slate-950 border border-slate-850 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between group hover:border-indigo-500/30 transition duration-150">
                <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black text-slate-100 font-sans tracking-wide bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
                      {report.monthLabel}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      {report.month}
                    </span>
                  </div>

                  <div className="space-y-3.5 my-4">
                    {/* Top Income Service */}
                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">সবচেয়ে বেশি আয়ের খাত 👑</div>
                      <div className="text-xs font-extrabold text-slate-200 mt-1">{serviceLabel}</div>
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                        <span>আবেদন সংখ্যা: <strong className="text-emerald-400 font-sans font-bold">{report.topServiceCount} টি</strong></span>
                        <span>মোট রাজস্ব: <strong className="text-slate-100">৳{report.topServiceRevenue.toLocaleString()}</strong></span>
                      </div>
                    </div>

                    {/* Top Expense Category */}
                    <div className="p-2.5 bg-rose-950/20 border border-rose-900/35 rounded-xl">
                      <div className="text-[10px] font-bold text-rose-450 uppercase tracking-wide">সর্বোচ্চ ব্যয়ের খাত 📉</div>
                      <div className="text-xs font-extrabold text-slate-200 mt-1">{expenseLabel}</div>
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                        <span>খরচের পরিমাণ: <strong className="text-rose-400">৳{report.topExpenseAmount.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic natural language summary requested by the user */}
                <div className="mt-4 pt-3 border-t border-slate-900/80 text-[11px] text-slate-400 leading-relaxed italic">
                  &ldquo;যেমন {report.monthLabel} মাসে <span className="text-emerald-400 font-semibold">{serviceLabel}</span> হয়েছে <strong className="text-white font-semibold">{report.topServiceCount} টি</strong>, এবং এই খাতে সবচেয়ে বেশি প্রফিট হয়েছে। আবার একই মাসে <span className="text-rose-400 font-semibold">{expenseLabel}</span> খাতে সবচেয়ে বেশি ব্যয় হয়েছে।&rdquo;
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HOURLY PROFIT BREAKDOWN REPORT TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
        <h3 className="text-sm font-bold text-white mb-3.5 flex items-center gap-1.5 font-sans">
          <Clock className="w-4.5 h-4.5 text-emerald-400" />
          ঘণ্টা অনুযায়ী প্রফিট রিপোর্ট (আজকের বিশ্লেষণ - Hourly Profit Setup)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold font-mono">
                <th className="py-2 px-2.5">সময় সময়সীমা</th>
                <th className="py-2 px-2.5">আয় (Inflow ৳)</th>
                <th className="py-2 px-2.5">ব্যয় (Outflow ৳)</th>
                <th className="py-2 px-2.5">নেট লাভ-ক্ষতি (৳)</th>
                <th className="py-2 px-2.5">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {stats.hourlyRanges.map(hr => {
                const profit = hr.income - hr.expense;
                return (
                  <tr key={hr.id} className="hover:bg-slate-850/15 transition">
                    <td className="py-2.5 px-2.5 font-semibold text-slate-300">{hr.label}</td>
                    <td className="py-2.5 px-2.5 text-emerald-400 font-mono">৳{hr.income.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-rose-400 font-mono">৳{hr.expense.toLocaleString()}</td>
                    <td className={`py-2.5 px-2.5 font-mono font-bold ${profit >= 0 ? 'text-emerald-450' : 'text-rose-450'}`}>
                      ৳{profit.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5">
                      {profit === 0 ? (
                        <span className="text-[10px] text-slate-500">লেনদেন নেই</span>
                      ) : profit > 0 ? (
                        <span className="inline-flex px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded text-[9px] font-bold">মুনাফা</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded text-[9px] font-bold">ক্ষতি</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SIMULATED EXPORT MODAL DISPLAY */}
      {exportModal && (
        <div id="export-popup" className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-755 rounded-3xl p-6 shadow-2xl max-w-lg w-full relative animate-in fade-in zoom-in duration-200 text-white">
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-400 mb-3">
                {successStatus ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                ) : (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-100">
                {successStatus ? 'রিপোর্ট প্রস্তুত হয়েছে!' : `${exportType === 'PDF' ? 'PDF' : 'Excel'} জেনারেট হচ্ছে...`}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{activeMonthReport.monthLabel} মাসের ভূমি সেবা সহায়িকা হিসাব রিপোর্ট</p>
            </div>

            {/* Generated Invoice Sheet Preview */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl text-left text-xs mb-5 font-mono select-all">
              <div className="text-center border-b border-slate-850 pb-2 mb-3">
                <div className="font-bold text-slate-300">ভূমি সেবা সহায়তা কেন্দ্র</div>
                <div className="text-[9px] text-slate-500">দোকানের আর্থিক সারসংক্ষেপ রিপোর্ট বুক</div>
              </div>
              
              <div className="space-y-1.5 text-slate-350 text-[10.5px]">
                <div className="flex justify-between">
                  <span>রিপোর্ট পিরিয়ড:</span> <span className="text-slate-100 font-bold">{activeMonthReport.monthLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span>মোট সেবা রাজস্ব:</span> <span className="text-emerald-400 font-bold">৳{activeMonthReport.totalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>মোট দোকান খরচ:</span> <span className="text-rose-400 font-bold">৳{activeMonthReport.totalExpense.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-850 pt-1 border-dashed">
                  <span>দোকান খোলা ছিল:</span> <span className="text-slate-200 font-bold">{activeMonthReport.openDaysCount} দিন (গড়: ৳{activeMonthReport.averageIncomePerOpenDay}/দিন)</span>
                </div>
                <div className="flex justify-between">
                  <span>দোকান বন্ধ ছিল:</span> <span className="text-slate-200 font-bold">{activeMonthReport.closedDaysCount} দিন (গড় লস: ৳{activeMonthReport.dailyFixedLoss}/দিন)</span>
                </div>
                <div className="flex justify-between">
                  <span>বন্ধ দিনের মোট লস:</span> <span className="text-rose-400 font-bold">৳{activeMonthReport.totalClosedDaysLoss.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-850 pt-1.5 font-bold">
                  <span>নেট লাভ পরিমাপ:</span> <span className={`${activeMonthReport.netProfit >= 0 ? 'text-emerald-450' : 'text-rose-455'} font-bold`}>৳{activeMonthReport.netProfit.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-650 mt-4 pt-1.5 border-t border-slate-900/60">
                জেনারেটর ইউজার: {currentUser.name} • তারিখ: {formatBanglaDate(getTodayStr())}
              </div>
            </div>

            {/* Modal actions close */}
            <div className="flex items-center space-x-2">
              <button
                id="btn-confirm-export-dl"
                onClick={() => setExportModal(false)}
                disabled={!successStatus}
                className="flex-1 py-2.5 bg-emerald-500 disabled:bg-slate-805 disabled:text-slate-500 hover:bg-emerald-600 font-bold text-xs rounded-xl shadow cursor-pointer text-center text-slate-950 disabled:cursor-not-allowed"
              >
                {successStatus ? 'রিপোর্ট ফাইল ডাউনলোড করুন' : 'দয়া করে অপেক্ষা করুন...'}
              </button>
              
              <button
                id="btn-close-export-modal"
                onClick={() => setExportModal(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 cursor-pointer text-center"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
