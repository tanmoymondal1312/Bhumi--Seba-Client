<?php
// ── Load .env (only OWNER_* needed — no DB config for SQLite) ────────────────
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        putenv(trim($k) . '=' . trim($v, " \t\"'"));
    }
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dbFile = __DIR__ . '/bhumi.db';

    try {
        $pdo = new PDO('sqlite:' . $dbFile, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        // WAL mode = better concurrent read/write performance
        $pdo->exec('PRAGMA journal_mode=WAL');
        $pdo->exec('PRAGMA foreign_keys=ON');
        $pdo->exec('PRAGMA encoding="UTF-8"');

        createTables($pdo);
        seedIfEmpty($pdo);
    } catch (Exception $e) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['message' => 'ডেটাবেস সমস্যা: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }

    return $pdo;
}

function createTables(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id         TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            role       TEXT NOT NULL CHECK(role IN ('OWNER_ONE','OWNER_TWO','STAFF')),
            pin        TEXT NOT NULL,
            avatar     TEXT DEFAULT '',
            phone      TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sessions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            token      TEXT UNIQUE NOT NULL,
            user_id    TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");

    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sessions_token  ON sessions(token)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS income_records (
            id             TEXT PRIMARY KEY,
            date           TEXT NOT NULL,
            time           TEXT NOT NULL,
            service_type   TEXT NOT NULL,
            amount         REAL NOT NULL,
            entered_by     TEXT NOT NULL,
            note           TEXT DEFAULT '',
            payment_method TEXT NOT NULL DEFAULT 'CASH',
            created_at     TEXT DEFAULT (datetime('now'))
        )
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_income_date ON income_records(date)");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS expense_records (
            id         TEXT PRIMARY KEY,
            date       TEXT NOT NULL,
            time       TEXT NOT NULL,
            category   TEXT NOT NULL,
            amount     REAL NOT NULL,
            entered_by TEXT NOT NULL,
            note       TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        )
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_expense_date ON expense_records(date)");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bkash_records (
            id         TEXT PRIMARY KEY,
            date       TEXT NOT NULL,
            time       TEXT NOT NULL,
            type       TEXT NOT NULL CHECK(type IN ('IN','OUT','PAYMENT')),
            amount     REAL NOT NULL,
            fee        REAL DEFAULT NULL,
            entered_by TEXT NOT NULL,
            note       TEXT DEFAULT '',
            ref_trx    TEXT DEFAULT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_bkash_date ON bkash_records(date)");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS reminders (
            id           TEXT PRIMARY KEY,
            title        TEXT NOT NULL,
            date         TEXT NOT NULL,
            is_completed INTEGER DEFAULT 0,
            created_at   TEXT DEFAULT (datetime('now'))
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS settings (
            id                         INTEGER PRIMARY KEY DEFAULT 1,
            is_dark_mode               INTEGER DEFAULT 1,
            pin_lock_enabled           INTEGER DEFAULT 1,
            daily_reminder_text        TEXT    DEFAULT '',
            expense_alert_threshold    REAL    DEFAULT 5000,
            monthly_rent               REAL    DEFAULT 6000,
            monthly_electricity        REAL    DEFAULT 1850,
            monthly_internet           REAL    DEFAULT 800,
            monthly_salary             REAL    DEFAULT 8000,
            last_quote_updated_at      INTEGER DEFAULT NULL,
            bkash_base_balance         REAL    DEFAULT 12500,
            bkash_today_spent_override REAL    DEFAULT NULL,
            cash_in_hand_override      REAL    DEFAULT NULL
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS memos (
            id          TEXT PRIMARY KEY,
            title       TEXT NOT NULL,
            description TEXT DEFAULT '',
            amount      REAL DEFAULT 0,
            image       TEXT DEFAULT '',
            entered_by  TEXT NOT NULL,
            date        TEXT NOT NULL,
            time        TEXT NOT NULL,
            created_at  TEXT DEFAULT (datetime('now'))
        )
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_memos_date ON memos(date)");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS services_metadata (
            service_key   TEXT PRIMARY KEY,
            bangla        TEXT NOT NULL,
            english       TEXT NOT NULL,
            color         TEXT NOT NULL,
            default_price REAL NOT NULL,
            is_active     INTEGER DEFAULT 1,
            sort_order    INTEGER DEFAULT 0
        )
    ");
}

