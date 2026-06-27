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

  const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
  if ((users as any)[0].count === 0) {
    await seedDatabase();
  }
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function seedDatabase() {
  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  // Seed users with bcrypt-hashed PINs
  const users = [
    { id: 'owner1', name: 'মোঃ রনি', role: 'OWNER_ONE', pin: '9999', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', phone: '01712-345678' },
    { id: 'owner2', name: 'মোঃ রাসেল', role: 'OWNER_TWO', pin: '8888', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', phone: '01912-876543' },
    { id: 'staff1', name: 'সুজন হোসাইন', role: 'STAFF', pin: '1234', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', phone: '01812-112233' },
  ];

  for (const u of users) {
    const hashedPin = await bcrypt.hash(u.pin, 10);
    await pool.execute(
      'INSERT INTO users (id, name, role, pin, avatar, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [u.id, u.name, u.role, hashedPin, u.avatar, u.phone]
    );
  }

  // Seed settings
  await pool.execute(
    `INSERT INTO settings (id, is_dark_mode, pin_lock_enabled, daily_reminder_text, expense_alert_threshold, monthly_rent, monthly_electricity, monthly_internet, monthly_salary, bkash_base_balance)
     VALUES (1, TRUE, TRUE, ?, 5000, 6000, 1850, 800, 8000, 12500)`,
    ['সাফল্য নিয়ে কোনো শর্টকাট নেই, প্রতিটি গ্রাহককে সর্বোচ্চ সাহায্য করুন।']
  );

  // Seed services metadata
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

  // Seed income records
  const incomeRecords = [
    { id: 'inc-1', date: today, time: '09:30', serviceType: 'NAMJARI', amount: 300, enteredBy: 'সুজন হোসাইন', note: 'হাজীপুর মৌজার জোত ৩১২ নামজারি', paymentMethod: 'CASH' },
    { id: 'inc-2', date: today, time: '10:15', serviceType: 'KHOTIYAN', amount: 200, enteredBy: 'সুজন হোসাইন', note: 'খতিয়ান নাম্বার ৪৫৬ নকল', paymentMethod: 'CASH' },
    { id: 'inc-3', date: today, time: '11:45', serviceType: 'PORCHA', amount: 200, enteredBy: 'সুজন হোসাইন', note: 'সিএস ৫৬ খতিয়ান পর্চা', paymentMethod: 'BKASH' },
    { id: 'inc-4', date: today, time: '13:20', serviceType: 'LAND_APP', amount: 500, enteredBy: 'সুজন হোসাইন', note: 'অনলাইন খাজনা দাখিলা আবেদন', paymentMethod: 'CASH' },
    { id: 'inc-5', date: today, time: '15:10', serviceType: 'DOLIL', amount: 2500, enteredBy: 'মোঃ রনি', note: 'হেবা দলিল খসড়া ও টাইপ', paymentMethod: 'BKASH' },
    { id: 'inc-6', date: today, time: '16:40', serviceType: 'OTHERS', amount: 350, enteredBy: 'সুজন হোসাইন', note: 'স্মার্ট কার্ড সংশোধন আবেদন', paymentMethod: 'CASH' },
    { id: 'inc-7', date: yesterday, time: '10:00', serviceType: 'NAMJARI', amount: 300, enteredBy: 'সুজন হোসাইন', note: '২টি জমি বিভক্ত আবেদন', paymentMethod: 'BKASH' },
    { id: 'inc-8', date: yesterday, time: '11:30', serviceType: 'KHOTIYAN', amount: 200, enteredBy: 'সুজন হোসাইন', note: 'বিএস ৯০৯ খতিয়ান', paymentMethod: 'CASH' },
    { id: 'inc-9', date: yesterday, time: '14:20', serviceType: 'PORCHA', amount: 200, enteredBy: 'মোঃ রাসেল', note: 'আরএস পর্চা নকল কপি', paymentMethod: 'CASH' },
    { id: 'inc-10', date: yesterday, time: '16:00', serviceType: 'LAND_APP', amount: 1000, enteredBy: 'সুজন হোসাইন', note: 'ভূমিসেবা তথ্য অনুসন্ধান ফি', paymentMethod: 'BKASH' },
    { id: 'inc-11', date: '2026-06-07', time: '11:20', serviceType: 'DOLIL', amount: 3500, enteredBy: 'মোঃ রনি', note: 'কবলা দলিল প্রস্তুত', paymentMethod: 'CASH' },
    { id: 'inc-12', date: '2026-06-06', time: '10:15', serviceType: 'NAMJARI', amount: 300, enteredBy: 'সুজন হোসাইন', note: 'মিউটেশন খতিয়ান সংশোধন', paymentMethod: 'CASH' },
    { id: 'inc-13', date: '2026-06-05', time: '14:30', serviceType: 'KHOTIYAN', amount: 200, enteredBy: 'সুজন হোসাইন', note: '৩টি খতিয়ান কপি জেলা অফিস রিলেটেড', paymentMethod: 'BKASH' },
    { id: 'inc-14', date: '2026-06-04', time: '12:00', serviceType: 'LAND_APP', amount: 800, enteredBy: 'সুজন হোসাইন', note: 'জলমহাল ইজারা আবেদন', paymentMethod: 'CASH' },
    { id: 'inc-15', date: '2026-06-03', time: '15:25', serviceType: 'NAMJARI', amount: 300, enteredBy: 'মোঃ রাসেল', note: 'দালাল হাট মৌজা নামজারি আবেদন', paymentMethod: 'BKASH' },
  ];

  // March Namjari records
  for (let i = 1; i <= 45; i++) {
    const day = String((i % 27) + 1).padStart(2, '0');
    incomeRecords.push({
      id: `inc-mar-namjari-${i}`, date: `2026-03-${day}`, time: `10:${day}`,
      serviceType: 'NAMJARI', amount: 300, enteredBy: 'সুজন হোসাইন',
      note: `নামজারি আবেদন #${i}`, paymentMethod: 'CASH',
    });
  }

  // March Khotiyan records
  for (let i = 1; i <= 15; i++) {
    const day = String((i % 27) + 1).padStart(2, '0');
    incomeRecords.push({
      id: `inc-mar-khotiyan-${i}`, date: `2026-03-${day}`, time: `11:${day}`,
      serviceType: 'KHOTIYAN', amount: 200, enteredBy: 'সুজন হোসাইন',
      note: `খতিয়ান উত্তোলন #${i}`, paymentMethod: 'BKASH',
    });
  }

  // May Porcha records
  for (let i = 1; i <= 30; i++) {
    const day = String((i % 27) + 1).padStart(2, '0');
    incomeRecords.push({
      id: `inc-may-porcha-${i}`, date: `2026-05-${day}`, time: `14:${day}`,
      serviceType: 'PORCHA', amount: 200, enteredBy: 'সুজন হোসাইন',
      note: `পর্চা সংগ্রহ #${i}`, paymentMethod: 'CASH',
    });
  }

  for (const rec of incomeRecords) {
    await pool.execute(
      'INSERT INTO income_records (id, date, time, service_type, amount, entered_by, note, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [rec.id, rec.date, rec.time, rec.serviceType, rec.amount, rec.enteredBy, rec.note, rec.paymentMethod]
    );
  }

  // Seed expense records
  const expenseRecords = [
    { id: 'exp-1', date: today, time: '11:00', category: 'OFFICE', amount: 120, enteredBy: 'সুজন হোসাইন', note: 'কাস্টমারদের চা-বিস্কুট' },
    { id: 'exp-2', date: today, time: '14:00', category: 'PRINT', amount: 350, enteredBy: 'সুজন হোসাইন', note: 'এ৪ সাইজ ফটোকপি পেপার ১ রিম' },
    { id: 'exp-3', date: yesterday, time: '12:00', category: 'TRAVEL', amount: 250, enteredBy: 'সুজন হোসাইন', note: 'ভূমি অফিসে দলিল জমা দেওয়ার যাতায়াত' },
    { id: 'exp-4', date: yesterday, time: '17:30', category: 'OFFICE', amount: 90, enteredBy: 'সুজন হোসাইন', note: 'অফিসের ঝাড়ু ও সাবান' },
    { id: 'exp-5', date: '2026-06-01', time: '10:00', category: 'RENT', amount: 6000, enteredBy: 'মোঃ রনি', note: 'জুন ২০২৬ মাসের দোকান ঘর ভাড়া' },
    { id: 'exp-6', date: '2026-06-01', time: '11:00', category: 'INTERNET', amount: 800, enteredBy: 'মোঃ রনি', note: 'ওয়াইফাই জেনুইন ইন্টারনেট বিল' },
    { id: 'exp-7', date: '2026-06-05', time: '18:00', category: 'ELECTRICITY', amount: 1850, enteredBy: 'মোঃ রাসেল', note: 'মে-জুন মাসের পল্লী বিদ্যুৎ বিল' },
    { id: 'exp-8', date: '2026-06-05', time: '11:30', category: 'SALARY', amount: 8000, enteredBy: 'মোঃ রনি', note: 'কর্মচারী সুজনের অগ্রিম বেতন' },
    { id: 'exp-mar-print-1', date: '2026-03-05', time: '12:00', category: 'PRINT', amount: 3500, enteredBy: 'সুজন হোসাইন', note: 'ফটোকপি কাগজ ও প্রিন্টার কার্টিজ ক্রয়' },
    { id: 'exp-mar-print-2', date: '2026-03-18', time: '15:00', category: 'PRINT', amount: 1100, enteredBy: 'সুজন হোসাইন', note: 'ডাবল-এ ফটোকপি কাগজ ২ রিম' },
    { id: 'exp-mar-rent', date: '2026-03-01', time: '10:00', category: 'RENT', amount: 6000, enteredBy: 'মোঃ রনি', note: 'মার্চ মাসের দোকান ঘর ভাড়া' },
    { id: 'exp-may-travel', date: '2026-05-10', time: '14:30', category: 'TRAVEL', amount: 2500, enteredBy: 'মোঃ রনি', note: 'জেলা রেকর্ড রুমে আবেদন জমা দেওয়ার গাড়ি ভাড়া' },
  ];

  for (const rec of expenseRecords) {
    await pool.execute(
      'INSERT INTO expense_records (id, date, time, category, amount, entered_by, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [rec.id, rec.date, rec.time, rec.category, rec.amount, rec.enteredBy, rec.note]
    );
  }

  // Seed bkash records
  const bkashRecords = [
    { id: 'bk-1', date: today, time: '11:45', type: 'IN', amount: 150, enteredBy: 'সুজন হোসাইন', note: 'পর্চা সংগ্রহ পেমেন্ট', refTrx: 'BHUM678A9', fee: null },
    { id: 'bk-2', date: today, time: '15:10', type: 'IN', amount: 2500, enteredBy: 'মোঃ রনি', note: 'দলিল লিখন অগ্রিম', refTrx: 'HPAY9902X', fee: null },
    { id: 'bk-3', date: today, time: '17:00', type: 'OUT', amount: 1500, enteredBy: 'মোঃ রনি', note: 'বিকাশ এজেন্ট থেকে ক্যাশআউট', refTrx: null, fee: 27 },
    { id: 'bk-4', date: yesterday, time: '10:00', type: 'IN', amount: 3000, enteredBy: 'সুজন হোসাইন', note: 'নামজারি আবেদন ফি', refTrx: 'TRX88220A', fee: null },
    { id: 'bk-5', date: '2026-06-08', time: '15:30', type: 'PAYMENT', amount: 450, enteredBy: 'সুজন হোসাইন', note: 'ভূমিসেবা পোর্টাল সরকারি আবেদন ফি প্রদান', refTrx: null, fee: null },
    { id: 'bk-6', date: '2026-06-08', time: '16:00', type: 'IN', amount: 1000, enteredBy: 'সুজন হোসাইন', note: 'তথ্য ক্লায়েন্ট পেমেন্ট', refTrx: 'TRX77334B', fee: null },
  ];

  for (const rec of bkashRecords) {
    await pool.execute(
      'INSERT INTO bkash_records (id, date, time, type, amount, fee, entered_by, note, ref_trx) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [rec.id, rec.date, rec.time, rec.type, rec.amount, rec.fee, rec.enteredBy, rec.note, rec.refTrx]
    );
  }

  // Seed reminders
  const reminderRecords = [
    { id: 'rem-1', title: 'আগামী পরশু নামজারি শুনানির নোটিশ ক্লায়েন্টকে জানানো', date: '2026-06-11', isCompleted: false },
    { id: 'rem-2', title: 'জুন মাসের বাকি খাজনা দাখিলা ক্লিয়ার করা', date: '2026-06-15', isCompleted: false },
    { id: 'rem-3', title: 'নতুন স্ট্যাম্প ও ফটোকপি পেপার অর্ডার করা', date: '2026-06-10', isCompleted: true },
  ];

  for (const rem of reminderRecords) {
    await pool.execute(
      'INSERT INTO reminders (id, title, date, is_completed) VALUES (?, ?, ?, ?)',
      [rem.id, rem.title, rem.date, rem.isCompleted]
    );
  }

  console.log('Database seeded successfully with initial data.');
}
