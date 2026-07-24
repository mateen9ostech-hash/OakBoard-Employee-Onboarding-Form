<?php

declare(strict_types=1);

const REQUIRED_EXTENSIONS = ['curl', 'json', 'mbstring', 'openssl', 'pdo', 'pdo_mysql'];
const REQUIRED_TABLES = [
    'app_users',
    'auth_sessions',
    'auth_tokens',
    'onboarding_email_logs',
    'onboarding_imports',
    'onboarding_plans',
];

function fail(string $message): never
{
    fwrite(STDERR, "OakBoard preflight failed: {$message}\n");
    exit(1);
}

if (PHP_VERSION_ID < 80400) {
    fail('PHP 8.4 or newer is required inside the container.');
}

foreach (REQUIRED_EXTENSIONS as $extension) {
    if (!extension_loaded($extension)) {
        fail("PHP extension {$extension} is missing.");
    }
}

$configPath = getenv('OAKBOARD_CONFIG_FILE') ?: '';
if ($configPath === '' || !is_file($configPath) || !is_readable($configPath)) {
    fail('the read-only private configuration file is missing.');
}

$appRoot = rtrim((string) (getenv('OAKBOARD_APP_ROOT') ?: '/var/www/html'), DIRECTORY_SEPARATOR);
if (!is_file($appRoot . '/api/bootstrap.php') || !is_file($appRoot . '/api/mailgun.php')) {
    fail('the application API runtime is missing.');
}

require $appRoot . '/api/bootstrap.php';
require $appRoot . '/api/mailgun.php';

try {
    $config = oakboard_config();
    $app = $config['app'] ?? [];
    $appUrl = (string) ($app['url'] ?? '');
    if (filter_var($appUrl, FILTER_VALIDATE_URL) === false) {
        fail('app.url is not a valid absolute URL.');
    }
    if (strlen((string) ($config['security']['session_secret'] ?? '')) < 32) {
        fail('security.session_secret must contain at least 32 characters.');
    }

    mailgun_config();
    $pdo = database();
    $placeholders = implode(',', array_fill(0, count(REQUIRED_TABLES), '?'));
    $statement = $pdo->prepare(
        "SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
           AND table_name IN ({$placeholders})"
    );
    $statement->execute(REQUIRED_TABLES);
    $existing = $statement->fetchAll(PDO::FETCH_COLUMN);
    $missing = array_values(array_diff(REQUIRED_TABLES, $existing));
    if ($missing !== []) {
        fail('database tables are missing: ' . implode(', ', $missing));
    }
} catch (Throwable $error) {
    fail($error->getMessage());
}

fwrite(STDOUT, "OakBoard preflight passed.\n");
