import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getTodayStr } from '../../src/utils/accountingPeriod';
import { isValidDate, isValidTime, isPositiveAmount, resolveEnteredBy } from '../validation';

const router = Router();

// Categories storable in expense_records.category (DB ENUM + seed table).
const LEGACY_EXPENSE_CATS = new Set(['RENT', 'ELECTRICITY', 'INTERNET', 'SALARY', 'OFFICE', 'TRAVEL', 'PRINT', 'OTHERS', 'COURT_FEE', 'A4_PAPER', 'LEGAL_PAPER', 'COLOR_PAPER', 'STAMP']);

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, date, time, category, amount, entered_by, note FROM expense_records ORDER BY date DESC, time DESC'
    );
    const mapped = (rows as any[]).map(r => ({
      id: r.id, date: r.date, time: r.time,
      category: r.category, amount: Number(r.amount),
      enteredBy: r.entered_by, note: r.note || '',
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { date, time, category, amount, note } = req.body;
    const id = `exp-${Date.now()}`;

    // Phase 5 hardening: server-side validation (same rules the UI enforces).
    if (!isPositiveAmount(amount)) {
      res.status(400).json({ message: 'খরচের পরিমাণ অবশ্যই 0 এর বেশি হতে হবে।' });
      return;
    }
    if (!isValidDate(date)) {
      res.status(400).json({ message: 'তারিখ সঠিক নয়।' });
      return;
    }
    if (date > getTodayStr()) {
      res.status(400).json({ message: 'ভবিষ্যতের তারিখে খরচ যোগ করা যাবে না।' });
      return;
    }
    if (!isValidTime(time)) {
      res.status(400).json({ message: 'সময় সঠিক নয়।' });
      return;
    }
    const cat = String(category || '');
    if (!LEGACY_EXPENSE_CATS.has(cat)) {
      const [catRows] = await pool.execute(
        'SELECT category_key FROM expense_categories WHERE category_key = ? AND is_active = 1',
        [cat]
      );
      if ((catRows as any[]).length === 0) {
        res.status(400).json({ message: 'খরচের খাতটি বৈধ নয়।' });
        return;
      }
    }

    const enteredBy = await resolveEnteredBy(pool, req.userId as string, req.body?.enteredBy);

    await pool.execute(
      'INSERT INTO expense_records (id, date, time, category, amount, entered_by, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, date, time, cat, amount, enteredBy, note || '']
    );

    res.status(201).json({ id, date, time, category: cat, amount, enteredBy, note: note || '' });
  } catch (err) {
    console.error('Add expense error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM expense_records WHERE id = ?', [id]);
    res.json({ message: 'মুছে ফেলা সফল।' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
