-- Bhumi Seva Hisab - MySQL Database Schema
-- Run this file to create all required tables

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role ENUM('OWNER_ONE', 'OWNER_TWO', 'STAFF') NOT NULL,
  pin VARCHAR(100) NOT NULL,
  avatar MEDIUMTEXT,
  phone VARCHAR(20) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at)
);

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
);

CREATE TABLE IF NOT EXISTS expense_records (
  id VARCHAR(50) PRIMARY KEY,
  date VARCHAR(10) NOT NULL,
  time VARCHAR(5) NOT NULL,
  category ENUM('RENT', 'ELECTRICITY', 'INTERNET', 'SALARY', 'OFFICE', 'TRAVEL', 'PRINT', 'OTHERS') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  entered_by VARCHAR(100) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
);

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
);

CREATE TABLE IF NOT EXISTS reminders (
  id VARCHAR(50) PRIMARY KEY,
  title TEXT NOT NULL,
  date VARCHAR(10) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

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
);

CREATE TABLE IF NOT EXISTS services_metadata (
  service_key VARCHAR(50) PRIMARY KEY,
  bangla VARCHAR(200) NOT NULL,
  english VARCHAR(200) NOT NULL,
  color VARCHAR(200) NOT NULL,
  default_price DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0
);
