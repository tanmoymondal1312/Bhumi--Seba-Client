import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase } from './db';

import authRoutes from './routes/auth';
import incomeRoutes from './routes/income';
import expenseRoutes from './routes/expense';
import bkashRoutes from './routes/bkash';
import reminderRoutes from './routes/reminders';
import settingsRoutes from './routes/settings';
import servicesRoutes from './routes/services';
import backupRoutes from './routes/backup';
import usersRoutes from './routes/users';
import memosRoutes from './routes/memos';
import categoriesRoutes from './routes/categories';
import salaryRoutes from './routes/salary';
import duesRoutes from './routes/dues';
import financialsRoutes from './routes/financials';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/bkash', bkashRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/memos', memosRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/dues', duesRoutes);
app.use('/api/financials', financialsRoutes);

// JSON 404 for unknown API paths (all methods) — without this, unknown GET /api/*
// fell through to the static catch-all below and hung with no response.
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'রিকোয়েস্ট করা এন্ডপয়েন্ট পাওয়া যায়নি।' });
});

// Serve static frontend files in production
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

async function start() {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully.');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
