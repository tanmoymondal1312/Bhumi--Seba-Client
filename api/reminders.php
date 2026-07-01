<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db     = getDB();
$m      = method();
$id     = $_GET['id']     ?? null;
$action = $_GET['action'] ?? null;

// GET /api/reminders
if ($m === 'GET') {
    requireAuth($db);
    $rows = $db->query(
        'SELECT id, title, date, is_completed FROM reminders ORDER BY date ASC'
    )->fetchAll();
    $out = array_map(fn($r) => [
        'id'          => $r['id'],
        'title'       => $r['title'],
        'date'        => $r['date'],
        'isCompleted' => (bool) $r['is_completed'],
    ], $rows);
    jsonOut($out);
}

// POST /api/reminders
if ($m === 'POST') {
    requireAuth($db);
    $body  = getBody();
    $title = $body['title'] ?? '';
    $date  = $body['date']  ?? '';

    $remId = 'rem-' . round(microtime(true) * 1000);
    $db->prepare('INSERT INTO reminders (id, title, date, is_completed) VALUES (?, ?, ?, FALSE)')
       ->execute([$remId, $title, $date]);

    jsonOut(['id' => $remId, 'title' => $title, 'date' => $date, 'isCompleted' => false], 201);
}

// PATCH /api/reminders/:id/toggle
if ($m === 'PATCH' && $id && $action === 'toggle') {
    requireAuth($db);
    $db->prepare('UPDATE reminders SET is_completed = NOT is_completed WHERE id = ?')->execute([$id]);
    jsonOut(['message' => 'টগল সফল।']);
}

// DELETE /api/reminders/:id
if ($m === 'DELETE' && $id) {
    requireAuth($db);
    $db->prepare('DELETE FROM reminders WHERE id = ?')->execute([$id]);
    jsonOut(['message' => 'মুছে ফেলা সফল।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
