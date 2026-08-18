/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IncomeRecord, ExpenseRecord, SalarySnapshot } from '../types';
import { getIncomeSum, isInAccountingPeriod } from './finance';

/**
 * THE single financial calculation model (Phase 5).
 *
 * Every financial module (Dashboard, Reports, backend summary endpoint) uses
 * this one function so the same accounting-period rule, salary integration and
 * fixed/operating classification produce identical totals everywhere.
 *
 * Formula (business rule, unchanged since Phase 1):
 *   মোট লাভ = মোট সেবা রাজস্ব − (মোট পরিচালন ব্যয় + স্থায়ী ব্যয়)
 *
 * Rules implemented here:
 * - Period membership uses the shared getAccountingPeriodForDate (3rd-of-month
 *   boundary). A record on the 1st/2nd belongs to the previous period.
 * - Revenue respects the "quick box" daily lock (getIncomeSum) so locked days
 *   are never double counted with individual entries.
 * - Fixed expense per category = recorded amount, falling back to the
 *   configured monthly value when nothing was recorded (recorded || config).
 * - Operating expense = total recorded expense − recorded fixed expense.
 * - Salary integration (Phase 4): when the salary system is active for the
 *   period (any employee obligation > 0), legacy SALARY shop-expense records
 *   are excluded from every expense figure and the fixed salary = Σ employee
 *   obligations. Otherwise the legacy behavior (recorded SALARY || settings
 *   monthlySalary) is preserved for historical periods.
 */
export interface FinancialModelInput {
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  period: string;
  settings?: {
    monthlyRent?: number;
    monthlyElectricity?: number;
    monthlyInternet?: number;
    monthlySalary?: number;
  } | null;
  salarySnapshot?: SalarySnapshot | null;
  /** Category classification — must use the same isFixed source everywhere. */
  catIsFixed: (cat: string) => boolean;
  /** Inclusive upper date bound (YYYY-MM-DD). Defaults to the full period. */
  maxDate?: string;
}

export interface FixedBreakdownEntry {
  cat: string;
  value: number;
  recorded: number;
}

export interface FinancialModelOutput {
  totalRevenue: number;
  totalExpense: number;
  operatingExpense: number;
  fixedExpense: number;
  recordedFixedExpense: number;
  totalProfit: number;
  salaryActive: boolean;
  salaryObligation: number;
  fixedBreakdown: FixedBreakdownEntry[];
  extraVariableExpense: number;
  periodIncomes: IncomeRecord[];
  periodExpenses: ExpenseRecord[];
  incomeCount: number;
  expenseCount: number;
}

export const FIXED_SETTINGS_KEYS = ['RENT', 'ELECTRICITY', 'INTERNET', 'SALARY'] as const;

export function computePeriodSummary(input: FinancialModelInput): FinancialModelOutput {
  const { incomes, expenses, period, settings, salarySnapshot, catIsFixed, maxDate } = input;

  const inPeriod = (dateStr: string) =>
    !!dateStr && dateStr.length >= 10 && isInAccountingPeriod(dateStr, period) && (!maxDate || dateStr <= maxDate);

  const salaryActive = !!(salarySnapshot && salarySnapshot.active);
  const salaryObligation = salaryActive ? (salarySnapshot?.totalObligation || 0) : 0;

  const periodIncomes = incomes.filter(i => inPeriod(i.date));
  const periodExpensesAll = expenses.filter(e => inPeriod(e.date));
  const periodExpenses = salaryActive
    ? periodExpensesAll.filter(e => e.category !== 'SALARY')
    : periodExpensesAll;

  const totalRevenue = getIncomeSum(periodIncomes).total;
  const totalExpense = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  const defaults: { cat: string; configVal: number }[] = [
    { cat: 'RENT', configVal: settings?.monthlyRent ?? 6000 },
    { cat: 'ELECTRICITY', configVal: settings?.monthlyElectricity ?? 1850 },
    { cat: 'INTERNET', configVal: settings?.monthlyInternet ?? 800 },
    { cat: 'SALARY', configVal: salaryActive ? salaryObligation : (settings?.monthlySalary ?? 8000) },
  ];

  const recordedByCat: Record<string, number> = {};
  let recordedFixedExpense = 0;
  periodExpenses.forEach(e => {
    if (catIsFixed(e.category)) {
      recordedByCat[e.category] = (recordedByCat[e.category] || 0) + e.amount;
      recordedFixedExpense += e.amount;
    }
  });

  const fixedBreakdown: FixedBreakdownEntry[] = [];
  let fixedExpense = 0;
  const handledCats = new Set<string>();
  defaults.forEach(({ cat, configVal }) => {
    const recorded = recordedByCat[cat] || 0;
    const value = recorded || configVal;
    fixedBreakdown.push({ cat, value, recorded });
    fixedExpense += value;
    handledCats.add(cat);
  });
  Object.entries(recordedByCat).forEach(([cat, recorded]) => {
    if (!handledCats.has(cat)) {
      fixedBreakdown.push({ cat, value: recorded, recorded });
      fixedExpense += recorded;
    }
  });

  const operatingExpense = totalExpense - recordedFixedExpense;
  const totalProfit = totalRevenue - (operatingExpense + fixedExpense);

  return {
    totalRevenue,
    totalExpense,
    operatingExpense,
    fixedExpense,
    recordedFixedExpense,
    totalProfit,
    salaryActive,
    salaryObligation,
    fixedBreakdown,
    extraVariableExpense: operatingExpense,
    periodIncomes,
    periodExpenses,
    incomeCount: periodIncomes.length,
    expenseCount: periodExpenses.length,
  };
}
