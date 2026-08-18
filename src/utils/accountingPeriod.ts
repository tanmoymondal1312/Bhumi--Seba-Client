/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared accounting-period helpers (frontend + backend).
 *
 * Accounting period rule (client business rule):
 * - The previous accounting period remains active through the 2nd day of the
 *   following calendar month (auto-settlement happens on the 2nd).
 * - The new accounting period starts on the 3rd day.
 * - A period labeled YYYY-MM therefore spans YYYY-MM-03 .. YYYY-(MM+1)-02.
 *   Example: period "2026-07" = 2026-07-03 .. 2026-08-02.
 *   So a transaction dated August 1 or 2 belongs to the July period; a
 *   transaction dated August 3 belongs to the August period.
 * Dates are plain local-date strings (YYYY-MM-DD); no timezone conversion.
 */
export function getAccountingPeriodForDate(dateStr: string): string {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(5, 7), 10);
  const day = parseInt(dateStr.substring(8, 10), 10);

  if (day <= 2) {
    const prevMonthDate = new Date(year, month - 1, 0);
    return `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getCurrentAccountingPeriod(): string {
  return getAccountingPeriodForDate(getTodayStr());
}

export function getAccountingPeriodRange(period: string): { start: string; end: string } {
  const year = parseInt(period.substring(0, 4), 10);
  const month = parseInt(period.substring(5, 7), 10);
  const nextMonthDate = new Date(year, month, 1);
  return {
    start: `${year}-${String(month).padStart(2, '0')}-03`,
    end: `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-02`,
  };
}

export function isInAccountingPeriod(dateStr: string, period: string): boolean {
  return getAccountingPeriodForDate(dateStr) === period;
}

export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}