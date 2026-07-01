<?php
// Local seed script — run once: php api/seed.php
// Creates api/bhumi.db with realistic pre-data

$dbFile = __DIR__ . '/bhumi.db';
if (file_exists($dbFile)) unlink($dbFile);

$pdo = new PDO('sqlite:' . $dbFile, null, null, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$pdo->exec('PRAGMA journal_mode=WAL');
$pdo->exec('PRAGMA foreign_keys=ON');
$pdo->exec('PRAGMA encoding="UTF-8"');

// ── Tables ────────────────────────────────────────────────────────────────────
$pdo->exec("CREATE TABLE users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL,
    pin TEXT NOT NULL, avatar TEXT DEFAULT '', phone TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
)");
$pdo->exec("CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), expires_at TEXT NOT NULL
)");
$pdo->exec("CREATE TABLE income_records (
    id TEXT PRIMARY KEY, date TEXT NOT NULL, time TEXT NOT NULL,
    service_type TEXT NOT NULL, amount REAL NOT NULL, entered_by TEXT NOT NULL,
    note TEXT DEFAULT '', payment_method TEXT NOT NULL DEFAULT 'CASH',
    created_at TEXT DEFAULT (datetime('now'))
)");
$pdo->exec("CREATE INDEX idx_income_date ON income_records(date)");
$pdo->exec("CREATE TABLE expense_records (
    id TEXT PRIMARY KEY, date TEXT NOT NULL, time TEXT NOT NULL,
    category TEXT NOT NULL, amount REAL NOT NULL, entered_by TEXT NOT NULL,
    note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now'))
)");
$pdo->exec("CREATE INDEX idx_expense_date ON expense_records(date)");
$pdo->exec("CREATE TABLE bkash_records (
    id TEXT PRIMARY KEY, date TEXT NOT NULL, time TEXT NOT NULL,
    type TEXT NOT NULL, amount REAL NOT NULL, fee REAL DEFAULT NULL,
    entered_by TEXT NOT NULL, note TEXT DEFAULT '', ref_trx TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
)");
$pdo->exec("CREATE INDEX idx_bkash_date ON bkash_records(date)");
$pdo->exec("CREATE TABLE reminders (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
)");
$pdo->exec("CREATE TABLE settings (
    id INTEGER PRIMARY KEY DEFAULT 1, is_dark_mode INTEGER DEFAULT 1,
    pin_lock_enabled INTEGER DEFAULT 1, daily_reminder_text TEXT DEFAULT '',
    expense_alert_threshold REAL DEFAULT 5000, monthly_rent REAL DEFAULT 6000,
    monthly_electricity REAL DEFAULT 1850, monthly_internet REAL DEFAULT 800,
    monthly_salary REAL DEFAULT 8000, last_quote_updated_at INTEGER DEFAULT NULL,
    bkash_base_balance REAL DEFAULT 12500, bkash_today_spent_override REAL DEFAULT NULL,
    cash_in_hand_override REAL DEFAULT NULL
)");
$pdo->exec("CREATE TABLE memos (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
    amount REAL DEFAULT 0, image TEXT DEFAULT '', entered_by TEXT NOT NULL,
    date TEXT NOT NULL, time TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
)");
$pdo->exec("CREATE INDEX idx_memos_date ON memos(date)");
$pdo->exec("CREATE TABLE services_metadata (
    service_key TEXT PRIMARY KEY, bangla TEXT NOT NULL, english TEXT NOT NULL,
    color TEXT NOT NULL, default_price REAL NOT NULL, is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
)");

// ── Users ─────────────────────────────────────────────────────────────────────
$pdo->prepare("INSERT INTO users VALUES ('owner1','মোঃ রনি','OWNER_ONE',?,''  ,'01712-345678',datetime('now'))")
    ->execute([password_hash('9999', PASSWORD_BCRYPT)]);
$pdo->prepare("INSERT INTO users VALUES ('user-staff1','করিম উদ্দিন','STAFF',?,'','01823-456789',datetime('now'))")
    ->execute([password_hash('1234', PASSWORD_BCRYPT)]);

// ── Settings ──────────────────────────────────────────────────────────────────
$pdo->exec("INSERT INTO settings VALUES (1,1,1,'সাফল্য নিয়ে কোনো শর্টকাট নেই, সত্যতা ও সঠিক গ্রাহক সেবাই ব্যবসার আসল মূলধন।',5000,6000,1850,800,8000,NULL,5000,NULL,NULL)");

// ── Services ──────────────────────────────────────────────────────────────────
$svcs = [
    ['NAMJARI',  'নামজারি আবেদন',     'Mutation Service',        'from-emerald-500 to-teal-600',   300,  1],
    ['KHOTIYAN', 'খতিয়ান উত্তোলন',    'Khotiyan copy',           'from-cyan-500 to-blue-600',      200,  2],
    ['PORCHA',   'পর্চা সংগ্রহ',       'Porcha copy',             'from-indigo-500 to-purple-600',  200,  3],
    ['DOLIL',    'দলিল লিখন / যাচাই', 'Deed Writing',            'from-amber-500 to-orange-655',   2000, 4],
    ['LAND_APP', 'ভূমি আবেদন',         'Land Online Application', 'from-violet-500 to-fuchsia-600', 500,  5],
    ['DCR',      'ডিসিআর পেমেন্ট',     'DCR Payment',             'from-blue-500 to-indigo-600',    200,  6],
    ['OTHERS',   'অন্যান্য সার্ভিস',   'Other General Work',      'from-slate-500 to-slate-700',    300,  7],
];
$s = $pdo->prepare("INSERT INTO services_metadata VALUES (?,?,?,?,?,1,?)");
foreach ($svcs as $r) $s->execute($r);

// ── Income records ────────────────────────────────────────────────────────────
$income = [
    // মে ২০২৬
    ['inc-001','2026-05-04','10:15','NAMJARI', 300, 'মোঃ রনি',      'করিম মিয়া - নামজারি','CASH'],
    ['inc-002','2026-05-06','11:30','KHOTIYAN',200, 'মোঃ রনি',      'আব্দুল হক - খতিয়ান কপি','CASH'],
    ['inc-003','2026-05-08','09:45','PORCHA',  200, 'করিম উদ্দিন',  'রহিমা বেগম - পর্চা','CASH'],
    ['inc-004','2026-05-10','14:00','DOLIL',  2000, 'মোঃ রনি',      'জমি ক্রয়-বিক্রয় দলিল','BKASH'],
    ['inc-005','2026-05-12','10:30','NAMJARI', 300, 'করিম উদ্দিন',  'সালমা খাতুন - নামজারি','CASH'],
    ['inc-006','2026-05-14','11:00','DCR',     200, 'মোঃ রনি',      'ডিসিআর পেমেন্ট','CASH'],
    ['inc-007','2026-05-16','15:30','LAND_APP',500, 'মোঃ রনি',      'ভূমি উন্নয়ন কর আবেদন','BKASH'],
    ['inc-008','2026-05-18','09:00','KHOTIYAN',200, 'করিম উদ্দিন',  'নুরুল ইসলাম - খতিয়ান','CASH'],
    ['inc-009','2026-05-20','13:45','PORCHA',  200, 'মোঃ রনি',      'জয়নাল আবেদিন - পর্চা','CASH'],
    ['inc-010','2026-05-22','10:00','NAMJARI', 350, 'মোঃ রনি',      'বিশেষ নামজারি','CASH'],
    ['inc-011','2026-05-24','11:15','OTHERS',  400, 'করিম উদ্দিন',  'বিবিধ সেবা','CASH'],
    ['inc-012','2026-05-26','14:30','DOLIL',  2500, 'মোঃ রনি',      'বাণিজ্যিক সম্পত্তি দলিল','BKASH'],
    ['inc-013','2026-05-28','10:45','DCR',     200, 'মোঃ রনি',      'ডিসিআর পরিশোধ','CASH'],
    ['inc-014','2026-05-30','09:30','NAMJARI', 300, 'করিম উদ্দিন',  'মোসলেম উদ্দিন - নামজারি','CASH'],
    // জুন ২০২৬
    ['inc-015','2026-06-02','10:00','KHOTIYAN',200, 'মোঃ রনি',      'আরিফ হোসেন - খতিয়ান','CASH'],
    ['inc-016','2026-06-04','11:30','NAMJARI', 300, 'মোঃ রনি',      'শামসুন্নাহার - নামজারি','CASH'],
    ['inc-017','2026-06-05','14:00','PORCHA',  200, 'করিম উদ্দিন',  'মোঃ জাহাঙ্গীর - পর্চা','BKASH'],
    ['inc-018','2026-06-07','09:15','LAND_APP',500, 'মোঃ রনি',      'অনলাইন ভূমি আবেদন','CASH'],
    ['inc-019','2026-06-09','13:30','DOLIL',  3000, 'মোঃ রনি',      'বড় সম্পত্তি দলিল লিখন','BKASH'],
    ['inc-020','2026-06-11','10:45','DCR',     200, 'করিম উদ্দিন',  'ডিসিআর','CASH'],
    ['inc-021','2026-06-13','11:00','NAMJARI', 300, 'মোঃ রনি',      'ফরিদা বেগম - নামজারি','CASH'],
    ['inc-022','2026-06-15','15:00','KHOTIYAN',200, 'করিম উদ্দিন',  'বকুল হোসেন - খতিয়ান','CASH'],
    ['inc-023','2026-06-17','10:30','OTHERS',  500, 'মোঃ রনি',      'পরামর্শ সেবা','CASH'],
    ['inc-024','2026-06-19','09:45','NAMJARI', 300, 'মোঃ রনি',      'সিরাজুল ইসলাম - নামজারি','BKASH'],
    ['inc-025','2026-06-21','14:15','PORCHA',  200, 'করিম উদ্দিন',  'শিউলি আক্তার - পর্চা','CASH'],
    ['inc-026','2026-06-23','11:30','LAND_APP',500, 'মোঃ রনি',      'জমি রেজিস্ট্রেশন আবেদন','CASH'],
    ['inc-027','2026-06-25','10:00','DOLIL',  2000, 'মোঃ রনি',      'দলিল যাচাই ও লিখন','BKASH'],
    ['inc-028','2026-06-27','13:00','NAMJARI', 300, 'করিম উদ্দিন',  'হাসান আলী - নামজারি','CASH'],
    ['inc-029','2026-06-29','09:30','KHOTIYAN',200, 'মোঃ রনি',      'মরিয়ম বেগম - খতিয়ান','CASH'],
    ['inc-030','2026-06-30','11:45','DCR',     400, 'মোঃ রনি',      'দুটি ডিসিআর পেমেন্ট','CASH'],
    // জুলাই ২০২৬
    ['inc-031','2026-07-01','09:30','NAMJARI', 300, 'মোঃ রনি',      'মাহমুদ হোসেন - নামজারি','CASH'],
    ['inc-032','2026-07-01','11:00','KHOTIYAN',200, 'করিম উদ্দিন',  'রাবেয়া বেগম - খতিয়ান','BKASH'],
];
$ins = $pdo->prepare("INSERT INTO income_records (id,date,time,service_type,amount,entered_by,note,payment_method) VALUES (?,?,?,?,?,?,?,?)");
foreach ($income as $r) $ins->execute($r);

// ── Expense records ───────────────────────────────────────────────────────────
$expenses = [
    // মে
    ['exp-001','2026-05-01','09:00','RENT',      6000,'মোঃ রনি',     'মে মাসের অফিস ভাড়া'],
    ['exp-002','2026-05-05','10:00','ELECTRICITY',1850,'মোঃ রনি',    'মে মাসের বিদ্যুৎ বিল'],
    ['exp-003','2026-05-05','10:30','INTERNET',    800,'মোঃ রনি',    'মে মাসের ইন্টারনেট'],
    ['exp-004','2026-05-31','11:00','SALARY',     8000,'মোঃ রনি',    'করিম উদ্দিনের মে মাসের বেতন'],
    ['exp-005','2026-05-10','14:00','PRINT',       350,'করিম উদ্দিন','কাগজ ও প্রিন্টিং খরচ'],
    ['exp-006','2026-05-18','10:00','OFFICE',      500,'মোঃ রনি',    'অফিস সরঞ্জাম'],
    // জুন
    ['exp-007','2026-06-01','09:00','RENT',       6000,'মোঃ রনি',    'জুন মাসের অফিস ভাড়া'],
    ['exp-008','2026-06-03','10:00','ELECTRICITY', 1950,'মোঃ রনি',   'জুন মাসের বিদ্যুৎ বিল (গরমে বেশি)'],
    ['exp-009','2026-06-03','10:30','INTERNET',    800,'মোঃ রনি',    'জুন মাসের ইন্টারনেট'],
    ['exp-010','2026-06-30','11:00','SALARY',     8000,'মোঃ রনি',    'করিম উদ্দিনের জুন মাসের বেতন'],
    ['exp-011','2026-06-12','14:30','PRINT',       420,'করিম উদ্দিন','প্রিন্টিং ও ফটোকপি'],
    ['exp-012','2026-06-20','09:30','TRAVEL',      300,'মোঃ রনি',    'জেলা রেজিস্ট্রি অফিস যাতায়াত'],
    // জুলাই
    ['exp-013','2026-07-01','09:00','RENT',       6000,'মোঃ রনি',    'জুলাই মাসের অফিস ভাড়া'],
];
$ine = $pdo->prepare("INSERT INTO expense_records (id,date,time,category,amount,entered_by,note) VALUES (?,?,?,?,?,?,?)");
foreach ($expenses as $r) $ine->execute($r);

// ── bKash records ─────────────────────────────────────────────────────────────
$bkash = [
    ['bk-001','2026-05-10','14:05','IN',   2000,  null, 'মোঃ রনি',     'ইনকাম এন্ট্রি লিংক: জমি ক্রয়-বিক্রয় দলিল','BHUMABHUM1'],
    ['bk-002','2026-05-16','15:35','IN',    500,  null, 'মোঃ রনি',     'ইনকাম এন্ট্রি লিংক: ভূমি উন্নয়ন কর আবেদন','BHUMABHUM2'],
    ['bk-003','2026-05-20','10:00','OUT',  3000, 18.0, 'মোঃ রনি',     'সরকারি ফি পরিশোধ - নামজারি','TRX20526001'],
    ['bk-004','2026-05-26','14:35','IN',   2500,  null, 'মোঃ রনি',     'ইনকাম এন্ট্রি লিংক: বাণিজ্যিক সম্পত্তি দলিল','BHUMABHUM3'],
    ['bk-005','2026-06-05','14:05','IN',    200,  null, 'করিম উদ্দিন', 'ইনকাম এন্ট্রি লিংক: মোঃ জাহাঙ্গীর - পর্চা','BHUMABHUM4'],
    ['bk-006','2026-06-09','13:35','IN',   3000,  null, 'মোঃ রনি',     'ইনকাম এন্ট্রি লিংক: বড় সম্পত্তি দলিল লিখন','BHUMABHUM5'],
    ['bk-007','2026-06-15','10:00','OUT',  5000, 30.0, 'মোঃ রনি',     'ব্যক্তিগত উত্তোলন','TRX20626001'],
    ['bk-008','2026-06-19','09:50','IN',    300,  null, 'মোঃ রনি',     'ইনকাম এন্ট্রি লিংক: সিরাজুল ইসলাম - নামজারি','BHUMABHUM6'],
    ['bk-009','2026-06-27','14:05','IN',   2000,  null, 'মোঃ রনি',     'ইনকাম এন্ট্রি লিংক: দলিল যাচাই ও লিখন','BHUMABHUM7'],
    ['bk-010','2026-07-01','11:05','IN',    200,  null, 'করিম উদ্দিন', 'ইনকাম এন্ট্রি লিংক: রাবেয়া বেগম - খতিয়ান','BHUMABHUM8'],
    ['bk-011','2026-06-25','09:00','PAYMENT',1850,null, 'মোঃ রনি',    'বিদ্যুৎ বিল অনলাইন পেমেন্ট','TRX20626002'],
];
$inb = $pdo->prepare("INSERT INTO bkash_records (id,date,time,type,amount,fee,entered_by,note,ref_trx) VALUES (?,?,?,?,?,?,?,?,?)");
foreach ($bkash as $r) $inb->execute($r);

// ── Reminders ─────────────────────────────────────────────────────────────────
$reminders = [
    ['rem-001','করিম মিয়ার নামজারির ফলাফল সংগ্রহ','2026-07-05',0],
    ['rem-002','জুলাই মাসের বিদ্যুৎ বিল পরিশোধ','2026-07-07',0],
    ['rem-003','সালমা খাতুনের নামজারি ডকুমেন্ট জমা','2026-07-10',0],
    ['rem-004','জুলাই মাসের ইন্টারনেট বিল','2026-07-10',0],
    ['rem-005','আব্দুল হকের কেস ফলোআপ','2026-07-15',0],
    ['rem-006','জুন মাসের হিসাব মিলান','2026-07-03',1],
    ['rem-007','নতুন স্ট্যাম্প পেপার সংগ্রহ','2026-07-08',0],
];
$inr = $pdo->prepare("INSERT INTO reminders (id,title,date,is_completed) VALUES (?,?,?,?)");
foreach ($reminders as $r) $inr->execute($r);

// ── Memos ─────────────────────────────────────────────────────────────────────
$memos = [
    ['memo-001','করিম মিয়ার নামজারি কেস','দাগ নং ১২৩৪, খতিয়ান নং ৫৬৭, সদর উপজেলা। আবেদন জমা হয়েছে ০৪/০৫/২০২৬। অনুমোদনের জন্য অপেক্ষায়।',300,'','মোঃ রনি','2026-05-04','10:20'],
    ['memo-002','বাণিজ্যিক সম্পত্তি দলিল - রহিম ট্রেডার্স','দলিল নং ৭৮৯/২০২৬। মৌজা: চাঁদপুর। দলিল সম্পন্ন, রেজিস্ট্রি বাকি। ক্লায়েন্ট ফোন: 01711-123456।',2500,'','মোঃ রনি','2026-05-26','14:35'],
    ['memo-003','জুন মাসের সারসংক্ষেপ','মোট আয়: ৯,৯০০ টাকা। মোট ব্যয়: ১৭,৪৭০ টাকা। বিকাশ লেনদেন: ৫টি। নতুন কেস: ১৫টি। সম্পন্ন কেস: ১২টি।',0,'','মোঃ রনি','2026-06-30','17:00'],
    ['memo-004','সিরাজুল ইসলামের ভূমি কেস','৩ একর জমির নামজারি ও পর্চা। দাগ: ৪৫৬, ৪৫৭। মৌজা: বাগানবাড়ি। বিভিন্ন উত্তরাধিকারীর মধ্যে বিরোধ আছে, সতর্কভাবে এগোতে হবে।',300,'','মোঃ রনি','2026-06-19','09:50'],
];
$inm = $pdo->prepare("INSERT INTO memos (id,title,description,amount,image,entered_by,date,time) VALUES (?,?,?,?,?,?,?,?)");
foreach ($memos as $r) $inm->execute($r);

echo "✓ bhumi.db তৈরি হয়েছে — " . filesize($dbFile) . " bytes\n";
echo "✓ Users: " . $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() . "\n";
echo "✓ Income: " . $pdo->query('SELECT COUNT(*) FROM income_records')->fetchColumn() . " records\n";
echo "✓ Expenses: " . $pdo->query('SELECT COUNT(*) FROM expense_records')->fetchColumn() . " records\n";
echo "✓ bKash: " . $pdo->query('SELECT COUNT(*) FROM bkash_records')->fetchColumn() . " records\n";
echo "✓ Reminders: " . $pdo->query('SELECT COUNT(*) FROM reminders')->fetchColumn() . "\n";
echo "✓ Memos: " . $pdo->query('SELECT COUNT(*) FROM memos')->fetchColumn() . "\n";
