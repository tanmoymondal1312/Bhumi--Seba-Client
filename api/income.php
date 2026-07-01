<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db = getDB();
$m  = method();
$id = $_GET['id'] ?? null;

// GET /api/income
if ($m === 'GET') {
    requireAuth($db);
    $rows = $db->query(
        'SELECT id, date, time, service_type, amount, entered_by, note, payment_method FROM income_records ORDER BY date DESC, time DESC'
    )->fetchAll();
    $out = array_map(fn($r) => [
        'id'            => $r['id'],
        'date'          => $r['date'],
        'time'          => $r['time'],
        'serviceType'   => $r['service_type'],
        'amount'        => (float) $r['amount'],
        'enteredBy'     => $r['entered_by'],
        'note'          => $r['note'] ?? '',
        'paymentMethod' => $r['payment_method'],
    ], $rows);
    jsonOut($out);
}

// POST /api/income
if ($m === 'POST') {
    requireAuth($db);
    $body          = getBody();
    $date          = $body['date']          ?? '';
    $time          = $body['time']          ?? '';
    $serviceType   = $body['serviceType']   ?? '';
    $amount        = $body['amount']        ?? 0;
    $enteredBy     = $body['enteredBy']     ?? '';
    $note          = $body['note']          ?? '';
    $paymentMethod = $body['paymentMethod'] ?? 'CASH';

    $incId = 'inc-' . round(microtime(true) * 1000);
    $db->prepare(
        'INSERT INTO income_records (id, date, time, service_type, amount, entered_by, note, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$incId, $date, $time, $serviceType, $amount, $enteredBy, $note, $paymentMethod]);

    $record = [
        'id' => $incId, 'date' => $date, 'time' => $time,
        'serviceType' => $serviceType, 'amount' => (float) $amount,
        'enteredBy' => $enteredBy, 'note' => $note, 'paymentMethod' => $paymentMethod,
    ];

    $bkashRecord = null;
    if ($paymentMethod === 'BKASH') {
        $bkId   = 'bk-' . round(microtime(true) * 1000);
        $refTrx = 'BHUM' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
        $bkNote = 'ইনকাম এন্ট্রি লিংক: ' . $note;
        $db->prepare(
            'INSERT INTO bkash_records (id, date, time, type, amount, entered_by, note, ref_trx)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$bkId, $date, $time, 'IN', $amount, $enteredBy, $bkNote, $refTrx]);
        $bkashRecord = [
            'id' => $bkId, 'date' => $date, 'time' => $time,
            'type' => 'IN', 'amount' => (float) $amount,
            'enteredBy' => $enteredBy, 'note' => $bkNote, 'refTrx' => $refTrx,
        ];
    }

    jsonOut(['income' => $record, 'bkash' => $bkashRecord], 201);
}

// PUT /api/income/:id
if ($m === 'PUT' && $id) {
    requireAuth($db);
    $body = getBody();
    $sets = []; $vals = [];

    $map = [
        'date'          => 'date',
        'time'          => 'time',
        'serviceType'   => 'service_type',
        'amount'        => 'amount',
        'enteredBy'     => 'entered_by',
        'note'          => 'note',
        'paymentMethod' => 'payment_method',
    ];
    foreach ($map as $key => $col) {
        if (array_key_exists($key, $body)) {
            $sets[] = "$col = ?";
            $vals[] = $body[$key];
        }
    }
    if (!$sets) jsonOut(['message' => 'কোনো আপডেট ডেটা দেওয়া হয়নি।'], 400);

    $vals[] = $id;
    $db->prepare('UPDATE income_records SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
    jsonOut(['message' => 'আপডেট সফল।']);
}

// DELETE /api/income/:id
if ($m === 'DELETE' && $id) {
    requireAuth($db);
    $db->prepare('DELETE FROM income_records WHERE id = ?')->execute([$id]);
    jsonOut(['message' => 'মুছে ফেলা সফল।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
