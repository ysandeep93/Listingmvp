<?php
/**
 * Daily Cleanup Cron Job
 * Expires listings older than EXPIRY_DAYS (default 7 days)
 * Can be run via Hostinger Cron: php -q /home/u123456789/public_html/cleanup.php
 * Or via web request with CRON_SECRET token
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

// Optional web protection token
$cronSecret = getenv('CRON_SECRET') ?: 'tolet_cleanup_cron_key';
if (php_sapi_name() !== 'cli') {
    $token = $_GET['secret'] ?? '';
    if (!hash_equals($cronSecret, $token)) {
        json_out(['error' => 'Forbidden: Invalid cron secret'], 403);
    }
}

try {
    $pdo = db();
    $days = EXPIRY_DAYS;

    // Soft-expire: Mark available listings older than 7 days as 'removed'
    $sql = "UPDATE listings 
            SET status = 'removed' 
            WHERE status = 'available' 
              AND last_seen_at < (NOW() - INTERVAL :days DAY)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':days', $days, PDO::PARAM_INT);
    $stmt->execute();

    $affected = $stmt->rowCount();

    $response = [
        'status' => 'success',
        'timestamp' => date('Y-m-d H:i:s'),
        'expired_count' => $affected,
        'message' => "Soft-expired {$affected} listing(s) older than {$days} days."
    ];

    if (php_sapi_name() === 'cli') {
        echo "[CLEANUP " . date('Y-m-d H:i:s') . "] {$response['message']}\n";
    } else {
        json_out($response);
    }
} catch (Exception $e) {
    if (php_sapi_name() === 'cli') {
        echo "[CLEANUP ERROR] " . $e->getMessage() . "\n";
    } else {
        json_out(['error' => $e->getMessage()], 500);
    }
}
