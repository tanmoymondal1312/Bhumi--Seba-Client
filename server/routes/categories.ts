import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT category_key, bangla, english, color, is_fixed, is_active FROM expense_categories ORDER BY sort_order ASC'
    );
    const mapped = (rows as any[]).map(r => ({
      categoryKey: r.category_key,
      bangla: r.bangla,
      english: r.english || '',
      color: r.color || 'bg-slate-500',
      isFixed: !!r.is_fixed,
      isActive: !!r.is_active,
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get expense categories error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { categoryKey, bangla, english, color, isFixed } = req.body;

    if (!categoryKey || !bangla) {
      res.status(400).json({ message: 'খাতের নাম ও ইউনিক কী আবশ্যক।' });
      return;
    }

    const [existing] = await pool.execute(
      'SELECT COUNT(*) as count FROM expense_categories WHERE category_key = ?',
      [categoryKey]
    );
    if ((existing as any[])[0].count > 0) {
      res.status(409).json({ message: 'এই খাতটি ইতিমধ্যে তালিকায় রয়েছে!' });
      return;
    }

    const [maxOrder] = await pool.execute('SELECT MAX(sort_order) as maxOrder FROM expense_categories');
    const nextOrder = ((maxOrder as any[])[0]?.maxOrder || 0) + 1;

    await pool.execute(
      'INSERT INTO expense_categories (category_key, bangla, english, color, is_fixed, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [categoryKey, bangla || '', english || '', color || 'bg-slate-500', isFixed ? 1 : 0, nextOrder]
    );

    res.status(201).json({ message: 'খরচের খাত যোগ সফল।' });
  } catch (err) {
    console.error('Add expense category error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.delete('/:key', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    await pool.execute('DELETE FROM expense_categories WHERE category_key = ?', [key]);
    res.json({ message: 'মুছে ফেলা সফল।' });
  } catch (err) {
    console.error('Delete expense category error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