function seedIfEmpty(PDO $pdo): void {
    $ownerPin   = getenv('OWNER_PIN')   ?: '9999';
    $ownerName  = getenv('OWNER_NAME')  ?: 'মালিক';
    $ownerPhone = getenv('OWNER_PHONE') ?: '01700-000000';

    $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($count > 0) {
        // Sync .env changes to owner1 on every startup
        $owner = $pdo->query("SELECT name, pin, phone FROM users WHERE id = 'owner1'")->fetch();
        if ($owner) {
            $updates = [];
            $vals    = [];
            if ($owner['name'] !== $ownerName)  { $updates[] = 'name = ?';  $vals[] = $ownerName; }
            if ($owner['phone'] !== $ownerPhone){ $updates[] = 'phone = ?'; $vals[] = $ownerPhone; }
            if (!password_verify($ownerPin, $owner['pin'])) {
                $updates[] = 'pin = ?';
                $vals[]    = password_hash($ownerPin, PASSWORD_BCRYPT);
            }
            if ($updates) {
                $vals[] = 'owner1';
                $pdo->prepare('UPDATE users SET ' . implode(', ', $updates) . " WHERE id = ?")->execute($vals);
            }
        }
        return;
    }

    $hashedPin  = password_hash($ownerPin, PASSWORD_BCRYPT);

    $pdo->prepare(
        "INSERT INTO users (id, name, role, pin, avatar, phone) VALUES ('owner1', ?, 'OWNER_ONE', ?, '', ?)"
    )->execute([$ownerName, $hashedPin, $ownerPhone]);

    $pdo->prepare(
        "INSERT INTO settings (id, is_dark_mode, pin_lock_enabled, daily_reminder_text,
         expense_alert_threshold, monthly_rent, monthly_electricity, monthly_internet,
         monthly_salary, bkash_base_balance)
         VALUES (1, 1, 1, ?, 5000, 6000, 1850, 800, 8000, 0)"
    )->execute(['সাফল্য নিয়ে কোনো শর্টকাট নেই, সত্যতা ও সঠিক গ্রাহক সেবাই ব্যবসার আসল মূলধন।']);

    $services = [
        ['NAMJARI',  'নামজারি আবেদন',     'Mutation Service',        'from-emerald-500 to-teal-600',   300,  1],
        ['KHOTIYAN', 'খতিয়ান উত্তোলন',    'Khotiyan copy',           'from-cyan-500 to-blue-600',      200,  2],
        ['PORCHA',   'পর্চা সংগ্রহ',       'Porcha copy',             'from-indigo-500 to-purple-600',  200,  3],
        ['DOLIL',    'দলিল লিখন / যাচাই', 'Deed Writing',            'from-amber-500 to-orange-655',   2000, 4],
        ['LAND_APP', 'ভূমি আবেদন',         'Land Online Application', 'from-violet-500 to-fuchsia-600', 500,  5],
        ['DCR',      'ডিসিআর পেমেন্ট',     'DCR Payment',             'from-blue-500 to-indigo-600',    200,  6],
        ['OTHERS',   'অন্যান্য সার্ভিস',   'Other General Work',      'from-slate-500 to-slate-700',    300,  7],
    ];

    $stmt = $pdo->prepare(
        'INSERT INTO services_metadata (service_key, bangla, english, color, default_price, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, 1, ?)'
    );
    foreach ($services as $s) $stmt->execute($s);
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

function getToken(): ?string {
    // Try getallheaders() first
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower($k) === 'authorization' && str_starts_with($v, 'Bearer ')) {
                return substr($v, 7);
            }
        }
    }
    // Fallbacks for servers that strip Authorization header
    foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION'] as $key) {
        $val = $_SERVER[$key] ?? '';
        if (str_starts_with($val, 'Bearer ')) return substr($val, 7);
    }
    return null;
}

function requireAuth(PDO $db): array {
    $token = getToken();
    if (!$token) jsonOut(['message' => 'অনুমোদন প্রয়োজন।'], 401);

    $stmt = $db->prepare(
        'SELECT s.user_id, u.role FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = ? AND s.expires_at > datetime("now")'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row) jsonOut(['message' => 'সেশন মেয়াদ শেষ বা অবৈধ।'], 401);
    return $row;
}

function requireOwner(PDO $db): array {
    $user = requireAuth($db);
    if ($user['role'] !== 'OWNER_ONE') {
        jsonOut(['message' => 'শুধুমাত্র প্রধান মালিক এই কাজ করতে পারেন।'], 403);
    }
    return $user;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonOut(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getBody(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function method(): string {
    return $_SERVER['REQUEST_METHOD'];
}
