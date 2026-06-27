/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServiceType, ExpenseCategory } from '../types';

export const SERVICE_METADATA: Record<ServiceType, { bangla: string; english: string; color: string; defaultPrice: number }> = {
  NAMJARI: { bangla: 'নামজারি আবেদন', english: 'Mutation Service', color: 'from-emerald-500 to-teal-600', defaultPrice: 300 },
  KHOTIYAN: { bangla: 'খতিয়ান উত্তোলন', english: 'Khotiyan copy', color: 'from-cyan-500 to-blue-600', defaultPrice: 200 },
  PORCHA: { bangla: 'পর্চা সংগ্রহ', english: 'Porcha copy', color: 'from-indigo-500 to-purple-600', defaultPrice: 200 },
  DOLIL: { bangla: 'দলিল লিখন / যাচাই', english: 'Deed Writing', color: 'from-amber-500 to-orange-655', defaultPrice: 2000 },
  LAND_APP: { bangla: 'ভূমি আবেদন', english: 'Land Online Application', color: 'from-violet-500 to-fuchsia-600', defaultPrice: 500 },
  DCR: { bangla: 'ডিসিআর পেমেন্ট', english: 'DCR Payment', color: 'from-blue-500 to-indigo-600', defaultPrice: 200 },
  OTHERS: { bangla: 'অন্যান্য সার্ভিস', english: 'Other General Work', color: 'from-slate-500 to-slate-700', defaultPrice: 300 }
};

export const EXPENSE_METADATA: Record<ExpenseCategory, { bangla: string; english: string; color: string; isFixed: boolean }> = {
  RENT: { bangla: 'ঘর ভাড়া', english: 'Shop Rent', color: 'bg-red-500', isFixed: true },
  ELECTRICITY: { bangla: 'কারেন্ট বিল', english: 'Electricity Bill', color: 'bg-yellow-500', isFixed: true },
  INTERNET: { bangla: 'ইন্টারনেট বিল', english: 'WiFi & Internet', color: 'bg-indigo-500', isFixed: true },
  SALARY: { bangla: 'কর্মচারী বেতন', english: 'Staff Salaries', color: 'bg-blue-600', isFixed: true },
  OFFICE: { bangla: 'অফিস খরচ/চা-নাস্তা', english: 'Office Tea & Snacks', color: 'bg-amber-500', isFixed: false },
  TRAVEL: { bangla: 'যাতায়াত খরচ', english: 'Travel & Courier', color: 'bg-purple-500', isFixed: false },
  PRINT: { bangla: 'প্রিন্ট/ফটোকপি পেপার', english: 'Paper & Stationery', color: 'bg-emerald-500', isFixed: false },
  OTHERS: { bangla: 'অন্যান্য খরচ', english: 'Miscellaneous Expenses', color: 'bg-slate-500', isFixed: false }
};

export const ROLE_METADATA: Record<string, { bangla: string; roleTheme: string }> = {
  OWNER_ONE: { bangla: 'মালিক ১', roleTheme: 'bg-rose-500 text-white' },
  OWNER_TWO: { bangla: 'মালিক ২', roleTheme: 'bg-violet-500 text-white' },
  STAFF: { bangla: 'কর্মচারী', roleTheme: 'bg-sky-500 text-white' }
};
