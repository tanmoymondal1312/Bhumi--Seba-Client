/**
 * Shared server-side validation helpers (Phase 5).
 *
 * The frontend already validates user input, but the API must not rely on it:
 * every write endpoint performs the same checks so bad data can never reach
 * the database (amount <= 0, malformed/future dates, unknown methods, ...).
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

export function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function isValidTime(timeStr: string): boolean {
  if (!TIME_REGEX.test(timeStr)) return false;
  const [hour, minute] = timeStr.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/** Positive amount check (rejects NaN, 0, negatives, non-finite). */
export function isPositiveAmount(value: unknown): boolean {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

/**
 * Falls back to the logged-in user's name when the request did not include
 * one (the legacy PHP endpoints accepted enteredBy from the body; the fallback
 * makes direct API calls safe).
 */
export async function resolveEnteredBy(
  pool: any,
  userId: string,
  bodyValue: unknown
): Promise<string> {
  const value = String(bodyValue || '').trim();
  if (value !== '') return value;
  const [rows] = await pool.execute('SELECT name FROM users WHERE id = ?', [userId]);
  return (rows as any[])[0]?.name || 'মালিক';
}
