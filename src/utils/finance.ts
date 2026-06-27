/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IncomeRecord } from '../types';

/**
 * Calculates metrics for a single date.
 * If a 'Quick box' entry exists for that date (e.g. note includes 'আজকের ইনকাম (একসাথে এন্ট্রি)'),
 * then we lock the daily totals to the sum of those quick entries alone. Any other service entries
 * are saved for breakdown tracking but ignored in the overall sum.
 */
export function getDailyIncomeMetrics(date: string, list: IncomeRecord[]) {
  const dailyRecords = list.filter(r => r.date === date);
  const quickRecords = dailyRecords.filter(r => r.note && r.note.includes('একসাথে এন্ট্রি'));

  if (quickRecords.length > 0) {
    const total = quickRecords.reduce((sum, item) => sum + item.amount, 0);
    const cash = quickRecords.filter(r => r.paymentMethod === 'CASH').reduce((sum, item) => sum + item.amount, 0);
    const bkash = quickRecords.filter(r => r.paymentMethod === 'BKASH').reduce((sum, item) => sum + item.amount, 0);
    return { total, cash, bkash, isLocked: true };
  } else {
    const total = dailyRecords.reduce((sum, item) => sum + item.amount, 0);
    const cash = dailyRecords.filter(r => r.paymentMethod === 'CASH').reduce((sum, item) => sum + item.amount, 0);
    const bkash = dailyRecords.filter(r => r.paymentMethod === 'BKASH').reduce((sum, item) => sum + item.amount, 0);
    return { total, cash, bkash, isLocked: false };
  }
}

/**
 * Sums up any slice of income logs correctly respecting daily locked rules.
 * To do this, we group the logs by date, compute each day's daily metric, and sum them.
 */
export function getIncomeSum(list: IncomeRecord[]) {
  const dates = Array.from(new Set(list.map(r => r.date)));
  let total = 0;
  let cash = 0;
  let bkash = 0;

  dates.forEach(d => {
    const metrics = getDailyIncomeMetrics(d, list);
    total += metrics.total;
    cash += metrics.cash;
    bkash += metrics.bkash;
  });

  return { total, cash, bkash };
}

export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatBanglaDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr;
  const parts = dateStr.split('-');
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  
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

  const dayVal = parseInt(day, 10);
  const dayBg = englishToBanglaDigits(dayVal.toString());
  const monthBg = monthNamesBg[month] || month;
  const yearBg = englishToBanglaDigits(year);

  let ordinalSuffix = 'ই';
  if (dayVal === 1) ordinalSuffix = 'লা';
  else if (dayVal >= 2 && dayVal <= 4) ordinalSuffix = 'রা';
  else if ((dayVal >= 5 && dayVal <= 18) || dayVal === 29 || dayVal === 30 || dayVal === 31) ordinalSuffix = 'শে';
  
  return `${dayBg}${ordinalSuffix} ${monthBg}, ${yearBg}`;
}


