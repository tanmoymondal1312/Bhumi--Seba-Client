-- Bhumi Seva Hisab - MySQL Database Schema
-- Run this file to create all required tables

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role ENUM('OWNER_ONE', 'OWNER_TWO', 'STAFF') NOT NULL,
  pin VARCHAR(100) NOT NULL,
  avatar MEDIUMTEXT,
  phone VARCHAR(20) DEFAULT '',
  monthly_salary DECIMAL(12,2) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS income_records (
  id VARCHAR(50) PRIMARY KEY,
  date VARCHAR(10) NOT NULL,
  time VARCHAR(5) NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  entered_by VARCHAR(100) NOT NULL,
  note TEXT,
  payment_method ENUM('CASH', 'BKASH') NOT NULL DEFAULT 'CASH',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expense_records (
  id VARCHAR(50) PRIMARY KEY,
  date VARCHAR(10) NOT NULL,
  time VARCHAR(5) NOT NULL,
  category ENUM('RENT', 'ELECTRICITY', 'INTERNET', 'SALARY', 'OFFICE', 'TRAVEL', 'PRINT', 'OTHERS', 'COURT_FEE', 'A4_PAPER', 'LEGAL_PAPER', 'COLOR_PAPER', 'STAMP') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  entered_by VARCHAR(100) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bkash_records (
  id VARCHAR(50) PRIMARY KEY,
  date VARCHAR(10) NOT NULL,
  time VARCHAR(5) NOT NULL,
  type ENUM('IN', 'OUT', 'PAYMENT') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  fee DECIMAL(12,2) DEFAULT NULL,
  entered_by VARCHAR(100) NOT NULL,
  note TEXT,
  ref_trx VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminders (
  id VARCHAR(50) PRIMARY KEY,
  title TEXT NOT NULL,
  date VARCHAR(10) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  is_dark_mode BOOLEAN DEFAULT TRUE,
  pin_lock_enabled BOOLEAN DEFAULT TRUE,
  daily_reminder_text TEXT,
  expense_alert_threshold DECIMAL(12,2) DEFAULT 5000,
  monthly_rent DECIMAL(12,2) DEFAULT 6000,
  monthly_electricity DECIMAL(12,2) DEFAULT 1850,
  monthly_internet DECIMAL(12,2) DEFAULT 800,
  monthly_salary DECIMAL(12,2) DEFAULT 8000,
  last_quote_updated_at BIGINT DEFAULT NULL,
  bkash_base_balance DECIMAL(12,2) DEFAULT 12500,
  bkash_today_spent_override DECIMAL(12,2) DEFAULT NULL,
  cash_in_hand_override DECIMAL(12,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memos (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) DEFAULT 0,
  image MEDIUMTEXT,
  entered_by VARCHAR(100) NOT NULL,
  date VARCHAR(10) NOT NULL,
  time VARCHAR(5) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services_metadata (
  service_key VARCHAR(50) PRIMARY KEY,
  bangla VARCHAR(200) NOT NULL,
  english VARCHAR(200) NOT NULL,
  color VARCHAR(200) NOT NULL,
  default_price DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expense_categories (
  category_key VARCHAR(50) PRIMARY KEY,
  bangla VARCHAR(200) NOT NULL,
  english VARCHAR(200) NOT NULL,
  color VARCHAR(200) NOT NULL,
  is_fixed BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default expense categories (idempotent seed — INSERT IGNORE never overwrites admin edits)
INSERT IGNORE INTO expense_categories (category_key, bangla, english, color, is_fixed, sort_order, is_active) VALUES
  ('RENT', 'ঘর ভাড়া', 'Shop Rent', 'bg-red-500', 1, 1, 1),
  ('ELECTRICITY', 'কারেন্ট বিল', 'Electricity Bill', 'bg-yellow-500', 1, 2, 1),
  ('INTERNET', 'ইন্টারনেট বিল', 'WiFi & Internet', 'bg-indigo-500', 1, 3, 1),
  ('SALARY', 'কর্মচারী বেতন', 'Staff Salaries', 'bg-blue-600', 1, 4, 1),
  ('OFFICE', 'অফিস খরচ/চা-নাস্তা', 'Office Tea & Snacks', 'bg-amber-500', 0, 5, 1),
  ('TRAVEL', 'যাতায়াত খরচ', 'Travel & Courier', 'bg-purple-500', 0, 6, 1),
  ('PRINT', 'প্রিন্ট/ফটোকপি পেপার', 'Paper & Stationery', 'bg-emerald-500', 0, 7, 1),
  ('OTHERS', 'অন্যান্য খরচ', 'Miscellaneous', 'bg-slate-500', 0, 8, 1),
  ('COURT_FEE', 'কোর্ট ফি ক্রয়', 'Court Fee & Purchase', 'bg-rose-500', 0, 9, 1),
  ('A4_PAPER', 'এফোর কাগজ ক্রয়', 'A4 Paper', 'bg-lime-500', 0, 10, 1),
  ('LEGAL_PAPER', 'লিগ্যাল কাগজ ক্রয়', 'Legal Paper', 'bg-teal-500', 0, 11, 1),
  ('COLOR_PAPER', 'রঙিন কাগজ ক্রয়', 'Color Paper', 'bg-fuchsia-500', 0, 12, 1),
  ('STAMP', 'স্ট্যাম্প ক্রয়', 'Stamp', 'bg-sky-500', 0, 13, 1);

-- Phase 4: Employee salary management
-- Monthly salary obligation per employee per accounting period.
-- The obligation for a period is locked at creation time so later salary changes
-- never retroactively modify previous accounting periods.
CREATE TABLE IF NOT EXISTS employee_salaries (
  employee_id VARCHAR(50) NOT NULL,
  period VARCHAR(7) NOT NULL,
  monthly_salary DECIMAL(12,2) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id, period),
  INDEX idx_period (period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Individual salary payment transactions (history preserved — employee_name is a
-- snapshot so history survives employee deletion from the users table).
CREATE TABLE IF NOT EXISTS salary_payments (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(100) NOT NULL,
  period VARCHAR(7) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method ENUM('CASH', 'BKASH') NOT NULL DEFAULT 'CASH',
  date VARCHAR(10) NOT NULL,
  time VARCHAR(5) NOT NULL,
  note TEXT,
  entered_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employee_period (employee_id, period),
  INDEX idx_period (period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phase 5: বাকির খাতা — outstanding customer dues.
-- Mirrors the legacy PHP/SQLite table (api/db.php) 1:1 so the Node backend can
-- serve the existing /api/dues contract. When a due is paid, an income record
-- is created and the due row is deleted (same behavior as api/dues.php).
CREATE TABLE IF NOT EXISTS dues (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) DEFAULT '',
  service_type VARCHAR(50) DEFAULT 'OTHERS',
  amount DECIMAL(12,2) NOT NULL,
  note TEXT,
  date VARCHAR(10) NOT NULL,
  entered_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dues_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
