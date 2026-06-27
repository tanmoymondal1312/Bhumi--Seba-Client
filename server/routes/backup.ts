import { Router, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcryptjs';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [income] = await pool.execute('SELECT id, date, time, service_type AS serviceType, amount, entered_by AS enteredBy, note, payment_method AS paymentMethod FROM income_records');
    const [expenses] = await pool.execute('SELECT id, date, time, category, amount, entered_by AS enteredBy, note FROM expense_records');
    const [bkash] = await pool.execute('SELECT id, date, time, type, amount, fee, entered_by AS enteredBy, note, ref_trx AS refTrx FROM bkash_records');
    const [reminders] = await pool.execute('SELECT id, title, date, is_completed AS isCompleted FROM reminders');
    const [settings] = await pool.execute('SELECT * FROM settings WHERE id = 1');
    const [services] = await pool.execute('SELECT service_key AS serviceKey, bangla, english, color, default_price AS defaultPrice, is_active AS isActive FROM services_metadata');

    res.json({
      exportDate: new Date().toISOString(),
      incomeList: income,
      expenseList: expenses,
      bkashList: bkash,
      reminderList: reminders,
      settings: (settings as any[])[0] || {},
      servicesMetadata: services,
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'এক্সপোর্ট ত্রুটি।' });
  }
});

router.post('/reset', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'OWNER_ONE' && req.userRole !== 'OWNER_TWO') {
      res.status(403).json({ message: 'শুধুমাত্র মালিক রিসেট করতে পারেন।' });
      return;
    }

    await pool.execute('DELETE FROM sessions');
    await pool.execute('DELETE FROM income_records');
    await pool.execute('DELETE FROM expense_records');
    await pool.execute('DELETE FROM bkash_records');
    await pool.execute('DELETE FROM reminders');
    await pool.execute('DELETE FROM settings');
    await pool.execute('DELETE FROM services_metadata');
    await pool.execute('DELETE FROM users');

    // Re-import and run seed
    const { initializeDatabase } = await import('../db');
    await initializeDatabase();

    res.json({ message: 'ডেটাবেস রিসেট সফল।' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ message: 'রিসেট ত্রুটি।' });
  }
});

export default router;
