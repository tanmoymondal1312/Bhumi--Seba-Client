import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getTodayStr } from '../../src/utils/accountingPeriod';
import { isValidDate, isValidTime, isPositiveAmount, resolveEnteredBy } from '../validation';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, date, time, service_type, amount, entered_by, note, payment_method FROM income_records ORDER BY date DESC, time DESC'
    );
    const mapped = (rows as any[]).map(r => ({
      id: r.id, date: r.date, time: r.time,
      serviceType: r.service_type, amount: Number(r.amount),
      enteredBy: r.entered_by, note: r.note || '',
      paymentMethod: r.payment_method,
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get income error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { date, time, serviceType, amount, note, paymentMethod } = req.body;
    const id = `inc-${Date.now()}`;

    // Phase 5 hardening: server-side validation (the UI already limits these,
    // but direct API calls must produce the same safe behavior).
    if (!isPositiveAmount(amount)) {
      res.status(400).json({ message: 'আয়ের পরিমাণ অবশ্যই 0 এর বেশি হতে হবে।' });
      return;
    }
    if (!isValidDate(date)) {
      res.status(400).json({ message: 'তারিখ সঠিক নয়।' });
      return;
    }
    if (date > getTodayStr()) {
      res.status(400).json({ message: 'ভবিষ্যতের তারিখে আয় যোগ করা যাবে না।' });
      return;
    }
    if (!isValidTime(time)) {
      res.status(400).json({ message: 'সময় সঠিক নয়।' });
      return;
    }
    if (!serviceType || String(serviceType).trim() === '') {
      res.status(400).json({ message: 'সেবার ধরন নির্বাচন করুন।' });
      return;
    }
    const method = String(paymentMethod || 'CASH');
    if (!['CASH', 'BKASH'].includes(method)) {
      res.status(400).json({ message: 'পরিশোধ পদ্ধতি CASH অথবা BKASH হতে হবে।' });
      return;
    }

    const enteredBy = await resolveEnteredBy(pool, req.userId as string, req.body?.enteredBy);

    // Income insert + linked bKash ledger entry are written atomically so the
    // ledger can never record a bKash income that does not exist (Phase 5).
    const conn = await pool.getConnection();
    let bkashRecord = null;
    try {
      await conn.beginTransaction();
      await conn.execute(
        'INSERT INTO income_records (id, date, time, service_type, amount, entered_by, note, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, date, time, serviceType, amount, enteredBy, note || '', method]
      );

      // Auto-create bKash record if payment method is BKASH
      if (method === 'BKASH') {
        const bkId = `bk-${Date.now()}`;
        const refTrx = 'BHUM' + Math.random().toString(36).substring(2, 8).toUpperCase();
        await conn.execute(
          'INSERT INTO bkash_records (id, date, time, type, amount, entered_by, note, ref_trx) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [bkId, date, time, 'IN', amount, enteredBy, `ইনকাম এন্ট্রি লিংক: ${note || ''}`, refTrx]
        );
        bkashRecord = { id: bkId, date, time, type: 'IN', amount, enteredBy, note: `ইনকাম এন্ট্রি লিংক: ${note || ''}`, refTrx };
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const record = { id, date, time, serviceType, amount, enteredBy, note: note || '', paymentMethod: method };
    res.status(201).json({ income: record, bkash: bkashRecord });
  } catch (err) {
    console.error('Add income error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    // Phase 6 hardening: PUT now enforces the same rules as POST so direct API
    // edits cannot introduce invalid amounts, future dates or bad enums.
    if (fields.amount !== undefined && !isPositiveAmount(fields.amount)) {
      res.status(400).json({ message: 'আয়ের পরিমাণ অবশ্যই 0 এর বেশি হতে হবে।' });
      return;
    }
    if (fields.date !== undefined) {
      if (!isValidDate(fields.date)) {
        res.status(400).json({ message: 'তারিখ সঠিক নয়।' });
        return;
      }
      if (fields.date > getTodayStr()) {
        res.status(400).json({ message: 'ভবিষ্যতের তারিখে আয় যোগ করা যাবে না।' });
        return;
      }
    }
    if (fields.time !== undefined && !isValidTime(fields.time)) {
      res.status(400).json({ message: 'সময় সঠিক নয়।' });
      return;
    }
    if (fields.serviceType !== undefined && String(fields.serviceType).trim() === '') {
      res.status(400).json({ message: 'সেবার ধরন নির্বাচন করুন।' });
      return;
    }
    if (fields.paymentMethod !== undefined && !['CASH', 'BKASH'].includes(String(fields.paymentMethod))) {
      res.status(400).json({ message: 'পরিশোধ পদ্ধতি CASH অথবা BKASH হতে হবে।' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (fields.date !== undefined) { updates.push('date = ?'); values.push(fields.date); }
    if (fields.time !== undefined) { updates.push('time = ?'); values.push(fields.time); }
    if (fields.serviceType !== undefined) { updates.push('service_type = ?'); values.push(fields.serviceType); }
    if (fields.amount !== undefined) { updates.push('amount = ?'); values.push(fields.amount); }
    if (fields.enteredBy !== undefined) { updates.push('entered_by = ?'); values.push(fields.enteredBy); }
    if (fields.note !== undefined) { updates.push('note = ?'); values.push(fields.note); }
    if (fields.paymentMethod !== undefined) { updates.push('payment_method = ?'); values.push(fields.paymentMethod); }

    if (updates.length === 0) {
      res.status(400).json({ message: 'কোনো আপডেট ডেটা দেওয়া হয়নি।' });
      return;
    }

    values.push(id);
    await pool.execute(`UPDATE income_records SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'আপডেট সফল।' });
  } catch (err) {
    console.error('Update income error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM income_records WHERE id = ?', [id]);
    res.json({ message: 'মুছে ফেলা সফল।' });
  } catch (err) {
    console.error('Delete income error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
