<?php

declare(strict_types=1);

// Dedicated profile endpoint. Keeping /api/profile independently executable
// prevents an older parent API front controller from turning profile requests
// into "API route not found" after a partial cPanel deployment.
if (PHP_VERSION_ID < 80100) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'OST Workforce Onboarding requires PHP 8.1 or newer.']);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/auth.php';
require dirname(__DIR__) . '/profile.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $user = authenticated_user();

    if ($method === 'GET') {
        json_response(get_profile((string) $user['id']));
    }

    if ($method === 'PATCH') {
        require_csrf($user);
        json_response(update_profile((string) $user['id'], request_json()));
    }

    json_response(['error' => 'Profile method not allowed.'], 405);
} catch (Throwable $error) {
    error_log('OST Workforce Onboarding profile API failure: ' . $error->getMessage());
    json_response(['error' => 'OST Workforce Onboarding could not complete this profile request.'], 500);
}
