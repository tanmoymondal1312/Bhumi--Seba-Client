<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db = getDB();
$m  = method();
$id = $_GET['id'] ?? null;

// GET /api/bkash
if ($m === 'GET') {
    requireAuth($db);
    $rows = $db->query(
        'SELECT id, date, time, type, amount, fee, entered_by, note, ref_trx FROM bkash_records ORDER BY date DESC, time DESC'
    )->fetchAll();
    $out = array_map(fn($r) => [
        'id'        => $r['id'],
        'date'      => $r['date'],
        'time'      => $r['time'],
        'type'      => $r['type'],
        'amount'    => (float) $r['amount'],
        'fee'       => $r['fee'] !== null ? (float) $r['fee'] : null,
        'enteredBy' => $r['entered_by'],
        'note'      => $r['note'] ?? '',
        'refTrx'    => $r['ref_trx'] ?? null,
    ], $rows);
    jsonOut($out);
}

// POST /api/bkash
if ($m === 'POST') {
    requireAuth($db);
    $body      = getBody();
    $date      = $body['date']      ?? '';
    $time      = $body['time']      ?? '';
    $type      = $body['type']      ?? '';
    $amount    = $body['amount']    ?? 0;
    $fee       = isset($body['fee']) && $body['fee'] !== null ? $body['fee'] : null;
    $enteredBy = $body['enteredBy'] ?? '';
    $note      = $body['note']      ?? '';
    $refTrx    = $body['refTrx']    ?? null;

    $bkId = 'bk-' . round(microtime(true) * 1000);
    $db->prepare(
        'INSERT INTO bkash_records (id, date, time, type, amount, fee, entered_by, note, ref_trx)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$bkId, $date, $time, $type, $amount, $fee, $enteredBy, $note, $refTrx]);

    jsonOut([
        'id' => $bkId, 'date' => $date, 'time' => $time,
        'type' => $type, 'amount' => (float) $amount, 'fee' => $fee !== null ? (float) $fee : null,
        'enteredBy' => $enteredBy, 'note' => $note, 'refTrx' => $refTrx,
    ], 201);
}

// PUT /api/bkash/:id
if ($m === 'PUT' && $id) {
    requireAuth($db);
    $body      = getBody();
    $fee       = isset($body['fee']) && $body['fee'] !== null ? $body['fee'] : null;
    $refTrx    = $body['refTrx'] ?? null;

    $db->prepare(
        'UPDATE bkash_records SET date=?, time=?, type=?, amount=?, fee=?, entered_by=?, note=?, ref_trx=? WHERE id=?'
    )->execute([
        $body['date'] ?? '', $body['time'] ?? '', $body['type'] ?? '',
        $body['amount'] ?? 0, $fee, $body['enteredBy'] ?? '',
        $body['note'] ?? '', $refTrx, $id,
    ]);
    jsonOut(['message' => 'আপডেট সফল।']);
}

// DELETE /api/bkash/:id
if ($m === 'DELETE' && $id) {
    requireAuth($db);
    $db->prepare('DELETE FROM bkash_records WHERE id = ?')->execute([$id]);
    jsonOut(['message' => 'মুছে ফেলা সফল।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
