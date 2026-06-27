import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

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
    const { date, time, category, amount, enteredBy, note } = req.body;
    const id = `exp-${Date.now()}`;

    await pool.execute(
      'INSERT INTO expense_records (id, date, time, category, amount, entered_by, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, date, time, category, amount, enteredBy, note || '']
    );

    res.status(201).json({ id, date, time, category, amount, enteredBy, note: note || '' });
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
