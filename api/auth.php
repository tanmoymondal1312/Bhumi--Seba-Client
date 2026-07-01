<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$db   = getDB();
$path = trim($_GET['_path'] ?? '', '/');
$m    = method();

// GET /api/auth/users-list
if ($m === 'GET' && $path === 'users-list') {
    $rows = $db->query(
        'SELECT id, name, role, avatar, phone FROM users ORDER BY FIELD(role,"OWNER_ONE","OWNER_TWO","STAFF"), created_at'
    )->fetchAll();
    jsonOut($rows);
}

// POST /api/auth/login
if ($m === 'POST' && $path === 'login') {
    $body     = getBody();
    $userId   = $body['userId']   ?? null;
    $username = $body['username'] ?? null;
    $pin      = $body['pin']      ?? null;

    if ((!$userId && !$username) || !$pin) {
        jsonOut(['message' => 'ইউজারনেম এবং পিন দেওয়া আবশ্যক।'], 400);
    }

    if ($userId) {
        $stmt = $db->prepare('SELECT id, name, role, pin, avatar, phone FROM users WHERE id = ?');
        $stmt->execute([$userId]);
    } else {
        $stmt = $db->prepare('SELECT id, name, role, pin, avatar, phone FROM users WHERE LOWER(name) = LOWER(?)');
        $stmt->execute([trim($username)]);
    }
    $user = $stmt->fetch();

    if (!$user) {
        jsonOut(['message' => 'ব্যবহারকারী পাওয়া যায়নি!'], 401);
    }

    if (!password_verify($pin, $user['pin'])) {
        jsonOut(['message' => 'ভুল পিন! সঠিক পিন দিয়ে আবার চেষ্টা করুন।'], 401);
    }

    $token     = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+7 days'));

    $db->prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
       ->execute([$token, $user['id'], $expiresAt]);

    jsonOut([
        'token' => $token,
        'user'  => [
            'id'     => $user['id'],
            'name'   => $user['name'],
            'role'   => $user['role'],
            'avatar' => $user['avatar'] ?? '',
            'phone'  => $user['phone']  ?? '',
        ],
    ]);
}

// POST /api/auth/logout
if ($m === 'POST' && $path === 'logout') {
    requireAuth($db);
    $token = getToken();
    $db->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
    jsonOut(['message' => 'লগআউট সফল।']);
}

// GET /api/auth/me
if ($m === 'GET' && $path === 'me') {
    $auth = requireAuth($db);
    $stmt = $db->prepare('SELECT id, name, role, avatar, phone FROM users WHERE id = ?');
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    if (!$user) jsonOut(['message' => 'ব্যবহারকারী পাওয়া যায়নি।'], 404);
    jsonOut(['user' => $user]);
}

// PUT /api/auth/avatar
if ($m === 'PUT' && $path === 'avatar') {
    $auth   = requireAuth($db);
    $body   = getBody();
    $avatar = $body['avatar'] ?? null;
    if (!$avatar) jsonOut(['message' => 'অ্যাভাটার দেওয়া আবশ্যক।'], 400);
    $db->prepare('UPDATE users SET avatar = ? WHERE id = ?')->execute([$avatar, $auth['user_id']]);
    jsonOut(['avatar' => $avatar]);
}

jsonOut(['message' => 'পাওয়া যায়নি।'], 404);
