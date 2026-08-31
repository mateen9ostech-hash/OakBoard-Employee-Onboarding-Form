<?php

declare(strict_types=1);

const OAKBOARD_MAX_BODY_BYTES = 12_000_000;

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
    $candidates = [];
    if ($configuredPath !== '') {
        $candidates[] = $configuredPath;
    } else {
        // Walk upward from the document root so the private config file is found
        // regardless of how deeply the site is nested on cPanel. This works for a
        // subdomain doc root at any depth (e.g. .../onboarding.example.com/dist/api,
        // or files uploaded straight to .../onboarding.example.com/api). Place
        // oakboard-config.php at or above the document root, ideally in the home
        // directory so it is never web-served.
        $directory = dirname(__DIR__);
        $previous = '';
        while ($directory !== $previous) {
            $candidates[] = $directory . DIRECTORY_SEPARATOR . 'oakboard-config.php';
            $previous = $directory;
            $directory = dirname($directory);
        }
    }
    $path = '';
    foreach ($candidates as $candidate) {
        if (is_file($candidate)) {
            $path = $candidate;
            break;
        }
    }

    if ($path === '') {
        throw new RuntimeException('OST Workforce Onboarding server configuration is missing.');
    }

    $loaded = require $path;
    if (!is_array($loaded) || !isset($loaded['mysql'], $loaded['app'])) {
        throw new RuntimeException('OST Workforce Onboarding server configuration is invalid.');
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

    // Local developers may point the same private config at a remote MySQL
    // host without editing the production file, where localhost must remain.
    $hostOverride = trim((string) (getenv('OAKBOARD_DB_HOST') ?: ''));
    $portOverride = trim((string) (getenv('OAKBOARD_DB_PORT') ?: ''));
    $host = $hostOverride !== '' ? $hostOverride : $mysql['host'];
    $port = $portOverride !== '' ? (int) $portOverride : (int) ($mysql['port'] ?? 3306);
    $databaseName = $mysql['database'];
    $dsn = "mysql:host={$host};port={$port};dbname={$databaseName};charset=utf8mb4";

    $pdo = new PDO($dsn, $mysql['username'], $mysql['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    // Keep application timestamps consistent even when the cPanel server uses
    // a regional system timezone.
    $pdo->exec("SET time_zone = '+00:00'");
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

function utc_strtotime(mixed $value): int
{
    // Every OST Workforce Onboarding DATETIME column holds UTC: PHP writes them with gmdate()
    // and MySQL defaults run under the connection time_zone of '+00:00'. A bare
    // datetime string has no zone designator, so strtotime() would read it in
    // the server's local timezone and shift the result on any cPanel host whose
    // date.timezone is regional. Pin the zone so expiries stay correct.
    $timestamp = strtotime((string) $value . ' UTC');
    return $timestamp === false ? 0 : $timestamp;
}

function onboarding_holiday_dates(): array
{
    static $dates = null;
    if (is_array($dates)) {
        return $dates;
    }

    $path = __DIR__ . '/holiday-calendar.json';
    $calendar = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
    if (!is_array($calendar) || !isset($calendar['holidays']) || !is_array($calendar['holidays'])) {
        throw new RuntimeException('The onboarding holiday calendar is unavailable.');
    }

    $dates = [];
    foreach ($calendar['holidays'] as $holiday) {
        $start = DateTimeImmutable::createFromFormat('!Y-m-d', (string) ($holiday['start'] ?? ''));
        $end = DateTimeImmutable::createFromFormat('!Y-m-d', (string) ($holiday['end'] ?? ''));
        if (!$start || !$end || $end < $start) {
            throw new RuntimeException('The onboarding holiday calendar contains an invalid date range.');
        }

        for ($date = $start; $date <= $end; $date = $date->modify('+1 day')) {
            $dates[$date->format('Y-m-d')] = true;
        }
    }

    return $dates;
}

function onboarding_workdays(string $startDate, int $count): ?array
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $startDate);
    if (!$date || $date->format('Y-m-d') !== $startDate) {
        return null;
    }

    $holidays = onboarding_holiday_dates();
    $dates = [];
    while (count($dates) < $count) {
        $key = $date->format('Y-m-d');
        $weekday = (int) $date->format('N');
        if ($weekday < 6 && !isset($holidays[$key])) {
            $dates[] = $key;
        }
        $date = $date->modify('+1 day');
    }

    return $dates;
}

function normalized_plan(mixed $value): ?array
{
    if (!is_array($value)) {
        return null;
    }
    $role = isset($value['role']) && is_string($value['role']) ? trim($value['role']) : '';
    $weeks = (int) ($value['nWeeks'] ?? 0);
    if ($role === '' || $weeks < 1 || $weeks > 8) {
        return null;
    }
    $startDate = isset($value['startDate']) && is_string($value['startDate']) ? trim($value['startDate']) : '';
    $planDates = onboarding_workdays($startDate, $weeks * 5);
    if ($planDates === null || !isset($value['weeks']) || !is_array($value['weeks']) || count($value['weeks']) < $weeks) {
        return null;
    }

    $normalizedWeeks = array_slice($value['weeks'], 0, $weeks);
    $flatDays = [];
    $globalDay = 0;
    foreach ($normalizedWeeks as $weekIndex => &$week) {
        if (!is_array($week) || !isset($week['days']) || !is_array($week['days']) || count($week['days']) < 5) {
            return null;
        }
        $week['days'] = array_slice($week['days'], 0, 5);
        foreach ($week['days'] as $dayIndex => &$day) {
            if (!is_array($day)) {
                return null;
            }
            $globalDay++;
            $day['g'] = $globalDay;
            $day['day'] = $globalDay;
            $day['localD'] = $dayIndex + 1;
            $day['date'] = $planDates[$globalDay - 1];
            $flatDays[] = $day;
        }
        unset($day);
    }
    unset($week);

    $value['role'] = mb_substr($role, 0, 160);
    $value['nWeeks'] = $weeks;
    $value['startDate'] = $startDate;
    $value['weeks'] = $normalizedWeeks;
    $value['days'] = $flatDays;
    return $value;
}

function saved_plan(array $row): array
{
    $decoded = is_array($row['plan_json']) ? $row['plan_json'] : json_decode((string) $row['plan_json'], true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Stored plan JSON is invalid.');
    }
    $weeks = min(8, max(1, (int) $row['duration_weeks']));
    $decoded['id'] = $row['id'];
    $decoded['nWeeks'] = $weeks;
    return [
        'id' => $row['id'],
        'name' => $row['title'] ?: $decoded['role'],
        'role' => $row['role'] ?: 'Untitled role',
        'nWeeks' => $weeks,
        'updatedAt' => gmdate('c', utc_strtotime($row['updated_at'])),
        'plan' => $decoded,
    ];
}
