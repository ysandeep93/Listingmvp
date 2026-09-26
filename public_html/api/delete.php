<?php
/**
 * POST /api/delete.php (Rider only)
 * Soft-deletes a pin: status = 'removed'. Deletes physical photo file from disk.
 */

declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_rider_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    json_out(['error' => 'Valid listing ID required'], 422);
}

try {
    $pdo = db();
    
    // Look up photo to clean disk
    $stmt = $pdo->prepare("SELECT photo_url FROM listings WHERE id = ?");
    $stmt->execute([$id]);
    $listing = $stmt->fetch();
    
    if (!$listing) {
        json_out(['error' => 'Listing not found'], 404);
    }
    
    if (!empty($listing['photo_url'])) {
        $filePath = __DIR__ . '/../' . $listing['photo_url'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
    }
    
    // Soft delete preserves audit history
    $updateStmt = $pdo->prepare("UPDATE listings SET status = 'removed', photo_url = NULL WHERE id = ?");
    $updateStmt->execute([$id]);

    json_out(['success' => true, 'message' => 'Pin removed successfully']);
} catch (Exception $e) {
    json_out(['error' => 'Delete failed: ' . $e->getMessage()], 500);
}
