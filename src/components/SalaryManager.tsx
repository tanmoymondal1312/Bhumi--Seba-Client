/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet, CheckCircle2, AlertTriangle, Clock, Trash2, Pencil, X, History, Banknote, Smartphone, Info
} from 'lucide-react';
import { api } from '../api/client';
import { SalarySnapshot } from '../types';
import { getCurrentAccountingPeriod, getAccountingPeriodRange, getTodayStr } from '../utils/finance';

interface SalaryManagerProps {
  currentUser: { name: string; role: string };
  onSalaryUpdated?: (snapshot: SalarySnapshot) => void;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  NO_OBLIGATION: { label: 'বেতন নির্ধারিত নয়', cls: 'bg-slate-700/40 text-slate-400' },
  UNPAID: { label: 'পরিশোধ হয়নি', cls: 'bg-rose-500/15 text-rose-400' },
  PARTIAL: { label: 'আংশিক পরিশোধ', cls: 'bg-amber-500/15 text-amber-400' },
  PAID: { label: 'পরিশোধিত', cls: 'bg-emerald-500/15 text-emerald-400' },
};

export default function SalaryManager({ currentUser, onSalaryUpdated }: SalaryManagerProps) {
  const currentPeriod = getCurrentAccountingPeriod();
  const todayStr = getTodayStr();
  const isOwner = currentUser.role === 'OWNER_ONE' || currentUser.role === 'OWNER_TWO';

  const [period, setPeriod] = useState(currentPeriod);
  const [snapshot, setSnapshot] = useState<SalarySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const [payFor, setPayFor] = useState<{ employeeId: string; name: string; remaining: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BKASH'>('CASH');
  const [payDate, setPayDate] = useState(todayStr);
  const [payNote, setPayNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [historyFor, setHistoryFor] = useState<{ employeeId: string; name: string } | null>(null);

  const showMsg = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      setActionMsg(msg);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const load = async (p: string) => {
    try {
      const data = await api.salary.getForPeriod(p);
      setSnapshot(data);
      if (onSalaryUpdated) onSalaryUpdated(data);
    } catch (err: any) {
      showMsg(err.message || 'বেতন তথ্য লোড ব্যর্থ।', true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const availablePeriods = useMemo(() => {
    const set = new Set<string>([currentPeriod]);
    const [year, month] = currentPeriod.split('-').map(Number);
    for (let i = 1; i <= 12; i++) {
      const d = new Date(year, month - 1 - i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    if (snapshot?.payments) {
      snapshot.payments.forEach(p => set.add(p.period));
    }
    if (snapshot?.employees) {
      snapshot.employees.forEach(e => {
        if (e.hasObligation) set.add(period);
      });
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [currentPeriod, snapshot, period]);

  const handleSetSalary = async (employeeId: string) => {
    const num = Number(editAmount);
    if (isNaN(num) || num < 0) {
      showMsg('মাসিক বেতন অবশ্যই 0 বা তার বেশি হতে হবে।', true);
      return;
    }
    try {
      await api.salary.setSalary(employeeId, period, num);
      setEditingId(null);
      showMsg('মাসিক বেতন সফলভাবে সংরক্ষণ হয়েছে!');
      load(period);
    } catch (err: any) {
      showMsg(err.message || 'বেতন সংরক্ষণ ব্যর্থ।', true);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payFor) return;
    const num = Number(payAmount);
    if (isNaN(num) || num <= 0) {
      showMsg('পরিশোধের পরিমাণ অবশ্যই 0 এর বেশি হতে হবে।', true);
      return;
    }
    if (num > payFor.remaining) {
      showMsg(`বাকি বেতনের চেয়ে বেশি টাকা পরিশোধ করা যাবে না। (বাকি: ৳${payFor.remaining.toLocaleString('bn-BD')})`, true);
      return;
    }
    setIsSaving(true);
    try {
      const result = await api.salary.addPayment({
        employeeId: payFor.employeeId,
        amount: num,
        method: payMethod,
        date: payDate,
        note: payNote.trim() || undefined,
      });
      showMsg(`"${payFor.name}" কে ৳${result.payment.amount.toLocaleString('bn-BD')} পরিশোধ সফল!`);
      setPayFor(null);
      setPayAmount('');
      setPayNote('');
      setPayDate(todayStr);
      load(period);
    } catch (err: any) {
      showMsg(err.message || 'পরিশোধ ব্যর্থ।', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, employeeName: string) => {
    if (!confirm(`"${employeeName}" এর এই পরিশোধ এন্ট্রি মুছে ফেলবেন?`)) return;
    try {
      await api.salary.deletePayment(paymentId);
      showMsg('পরিশোধ এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে!');
      load(period);
    } catch (err: any) {
      showMsg(err.message || 'মুছে ফেলা ব্যর্থ।', true);
    }
  };

  const emp = (id: string) => snapshot?.employees.find(e => e.employeeId === id);
  const empPayments = (id: string) => snapshot?.payments.filter(p => p.employeeId === id) || [];

  return (
    <div className="space-y-5">
      {/* HEADER + PERIOD SELECTOR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-400" />
            কর্মচারী বেতন ব্যবস্থাপনা
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            মাসিক বেতন দায় নির্ধারণ করুন এবং কিস্তিতে পরিশোধের হিসাব রাখুন।
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            id="salary-period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 text-xs cursor-pointer focus:outline-none focus:border-indigo-500/60 font-medium"
            title="হিসাব চক্র নির্বাচন করুন (মাসের ৩ তারিখে নতুন চক্র শুরু হয়)"
          >
            {availablePeriods.map(p => (
              <option key={p} value={p}>
                হিসাব চক্র: {p} {p === currentPeriod ? '(চলমান)' : ''}
              </option>
            ))}
          </select>
          {snapshot && (
            <div className="text-[10px] text-slate-500 font-mono text-center sm:text-right">
              চক্র {snapshot.period} • {getAccountingPeriodRange(snapshot.period).start} থেকে {getAccountingPeriodRange(snapshot.period).end} পর্যন্ত
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs rounded-xl p-3 font-medium">
          {errorMsg}
        </div>
      )}
      {actionMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs rounded-xl p-3 font-medium">
          {actionMsg}
        </div>
      )}

      {/* SUMMARY CARDS */}
      {snapshot && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">মোট বেতন দায় (এই চক্র)</p>
            <p className="text-2xl font-black text-indigo-400 mt-1 font-sans">৳{snapshot.totalObligation.toLocaleString('bn-BD')}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">মোট পরিশোধ</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-sans">৳{snapshot.totalPaid.toLocaleString('bn-BD')}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">মোট বাকি</p>
            <p className={`text-2xl font-black mt-1 font-sans ${snapshot.totalRemaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ৳{snapshot.totalRemaining.toLocaleString('bn-BD')}
            </p>
          </div>
        </div>
      )}

      {/* RULE INFO BANNER */}
      <div className="bg-indigo-500/5 border border-indigo-500/25 rounded-2xl p-3.5 text-[11px] text-slate-400 leading-relaxed">
        <p className="flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">বেতন দায় নিয়ম:</strong> প্রতিটি কর্মচারীর মাসিক বেতন এই চক্রের{' '}
            <strong className="text-indigo-400">স্থায়ী ব্যয়</strong> হিসেবে যুক্ত হয় (পরিশোধ হোক বা না হোক — মাসের ২ তারিখের অটো হিসাব)।
            পরিশোধ শুধু লেজার হিসাব: কিস্তিতে পরিশোধ করলে <strong className="text-emerald-400">পরিশোধিত</strong> ও{' '}
            <strong className="text-rose-400">বাকি</strong> আপডেট হয়। সক্রিয় থাকলে পুরাতন "কর্মচারী বেতন" (দোকান ব্যয়) এন্ট্রি আর হিসাবের
            বাইরে থাকে — দ্বিগুণ হিসাব হয় না। বিকাশ মাধ্যমে পরিশোধ শুধু বেতন খাতায় সংরক্ষিত হয়, বিকাশ খাতায় স্বয়ংক্রিয় এন্ট্রি হয় না।
          </span>
        </p>
      </div>

      {!snapshot?.active && snapshot && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-3.5 text-[11px] text-amber-400/90 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            এই চক্রে কোনো কর্মচারীর মাসিক বেতন নির্ধারিত হয়নি, তাই পুরাতন পদ্ধতি অনুযায়ী হিসাব চলছে (দোকান ব্যয়ের "কর্মচারী বেতন"
            রেকর্ড অথবা সেটিংসের মাসিক বেতন)। বেতন ব্যবস্থাপনা সক্রিয় করতে নিচে প্রতিটি কর্মচারীর মাসিক বেতন নির্ধারণ করুন।
          </span>
        </div>
      )}

      {/* EMPLOYEES TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">কর্মচারী বেতন তালিকা</h3>
            <p className="text-[11px] text-slate-400">চক্র {period} এর জন্য মাসিক বেতন দায় ও পরিশোধের অবস্থা</p>
          </div>
          {isLoading && <span className="text-[10px] text-slate-500 font-mono">লোড হচ্ছে...</span>}
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">
                <th className="py-2.5 px-2">কর্মচারী</th>
                <th className="py-2.5 px-2">মাসিক বেতন (দায়)</th>
                <th className="py-2.5 px-2">পরিশোধিত</th>
                <th className="py-2.5 px-2">বাকি</th>
                <th className="py-2.5 px-2">অবস্থা</th>
                <th className="py-2.5 px-2 text-right">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {snapshot?.employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500 italic">
                    কোনো কর্মচারী পাওয়া যায়নি। সেটিংস থেকে নতুন কর্মচারী যোগ করুন।
                  </td>
                </tr>
              )}
              {snapshot?.employees.map(e => {
                const status = STATUS_LABELS[e.status] || STATUS_LABELS.NO_OBLIGATION;
                const isEditing = editingId === e.employeeId;
                return (
                  <tr key={e.employeeId} className="hover:bg-slate-800/20">
                    <td className="py-3 px-2">
                      <p className="text-xs font-semibold text-white">{e.name}</p>
                      <p className="text-[9px] text-slate-500 font-mono">{e.employeeId.slice(0, 18)}...</p>
                    </td>
                    <td className="py-3 px-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`salary-edit-input-${e.employeeId}`}
                            type="number"
                            min={0}
                            value={editAmount}
                            onChange={(ev) => setEditAmount(ev.target.value)}
                            className="w-24 bg-slate-950 border border-indigo-500/50 rounded-lg py-1 px-2 text-white text-xs focus:outline-none"
                          />
                          <button
                            onClick={() => handleSetSalary(e.employeeId)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-bold rounded-lg px-2 py-1.5 cursor-pointer"
                          >
                            সংরক্ষণ
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg px-2 py-1.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-sans">
                            ৳{e.monthlySalary.toLocaleString('bn-BD')}
                          </span>
                          <button
                            id={`btn-edit-salary-${e.employeeId}`}
                            onClick={() => {
                              setEditingId(e.employeeId);
                              setEditAmount(String(e.monthlySalary));
                            }}
                            className="text-slate-500 hover:text-indigo-400 transition cursor-pointer"
                            title="বেতন পরিবর্তন করুন"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-xs font-bold text-emerald-400 font-sans">৳{e.paid.toLocaleString('bn-BD')}</td>
                    <td className="py-3 px-2 text-xs font-bold font-sans">
                      <span className={e.remaining > 0 ? 'text-rose-400' : 'text-slate-400'}>
                        ৳{e.remaining.toLocaleString('bn-BD')}
                      </span>
                      {e.overPaid > 0 && (
                        <span className="text-[9px] text-amber-400 block">অতিরিক্ত পরিশোধ ৳{e.overPaid.toLocaleString('bn-BD')}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-pay-salary-${e.employeeId}`}
                          disabled={!e.hasObligation || e.monthlySalary <= 0 || e.remaining <= 0}
                          onClick={() => {
                            setPayFor({ employeeId: e.employeeId, name: e.name, remaining: e.remaining });
                            setPayAmount('');
                            setPayNote('');
                            setPayDate(todayStr);
                            setPayMethod('CASH');
                          }}
                          className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                          title="বেতন পরিশোধ করুন"
                        >
                          <Banknote className="w-3 h-3 inline mr-1" />পরিশোধ
                        </button>
                        <button
                          onClick={() => setHistoryFor({ employeeId: e.employeeId, name: e.name })}
                          className="bg-slate-800/60 text-slate-400 hover:text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                          title="পরিশোধের ইতিহাস"
                        >
                          <History className="w-3 h-3 inline mr-1" />ইতিহাস
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENTS LEDGER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md">
        <div className="pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">পরিশোধ লেজার — চক্র {period}</h3>
          <p className="text-[11px] text-slate-400">সব কর্মচারীর বেতন পরিশোধের সম্পূর্ণ ইতিহাস (মোট {snapshot?.payments.length || 0} টি এন্ট্রি)</p>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">
                <th className="py-2.5 px-2">তারিখ</th>
                <th className="py-2.5 px-2">কর্মচারী</th>
                <th className="py-2.5 px-2">মাধ্যম</th>
                <th className="py-2.5 px-2">টাকা (৳)</th>
                <th className="py-2.5 px-2">নোট / এন্ট্রি করেন</th>
                <th className="py-2.5 px-2 text-right">ডিলিট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(snapshot?.payments.length || 0) === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500 italic">
                    এই চক্রে কোনো পরিশোধ এন্ট্রি নেই।
                  </td>
                </tr>
              )}
              {snapshot?.payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-2">
                    <p className="text-xs text-slate-300 font-mono">{p.date}</p>
                    <p className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />{p.time}
                    </p>
                  </td>
                  <td className="py-2.5 px-2 text-xs font-semibold text-white">{p.employeeName}</td>
                  <td className="py-2.5 px-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.method === 'BKASH' ? 'bg-pink-500/15 text-pink-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                      {p.method === 'BKASH' ? <Smartphone className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                      {p.method === 'BKASH' ? 'বিকাশ' : 'নগদ'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-xs font-bold text-white font-sans">৳{p.amount.toLocaleString('bn-BD')}</td>
                  <td className="py-2.5 px-2">
                    <p className="text-[11px] text-slate-400 max-w-45 truncate">{p.note || '—'}</p>
                    <p className="text-[9px] text-slate-500 font-mono">{p.enteredBy}</p>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <button
                      id={`btn-delete-salary-payment-${p.id}`}
                      onClick={() => handleDeletePayment(p.id, p.employeeName)}
                      className="text-slate-600 hover:text-rose-400 transition cursor-pointer"
                      title="এন্ট্রি মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {payFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">বেতন পরিশোধ — {payFor.name}</h3>
              <button onClick={() => setPayFor(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3.5 mt-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 flex items-center justify-between">
                <span>এই চক্রে বাকি আছে</span>
                <strong className="text-rose-400 text-sm font-sans">৳{payFor.remaining.toLocaleString('bn-BD')}</strong>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">পরিশোধের পরিমাণ (৳)</label>
                <input
                  id="salary-payment-amount"
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-bold focus:outline-none focus:border-emerald-500/80"
                  placeholder="যেমন: 3000"
                />
                <p className="text-[9px] text-slate-500 mt-1">বাকি বেতনের চেয়ে বেশি পরিশোধ করা যাবে না।</p>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">পরিশোধের মাধ্যম</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('CASH')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${payMethod === 'CASH' ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' : 'bg-slate-950 border-slate-700 text-slate-500'}`}
                  >
                    <Banknote className="w-3.5 h-3.5" />নগদ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('BKASH')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${payMethod === 'BKASH' ? 'bg-pink-500/20 border-pink-500/60 text-pink-400' : 'bg-slate-950 border-slate-700 text-slate-500'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />বিকাশ
                  </button>
                </div>
                {payMethod === 'BKASH' && (
                  <p className="text-[9px] text-slate-500 mt-1">বিকাশ খাতায় স্বয়ংক্রিয় এন্ট্রি হয় না — শুধু বেতন লেজারে সংরক্ষিত হবে।</p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">পরিশোধের তারিখ</label>
                <input
                  id="salary-payment-date"
                  type="date"
                  required
                  max={todayStr}
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-500/80"
                />
                <p className="text-[9px] text-slate-500 mt-1">মাসের ১-২ তারিখের পরিশোধ আগের চক্রে হিসাব হবে (অটো হিসাব নিয়ম)।</p>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5">নোট (ঐচ্ছিক)</label>
                <input
                  id="salary-payment-note"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-emerald-500/80"
                  placeholder="যেমন: প্রথম কিস্তি"
                />
              </div>

              <button
                id="btn-submit-salary-payment"
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 text-center bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition cursor-pointer"
              >
                {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'পরিশোধ সংরক্ষণ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyFor && snapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">পরিশোধের ইতিহাস — {historyFor.name}</h3>
              <button onClick={() => setHistoryFor(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {empPayments(historyFor.employeeId).length === 0 && (
                <p className="text-xs text-slate-500 italic py-6 text-center">এই চক্রে কোনো পরিশোধ নেই।</p>
              )}
              {empPayments(historyFor.employeeId).map(p => (
                <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white font-sans">৳{p.amount.toLocaleString('bn-BD')}</p>
                    <p className="text-[9px] text-slate-500 font-mono">{p.date} • {p.time} • {p.method === 'BKASH' ? 'বিকাশ' : 'নগদ'}</p>
                    {p.note && <p className="text-[10px] text-slate-400 mt-0.5">{p.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500 font-mono">{p.enteredBy}</p>
                    <button
                      onClick={() => {
                        handleDeletePayment(p.id, historyFor.name);
                        setHistoryFor(null);
                      }}
                      className="text-slate-600 hover:text-rose-400 text-[10px] mt-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" /> মুছুন
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] flex items-center justify-between">
              <span className="text-slate-400">মোট পরিশোধ (চক্র {period})</span>
              <strong className="text-emerald-400 font-sans">
                ৳{(emp(historyFor.employeeId)?.paid || 0).toLocaleString('bn-BD')}
              </strong>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              বেতন দায়: ৳{(emp(historyFor.employeeId)?.monthlySalary || 0).toLocaleString('bn-BD')} • বাকি: ৳
              {(emp(historyFor.employeeId)?.remaining || 0).toLocaleString('bn-BD')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}