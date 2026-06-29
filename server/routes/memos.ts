import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, description, amount, image, entered_by, date, time FROM memos ORDER BY date DESC, time DESC'
    );
    const mapped = (rows as any[]).map(r => ({
      id: r.id, title: r.title, description: r.description || '',
      amount: Number(r.amount), image: r.image || '',
      enteredBy: r.entered_by, date: r.date, time: r.time,
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get memos error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, amount, image, enteredBy, date, time } = req.body;
    if (!title) {
      res.status(400).json({ message: 'মেমো শিরোনাম আবশ্যক।' });
      return;
    }
    const id = `memo-${Date.now()}`;
    await pool.execute(
      'INSERT INTO memos (id, title, description, amount, image, entered_by, date, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, description || '', amount || 0, image || '', enteredBy, date, time]
    );
    res.status(201).json({ id, title, description: description || '', amount: amount || 0, image: image || '', enteredBy, date, time });
  } catch (err) {
    console.error('Add memo error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM memos WHERE id = ?', [req.params.id]);
    res.json({ message: 'মেমো মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('Delete memo error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
