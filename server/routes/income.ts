import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, date, time, service_type AS serviceType, amount, entered_by AS enteredBy, note, payment_method AS paymentMethod FROM income_records ORDER BY date DESC, time DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Get income error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { date, time, serviceType, amount, enteredBy, note, paymentMethod } = req.body;
    const id = `inc-${Date.now()}`;

    await pool.execute(
      'INSERT INTO income_records (id, date, time, service_type, amount, entered_by, note, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, date, time, serviceType, amount, enteredBy, note || '', paymentMethod || 'CASH']
    );

    const record = { id, date, time, serviceType, amount, enteredBy, note: note || '', paymentMethod: paymentMethod || 'CASH' };

    // Auto-create bKash record if payment method is BKASH
    let bkashRecord = null;
    if (paymentMethod === 'BKASH') {
      const bkId = `bk-${Date.now()}`;
      const refTrx = 'BHUM' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await pool.execute(
        'INSERT INTO bkash_records (id, date, time, type, amount, entered_by, note, ref_trx) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [bkId, date, time, 'IN', amount, enteredBy, `ইনকাম এন্ট্রি লিংক: ${note || ''}`, refTrx]
      );
      bkashRecord = { id: bkId, date, time, type: 'IN', amount, enteredBy, note: `ইনকাম এন্ট্রি লিংক: ${note || ''}`, refTrx };
    }

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
