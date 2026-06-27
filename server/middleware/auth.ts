import { Request, Response, NextFunction } from 'express';
import pool from '../db';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'অনুমোদন প্রয়োজন।' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const [rows] = await pool.execute(
      'SELECT s.user_id, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > NOW()',
      [token]
    );

    const sessions = rows as any[];
    if (sessions.length === 0) {
      res.status(401).json({ message: 'সেশন মেয়াদ শেষ বা অবৈধ।' });
      return;
    }

    req.userId = sessions[0].user_id;
    req.userRole = sessions[0].role;
    next();
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার ত্রুটি।' });
  }
}
