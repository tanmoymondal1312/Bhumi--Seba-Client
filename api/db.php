<?php
// ── Load .env from project root ───────────────────────────────────────────────
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $v = trim($v, " \t\"'");
        putenv(trim($k) . '=' . $v);
    }
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $host   = getenv('DB_HOST')     ?: 'localhost';
    $port   = getenv('DB_PORT')     ?: '3306';
    $dbname = getenv('DB_NAME')     ?: 'bhumi_seva_hisab';
    $user   = getenv('DB_USER')     ?: 'root';
    $pass   = getenv('DB_PASSWORD') ?: (getenv('DB_PASS') ?: '');

    try {
        $pdo = new PDO(
            "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
            $user, $pass,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
        $pdo->exec("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
        createTables($pdo);
        seedIfEmpty($pdo);
    } catch (PDOException $e) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['message' => 'ডেটাবেস সংযোগ ব্যর্থ: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }

    return $pdo;
}

function createTables(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id         VARCHAR(50)  PRIMARY KEY,
            name       VARCHAR(100) NOT NULL,
            role       ENUM('OWNER_ONE','OWNER_TWO','STAFF') NOT NULL,
            pin        VARCHAR(100) NOT NULL,
            avatar     MEDIUMTEXT,
            phone      VARCHAR(20)  DEFAULT '',
            created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sessions (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            token      VARCHAR(100) UNIQUE NOT NULL,
            user_id    VARCHAR(50)  NOT NULL,
            created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP    NOT NULL,
            INDEX idx_token  (token),
            INDEX idx_expires (expires_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS income_records (
            id             VARCHAR(50)  PRIMARY KEY,
            date           VARCHAR(10)  NOT NULL,
            time           VARCHAR(5)   NOT NULL,
            service_type   VARCHAR(50)  NOT NULL,
            amount         DECIMAL(12,2) NOT NULL,
            entered_by     VARCHAR(100) NOT NULL,
            note           TEXT,
            payment_method ENUM('CASH','BKASH') NOT NULL DEFAULT 'CASH',
            created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS expense_records (
            id         VARCHAR(50)  PRIMARY KEY,
            date       VARCHAR(10)  NOT NULL,
            time       VARCHAR(5)   NOT NULL,
            category   ENUM('RENT','ELECTRICITY','INTERNET','SALARY','OFFICE','TRAVEL','PRINT','OTHERS') NOT NULL,
            amount     DECIMAL(12,2) NOT NULL,
            entered_by VARCHAR(100) NOT NULL,
            note       TEXT,
            created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bkash_records (
            id         VARCHAR(50)  PRIMARY KEY,
            date       VARCHAR(10)  NOT NULL,
            time       VARCHAR(5)   NOT NULL,
            type       ENUM('IN','OUT','PAYMENT') NOT NULL,
            amount     DECIMAL(12,2) NOT NULL,
            fee        DECIMAL(12,2) DEFAULT NULL,
            entered_by VARCHAR(100) NOT NULL,
            note       TEXT,
            ref_trx    VARCHAR(50)  DEFAULT NULL,
            created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS reminders (
            id           VARCHAR(50) PRIMARY KEY,
            title        TEXT        NOT NULL,
            date         VARCHAR(10) NOT NULL,
            is_completed BOOLEAN     DEFAULT FALSE,
            created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS settings (
            id                       INT PRIMARY KEY DEFAULT 1,
            is_dark_mode             BOOLEAN       DEFAULT TRUE,
            pin_lock_enabled         BOOLEAN       DEFAULT TRUE,
            daily_reminder_text      TEXT,
            expense_alert_threshold  DECIMAL(12,2) DEFAULT 5000,
            monthly_rent             DECIMAL(12,2) DEFAULT 6000,
            monthly_electricity      DECIMAL(12,2) DEFAULT 1850,
            monthly_internet         DECIMAL(12,2) DEFAULT 800,
            monthly_salary           DECIMAL(12,2) DEFAULT 8000,
            last_quote_updated_at    BIGINT        DEFAULT NULL,
            bkash_base_balance       DECIMAL(12,2) DEFAULT 12500,
            bkash_today_spent_override DECIMAL(12,2) DEFAULT NULL,
            cash_in_hand_override    DECIMAL(12,2) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS memos (
            id         VARCHAR(50)   PRIMARY KEY,
            title      VARCHAR(200)  NOT NULL,
            description TEXT,
            amount     DECIMAL(12,2) DEFAULT 0,
            image      MEDIUMTEXT,
            entered_by VARCHAR(100)  NOT NULL,
            date       VARCHAR(10)   NOT NULL,
            time       VARCHAR(5)    NOT NULL,
            created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS services_metadata (
            service_key   VARCHAR(50)  PRIMARY KEY,
            bangla        VARCHAR(200) NOT NULL,
            english       VARCHAR(200) NOT NULL,
            color         VARCHAR(200) NOT NULL,
            default_price DECIMAL(12,2) NOT NULL,
            is_active     BOOLEAN      DEFAULT TRUE,
            sort_order    INT          DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function seedIfEmpty(PDO $pdo): void {
    $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($count > 0) return;

    $ownerPin   = getenv('OWNER_PIN')   ?: '9999';
    $ownerName  = getenv('OWNER_NAME')  ?: 'মালিক';
    $ownerPhone = getenv('OWNER_PHONE') ?: '01700-000000';
    $hashedPin  = password_hash($ownerPin, PASSWORD_BCRYPT);

    $pdo->prepare(
        'INSERT INTO users (id, name, role, pin, avatar, phone) VALUES (?, ?, ?, ?, ?, ?)'
    )->execute(['owner1', $ownerName, 'OWNER_ONE', $hashedPin, '', $ownerPhone]);

    $pdo->prepare(
        "INSERT INTO settings (id, is_dark_mode, pin_lock_enabled, daily_reminder_text, expense_alert_threshold,
         monthly_rent, monthly_electricity, monthly_internet, monthly_salary, bkash_base_balance)
         VALUES (1, TRUE, TRUE, ?, 5000, 6000, 1850, 800, 8000, 0)"
    )->execute(['সাফল্য নিয়ে কোনো শর্টকাট নেই, সত্যতা ও সঠিক গ্রাহক সেবাই ব্যবসার আসল মূলধন।']);

    $services = [
        ['NAMJARI',  'নামজারি আবেদন',      'Mutation Service',         'from-emerald-500 to-teal-600',   300,  1],
        ['KHOTIYAN', 'খতিয়ান উত্তোলন',     'Khotiyan copy',            'from-cyan-500 to-blue-600',      200,  2],
        ['PORCHA',   'পর্চা সংগ্রহ',        'Porcha copy',              'from-indigo-500 to-purple-600',  200,  3],
        ['DOLIL',    'দলিল লিখন / যাচাই',  'Deed Writing',             'from-amber-500 to-orange-655',   2000, 4],
        ['LAND_APP', 'ভূমি আবেদন',          'Land Online Application',  'from-violet-500 to-fuchsia-600', 500,  5],
        ['DCR',      'ডিসিআর পেমেন্ট',      'DCR Payment',              'from-blue-500 to-indigo-600',    200,  6],
        ['OTHERS',   'অন্যান্য সার্ভিস',    'Other General Work',       'from-slate-500 to-slate-700',    300,  7],
    ];

    $stmt = $pdo->prepare(
        'INSERT INTO services_metadata (service_key, bangla, english, color, default_price, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, TRUE, ?)'
    );
    foreach ($services as $s) {
        $stmt->execute($s);
    }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

function getToken(): ?string {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    foreach ($headers as $k => $v) {
        if (strtolower($k) === 'authorization') {
            if (str_starts_with($v, 'Bearer ')) return substr($v, 7);
            return null;
        }
    }
    // Fallback for servers that don't support getallheaders()
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (str_starts_with($auth, 'Bearer ')) return substr($auth, 7);
    return null;
}

function requireAuth(PDO $db): array {
    $token = getToken();
    if (!$token) {
        jsonOut(['message' => 'অনুমোদন প্রয়োজন।'], 401);
    }
    $stmt = $db->prepare(
        'SELECT s.user_id, u.role FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = ? AND s.expires_at > NOW()'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row) {
        jsonOut(['message' => 'সেশন মেয়াদ শেষ বা অবৈধ।'], 401);
    }
    return $row;
}

function requireOwner(PDO $db): array {
    $user = requireAuth($db);
    if ($user['role'] !== 'OWNER_ONE') {
        jsonOut(['message' => 'শুধুমাত্র প্রধান মালিক এই কাজ করতে পারেন।'], 403);
    }
    return $user;
}

// ── Response helpers ──────────────────────────────────────────────────────────

function jsonOut(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function method(): string {
    return $_SERVER['REQUEST_METHOD'];
}
