<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db     = getDB();
$m      = method();
$key    = $_GET['key']    ?? null;
$action = $_GET['action'] ?? null;

// GET /api/services
if ($m === 'GET') {
    requireAuth($db);
    $rows = $db->query(
        'SELECT service_key, bangla, english, color, default_price, is_active FROM services_metadata ORDER BY sort_order ASC'
    )->fetchAll();
    $out = array_map(fn($r) => [
        'serviceKey'   => $r['service_key'],
        'bangla'       => $r['bangla'],
        'english'      => $r['english'],
        'color'        => $r['color'],
        'defaultPrice' => (float) $r['default_price'],
        'isActive'     => (bool) $r['is_active'],
    ], $rows);
    jsonOut($out);
}

// POST /api/services
if ($m === 'POST') {
    requireAuth($db);
    $body         = getBody();
    $serviceKey   = $body['serviceKey']   ?? '';
    $bangla       = $body['bangla']       ?? '';
    $english      = $body['english']      ?? '';
    $color        = $body['color']        ?? '';
    $defaultPrice = $body['defaultPrice'] ?? 0;

    $maxOrder = (int) $db->query('SELECT MAX(sort_order) FROM services_metadata')->fetchColumn();
    $db->prepare(
        'INSERT INTO services_metadata (service_key, bangla, english, color, default_price, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, TRUE, ?)'
    )->execute([$serviceKey, $bangla, $english, $color, $defaultPrice, $maxOrder + 1]);

    jsonOut(['message' => 'সার্ভিস যোগ সফল।'], 201);
}

// PUT /api/services/:key/toggle
if ($m === 'PUT' && $key && $action === 'toggle') {
    requireAuth($db);
    $body     = getBody();
    $isActive = isset($body['isActive']) ? (int)(bool)$body['isActive'] : 1;
    $db->prepare('UPDATE services_metadata SET is_active = ? WHERE service_key = ?')->execute([$isActive, $key]);
    jsonOut(['message' => 'স্ট্যাটাস আপডেট সফল।']);
}

// PUT /api/services/:key
if ($m === 'PUT' && $key) {
    requireAuth($db);
    $body         = getBody();
    $bangla       = $body['bangla']       ?? '';
    $english      = $body['english']      ?? '';
    $color        = $body['color']        ?? '';
    $defaultPrice = $body['defaultPrice'] ?? 0;

    $db->prepare(
        'UPDATE services_metadata SET bangla=?, english=?, color=?, default_price=? WHERE service_key=?'
    )->execute([$bangla, $english, $color, $defaultPrice, $key]);
    jsonOut(['message' => 'আপডেট সফল।']);
}

// DELETE /api/services/:key
if ($m === 'DELETE' && $key) {
    requireAuth($db);
    $db->prepare('DELETE FROM services_metadata WHERE service_key = ?')->execute([$key]);
    jsonOut(['message' => 'মুছে ফেলা সফল।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
