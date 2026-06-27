/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'OWNER_ONE' | 'OWNER_TWO' | 'STAFF';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  avatar: string;
  phone?: string;
}

export type ServiceType = string;

export interface IncomeRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  serviceType: ServiceType;
  amount: number;
  enteredBy: string; // user name or id
  note: string;
  paymentMethod: 'CASH' | 'BKASH';
}

export type ExpenseCategory =
  | 'RENT' // ঘর ভাড়া
  | 'ELECTRICITY' // কারেন্ট বিল
  | 'INTERNET' // ইন্টারনেট বিল
  | 'SALARY' // কর্মচারী বেতন
  | 'OFFICE' // অফিস খরচ
  | 'TRAVEL' // যাতায়াত
  | 'PRINT' // প্রিন্ট/ফটোকপি
  | 'OTHERS'; // অন্যান্য খরচ

export type ExpenseType = 'FIXED' | 'VARIABLE';

export interface ExpenseRecord {
  id: string;
  date: string;
  time: string;
  category: ExpenseCategory;
  amount: number;
  enteredBy: string;
  note: string;
}

export interface BKashRecord {
  id: string;
  date: string;
  time: string;
  type: 'IN' | 'OUT' | 'PAYMENT';
  amount: number;
  fee?: number;
  enteredBy: string;
  note: string;
  refTrx?: string;
}

export interface QuickReminder {
  id: string;
  title: string;
  date: string;
  isCompleted: boolean;
}

export interface SystemSettings {
  isDarkMode: boolean;
  pinLockEnabled: boolean;
  dailyReminderText: string;
  expenseAlertThreshold: number;
  monthlyRent?: number;
  monthlyElectricity?: number;
  monthlyInternet?: number;
  monthlySalary?: number;
  lastQuoteUpdatedAt?: number;
  bkashBaseBalance?: number;
  bkashTodaySpentOverride?: number;
  cashInHandOverride?: number;
}
