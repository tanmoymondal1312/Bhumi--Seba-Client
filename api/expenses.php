<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db = getDB();
$m  = method();
$id = $_GET['id'] ?? null;

// GET /api/expenses
if ($m === 'GET') {
    requireAuth($db);
    $rows = $db->query(
        'SELECT id, date, time, category, amount, entered_by, note FROM expense_records ORDER BY date DESC, time DESC'
    )->fetchAll();
    $out = array_map(fn($r) => [
        'id'        => $r['id'],
        'date'      => $r['date'],
        'time'      => $r['time'],
        'category'  => $r['category'],
        'amount'    => (float) $r['amount'],
        'enteredBy' => $r['entered_by'],
        'note'      => $r['note'] ?? '',
    ], $rows);
    jsonOut($out);
}

// POST /api/expenses
if ($m === 'POST') {
    requireAuth($db);
    $body      = getBody();
    $date      = $body['date']      ?? '';
    $time      = $body['time']      ?? '';
    $category  = $body['category']  ?? '';
    $amount    = $body['amount']    ?? 0;
    $enteredBy = $body['enteredBy'] ?? '';
    $note      = $body['note']      ?? '';

    $expId = 'exp-' . round(microtime(true) * 1000);
    $db->prepare(
        'INSERT INTO expense_records (id, date, time, category, amount, entered_by, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([$expId, $date, $time, $category, $amount, $enteredBy, $note]);

    jsonOut([
        'id' => $expId, 'date' => $date, 'time' => $time,
        'category' => $category, 'amount' => (float) $amount,
        'enteredBy' => $enteredBy, 'note' => $note,
    ], 201);
}

// DELETE /api/expenses/:id
if ($m === 'DELETE' && $id) {
    requireAuth($db);
    $db->prepare('DELETE FROM expense_records WHERE id = ?')->execute([$id]);
    jsonOut(['message' => 'মুছে ফেলা সফল।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
