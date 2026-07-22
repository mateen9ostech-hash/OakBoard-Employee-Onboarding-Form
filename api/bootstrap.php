<?php

declare(strict_types=1);

const OAKBOARD_MAX_BODY_BYTES = 2_500_000;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function oakboard_config(): array
{
    static $config = null;
    if (is_array($config)) {
        return $config;
    }

    $configuredPath = getenv('OAKBOARD_CONFIG_FILE') ?: '';
    $defaultPath = dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'oakboard-config.php';
    $path = $configuredPath !== '' ? $configuredPath : $defaultPath;

    if (!is_file($path)) {
        throw new RuntimeException('OakBoard server configuration is missing.');
    }

    $loaded = require $path;
    if (!is_array($loaded) || !isset($loaded['mysql'], $loaded['supabase'])) {
        throw new RuntimeException('OakBoard server configuration is invalid.');
    }

    $config = $loaded;
    return $config;
}

function database(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $mysql = oakboard_config()['mysql'];
    foreach (['host', 'database', 'username', 'password'] as $required) {
        if (!isset($mysql[$required]) || !is_string($mysql[$required]) || $mysql[$required] === '') {
            throw new RuntimeException('MySQL configuration is incomplete.');
        }
    }

    $host = $mysql['host'];
    $port = (int) ($mysql['port'] ?? 3306);
    $databaseName = $mysql['database'];
    $dsn = "mysql:host={$host};port={$port};dbname={$databaseName};charset=utf8mb4";

    $pdo = new PDO($dsn, $mysql['username'], $mysql['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function request_json(): array
{
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > OAKBOARD_MAX_BODY_BYTES) {
        json_response(['error' => 'Request body is too large.'], 413);
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_response(['error' => 'A valid JSON request body is required.'], 400);
    }
    return $decoded;
}

function authorization_header(): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    return is_string($header) ? $header : '';
}

function authenticated_user(): array
{
    $header = authorization_header();
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        json_response(['error' => 'Unauthorized'], 401);
    }

    $config = oakboard_config()['supabase'];
    $url = rtrim((string) ($config['url'] ?? ''), '/');
    $publishableKey = (string) ($config['publishable_key'] ?? '');
    if ($url === '' || $publishableKey === '') {
        throw new RuntimeException('Supabase authentication configuration is incomplete.');
    }

    $curl = curl_init($url . '/auth/v1/user');
    if ($curl === false) {
        throw new RuntimeException('Authentication service could not be initialized.');
    }

    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'apikey: ' . $publishableKey,
            'Authorization: Bearer ' . $matches[1],
        ],
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $response = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($response === false) {
        error_log('OakBoard Supabase verification failed: ' . $curlError);
        json_response(['error' => 'Authentication service is temporarily unavailable.'], 503);
    }
    if ($status !== 200) {
        json_response(['error' => 'Unauthorized'], 401);
    }

    $user = json_decode($response, true);
    if (!is_array($user) || !isset($user['id']) || !is_string($user['id'])) {
        json_response(['error' => 'Unauthorized'], 401);
    }
    return $user;
}

function display_name(array $user): string
{
    $metadata = is_array($user['user_metadata'] ?? null) ? $user['user_metadata'] : [];
    foreach (['full_name', 'name', 'display_name'] as $key) {
        if (isset($metadata[$key]) && is_string($metadata[$key]) && trim($metadata[$key]) !== '') {
            return mb_substr(trim($metadata[$key]), 0, 160);
        }
    }
    return '';
}

function ensure_application_user(array $user): void
{
    $email = isset($user['email']) && is_string($user['email']) && $user['email'] !== ''
        ? mb_strtolower(trim($user['email']))
        : $user['id'] . '@legacy.oakboard.invalid';
    $verifiedAt = isset($user['email_confirmed_at']) && is_string($user['email_confirmed_at'])
        ? date('Y-m-d H:i:s.v', strtotime($user['email_confirmed_at']))
        : null;

    $statement = database()->prepare(
        'INSERT INTO app_users (id, email, full_name, email_verified_at)
         VALUES (:id, :email, :full_name, :verified_at)
         ON DUPLICATE KEY UPDATE
           email = VALUES(email),
           full_name = VALUES(full_name),
           email_verified_at = COALESCE(VALUES(email_verified_at), email_verified_at),
           updated_at = CURRENT_TIMESTAMP(3)'
    );
    $statement->execute([
        'id' => $user['id'],
        'email' => $email,
        'full_name' => display_name($user),
        'verified_at' => $verifiedAt,
    ]);
}

function uuid_v4(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

function valid_uuid(string $value): bool
{
    return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $value) === 1;
}

function normalized_plan(mixed $value): ?array
{
    if (!is_array($value)) {
        return null;
    }
    $role = isset($value['role']) && is_string($value['role']) ? trim($value['role']) : '';
    $weeks = (int) ($value['nWeeks'] ?? 0);
    if ($role === '' || !in_array($weeks, [2, 4], true)) {
        return null;
    }
    $value['role'] = mb_substr($role, 0, 160);
    $value['nWeeks'] = $weeks;
    return $value;
}

function saved_plan(array $row): array
{
    $decoded = is_array($row['plan_json']) ? $row['plan_json'] : json_decode((string) $row['plan_json'], true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Stored plan JSON is invalid.');
    }
    $weeks = (int) $row['duration_weeks'] === 4 ? 4 : 2;
    $decoded['id'] = $row['id'];
    $decoded['nWeeks'] = $weeks;
    return [
        'id' => $row['id'],
        'name' => $row['title'] ?: $decoded['role'],
        'role' => $row['role'] ?: 'Untitled role',
        'nWeeks' => $weeks,
        'updatedAt' => gmdate('c', strtotime((string) $row['updated_at'])),
        'plan' => $decoded,
    ];
}
