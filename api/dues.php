<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db     = getDB();
$m      = method();
$id     = $_GET['id']     ?? null;
$action = $_GET['action'] ?? null;

// GET /api/dues
if ($m === 'GET') {
    requireAuth($db);
    $rows = $db->query(
        'SELECT id, customer_name, phone, service_type, amount, note, date, entered_by FROM dues ORDER BY date DESC, created_at DESC'
    )->fetchAll();
    $out = array_map(fn($r) => [
        'id'           => $r['id'],
        'customerName' => $r['customer_name'],
        'phone'        => $r['phone'] ?? '',
        'serviceType'  => $r['service_type'] ?? 'OTHERS',
        'amount'       => (float) $r['amount'],
        'note'         => $r['note'] ?? '',
        'date'         => $r['date'],
        'enteredBy'    => $r['entered_by'],
    ], $rows);
    jsonOut($out);
}

// POST /api/dues
if ($m === 'POST' && !$id) {
    requireAuth($db);
    $body         = getBody();
    $customerName = trim($body['customerName'] ?? '');
    $phone        = trim($body['phone'] ?? '');
    $serviceType  = $body['serviceType'] ?? 'OTHERS';
    $amount       = (float) ($body['amount'] ?? 0);
    $note         = trim($body['note'] ?? '');
    $date         = $body['date'] ?? '';
    $enteredBy    = $body['enteredBy'] ?? '';

    if ($customerName === '' || $amount <= 0 || $date === '') {
        jsonOut(['message' => 'গ্রাহকের নাম, টাকার পরিমাণ ও তারিখ আবশ্যক।'], 400);
    }

    $dueId = 'due-' . round(microtime(true) * 1000);
    $db->prepare(
        'INSERT INTO dues (id, customer_name, phone, service_type, amount, note, date, entered_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$dueId, $customerName, $phone, $serviceType, $amount, $note, $date, $enteredBy]);

    jsonOut([
        'id' => $dueId, 'customerName' => $customerName, 'phone' => $phone,
        'serviceType' => $serviceType, 'amount' => $amount, 'note' => $note,
        'date' => $date, 'enteredBy' => $enteredBy,
    ], 201);
}

// POST /api/dues/:id/pay  → delete due + create income record on the paid date
if ($m === 'POST' && $id && $action === 'pay') {
    requireAuth($db);
    $body      = getBody();
    $date      = $body['date'] ?? '';
    $time      = $body['time'] ?? '';
    $enteredBy = $body['enteredBy'] ?? '';
    $method    = $body['paymentMethod'] ?? 'CASH';

    $due = $db->prepare('SELECT * FROM dues WHERE id = ?');
    $due->execute([$id]);
    $due = $due->fetch();
    if (!$due) jsonOut(['message' => 'বাকির এন্ট্রিটি পাওয়া যায়নি।'], 404);
    if ($date === '' || $time === '') jsonOut(['message' => 'তারিখ ও সময় আবশ্যক।'], 400);

    $incId = 'inc-' . round(microtime(true) * 1000);
    $note  = 'বাকি পরিশোধ: ' . $due['customer_name'] . ($due['note'] ? ' (' . $due['note'] . ')' : '');

    $db->beginTransaction();
    try {
        $db->prepare(
            'INSERT INTO income_records (id, date, time, service_type, amount, entered_by, note, payment_method)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$incId, $date, $time, $due['service_type'] ?: 'OTHERS', $due['amount'], $enteredBy, $note, $method]);

        $db->prepare('DELETE FROM dues WHERE id = ?')->execute([$id]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        jsonOut(['message' => 'পরিশোধ প্রক্রিয়া ব্যর্থ হয়েছে — আবার চেষ্টা করুন।'], 500);
    }

    jsonOut([
        'income' => [
            'id' => $incId, 'date' => $date, 'time' => $time,
            'serviceType' => $due['service_type'] ?: 'OTHERS',
            'amount' => (float) $due['amount'], 'enteredBy' => $enteredBy,
            'note' => $note, 'paymentMethod' => $method,
        ],
        'deletedDueId' => $id,
    ], 201);
}

// DELETE /api/dues/:id  → remove without income (wrong entry)
if ($m === 'DELETE' && $id) {
    requireAuth($db);
    $db->prepare('DELETE FROM dues WHERE id = ?')->execute([$id]);
    jsonOut(['message' => 'মুছে ফেলা সফল।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
