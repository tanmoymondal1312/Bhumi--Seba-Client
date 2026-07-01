<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db = getDB();
$m  = method();
$id = $_GET['id'] ?? null;

// GET /api/users
if ($m === 'GET') {
    requireOwner($db);
    $rows = $db->query(
        'SELECT id, name, role, avatar, phone, created_at FROM users ORDER BY FIELD(role,"OWNER_ONE","OWNER_TWO","STAFF"), created_at'
    )->fetchAll();
    jsonOut($rows);
}

// POST /api/users
if ($m === 'POST') {
    requireOwner($db);
    $body   = getBody();
    $name   = $body['name']   ?? null;
    $role   = $body['role']   ?? null;
    $pin    = $body['pin']    ?? null;
    $phone  = $body['phone']  ?? '';
    $avatar = $body['avatar'] ?? '';

    if (!$name || !$pin || !$role) {
        jsonOut(['message' => 'নাম, পিন এবং ভূমিকা আবশ্যক।'], 400);
    }
    if (!in_array($role, ['OWNER_TWO', 'STAFF'])) {
        jsonOut(['message' => 'ভূমিকা OWNER_TWO অথবা STAFF হতে হবে।'], 400);
    }

    $userId    = 'user-' . round(microtime(true) * 1000);
    $hashedPin = password_hash($pin, PASSWORD_BCRYPT);

    $db->prepare('INSERT INTO users (id, name, role, pin, avatar, phone) VALUES (?, ?, ?, ?, ?, ?)')
       ->execute([$userId, $name, $role, $hashedPin, $avatar, $phone]);

    jsonOut(['id' => $userId, 'name' => $name, 'role' => $role, 'avatar' => $avatar, 'phone' => $phone]);
}

// PUT /api/users/:id
if ($m === 'PUT' && $id) {
    requireOwner($db);
    if ($id === 'owner1') {
        jsonOut(['message' => 'প্রধান মালিকের তথ্য এখান থেকে পরিবর্তন করা যাবে না।'], 403);
    }

    $body = getBody();
    $sets = []; $vals = [];

    if (!empty($body['name']))  { $sets[] = 'name = ?';  $vals[] = $body['name']; }
    if (!empty($body['role']))  {
        if (!in_array($body['role'], ['OWNER_TWO', 'STAFF'])) {
            jsonOut(['message' => 'ভূমিকা OWNER_TWO অথবা STAFF হতে হবে।'], 400);
        }
        $sets[] = 'role = ?'; $vals[] = $body['role'];
    }
    if (!empty($body['pin']))   {
        $sets[] = 'pin = ?';
        $vals[] = password_hash($body['pin'], PASSWORD_BCRYPT);
    }
    if (isset($body['phone']))  { $sets[] = 'phone = ?';  $vals[] = $body['phone']; }
    if (isset($body['avatar'])) { $sets[] = 'avatar = ?'; $vals[] = $body['avatar']; }

    if (!$sets) jsonOut(['message' => 'কোনো পরিবর্তন দেওয়া হয়নি।'], 400);

    $vals[] = $id;
    $db->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);

    if (!empty($body['pin'])) {
        $db->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$id]);
    }

    $stmt = $db->prepare('SELECT id, name, role, avatar, phone FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) jsonOut(['message' => 'ব্যবহারকারী পাওয়া যায়নি।'], 404);
    jsonOut($user);
}

// DELETE /api/users/:id
if ($m === 'DELETE' && $id) {
    requireOwner($db);
    if ($id === 'owner1') {
        jsonOut(['message' => 'প্রধান মালিকের অ্যাকাউন্ট মুছে ফেলা যাবে না।'], 403);
    }
    $db->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    jsonOut(['message' => 'ব্যবহারকারী সফলভাবে মুছে ফেলা হয়েছে।']);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
