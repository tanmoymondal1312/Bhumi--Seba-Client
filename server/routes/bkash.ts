import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

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
    const { date, time, type, amount, fee, enteredBy, note, refTrx } = req.body;
    const id = `bk-${Date.now()}`;

    await pool.execute(
      'INSERT INTO bkash_records (id, date, time, type, amount, fee, entered_by, note, ref_trx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, date, time, type, amount, fee || null, enteredBy, note || '', refTrx || null]
    );

    res.status(201).json({ id, date, time, type, amount, fee: fee || undefined, enteredBy, note: note || '', refTrx: refTrx || undefined });
  } catch (err) {
    console.error('Add bkash error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { date, time, type, amount, fee, enteredBy, note, refTrx } = req.body;

    await pool.execute(
      'UPDATE bkash_records SET date = ?, time = ?, type = ?, amount = ?, fee = ?, entered_by = ?, note = ?, ref_trx = ? WHERE id = ?',
      [date, time, type, amount, fee || null, enteredBy, note || '', refTrx || null, id]
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
