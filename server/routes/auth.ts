import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { pin, role } = req.body;

    if (!pin) {
      res.status(400).json({ message: 'পিন দেওয়া আবশ্যক।' });
      return;
    }

    let roleCondition = '';
    if (role === 'OWNER') {
      roleCondition = "AND (role = 'OWNER_ONE' OR role = 'OWNER_TWO')";
    } else if (role === 'STAFF') {
      roleCondition = "AND role = 'STAFF'";
    }

    const [rows] = await pool.execute(
      `SELECT id, name, role, pin, avatar, phone FROM users WHERE 1=1 ${roleCondition}`,
    );

    const users = rows as any[];
    let matchedUser = null;

    for (const user of users) {
      const pinMatch = await bcrypt.compare(pin, user.pin);
      if (pinMatch) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      res.status(401).json({ message: 'ভুল পিন বা সঠিক একাউন্ট ধরন নির্বাচন করা হয়নি!' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.execute(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
      [token, matchedUser.id, expiresAt]
    );

    res.json({
      token,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        role: matchedUser.role,
        avatar: matchedUser.avatar,
        phone: matchedUser.phone,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, phone, pin, role } = req.body;

    if (!name || !pin) {
      res.status(400).json({ message: 'নাম এবং পিন দেওয়া আবশ্যক।' });
      return;
    }

    const userId = `user-${Date.now()}`;
    const hashedPin = await bcrypt.hash(pin.length === 4 ? pin : '1234', 10);
    const userRole = role === 'OWNER' ? 'OWNER_ONE' : 'STAFF';
    const avatar = role === 'OWNER'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80';

    await pool.execute(
      'INSERT INTO users (id, name, role, pin, avatar, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, userRole, hashedPin, avatar, phone || '01700-000000']
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
      [token, userId, expiresAt]
    );

    res.json({
      token,
      user: {
        id: userId,
        name,
        role: userRole,
        avatar,
        phone: phone || '01700-000000',
      },
    });
  } catch (err) {
    console.error('Register error:', err);
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
