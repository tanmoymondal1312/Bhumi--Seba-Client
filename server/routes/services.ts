import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT service_key, bangla, english, color, default_price, is_active FROM services_metadata ORDER BY sort_order ASC'
    );
    const mapped = (rows as any[]).map(r => ({
      serviceKey: r.service_key,
      bangla: r.bangla,
      english: r.english,
      color: r.color,
      defaultPrice: Number(r.default_price),
      isActive: !!r.is_active,
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Get services error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { serviceKey, bangla, english, color, defaultPrice } = req.body;

    const [existing] = await pool.execute(
      'SELECT MAX(sort_order) as maxOrder FROM services_metadata'
    );
    const nextOrder = ((existing as any[])[0]?.maxOrder || 0) + 1;

    await pool.execute(
      'INSERT INTO services_metadata (service_key, bangla, english, color, default_price, is_active, sort_order) VALUES (?, ?, ?, ?, ?, TRUE, ?)',
      [serviceKey, bangla, english, color, defaultPrice, nextOrder]
    );

    res.status(201).json({ message: 'সার্ভিস যোগ সফল।' });
  } catch (err) {
    console.error('Add service error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.put('/:key', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { bangla, english, color, defaultPrice } = req.body;

    await pool.execute(
      'UPDATE services_metadata SET bangla = ?, english = ?, color = ?, default_price = ? WHERE service_key = ?',
      [bangla, english, color, defaultPrice, key]
    );

    res.json({ message: 'আপডেট সফল।' });
  } catch (err) {
    console.error('Update service error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.delete('/:key', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    await pool.execute('DELETE FROM services_metadata WHERE service_key = ?', [key]);
    res.json({ message: 'মুছে ফেলা সফল।' });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.put('/:key/toggle', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { isActive } = req.body;
    await pool.execute(
      'UPDATE services_metadata SET is_active = ? WHERE service_key = ?',
      [isActive, key]
    );
    res.json({ message: 'স্ট্যাটাস আপডেট সফল।' });
  } catch (err) {
    console.error('Toggle service error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
