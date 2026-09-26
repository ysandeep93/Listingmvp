<?php
/**
 * POST /api/status.php (Public)
 * Public crowd-sourced freshness voting:
 *   - 'renew': Updates last_seen_at = NOW() (extends 7-day clock)
 *   - 'taken': Updates status = 'taken' (removes from active vacancy map)
 * Includes session-based rate limiting (1 vote per pin per hour per session)
 */

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
$action = trim($_POST['action'] ?? '');

if (!$id || !in_array($action, ['renew', 'taken'], true)) {
    json_out(['error' => 'Valid id and action (renew|taken) required'], 422);
}

// Session rate limiting: track last vote time per pin
if (!isset($_SESSION['votes'])) {
    $_SESSION['votes'] = [];
}

$now = time();
$lastVoteTime = $_SESSION['votes'][$id] ?? 0;
if (($now - $lastVoteTime) < 3600) {
    // 1 hour cooldown per pin per session
    $remainingMinutes = ceil((3600 - ($now - $lastVoteTime)) / 60);
    json_out([
        'error' => "You already voted on this pin recently. Please wait {$remainingMinutes} min before voting again."
    ], 429);
}

try {
    $pdo = db();

    if ($action === 'renew') {
        // Reset 7-day expiry clock to right now
        $stmt = $pdo->prepare("UPDATE listings SET last_seen_at = NOW() WHERE id = ? AND status = 'available'");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            json_out(['error' => 'Listing not found or no longer available'], 404);
        }

        $_SESSION['votes'][$id] = $now;
        json_out([
            'success' => true,
            'message' => 'Thanks! Pin freshness renewed. Visible for 7 more days.'
        ]);
    } else if ($action === 'taken') {
        // Mark as taken
        $stmt = $pdo->prepare("UPDATE listings SET status = 'taken' WHERE id = ?");
        $stmt->execute([$id]);

        $_SESSION['votes'][$id] = $now;
        json_out([
            'success' => true,
            'message' => 'Marked as Taken. Thanks for keeping the vacancy map clean!'
        ]);
    }
} catch (Exception $e) {
    json_out(['error' => 'Database error: ' . $e->getMessage()], 500);
}
