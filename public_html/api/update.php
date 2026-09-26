<?php
/**
 * POST /api/update.php (Rider only)
 * Updates an existing pin's details and refreshes last_seen_at
 */

declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_rider_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    json_out(['error' => 'Valid listing id required'], 422);
}

$bhk = trim($_POST['bhk'] ?? '');
$rent = isset($_POST['rent']) && $_POST['rent'] !== '' ? (int)$_POST['rent'] : null;
$deposit = isset($_POST['deposit']) && $_POST['deposit'] !== '' ? (int)$_POST['deposit'] : null;
$area = trim($_POST['area'] ?? '');
$house_no = trim($_POST['house_no'] ?? '');
$notes = trim($_POST['notes'] ?? '');
$removePhoto = !empty($_POST['remove_photo']);

$validBHK = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'];
if (!in_array($bhk, $validBHK, true)) {
    json_out(['error' => 'Invalid BHK selected'], 422);
}

$pdo = db();

// Fetch current listing
$stmt = $pdo->prepare("SELECT photo_url FROM listings WHERE id = ?");
$stmt->execute([$id]);
$current = $stmt->fetch();
if (!$current) {
    json_out(['error' => 'Listing not found'], 404);
}

$photoUrl = $current['photo_url'];

// Handle photo removal
if ($removePhoto && $photoUrl) {
    $filePath = __DIR__ . '/../' . $photoUrl;
    if (file_exists($filePath)) {
        @unlink($filePath);
    }
    $photoUrl = null;
}

// Handle new photo replacement
if (!empty($_FILES['photo']['name']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($_FILES['photo']['tmp_name']);
    
    if (in_array($mime, $allowedTypes, true)) {
        // Delete old photo if exists
        if ($photoUrl && file_exists(__DIR__ . '/../' . $photoUrl)) {
            @unlink(__DIR__ . '/../' . $photoUrl);
        }
        
        $ext = ($mime === 'image/png') ? 'png' : (($mime === 'image/webp') ? 'webp' : 'jpg');
        $filename = bin2hex(random_bytes(16)) . '.' . $ext;
        $destPath = $uploadDir . $filename;
        if (move_uploaded_file($_FILES['photo']['tmp_name'], $destPath)) {
            $photoUrl = 'uploads/' . $filename;
        }
    }
}

try {
    // Updating refreshes last_seen_at
    $sql = "UPDATE listings 
            SET bhk = :bhk, rent = :rent, deposit = :deposit, area = :area, 
                house_no = :house_no, notes = :notes, photo_url = :photo_url, 
                last_seen_at = NOW() 
            WHERE id = :id";
            
    $updateStmt = $pdo->prepare($sql);
    $updateStmt->execute([
        ':bhk'       => $bhk,
        ':rent'      => $rent,
        ':deposit'   => $deposit,
        ':area'      => $area ?: null,
        ':house_no'  => $house_no ?: null,
        ':notes'     => $notes ?: null,
        ':photo_url' => $photoUrl,
        ':id'        => $id,
    ]);

    json_out(['success' => true, 'message' => 'Listing updated and refreshed!']);
} catch (Exception $e) {
    json_out(['error' => 'Database update error: ' . $e->getMessage()], 500);
}
