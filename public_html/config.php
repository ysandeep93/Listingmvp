<?php
/**
 * To-Let Map - Global Configuration & Database Helper
 * Hostinger Shared Hosting (PHP 8.x + MySQL PDO)
 */

declare(strict_types=1);

// Prevent direct execution outside web server
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Database Credentials (Update with your Hostinger MySQL details)
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'u123456789_toletmap');
define('DB_USER', getenv('DB_USER') ?: 'u123456789_tlmuser');
define('DB_PASS', getenv('DB_PASS') ?: 'YourStrongDbPasswordHere');

// Rider Single Password (For founder's field phone app)
define('RIDER_PASSWORD', getenv('RIDER_PASSWORD') ?: 'rider_gurgaon_2026');

// Freshness Expiry Window (in days)
define('EXPIRY_DAYS', 7);

// Timezone (IST for India)
date_default_timezone_set('Asia/Kolkata');

/**
 * Returns a shared PDO instance with prepared statements and error exceptions
 */
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}

/**
 * Sends a clean JSON response and exits
 */
function json_out(mixed $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Requires active rider session or terminates with 401
 */
function require_rider_auth(): void {
    if (empty($_SESSION['rider'])) {
        json_out(['error' => 'Unauthorized: Rider login required'], 401);
    }
}
