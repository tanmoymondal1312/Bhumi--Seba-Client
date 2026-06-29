import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bhumi_seva_hisab',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;

export async function initializeDatabase() {
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    await pool.execute(stmt);
  }

  try {
    await pool.execute('ALTER TABLE users MODIFY COLUMN avatar MEDIUMTEXT');
  } catch {}

  const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
  if ((users as any)[0].count === 0) {
    await seedDatabase();
  }

  await syncPrimaryOwner();
}

async function syncPrimaryOwner() {
  const ownerPin = process.env.OWNER_PIN || '9999';
  const ownerName = process.env.OWNER_NAME || 'মালিক';
  const ownerPhone = process.env.OWNER_PHONE || '01700-000000';

  const [rows] = await pool.execute('SELECT id FROM users WHERE id = ?', ['owner1']);
  const existing = rows as any[];

  const hashedPin = await bcrypt.hash(ownerPin, 10);

  if (existing.length > 0) {
    await pool.execute(
      'UPDATE users SET name = ?, pin = ?, phone = ? WHERE id = ?',
      [ownerName, hashedPin, ownerPhone, 'owner1']
    );
  } else {
    await pool.execute(
      'INSERT INTO users (id, name, role, pin, avatar, phone) VALUES (?, ?, ?, ?, ?, ?)',
      ['owner1', ownerName, 'OWNER_ONE', hashedPin, '', ownerPhone]
    );
  }
}

async function seedDatabase() {
  const ownerPin = process.env.OWNER_PIN || '9999';
  const ownerName = process.env.OWNER_NAME || 'মালিক';
  const ownerPhone = process.env.OWNER_PHONE || '01700-000000';

  const hashedPin = await bcrypt.hash(ownerPin, 10);
  await pool.execute(
    'INSERT INTO users (id, name, role, pin, avatar, phone) VALUES (?, ?, ?, ?, ?, ?)',
    ['owner1', ownerName, 'OWNER_ONE', hashedPin, '', ownerPhone]
  );

  await pool.execute(
    `INSERT INTO settings (id, is_dark_mode, pin_lock_enabled, daily_reminder_text, expense_alert_threshold, monthly_rent, monthly_electricity, monthly_internet, monthly_salary, bkash_base_balance)
     VALUES (1, TRUE, TRUE, ?, 5000, 6000, 1850, 800, 8000, 0)`,
    ['সাফল্য নিয়ে কোনো শর্টকাট নেই, সত্যতা ও সঠিক গ্রাহক সেবাই ব্যবসার আসল মূলধন।']
  );

  const services = [
    { key: 'NAMJARI', bangla: 'নামজারি আবেদন', english: 'Mutation Service', color: 'from-emerald-500 to-teal-600', price: 300, order: 1 },
    { key: 'KHOTIYAN', bangla: 'খতিয়ান উত্তোলন', english: 'Khotiyan copy', color: 'from-cyan-500 to-blue-600', price: 200, order: 2 },
    { key: 'PORCHA', bangla: 'পর্চা সংগ্রহ', english: 'Porcha copy', color: 'from-indigo-500 to-purple-600', price: 200, order: 3 },
    { key: 'DOLIL', bangla: 'দলিল লিখন / যাচাই', english: 'Deed Writing', color: 'from-amber-500 to-orange-655', price: 2000, order: 4 },
    { key: 'LAND_APP', bangla: 'ভূমি আবেদন', english: 'Land Online Application', color: 'from-violet-500 to-fuchsia-600', price: 500, order: 5 },
    { key: 'DCR', bangla: 'ডিসিআর পেমেন্ট', english: 'DCR Payment', color: 'from-blue-500 to-indigo-600', price: 200, order: 6 },
    { key: 'OTHERS', bangla: 'অন্যান্য সার্ভিস', english: 'Other General Work', color: 'from-slate-500 to-slate-700', price: 300, order: 7 },
  ];

  for (const s of services) {
    await pool.execute(
      'INSERT INTO services_metadata (service_key, bangla, english, color, default_price, is_active, sort_order) VALUES (?, ?, ?, ?, ?, TRUE, ?)',
      [s.key, s.bangla, s.english, s.color, s.price, s.order]
    );
  }

  console.log('Database seeded with primary owner, settings, and services.');
}
