<?php
/**
 * POST /api/add.php (Rider only)
 * Creates a new vacancy pin spotted in the neighborhood
 */

declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_rider_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

$lat = filter_input(INPUT_POST, 'lat', FILTER_VALIDATE_FLOAT);
$lng = filter_input(INPUT_POST, 'lng', FILTER_VALIDATE_FLOAT);
$bhk = trim($_POST['bhk'] ?? '');
$rent = !empty($_POST['rent']) ? (int)$_POST['rent'] : null;
$deposit = !empty($_POST['deposit']) ? (int)$_POST['deposit'] : null;
$area = trim($_POST['area'] ?? '');
$house_no = trim($_POST['house_no'] ?? '');
$notes = trim($_POST['notes'] ?? '');

$validBHK = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'];
if ($lat === false || $lng === false || !in_array($bhk, $validBHK, true)) {
    json_out(['error' => 'Invalid input: lat, lng, and valid BHK are required'], 422);
}

// Handle optional photo upload
$photoUrl = null;
if (!empty($_FILES['photo']['name']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Check file type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($_FILES['photo']['tmp_name']);
    
    if (in_array($mime, $allowedTypes, true)) {
        $ext = ($mime === 'image/png') ? 'png' : (($mime === 'image/webp') ? 'webp' : 'jpg');
        $filename = bin2hex(random_bytes(16)) . '.' . $ext;
        $destPath = $uploadDir . $filename;
        if (move_uploaded_file($_FILES['photo']['tmp_name'], $destPath)) {
            $photoUrl = 'uploads/' . $filename;
        }
    }
}

try {
    $pdo = db();
    $sql = "INSERT INTO listings 
            (lat, lng, bhk, rent, deposit, area, house_no, notes, photo_url, status, source, owner_verified, last_seen_at)
            VALUES 
            (:lat, :lng, :bhk, :rent, :deposit, :area, :house_no, :notes, :photo_url, 'available', 'rider', 0, NOW())";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':lat'       => $lat,
        ':lng'       => $lng,
        ':bhk'       => $bhk,
        ':rent'      => $rent,
        ':deposit'   => $deposit,
        ':area'      => $area ?: null,
        ':house_no'  => $house_no ?: null,
        ':notes'     => $notes ?: null,
        ':photo_url' => $photoUrl,
    ]);

    $id = (int)$pdo->lastInsertId();
    json_out([
        'success' => true,
        'id' => $id,
        'message' => 'To-Let pin dropped successfully!'
    ], 201);
} catch (Exception $e) {
    json_out(['error' => 'Database error: ' . $e->getMessage()], 500);
}
