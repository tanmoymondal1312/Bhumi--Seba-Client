import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getTodayStr } from '../../src/utils/accountingPeriod';
import { isValidDate, isValidTime, isPositiveAmount, resolveEnteredBy } from '../validation';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, date, time, type, amount, fee, entered_by, note, ref_trx FROM bkash_records ORDER BY date DESC, time DESC'
    );
    const mapped = (rows as any[]).map(r => ({
      id: r.id, date: r.date, time: r.time,
      type: r.type, amount: Number(r.amount),
      fee: r.fee != null ? Number(r.fee) : undefined,
      enteredBy: r.entered_by, note: r.note || '',
      refTrx: r.ref_trx || undefined,
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get bkash error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { date, time, type, amount, fee, note, refTrx } = req.body;
    const id = `bk-${Date.now()}`;

    // Phase 5 hardening: server-side validation (same rules the UI enforces).
    if (!isPositiveAmount(amount)) {
      res.status(400).json({ message: 'টাকার পরিমাণ অবশ্যই 0 এর বেশি হতে হবে।' });
      return;
    }
    if (!isValidDate(date)) {
      res.status(400).json({ message: 'তারিখ সঠিক নয়।' });
      return;
    }
    if (date > getTodayStr()) {
      res.status(400).json({ message: 'ভবিষ্যতের তারিখে এন্ট্রি যোগ করা যাবে না।' });
      return;
    }
    if (!isValidTime(time)) {
      res.status(400).json({ message: 'সময় সঠিক নয়।' });
      return;
    }
    const recType = String(type || '');
    if (!['IN', 'OUT', 'PAYMENT'].includes(recType)) {
      res.status(400).json({ message: 'লেনদেনের ধরন সঠিক নয়।' });
      return;
    }
    if (fee !== undefined && fee !== null && (isNaN(Number(fee)) || Number(fee) < 0)) {
      res.status(400).json({ message: 'ফি সঠিক নয়।' });
      return;
    }

    const enteredBy = await resolveEnteredBy(pool, req.userId as string, req.body?.enteredBy);

    await pool.execute(
      'INSERT INTO bkash_records (id, date, time, type, amount, fee, entered_by, note, ref_trx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, date, time, recType, amount, fee || null, enteredBy, note || '', refTrx || null]
    );

    res.status(201).json({ id, date, time, type: recType, amount, fee: fee || undefined, enteredBy, note: note || '', refTrx: refTrx || undefined });
  } catch (err) {
    console.error('Add bkash error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { date, time, type, amount, fee, enteredBy, note, refTrx } = req.body;

    // Phase 6 hardening: PUT enforces the same rules as POST so direct API
    // edits cannot introduce invalid amounts, dates, types or fees.
    if (!isPositiveAmount(amount)) {
      res.status(400).json({ message: 'টাকার পরিমাণ অবশ্যই 0 এর বেশি হতে হবে।' });
      return;
    }
    if (!isValidDate(date)) {
      res.status(400).json({ message: 'তারিখ সঠিক নয়।' });
      return;
    }
    if (date > getTodayStr()) {
      res.status(400).json({ message: 'ভবিষ্যতের তারিখে এন্ট্রি যোগ করা যাবে না।' });
      return;
    }
    if (!isValidTime(time)) {
      res.status(400).json({ message: 'সময় সঠিক নয়।' });
      return;
    }
    const recType = String(type || '');
    if (!['IN', 'OUT', 'PAYMENT'].includes(recType)) {
      res.status(400).json({ message: 'লেনদেনের ধরন সঠিক নয়।' });
      return;
    }
    if (fee !== undefined && fee !== null && (isNaN(Number(fee)) || Number(fee) < 0)) {
      res.status(400).json({ message: 'ফি সঠিক নয়।' });
      return;
    }

    await pool.execute(
      'UPDATE bkash_records SET date = ?, time = ?, type = ?, amount = ?, fee = ?, entered_by = ?, note = ?, ref_trx = ? WHERE id = ?',
      [date, time, recType, amount, fee || null, enteredBy, note || '', refTrx || null, id]
    );

    res.json({ message: 'আপডেট সফল।' });
  } catch (err) {
    console.error('Update bkash error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM bkash_records WHERE id = ?', [id]);
    res.json({ message: 'মুছে ফেলা সফল।' });
  } catch (err) {
    console.error('Delete bkash error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
