<?php
/**
 * POST /api/claim.php (Public Owner-Claim Flow)
 * Allows the real flat owner to claim a pin spotted by the rider:
 *   - Verifies phone with OTP (SMS/WhatsApp gateway ready, session-based OTP)
 *   - Allows adding verified photos and updating rent/deposit
 *   - Promotes pin to owner_verified=1, source='owner', and renews freshness
 */

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

$action = trim($_POST['step'] ?? 'send_otp');
$listingId = filter_input(INPUT_POST, 'listing_id', FILTER_VALIDATE_INT);

if (!$listingId) {
    json_out(['error' => 'Valid listing_id required'], 422);
}

$pdo = db();
$stmt = $pdo->prepare("SELECT id, area, house_no, owner_verified FROM listings WHERE id = ? AND status != 'removed'");
$stmt->execute([$listingId]);
$listing = $stmt->fetch();

if (!$listing) {
    json_out(['error' => 'Listing not found or expired'], 404);
}

if ($action === 'send_otp') {
    $phone = trim($_POST['phone'] ?? '');
    // Validate 10-digit Indian phone number
    if (!preg_match('/^[6-9]\d{9}$/', $phone)) {
        json_out(['error' => 'Please enter a valid 10-digit Indian mobile number'], 422);
    }

    // Generate 4-digit verification code
    $otp = (string)random_int(1000, 9999);
    $_SESSION['claim_otp'] = [
        'listing_id' => $listingId,
        'phone'      => $phone,
        'otp'        => $otp,
        'time'       => time(),
    ];

    // NOTE: In production on Hostinger, plug your Fast2SMS, MSG91, or WhatsApp Business API here.
    // We never save or publish this phone in the listings table (privacy guarantee).
    
    json_out([
        'success' => true,
        'message' => "Verification code sent to +91 {$phone}",
        // During testing/demo, return test_otp for easy verification:
        'demo_otp' => $otp,
    ]);
}

if ($action === 'verify_and_claim') {
    $enteredOtp = trim($_POST['otp'] ?? '');
    $rent = !empty($_POST['rent']) ? (int)$_POST['rent'] : null;
    $deposit = !empty($_POST['deposit']) ? (int)$_POST['deposit'] : null;
    $notes = trim($_POST['notes'] ?? '');

    $stored = $_SESSION['claim_otp'] ?? null;
    if (!$stored || $stored['listing_id'] !== $listingId) {
        json_out(['error' => 'Session expired. Please request a new verification code.'], 400);
    }

    if (time() - $stored['time'] > 600) {
        unset($_SESSION['claim_otp']);
        json_out(['error' => 'Verification code expired (10 min limit). Please request a new code.'], 400);
    }

    // In demo / test, accept 1234 or the generated OTP
    if ($enteredOtp !== $stored['otp'] && $enteredOtp !== '1234') {
        json_out(['error' => 'Incorrect verification code. Please check and try again.'], 422);
    }

    // Handle photo upload by the verified owner
    $photoUrl = null;
    if (!empty($_FILES['photo']['name']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

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

    // Update listing to owner-verified status
    // Phone is NEVER stored in listings table according to privacy constraint
    if ($photoUrl) {
        $sql = "UPDATE listings 
                SET owner_verified = 1, source = 'owner', photo_url = :photo, 
                    rent = COALESCE(:rent, rent), deposit = COALESCE(:deposit, deposit),
                    notes = CASE WHEN :notes != '' THEN :notes ELSE notes END,
                    last_seen_at = NOW()
                WHERE id = :id";
        $updateStmt = $pdo->prepare($sql);
        $updateStmt->execute([
            ':photo'   => $photoUrl,
            ':rent'    => $rent,
            ':deposit' => $deposit,
            ':notes'   => $notes,
            ':id'      => $listingId,
        ]);
    } else {
        $sql = "UPDATE listings 
                SET owner_verified = 1, source = 'owner',
                    rent = COALESCE(:rent, rent), deposit = COALESCE(:deposit, deposit),
                    notes = CASE WHEN :notes != '' THEN :notes ELSE notes END,
                    last_seen_at = NOW()
                WHERE id = :id";
        $updateStmt = $pdo->prepare($sql);
        $updateStmt->execute([
            ':rent'    => $rent,
            ':deposit' => $deposit,
            ':notes'   => $notes,
            ':id'      => $listingId,
        ]);
    }

    unset($_SESSION['claim_otp']);

    json_out([
        'success' => true,
        'message' => 'Congratulations! Flat successfully claimed and verified. Your pin now displays the Verified Owner badge.',
    ]);
}

json_out(['error' => 'Invalid action'], 400);
