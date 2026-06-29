import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/users-list', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, role, avatar, phone FROM users ORDER BY FIELD(role, "OWNER_ONE", "OWNER_TWO", "STAFF"), created_at'
    );
    res.json(rows);
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { userId, pin } = req.body;

    if (!userId || !pin) {
      res.status(400).json({ message: 'ইউজার এবং পিন দেওয়া আবশ্যক।' });
      return;
    }

    const [rows] = await pool.execute(
      'SELECT id, name, role, pin, avatar, phone FROM users WHERE id = ?',
      [userId]
    );

    const users = rows as any[];
    if (users.length === 0) {
      res.status(401).json({ message: 'ব্যবহারকারী পাওয়া যায়নি!' });
      return;
    }

    const user = users[0];
    const pinMatch = await bcrypt.compare(pin, user.pin);
    if (!pinMatch) {
      res.status(401).json({ message: 'ভুল পিন! সঠিক পিন দিয়ে আবার চেষ্টা করুন।' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
      [token, user.id, expiresAt]
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization!.split(' ')[1];
    await pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
    res.json({ message: 'লগআউট সফল।' });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, role, avatar, phone FROM users WHERE id = ?',
      [req.userId]
    );
    const users = rows as any[];
    if (users.length === 0) {
      res.status(404).json({ message: 'ব্যবহারকারী পাওয়া যায়নি।' });
      return;
    }
    res.json({ user: users[0] });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
