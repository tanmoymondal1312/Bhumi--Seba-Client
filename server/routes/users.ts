import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

function requireOwner(req: AuthRequest, res: Response): boolean {
  if (req.userRole !== 'OWNER_ONE') {
    res.status(403).json({ message: 'শুধুমাত্র প্রধান মালিক ব্যবহারকারী পরিচালনা করতে পারেন।' });
    return false;
  }
  return true;
}

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!requireOwner(req, res)) return;
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, role, avatar, phone, created_at FROM users ORDER BY FIELD(role, "OWNER_ONE", "OWNER_TWO", "STAFF"), created_at'
    );
    res.json(rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!requireOwner(req, res)) return;
  try {
    const { name, role, pin, phone, avatar } = req.body;

    if (!name || !pin || !role) {
      res.status(400).json({ message: 'নাম, পিন এবং ভূমিকা আবশ্যক।' });
      return;
    }

    if (!['OWNER_TWO', 'STAFF'].includes(role)) {
      res.status(400).json({ message: 'ভূমিকা OWNER_TWO অথবা STAFF হতে হবে।' });
      return;
    }

    const userId = `user-${Date.now()}`;
    const hashedPin = await bcrypt.hash(pin, 10);

    await pool.execute(
      'INSERT INTO users (id, name, role, pin, avatar, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, role, hashedPin, avatar || '', phone || '']
    );

    res.json({
      id: userId,
      name,
      role,
      avatar: avatar || '',
      phone: phone || '',
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!requireOwner(req, res)) return;
  try {
    const { id } = req.params;

    if (id === 'owner1') {
      res.status(403).json({ message: 'প্রধান মালিকের তথ্য এখান থেকে পরিবর্তন করা যাবে না। .env ফাইল পরিবর্তন করুন।' });
      return;
    }

    const { name, role, pin, phone, avatar } = req.body;

    if (role && !['OWNER_TWO', 'STAFF'].includes(role)) {
      res.status(400).json({ message: 'ভূমিকা OWNER_TWO অথবা STAFF হতে হবে।' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (role) { updates.push('role = ?'); values.push(role); }
    if (pin) {
      const hashedPin = await bcrypt.hash(pin, 10);
      updates.push('pin = ?');
      values.push(hashedPin);
    }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }

    if (updates.length === 0) {
      res.status(400).json({ message: 'কোনো পরিবর্তন দেওয়া হয়নি।' });
      return;
    }

    values.push(id);
    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    if (pin) {
      await pool.execute('DELETE FROM sessions WHERE user_id = ?', [id]);
    }

    const [rows] = await pool.execute('SELECT id, name, role, avatar, phone FROM users WHERE id = ?', [id]);
    const user = (rows as any[])[0];
    if (!user) {
      res.status(404).json({ message: 'ব্যবহারকারী পাওয়া যায়নি।' });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!requireOwner(req, res)) return;
  try {
    const { id } = req.params;

    if (id === 'owner1') {
      res.status(403).json({ message: 'প্রধান মালিকের অ্যাকাউন্ট মুছে ফেলা যাবে না।' });
      return;
    }

    await pool.execute('DELETE FROM sessions WHERE user_id = ?', [id]);
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'ব্যবহারকারী সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
});

export default router;
