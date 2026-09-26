<?php
/**
 * GET /api/listings.php
 * Returns JSON feed of vacancies with computed days_ago
 * Public: status = 'available' AND last_seen_at >= NOW() - 7 DAYS
 * Rider: ?include_all=1 -> includes taken and older pins (status != 'removed')
 */

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

$pdo = db();
$includeAll = isset($_GET['include_all']) && $_GET['include_all'] == '1';

// If rider view requested, ensure session
if ($includeAll && empty($_SESSION['rider'])) {
    // If not authenticated rider, fallback to public view safely
    $includeAll = false;
}

if ($includeAll) {
    // Rider sees active & taken listings (not deleted)
    $sql = "SELECT id, lat, lng, bhk, rent, deposit, area, house_no, notes, 
                   photo_url, status, source, owner_verified, last_seen_at, created_at,
                   TIMESTAMPDIFF(HOUR, last_seen_at, NOW()) AS hours_ago,
                   DATEDIFF(NOW(), last_seen_at) AS days_ago
            FROM listings 
            WHERE status != 'removed'
            ORDER BY last_seen_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
} else {
    // Public map: available only and strictly <= 7 days old
    $sql = "SELECT id, lat, lng, bhk, rent, deposit, area, house_no, notes, 
                   photo_url, status, source, owner_verified, last_seen_at, created_at,
                   TIMESTAMPDIFF(HOUR, last_seen_at, NOW()) AS hours_ago,
                   DATEDIFF(NOW(), last_seen_at) AS days_ago
            FROM listings 
            WHERE status = 'available' 
              AND last_seen_at >= (NOW() - INTERVAL :days DAY)
            ORDER BY last_seen_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':days', EXPIRY_DAYS, PDO::PARAM_INT);
    $stmt->execute();
}

$rows = $stmt->fetchAll();

// Clean up types and relative URLs
$listings = array_map(function ($row) {
    return [
        'id'             => (int)$row['id'],
        'lat'            => (float)$row['lat'],
        'lng'            => (float)$row['lng'],
        'bhk'            => $row['bhk'],
        'rent'           => $row['rent'] !== null ? (int)$row['rent'] : null,
        'deposit'        => $row['deposit'] !== null ? (int)$row['deposit'] : null,
        'area'           => $row['area'] ?? '',
        'house_no'       => $row['house_no'] ?? '',
        'notes'          => $row['notes'] ?? '',
        'photo_url'      => !empty($row['photo_url']) ? $row['photo_url'] : null,
        'status'         => $row['status'],
        'source'         => $row['source'],
        'owner_verified' => (bool)$row['owner_verified'],
        'last_seen_at'   => $row['last_seen_at'],
        'created_at'     => $row['created_at'],
        'hours_ago'      => (int)$row['hours_ago'],
        'days_ago'       => (int)$row['days_ago'],
    ];
}, $rows);

json_out($listings);
