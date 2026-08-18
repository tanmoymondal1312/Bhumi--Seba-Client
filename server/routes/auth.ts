import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// Phase 6 hardening: simple in-memory brute-force guard for PIN login.
// Tracks failed attempts per identity + IP; 10 failures within 15 minutes
// blocks further attempts for 15 minutes. (In-memory: resets on restart.)
const attemptBuckets = new Map<string, { count: number; blockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

function checkLoginBlocked(key: string): boolean {
  const entry = attemptBuckets.get(key);
  if (!entry) return false;
  if (entry.blockedUntil > Date.now()) return true;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.blockedUntil = Date.now() + LOCK_WINDOW_MS;
    entry.count = 0;
    return true;
  }
  return false;
}

function recordLoginFailure(key: string) {
  const entry = attemptBuckets.get(key) || { count: 0, blockedUntil: 0 };
  entry.count += 1;
  attemptBuckets.set(key, entry);
}

function clearLoginFailures(key: string) {
  attemptBuckets.delete(key);
}

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
    const { userId, username, pin } = req.body;

    if ((!userId && !username) || !pin) {
      res.status(400).json({ message: 'ইউজারনেম এবং পিন দেওয়া আবশ্যক।' });
      return;
    }

    const attemptKey = `${(userId || String(username || '').trim().toLowerCase())}|${req.ip || 'unknown'}`;
    if (checkLoginBlocked(attemptKey)) {
      res.status(429).json({ message: 'অনেকবার ভুল পিন দেওয়া হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন।' });
      return;
    }

    let rows: any;
    if (userId) {
      [rows] = await pool.execute(
        'SELECT id, name, role, pin, avatar, phone FROM users WHERE id = ?',
        [userId]
      );
    } else {
      [rows] = await pool.execute(
        'SELECT id, name, role, pin, avatar, phone FROM users WHERE LOWER(name) = LOWER(?)',
        [username.trim()]
      );
    }

    const users = rows as any[];
    if (users.length === 0) {
      recordLoginFailure(attemptKey);
      res.status(401).json({ message: 'ব্যবহারকারী পাওয়া যায়নি!' });
      return;
    }

    const user = users[0];
    const pinMatch = await bcrypt.compare(pin, user.pin);
    if (!pinMatch) {
      recordLoginFailure(attemptKey);
      res.status(401).json({ message: 'ভুল পিন! সঠিক পিন দিয়ে আবার চেষ্টা করুন।' });
      return;
    }
    clearLoginFailures(attemptKey);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Phase 6 hardening: purge expired sessions on each successful login so
    // stale rows do not accumulate forever in the sessions table.
    await pool.execute('DELETE FROM sessions WHERE expires_at <= NOW()');

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

router.put('/avatar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { avatar } = req.body;
    if (!avatar) {
      res.status(400).json({ message: 'অ্যাভাটার দেওয়া আবশ্যক।' });
      return;
    }
    await pool.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.userId]);
    res.json({ avatar });
  } catch (err) {
    console.error('Avatar update error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
