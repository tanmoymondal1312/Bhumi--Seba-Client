import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getAccountingPeriodRange, getCurrentAccountingPeriod, getTodayStr } from '../../src/utils/accountingPeriod';
import { computePeriodSummary } from '../../src/utils/financialModel';

const router = Router();

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function requireOwner(req: AuthRequest, res: Response): boolean {
  if (req.userRole !== 'OWNER_ONE' && req.userRole !== 'OWNER_TWO') {
    res.status(403).json({ message: 'শুধুমাত্র মালিক আর্থিক সারসংক্ষেপ দেখতে পারেন।' });
    return false;
  }
  return true;
}

// Legacy fixed categories used as fallback when a category is missing from the
// expense_categories table — mirrors the frontend EXPENSE_METADATA defaults.
const LEGACY_FIXED_CATS = new Set(['RENT', 'ELECTRICITY', 'INTERNET', 'SALARY']);

/**
 * GET /api/financials/summary?period=YYYY-MM
 *
 * The smart-report totals for one accounting period, computed server-side with
 * the SAME financial model the frontend uses (src/utils/financialModel.ts), so
 * the API and the UI can never drift apart. Salary obligations are auto-ensured
 * for the current period (identical to GET /api/salary), the salary obligation
 * replaces legacy SALARY records when active, and revenue respects the quick-box
 * daily lock. upToDate = today for the current period, period end otherwise —
 * exactly the "report view" cutoff.
 */
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!requireOwner(req, res)) return;
  try {
    const requested = (req.query.period as string) || getCurrentAccountingPeriod();
    if (!PERIOD_REGEX.test(requested)) {
      res.status(400).json({ message: 'হিসাব চক্র সঠিক নয়।' });
      return;
    }

    const currentPeriod = getCurrentAccountingPeriod();
    if (requested === currentPeriod) {
      await pool.execute(
        `INSERT IGNORE INTO employee_salaries (employee_id, period, monthly_salary)
         SELECT id, ?, COALESCE(monthly_salary, 0) FROM users WHERE role = 'STAFF'`,
        [requested]
      );
    }

    const range = getAccountingPeriodRange(requested);
    const upToDate = requested === currentPeriod && getTodayStr() > range.start ? getTodayStr() : range.end;

    const [incomeRows] = await pool.execute(
      'SELECT id, date, time, service_type, amount, entered_by, note, payment_method FROM income_records WHERE date BETWEEN ? AND ?',
      [range.start, upToDate]
    );
    const incomes = (incomeRows as any[]).map(r => ({
      id: r.id,
      date: r.date,
      time: r.time,
      serviceType: r.service_type,
      amount: Number(r.amount),
      enteredBy: r.entered_by,
      note: r.note || '',
      paymentMethod: r.payment_method,
    }));

    const [expenseRows] = await pool.execute(
      'SELECT id, date, time, category, amount, entered_by, note FROM expense_records WHERE date BETWEEN ? AND ?',
      [range.start, upToDate]
    );
    const expenses = (expenseRows as any[]).map(r => ({
      id: r.id,
      date: r.date,
      time: r.time,
      category: r.category,
      amount: Number(r.amount),
      enteredBy: r.entered_by,
      note: r.note || '',
    }));

    const [settingsRows] = await pool.execute(
      'SELECT monthly_rent, monthly_electricity, monthly_internet, monthly_salary FROM settings WHERE id = 1'
    );
    const s = (settingsRows as any[])[0] || {};
    const settings = {
      monthlyRent: s.monthly_rent != null ? Number(s.monthly_rent) : undefined,
      monthlyElectricity: s.monthly_electricity != null ? Number(s.monthly_electricity) : undefined,
      monthlyInternet: s.monthly_internet != null ? Number(s.monthly_internet) : undefined,
      monthlySalary: s.monthly_salary != null ? Number(s.monthly_salary) : undefined,
    };

    // Salary snapshot for the period (same math as GET /api/salary)
    const [staffRows] = await pool.execute(
      "SELECT id, name FROM users WHERE role = 'STAFF' ORDER BY created_at"
    );
    const staff = staffRows as any[];

    const [salaryRows] = await pool.execute(
      'SELECT employee_id, monthly_salary FROM employee_salaries WHERE period = ?',
      [requested]
    );
    const salaryByEmployee = new Map<string, number>();
    (salaryRows as any[]).forEach(r => salaryByEmployee.set(r.employee_id, Number(r.monthly_salary)));

    const [paymentRows] = await pool.execute(
      'SELECT employee_id, amount FROM salary_payments WHERE period = ?',
      [requested]
    );
    const paidByEmployee = new Map<string, number>();
    (paymentRows as any[]).forEach(p => {
      paidByEmployee.set(p.employee_id, (paidByEmployee.get(p.employee_id) || 0) + Number(p.amount));
    });

    let totalObligation = 0;
    let active = false;
    staff.forEach(emp => {
      const salary = salaryByEmployee.has(emp.id) ? salaryByEmployee.get(emp.id)! : 0;
      if (salaryByEmployee.has(emp.id) && salary > 0) {
        active = true;
        totalObligation += salary;
      }
    });

    const [catRows] = await pool.execute(
      'SELECT category_key, is_fixed FROM expense_categories'
    );
    const fixedCats = new Map<string, boolean>();
    (catRows as any[]).forEach(c => fixedCats.set(c.category_key, !!c.is_fixed));
    const catIsFixed = (cat: string) => {
      if (fixedCats.has(cat)) return fixedCats.get(cat)!;
      return LEGACY_FIXED_CATS.has(cat);
    };

    const summary = computePeriodSummary({
      incomes,
      expenses,
      period: requested,
      settings,
      salarySnapshot: { period: requested, isCurrent: requested === currentPeriod, active, totalObligation, totalPaid: 0, totalRemaining: 0, employees: [], payments: [] },
      catIsFixed,
      maxDate: upToDate,
    });

    res.json({
      period: requested,
      isCurrent: requested === currentPeriod,
      upToDate,
      ...summary,
    });
  } catch (err) {
    console.error('Financial summary error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
