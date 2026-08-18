import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getAccountingPeriodForDate, getCurrentAccountingPeriod, getTodayStr } from '../../src/utils/accountingPeriod';

const router = Router();

function requireOwner(req: AuthRequest, res: Response): boolean {
  if (req.userRole !== 'OWNER_ONE' && req.userRole !== 'OWNER_TWO') {
    res.status(403).json({ message: 'শুধুমাত্র মালিক বেতন তথ্য দেখতে ও পরিচালনা করতে পারেন।' });
    return false;
  }
  return true;
}

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function isValidPeriod(period: string): boolean {
  if (!PERIOD_REGEX.test(period)) return false;
  const [year, month] = period.split('-').map(Number);
  if (year < 2000 || year > 2100) return false;
  return month >= 1 && month <= 12;
}

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * GET /api/salary?period=YYYY-MM
 *
 * Returns the full salary snapshot for one accounting period:
 * - For the CURRENT period, obligations are auto-ensured for every STAFF user
 *   (INSERT IGNORE, default = users.monthly_salary ?? 0). Repeated refreshes
 *   never duplicate rows thanks to the (employee_id, period) primary key.
 * - For historical/future periods only obligations explicitly set are returned.
 * Payments are summed per employee and remaining/status are computed (never stored).
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!requireOwner(req, res)) return;
  try {
    const requested = (req.query.period as string) || getCurrentAccountingPeriod();
    if (!isValidPeriod(requested)) {
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

    const [staffRows] = await pool.execute(
      `SELECT id, name, role FROM users WHERE role = 'STAFF' ORDER BY created_at`
    );
    const staff = staffRows as any[];

    const [salaryRows] = await pool.execute(
      'SELECT employee_id, period, monthly_salary FROM employee_salaries WHERE period = ?',
      [requested]
    );
    const salaries = salaryRows as any[];
    const salaryByEmployee = new Map<string, number>();
    salaries.forEach(s => salaryByEmployee.set(s.employee_id, Number(s.monthly_salary)));

    const [paymentRows] = await pool.execute(
      `SELECT id, employee_id, employee_name, period, amount, method, date, time, note, entered_by, created_at
       FROM salary_payments WHERE period = ? ORDER BY date DESC, created_at DESC`,
      [requested]
    );
    const payments = (paymentRows as any[]).map(p => ({
      id: p.id,
      employeeId: p.employee_id,
      employeeName: p.employee_name,
      period: p.period,
      amount: Number(p.amount),
      method: p.method,
      date: p.date,
      time: p.time,
      note: p.note || '',
      enteredBy: p.entered_by,
      createdAt: p.created_at,
    }));

    const paidByEmployee = new Map<string, number>();
    payments.forEach(p => {
      paidByEmployee.set(p.employeeId, (paidByEmployee.get(p.employeeId) || 0) + p.amount);
    });

    const employees = staff.map(s => {
      const salary = salaryByEmployee.has(s.id) ? salaryByEmployee.get(s.id)! : 0;
      const hasObligation = salaryByEmployee.has(s.id);
      const paid = paidByEmployee.get(s.id) || 0;
      const remaining = salary - paid;
      let status = 'NO_OBLIGATION';
      if (hasObligation && salary > 0) {
        if (remaining <= 0) status = 'PAID';
        else if (paid > 0) status = 'PARTIAL';
        else status = 'UNPAID';
      }
      return {
        employeeId: s.id,
        name: s.name,
        role: s.role,
        monthlySalary: salary,
        hasObligation,
        paid,
        remaining: Math.max(0, remaining),
        overPaid: remaining < 0 ? -remaining : 0,
        status,
      };
    });

    const totalObligation = employees.reduce((sum, e) => sum + e.monthlySalary, 0);
    const totalPaid = employees.reduce((sum, e) => sum + e.paid, 0);
    const totalRemaining = employees.reduce((sum, e) => sum + e.remaining, 0);

    res.json({
      period: requested,
      isCurrent: requested === currentPeriod,
      active: employees.some(e => e.hasObligation && e.monthlySalary > 0),
      totalObligation,
      totalPaid,
      totalRemaining,
      employees,
      payments,
    });
  } catch (err) {
    console.error('List salary error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

/**
 * PUT /api/salary/:employeeId/:period  body: { monthlySalary }
 *
 * Sets/locks the monthly salary obligation for one employee for one period.
 * Because each period has its own row, changing a salary never retroactively
 * rewrites previous accounting periods.
 */
router.put('/:employeeId/:period', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!requireOwner(req, res)) return;
  try {
    const { employeeId, period } = req.params;
    const monthlySalary = Number(req.body?.monthlySalary);

    if (!isValidPeriod(period)) {
      res.status(400).json({ message: 'হিসাব চক্র সঠিক নয়।' });
      return;
    }
    if (isNaN(monthlySalary) || monthlySalary < 0) {
      res.status(400).json({ message: 'মাসিক বেতন অবশ্যই 0 বা তার বেশি হতে হবে।' });
      return;
    }

    const [userRows] = await pool.execute('SELECT id, name, role FROM users WHERE id = ?', [employeeId]);
    const user = (userRows as any[])[0];
    if (!user || user.role !== 'STAFF') {
      res.status(400).json({ message: 'কর্মচারী পাওয়া যায়নি।' });
      return;
    }

    await pool.execute(
      `INSERT INTO employee_salaries (employee_id, period, monthly_salary)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE monthly_salary = VALUES(monthly_salary)`,
      [employeeId, period, monthlySalary]
    );

    res.json({ employeeId, name: user.name, period, monthlySalary });
  } catch (err) {
    console.error('Set salary error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

/**
 * POST /api/salary/payment  body: { employeeId, amount, method, date, note? }
 *
 * Records an individual salary payment. The accounting period is derived from
 * the payment date using the shared accounting-period rule (3rd of the month
 * boundary), so a payment on the 1st/2nd still lands in the previous period.
 * Payments are only allowed against an existing obligation for that period and
 * cannot exceed the remaining due.
 */
router.post('/payment', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!requireOwner(req, res)) return;
  try {
    const { employeeId, amount, method, date, note } = req.body;

    if (!employeeId) {
      res.status(400).json({ message: 'কর্মচারী নির্বাচন করুন।' });
      return;
    }
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      res.status(400).json({ message: 'পরিশোধের পরিমাণ অবশ্যই 0 এর বেশি হতে হবে।' });
      return;
    }
    if (!['CASH', 'BKASH'].includes(method)) {
      res.status(400).json({ message: 'পরিশোধ পদ্ধতি CASH অথবা BKASH হতে হবে।' });
      return;
    }
    if (!isValidDate(date)) {
      res.status(400).json({ message: 'তারিখ সঠিক নয়।' });
      return;
    }
    if (date > getTodayStr()) {
      res.status(400).json({ message: 'ভবিষ্যতের তারিখে পরিশোধ করা যাবে না।' });
      return;
    }

    const [userRows] = await pool.execute('SELECT id, name, role FROM users WHERE id = ?', [employeeId]);
    const user = (userRows as any[])[0];
    if (!user || user.role !== 'STAFF') {
      res.status(400).json({ message: 'কর্মচারী পাওয়া যায়নি।' });
      return;
    }

    const period = getAccountingPeriodForDate(date);

    const [entryRows] = await pool.execute('SELECT name FROM users WHERE id = ?', [req.userId]);
    const enteredByName = (entryRows as any[])[0]?.name || 'মালিক';

    // Phase 5: the remaining-due check and the payment insert run inside one
    // transaction, locking the obligation row (SELECT ... FOR UPDATE) so two
    // concurrent payments can never double-spend an employee's salary.
    const paymentId = `salpay-${Date.now()}`;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [lockRows] = await conn.execute(
        'SELECT monthly_salary FROM employee_salaries WHERE employee_id = ? AND period = ? FOR UPDATE',
        [employeeId, period]
      );
      const lockedSalaryRow = (lockRows as any[])[0];
      if (!lockedSalaryRow || Number(lockedSalaryRow.monthly_salary) <= 0) {
        await conn.rollback();
        res.status(400).json({ message: 'প্রথমে এই কর্মচারীর মাসিক বেতন নির্ধারণ করুন।' });
        return;
      }
      const [paidRows] = await conn.execute(
        'SELECT COALESCE(SUM(amount), 0) AS paid FROM salary_payments WHERE employee_id = ? AND period = ?',
        [employeeId, period]
      );
      const paid = Number((paidRows as any[])[0].paid);
      const lockedRemaining = Number(lockedSalaryRow.monthly_salary) - paid;

      if (amountNum > lockedRemaining) {
        await conn.rollback();
        res.status(400).json({
          message: `বাকি বেতনের চেয়ে বেশি টাকা পরিশোধ করা যাবে না। (বাকি: ৳${lockedRemaining.toLocaleString('en-IN')})`,
        });
        return;
      }

      await conn.execute(
        `INSERT INTO salary_payments (id, employee_id, employee_name, period, amount, method, date, time, note, entered_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [paymentId, employeeId, user.name, period, amountNum, method, date, nowTimeStr(), (note || '').toString().slice(0, 200), enteredByName]
      );
      await conn.commit();

      res.json({
        payment: {
          id: paymentId,
          employeeId,
          employeeName: user.name,
          period,
          amount: amountNum,
          method,
          date,
          time: nowTimeStr(),
          note: note || '',
          enteredBy: enteredByName,
        },
        remaining: Number((lockedRemaining - amountNum).toFixed(2)),
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Salary payment error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

/**
 * DELETE /api/salary/payment/:id
 *
 * Removes a salary payment entry (owner only). Historical payments for deleted
 * employees are preserved in the payments list (name snapshot), only the
 * employee's obligation rows are cleaned up when the employee is deleted.
 */
router.delete('/payment/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!requireOwner(req, res)) return;
  try {
    const { id } = req.params;
    const [result] = await pool.execute('DELETE FROM salary_payments WHERE id = ?', [id]);
    if ((result as any).affectedRows === 0) {
      res.status(404).json({ message: 'পরিশোধ এন্ট্রি পাওয়া যায়নি।' });
      return;
    }
    res.json({ message: 'পরিশোধ এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('Delete salary payment error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;