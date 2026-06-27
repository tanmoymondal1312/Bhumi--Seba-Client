import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM settings WHERE id = 1');
    const settings = rows as any[];

    if (settings.length === 0) {
      res.json({
        isDarkMode: true,
        pinLockEnabled: true,
        dailyReminderText: '',
        expenseAlertThreshold: 5000,
        monthlyRent: 6000,
        monthlyElectricity: 1850,
        monthlyInternet: 800,
        monthlySalary: 8000,
        bkashBaseBalance: 12500,
      });
      return;
    }

    const s = settings[0];
    res.json({
      isDarkMode: !!s.is_dark_mode,
      pinLockEnabled: !!s.pin_lock_enabled,
      dailyReminderText: s.daily_reminder_text || '',
      expenseAlertThreshold: Number(s.expense_alert_threshold),
      monthlyRent: s.monthly_rent != null ? Number(s.monthly_rent) : undefined,
      monthlyElectricity: s.monthly_electricity != null ? Number(s.monthly_electricity) : undefined,
      monthlyInternet: s.monthly_internet != null ? Number(s.monthly_internet) : undefined,
      monthlySalary: s.monthly_salary != null ? Number(s.monthly_salary) : undefined,
      lastQuoteUpdatedAt: s.last_quote_updated_at != null ? Number(s.last_quote_updated_at) : undefined,
      bkashBaseBalance: s.bkash_base_balance != null ? Number(s.bkash_base_balance) : undefined,
      bkashTodaySpentOverride: s.bkash_today_spent_override != null ? Number(s.bkash_today_spent_override) : undefined,
      cashInHandOverride: s.cash_in_hand_override != null ? Number(s.cash_in_hand_override) : undefined,
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.put('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.isDarkMode !== undefined) { updates.push('is_dark_mode = ?'); values.push(data.isDarkMode); }
    if (data.pinLockEnabled !== undefined) { updates.push('pin_lock_enabled = ?'); values.push(data.pinLockEnabled); }
    if (data.dailyReminderText !== undefined) { updates.push('daily_reminder_text = ?'); values.push(data.dailyReminderText); }
    if (data.expenseAlertThreshold !== undefined) { updates.push('expense_alert_threshold = ?'); values.push(data.expenseAlertThreshold); }
    if (data.monthlyRent !== undefined) { updates.push('monthly_rent = ?'); values.push(data.monthlyRent); }
    if (data.monthlyElectricity !== undefined) { updates.push('monthly_electricity = ?'); values.push(data.monthlyElectricity); }
    if (data.monthlyInternet !== undefined) { updates.push('monthly_internet = ?'); values.push(data.monthlyInternet); }
    if (data.monthlySalary !== undefined) { updates.push('monthly_salary = ?'); values.push(data.monthlySalary); }
    if (data.lastQuoteUpdatedAt !== undefined) { updates.push('last_quote_updated_at = ?'); values.push(data.lastQuoteUpdatedAt); }
    if (data.bkashBaseBalance !== undefined) { updates.push('bkash_base_balance = ?'); values.push(data.bkashBaseBalance); }
    if (data.bkashTodaySpentOverride !== undefined) { updates.push('bkash_today_spent_override = ?'); values.push(data.bkashTodaySpentOverride); }
    if (data.cashInHandOverride !== undefined) { updates.push('cash_in_hand_override = ?'); values.push(data.cashInHandOverride); }

    if (updates.length === 0) {
      res.status(400).json({ message: 'কোনো আপডেট ডেটা দেওয়া হয়নি।' });
      return;
    }

    // Upsert: insert if not exists, update if exists
    const [existing] = await pool.execute('SELECT id FROM settings WHERE id = 1');
    if ((existing as any[]).length === 0) {
      await pool.execute('INSERT INTO settings (id) VALUES (1)');
    }

    await pool.execute(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`, values);
    res.json({ message: 'সেটিংস আপডেট সফল।' });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
