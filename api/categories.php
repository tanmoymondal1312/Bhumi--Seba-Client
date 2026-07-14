<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db  = getDB();
$m   = method();
$key = $_GET['key'] ?? null;

// GET /api/categories
if ($m === 'GET') {
    requireAuth($db);
    $rows = $db->query(
        'SELECT category_key, bangla, english, color, is_fixed, is_active FROM expense_categories ORDER BY sort_order ASC'
    )->fetchAll();
    $out = array_map(fn($r) => [
        'categoryKey' => $r['category_key'],
        'bangla'      => $r['bangla'],
        'english'     => $r['english'] ?? '',
        'color'       => $r['color'] ?? 'bg-slate-500',
        'isFixed'     => (bool) $r['is_fixed'],
        'isActive'    => (bool) $r['is_active'],
    ], $rows);
    jsonOut($out);
}

// POST /api/categories
if ($m === 'POST') {
    requireAuth($db);
    $body        = getBody();
    $categoryKey = trim($body['categoryKey'] ?? '');
    $bangla      = trim($body['bangla'] ?? '');
    $english     = trim($body['english'] ?? '');
    $color       = $body['color'] ?? 'bg-slate-500';
    $isFixed     = (int)(bool)($body['isFixed'] ?? false);

    if ($categoryKey === '' || $bangla === '') {
        jsonOut(['message' => 'খাতের নাম ও ইউনিক কী আবশ্যক।'], 400);
    }

    $exists = $db->prepare('SELECT COUNT(*) FROM expense_categories WHERE category_key = ?');
    $exists->execute([$categoryKey]);
    if ((int) $exists->fetchColumn() > 0) {
        jsonOut(['message' => 'এই খাতটি ইতিমধ্যে তালিকায় রয়েছে!'], 409);
    }

    $maxOrder = (int) $db->query('SELECT MAX(sort_order) FROM expense_categories')->fetchColumn();
    $db->prepare(
        'INSERT INTO expense_categories (category_key, bangla, english, color, is_fixed, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)'
    )->execute([$categoryKey, $bangla, $english, $color, $isFixed, $maxOrder + 1]);

    jsonOut(['message' => 'খরচের খাত যোগ সফল।'], 201);
}

// DELETE /api/categories/:key
if ($m === 'DELETE' && $key) {
    requireAuth($db);
    $db->prepare('DELETE FROM expense_categories WHERE category_key = ?')->execute([$key]);
    jsonOut(['message' => 'মুছে ফেলা সফল।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
