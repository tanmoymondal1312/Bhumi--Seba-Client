<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db = getDB();
$m  = method();
$id = $_GET['id'] ?? null;

// GET /api/memos
if ($m === 'GET') {
    requireAuth($db);
    $rows = $db->query(
        'SELECT id, title, description, amount, image, entered_by, date, time FROM memos ORDER BY date DESC, time DESC'
    )->fetchAll();
    $out = array_map(fn($r) => [
        'id'          => $r['id'],
        'title'       => $r['title'],
        'description' => $r['description'] ?? '',
        'amount'      => (float) $r['amount'],
        'image'       => $r['image'] ?? '',
        'enteredBy'   => $r['entered_by'],
        'date'        => $r['date'],
        'time'        => $r['time'],
    ], $rows);
    jsonOut($out);
}

// POST /api/memos
if ($m === 'POST') {
    requireAuth($db);
    $body        = getBody();
    $title       = $body['title']       ?? '';
    $description = $body['description'] ?? '';
    $amount      = $body['amount']      ?? 0;
    $image       = $body['image']       ?? '';
    $enteredBy   = $body['enteredBy']   ?? '';
    $date        = $body['date']        ?? '';
    $time        = $body['time']        ?? '';

    if (!$title) jsonOut(['message' => 'মেমো শিরোনাম আবশ্যক।'], 400);

    $memoId = 'memo-' . round(microtime(true) * 1000);
    $db->prepare(
        'INSERT INTO memos (id, title, description, amount, image, entered_by, date, time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([$memoId, $title, $description, $amount, $image, $enteredBy, $date, $time]);

    jsonOut([
        'id' => $memoId, 'title' => $title, 'description' => $description,
        'amount' => (float) $amount, 'image' => $image,
        'enteredBy' => $enteredBy, 'date' => $date, 'time' => $time,
    ], 201);
}

// DELETE /api/memos/:id
if ($m === 'DELETE' && $id) {
    requireAuth($db);
    $db->prepare('DELETE FROM memos WHERE id = ?')->execute([$id]);
    jsonOut(['message' => 'মেমো মুছে ফেলা হয়েছে।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
