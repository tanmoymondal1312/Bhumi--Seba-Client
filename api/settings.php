<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db = getDB();
$m  = method();

// GET /api/settings
if ($m === 'GET') {
    requireAuth($db);
    $row = $db->query('SELECT * FROM settings WHERE id = 1')->fetch();

    if (!$row) {
        jsonOut([
            'isDarkMode'             => true,
            'pinLockEnabled'         => true,
            'dailyReminderText'      => '',
            'expenseAlertThreshold'  => 5000,
            'monthlyRent'            => 6000,
            'monthlyElectricity'     => 1850,
            'monthlyInternet'        => 800,
            'monthlySalary'          => 8000,
            'bkashBaseBalance'       => 12500,
        ]);
    }

    jsonOut([
        'isDarkMode'                => (bool) $row['is_dark_mode'],
        'pinLockEnabled'            => (bool) $row['pin_lock_enabled'],
        'dailyReminderText'         => $row['daily_reminder_text'] ?? '',
        'expenseAlertThreshold'     => (float) $row['expense_alert_threshold'],
        'monthlyRent'               => $row['monthly_rent']               !== null ? (float) $row['monthly_rent']               : null,
        'monthlyElectricity'        => $row['monthly_electricity']        !== null ? (float) $row['monthly_electricity']        : null,
        'monthlyInternet'           => $row['monthly_internet']           !== null ? (float) $row['monthly_internet']           : null,
        'monthlySalary'             => $row['monthly_salary']             !== null ? (float) $row['monthly_salary']             : null,
        'lastQuoteUpdatedAt'        => $row['last_quote_updated_at']      !== null ? (int)   $row['last_quote_updated_at']      : null,
        'bkashBaseBalance'          => $row['bkash_base_balance']         !== null ? (float) $row['bkash_base_balance']         : null,
        'bkashTodaySpentOverride'   => $row['bkash_today_spent_override'] !== null ? (float) $row['bkash_today_spent_override'] : null,
        'cashInHandOverride'        => $row['cash_in_hand_override']      !== null ? (float) $row['cash_in_hand_override']      : null,
    ]);
}

// PUT /api/settings
if ($m === 'PUT') {
    requireAuth($db);
    $data = getBody();
    $sets = []; $vals = [];

    $map = [
        'isDarkMode'              => 'is_dark_mode',
        'pinLockEnabled'          => 'pin_lock_enabled',
        'dailyReminderText'       => 'daily_reminder_text',
        'expenseAlertThreshold'   => 'expense_alert_threshold',
        'monthlyRent'             => 'monthly_rent',
        'monthlyElectricity'      => 'monthly_electricity',
        'monthlyInternet'         => 'monthly_internet',
        'monthlySalary'           => 'monthly_salary',
        'lastQuoteUpdatedAt'      => 'last_quote_updated_at',
        'bkashBaseBalance'        => 'bkash_base_balance',
        'bkashTodaySpentOverride' => 'bkash_today_spent_override',
        'cashInHandOverride'      => 'cash_in_hand_override',
    ];

    foreach ($map as $key => $col) {
        if (array_key_exists($key, $data)) {
            $sets[] = "$col = ?";
            $vals[] = $data[$key];
        }
    }

    if (!$sets) jsonOut(['message' => 'কোনো আপডেট ডেটা দেওয়া হয়নি।'], 400);

    $existing = $db->query('SELECT id FROM settings WHERE id = 1')->fetch();
    if (!$existing) {
        $db->exec('INSERT INTO settings (id) VALUES (1)');
    }

    $db->prepare('UPDATE settings SET ' . implode(', ', $sets) . ' WHERE id = 1')->execute($vals);
    jsonOut(['message' => 'সেটিংস আপডেট সফল।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
