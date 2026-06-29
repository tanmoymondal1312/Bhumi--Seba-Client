import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [income] = await pool.execute('SELECT * FROM income_records ORDER BY date DESC, time DESC');
    const [expenses] = await pool.execute('SELECT * FROM expense_records ORDER BY date DESC, time DESC');
    const [bkash] = await pool.execute('SELECT * FROM bkash_records ORDER BY date DESC, time DESC');
    const [reminders] = await pool.execute('SELECT * FROM reminders ORDER BY date DESC');
    const [settings] = await pool.execute('SELECT * FROM settings WHERE id = 1');
    const [services] = await pool.execute('SELECT * FROM services_metadata ORDER BY sort_order');
    const [memos] = await pool.execute('SELECT * FROM memos ORDER BY date DESC, time DESC');

    const incomeList = (income as any[]).map(r => ({
      id: r.id, date: r.date, time: r.time,
      serviceType: r.service_type, amount: Number(r.amount),
      enteredBy: r.entered_by, note: r.note || '',
      paymentMethod: r.payment_method,
    }));

    const expenseList = (expenses as any[]).map(r => ({
      id: r.id, date: r.date, time: r.time,
      category: r.category, amount: Number(r.amount),
      enteredBy: r.entered_by, note: r.note || '',
    }));

    const bkashList = (bkash as any[]).map(r => ({
      id: r.id, date: r.date, time: r.time,
      type: r.type, amount: Number(r.amount),
      fee: r.fee != null ? Number(r.fee) : null,
      enteredBy: r.entered_by, note: r.note || '',
      refTrx: r.ref_trx || null,
    }));

    const reminderList = (reminders as any[]).map(r => ({
      id: r.id, title: r.title, date: r.date,
      isCompleted: !!r.is_completed,
    }));

    const s = (settings as any[])[0];
    const settingsData = s ? {
      isDarkMode: !!s.is_dark_mode,
      pinLockEnabled: !!s.pin_lock_enabled,
      dailyReminderText: s.daily_reminder_text || '',
      expenseAlertThreshold: Number(s.expense_alert_threshold),
      monthlyRent: Number(s.monthly_rent),
      monthlyElectricity: Number(s.monthly_electricity),
      monthlyInternet: Number(s.monthly_internet),
      monthlySalary: Number(s.monthly_salary),
      bkashBaseBalance: Number(s.bkash_base_balance),
    } : {};

    const servicesMetadata = (services as any[]).map(r => ({
      serviceKey: r.service_key,
      bangla: r.bangla,
      english: r.english,
      color: r.color,
      defaultPrice: Number(r.default_price),
      isActive: !!r.is_active,
    }));

    res.json({
      exportDate: new Date().toISOString(),
      incomeList,
      expenseList,
      bkashList,
      reminderList,
      settings: settingsData,
      servicesMetadata,
      memoList: (memos as any[]).map(r => ({
        id: r.id, title: r.title, description: r.description || '',
        amount: Number(r.amount), image: r.image ? '[base64]' : '',
        enteredBy: r.entered_by, date: r.date, time: r.time,
      })),
    });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'এক্সপোর্ট ত্রুটি।' });
  }
});

router.post('/reset', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'OWNER_ONE') {
      res.status(403).json({ message: 'শুধুমাত্র মালিক রিসেট করতে পারেন।' });
      return;
    }

    await pool.execute('DELETE FROM sessions');
    await pool.execute('DELETE FROM income_records');
    await pool.execute('DELETE FROM expense_records');
    await pool.execute('DELETE FROM bkash_records');
    await pool.execute('DELETE FROM reminders');
    await pool.execute('DELETE FROM memos');
    await pool.execute('DELETE FROM settings');
    await pool.execute('DELETE FROM services_metadata');
    await pool.execute('DELETE FROM users');

    const { initializeDatabase } = await import('../db');
    await initializeDatabase();

    res.json({ message: 'ডেটাবেস রিসেট সফল।' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ message: 'রিসেট ত্রুটি।' });
  }
});

export default router;
