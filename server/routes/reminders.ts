import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, date, is_completed FROM reminders ORDER BY date ASC'
    );
    const mapped = (rows as any[]).map(r => ({
      id: r.id,
      title: r.title,
      date: r.date,
      isCompleted: !!r.is_completed,
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get reminders error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, date } = req.body;
    const id = `rem-${Date.now()}`;

    await pool.execute(
      'INSERT INTO reminders (id, title, date, is_completed) VALUES (?, ?, ?, FALSE)',
      [id, title, date]
    );

    res.status(201).json({ id, title, date, isCompleted: false });
  } catch (err) {
    console.error('Add reminder error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.patch('/:id/toggle', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.execute(
      'UPDATE reminders SET is_completed = NOT is_completed WHERE id = ?',
      [id]
    );
    res.json({ message: 'টগল সফল।' });
  } catch (err) {
    console.error('Toggle reminder error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM reminders WHERE id = ?', [id]);
    res.json({ message: 'মুছে ফেলা সফল।' });
  } catch (err) {
    console.error('Delete reminder error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
