import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getTodayStr } from '../../src/utils/accountingPeriod';

const router = Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * GET /api/dues
 *
 * Lists all outstanding dues, newest first. Same contract as the legacy
 * api/dues.php (any logged-in user can read, matching the PHP design).
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, customer_name, phone, service_type, amount, note, date, entered_by FROM dues ORDER BY date DESC, created_at DESC'
    );
    const out = (rows as any[]).map(r => ({
      id: r.id,
      customerName: r.customer_name,
      phone: r.phone || '',
      serviceType: r.service_type || 'OTHERS',
      amount: Number(r.amount),
      note: r.note || '',
      date: r.date,
      enteredBy: r.entered_by,
    }));
    res.json(out);
  } catch (err) {
    console.error('List dues error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

/**
 * POST /api/dues
 * body: { customerName, phone?, serviceType?, amount, note?, date, enteredBy? }
 *
 * Creates a new due entry. Validation mirrors api/dues.php (name, amount>0 and
 * date required) plus Phase 5 hardening: the date must be a real, non-future
 * date and enteredBy falls back to the logged-in user's name.
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const customerName = String(req.body?.customerName || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const serviceType = String(req.body?.serviceType || 'OTHERS');
    const amount = Number(req.body?.amount);
    const note = String(req.body?.note || '').trim();
    const date = String(req.body?.date || '');

    if (customerName === '' || isNaN(amount) || amount <= 0 || date === '') {
      res.status(400).json({ message: 'গ্রাহকের নাম, টাকার পরিমাণ ও তারিখ আবশ্যক।' });
      return;
    }
    if (!isValidDate(date)) {
      res.status(400).json({ message: 'তারিখ সঠিক নয়।' });
      return;
    }
    if (date > getTodayStr()) {
      res.status(400).json({ message: 'ভবিষ্যতের তারিখে বাকি নেওয়া যাবে না।' });
      return;
    }

    let enteredBy = String(req.body?.enteredBy || '').trim();
    if (enteredBy === '') {
      const [userRows] = await pool.execute('SELECT name FROM users WHERE id = ?', [req.userId]);
      enteredBy = (userRows as any[])[0]?.name || 'মালিক';
    }

    const dueId = `due-${Date.now()}`;
    await pool.execute(
      `INSERT INTO dues (id, customer_name, phone, service_type, amount, note, date, entered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dueId, customerName, phone, serviceType, amount, note, date, enteredBy]
    );

    res.status(201).json({
      id: dueId,
      customerName,
      phone,
      serviceType,
      amount,
      note,
      date,
      enteredBy,
    });
  } catch (err) {
    console.error('Create due error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

/**
 * POST /api/dues/:id/pay
 * body: { date, time, enteredBy?, paymentMethod? }
 *
 * Settles a due: creates an income record on the given date and deletes the
 * due row — atomically inside one transaction (same behavior as api/dues.php).
 * The legacy PHP flow did NOT create a bKash ledger entry for BKASH payments;
 * this port keeps that behavior identical (documented limitation).
 */
router.post('/:id/pay', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const date = String(req.body?.date || '');
    const time = String(req.body?.time || '');
    const method = String(req.body?.paymentMethod || 'CASH');

    const [dueRows] = await pool.execute('SELECT * FROM dues WHERE id = ?', [id]);
    const due = (dueRows as any[])[0];
    if (!due) {
      res.status(404).json({ message: 'বাকির এন্ট্রিটি পাওয়া যায়নি।' });
      return;
    }
    if (date === '' || time === '') {
      res.status(400).json({ message: 'তারিখ ও সময় আবশ্যক।' });
      return;
    }
    if (!isValidDate(date) || !TIME_REGEX.test(time)) {
      res.status(400).json({ message: 'তারিখ অথবা সময় সঠিক নয়।' });
      return;
    }
    if (date > getTodayStr()) {
      res.status(400).json({ message: 'ভবিষ্যতের তারিখে পরিশোধ করা যাবে না।' });
      return;
    }
    if (!['CASH', 'BKASH'].includes(method)) {
      res.status(400).json({ message: 'পরিশোধ পদ্ধতি CASH অথবা BKASH হতে হবে।' });
      return;
    }

    let enteredBy = String(req.body?.enteredBy || '').trim();
    if (enteredBy === '') {
      const [userRows] = await pool.execute('SELECT name FROM users WHERE id = ?', [req.userId]);
      enteredBy = (userRows as any[])[0]?.name || 'মালিক';
    }

    const incId = `inc-${Date.now()}`;
    const note = `বাকি পরিশোধ: ${due.customer_name}${due.note ? ` (${due.note})` : ''}`;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `INSERT INTO income_records (id, date, time, service_type, amount, entered_by, note, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [incId, date, time, due.service_type || 'OTHERS', Number(due.amount), enteredBy, note, method]
      );
      await conn.execute('DELETE FROM dues WHERE id = ?', [id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      console.error('Due payment transaction error:', err);
      res.status(500).json({ message: 'পরিশোধ প্রক্রিয়া ব্যর্থ হয়েছে — আবার চেষ্টা করুন।' });
      return;
    } finally {
      conn.release();
    }

    res.status(201).json({
      income: {
        id: incId,
        date,
        time,
        serviceType: due.service_type || 'OTHERS',
        amount: Number(due.amount),
        enteredBy,
        note,
        paymentMethod: method,
      },
      deletedDueId: id,
    });
  } catch (err) {
    console.error('Pay due error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

/**
 * DELETE /api/dues/:id
 *
 * Removes a due without creating income (wrong entry), same as api/dues.php.
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM dues WHERE id = ?', [req.params.id]);
    res.json({ message: 'মুছে ফেলা সফল।' });
  } catch (err) {
    console.error('Delete due error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
