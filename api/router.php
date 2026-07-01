<?php
// PHP built-in server router — mimics .htaccess rewrite rules for local dev
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip leading /api from path
$path = preg_replace('#^/api#', '', $uri);

// Parse query string
$query = $_SERVER['QUERY_STRING'] ?? '';

// Route: /auth/*
if (preg_match('#^/auth/(.+)$#', $path, $m)) {
    $_GET['_path'] = $m[1];
    require __DIR__ . '/auth.php';

// Route: /reminders/:id/toggle
} elseif (preg_match('#^/reminders/([^/]+)/toggle$#', $path, $m)) {
    $_GET['id'] = $m[1];
    $_GET['action'] = 'toggle';
    require __DIR__ . '/reminders.php';

// Route: /reminders/:id
} elseif (preg_match('#^/reminders/([^/]+)$#', $path, $m)) {
    $_GET['id'] = $m[1];
    require __DIR__ . '/reminders.php';

// Route: /reminders
} elseif ($path === '/reminders') {
    require __DIR__ . '/reminders.php';

// Route: /income/:id
} elseif (preg_match('#^/income/([^/]+)$#', $path, $m)) {
    $_GET['id'] = $m[1];
    require __DIR__ . '/income.php';

// Route: /income
} elseif ($path === '/income') {
    require __DIR__ . '/income.php';

// Route: /expenses/:id
} elseif (preg_match('#^/expenses/([^/]+)$#', $path, $m)) {
    $_GET['id'] = $m[1];
    require __DIR__ . '/expenses.php';

// Route: /expenses
} elseif ($path === '/expenses') {
    require __DIR__ . '/expenses.php';

// Route: /bkash/:id
} elseif (preg_match('#^/bkash/([^/]+)$#', $path, $m)) {
    $_GET['id'] = $m[1];
    require __DIR__ . '/bkash.php';

// Route: /bkash
} elseif ($path === '/bkash') {
    require __DIR__ . '/bkash.php';

// Route: /settings
} elseif ($path === '/settings') {
    require __DIR__ . '/settings.php';

// Route: /memos/:id
} elseif (preg_match('#^/memos/([^/]+)$#', $path, $m)) {
    $_GET['id'] = $m[1];
    require __DIR__ . '/memos.php';

// Route: /memos
} elseif ($path === '/memos') {
    require __DIR__ . '/memos.php';

// Route: /services/:key/toggle
} elseif (preg_match('#^/services/([^/]+)/toggle$#', $path, $m)) {
    $_GET['key'] = $m[1];
    $_GET['action'] = 'toggle';
    require __DIR__ . '/services.php';

// Route: /services/:key
} elseif (preg_match('#^/services/([^/]+)$#', $path, $m)) {
    $_GET['key'] = $m[1];
    require __DIR__ . '/services.php';

// Route: /services
} elseif ($path === '/services') {
    require __DIR__ . '/services.php';

// Route: /backup/*
} elseif (preg_match('#^/backup#', $path)) {
    require __DIR__ . '/backup.php';

// Route: /users/:id
} elseif (preg_match('#^/users/([^/]+)$#', $path, $m)) {
    $_GET['id'] = $m[1];
    require __DIR__ . '/users.php';

// Route: /users
} elseif ($path === '/users') {
    require __DIR__ . '/users.php';

} else {
    http_response_code(404);
    echo json_encode(['error' => 'Not found: ' . $path]);
}
