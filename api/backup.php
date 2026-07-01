<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db     = getDB();
$m      = method();
$action = $_GET['action'] ?? null;

// GET /api/backup/export
if ($m === 'GET' && $action === 'export') {
    requireAuth($db);

    $income = $db->query('SELECT * FROM income_records ORDER BY date DESC, time DESC')->fetchAll();
    $expenses = $db->query('SELECT * FROM expense_records ORDER BY date DESC, time DESC')->fetchAll();
    $bkash = $db->query('SELECT * FROM bkash_records ORDER BY date DESC, time DESC')->fetchAll();
    $reminders = $db->query('SELECT * FROM reminders ORDER BY date DESC')->fetchAll();
    $settings = $db->query('SELECT * FROM settings WHERE id = 1')->fetch();
    $services = $db->query('SELECT * FROM services_metadata ORDER BY sort_order')->fetchAll();
    $memos = $db->query('SELECT * FROM memos ORDER BY date DESC, time DESC')->fetchAll();

    jsonOut([
        'exportDate'      => date('c'),
        'incomeList'      => array_map(fn($r) => [
            'id' => $r['id'], 'date' => $r['date'], 'time' => $r['time'],
            'serviceType' => $r['service_type'], 'amount' => (float) $r['amount'],
            'enteredBy' => $r['entered_by'], 'note' => $r['note'] ?? '',
            'paymentMethod' => $r['payment_method'],
        ], $income),
        'expenseList'     => array_map(fn($r) => [
            'id' => $r['id'], 'date' => $r['date'], 'time' => $r['time'],
            'category' => $r['category'], 'amount' => (float) $r['amount'],
            'enteredBy' => $r['entered_by'], 'note' => $r['note'] ?? '',
        ], $expenses),
        'bkashList'       => array_map(fn($r) => [
            'id' => $r['id'], 'date' => $r['date'], 'time' => $r['time'],
            'type' => $r['type'], 'amount' => (float) $r['amount'],
            'fee' => $r['fee'] !== null ? (float) $r['fee'] : null,
            'enteredBy' => $r['entered_by'], 'note' => $r['note'] ?? '',
            'refTrx' => $r['ref_trx'] ?? null,
        ], $bkash),
        'reminderList'    => array_map(fn($r) => [
            'id' => $r['id'], 'title' => $r['title'],
            'date' => $r['date'], 'isCompleted' => (bool) $r['is_completed'],
        ], $reminders),
        'settings'        => $settings ? [
            'isDarkMode'            => (bool) $settings['is_dark_mode'],
            'pinLockEnabled'        => (bool) $settings['pin_lock_enabled'],
            'dailyReminderText'     => $settings['daily_reminder_text'] ?? '',
            'expenseAlertThreshold' => (float) $settings['expense_alert_threshold'],
            'monthlyRent'           => (float) $settings['monthly_rent'],
            'monthlyElectricity'    => (float) $settings['monthly_electricity'],
            'monthlyInternet'       => (float) $settings['monthly_internet'],
            'monthlySalary'         => (float) $settings['monthly_salary'],
            'bkashBaseBalance'      => (float) $settings['bkash_base_balance'],
        ] : [],
        'servicesMetadata' => array_map(fn($r) => [
            'serviceKey'   => $r['service_key'],
            'bangla'       => $r['bangla'],
            'english'      => $r['english'],
            'color'        => $r['color'],
            'defaultPrice' => (float) $r['default_price'],
            'isActive'     => (bool) $r['is_active'],
        ], $services),
        'memoList'        => array_map(fn($r) => [
            'id' => $r['id'], 'title' => $r['title'],
            'description' => $r['description'] ?? '',
            'amount' => (float) $r['amount'],
            'image' => $r['image'] ? '[base64]' : '',
            'enteredBy' => $r['entered_by'],
            'date' => $r['date'], 'time' => $r['time'],
        ], $memos),
    ]);
}

// POST /api/backup/reset
if ($m === 'POST' && $action === 'reset') {
    $auth = requireAuth($db);
    if ($auth['role'] !== 'OWNER_ONE') {
        jsonOut(['message' => 'শুধুমাত্র মালিক রিসেট করতে পারেন।'], 403);
    }

    $db->exec('DELETE FROM sessions');
    $db->exec('DELETE FROM income_records');
    $db->exec('DELETE FROM expense_records');
    $db->exec('DELETE FROM bkash_records');
    $db->exec('DELETE FROM reminders');
    $db->exec('DELETE FROM memos');
    $db->exec('DELETE FROM settings');
    $db->exec('DELETE FROM services_metadata');
    $db->exec('DELETE FROM users');

    seedIfEmpty($db);

    jsonOut(['message' => 'ডেটাবেস রিসেট সফল।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
