<?php
/**
 * To-Let Map - Rider App (Founder's Field Tool)
 * Password-protected mobile web tool for spotting and logging physical To-Let boards.
 */

declare(strict_types=1);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cities.php';

// Handle login POST
$loginError = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login_pass'])) {
    if ($_POST['login_pass'] === RIDER_PASSWORD) {
        $_SESSION['rider'] = true;
        header('Location: rider.php');
        exit;
    } else {
        $loginError = 'Invalid rider password. Please check your credentials.';
    }
}

// Handle logout
if (isset($_GET['logout'])) {
    unset($_SESSION['rider']);
    header('Location: rider.php');
    exit;
}

$isLoggedIn = !empty($_SESSION['rider']);
$activeCity = $_GET['city'] ?? 'gurgaon';
if (!array_key_exists($activeCity, $CITIES)) {
    $activeCity = 'gurgaon';
}
$cityData = $CITIES[$activeCity];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Rider App | To-Let Map</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; height: 100vh; width: 100vw; overflow: hidden; display: flex; flex-direction: column; background: #0f172a; color: #1e293b; }
    
    header { background: #0f172a; color: #fff; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; z-index: 1000; }
    .brand { font-weight: 800; font-size: 15px; color: #38bdf8; display: flex; align-items: center; gap: 6px; }
    .brand-badge { background: #0284c7; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; }

    .header-actions { display: flex; gap: 6px; align-items: center; }
    .btn-icon { background: #1e293b; border: 1px solid #334155; color: #f8fafc; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; }
    .btn-icon:hover { background: #334155; }
    
    #map { flex: 1; width: 100%; height: 100%; position: relative; }

    /* Login Overlay */
    .login-modal { position: fixed; inset: 0; background: rgba(15,23,42,0.85); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 20px; }
    .login-card { background: #ffffff; width: 100%; max-width: 360px; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); }
    .login-card h2 { font-size: 18px; margin-bottom: 8px; color: #0f172a; }
    .login-card p { font-size: 13px; color: #64748b; margin-bottom: 16px; }
    .login-input { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 12px; font-size: 14px; }
    .login-btn { width: 100%; background: #0284c7; color: #fff; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    
    /* Bottom Sheet Form */
    .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 2000; display: none; }
    .sheet { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-radius: 16px 16px 0 0; padding: 16px; max-height: 85vh; overflow-y: auto; z-index: 2001; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); display: none; }
    .sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .sheet-title { font-size: 16px; font-weight: 700; color: #0f172a; }
    .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .form-group { margin-bottom: 10px; }
    .form-group.full { grid-column: span 2; }
    label { display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; }
    input, select, textarea { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px; font-family: inherit; }
    textarea { resize: vertical; min-height: 60px; }

    .sheet-actions { display: flex; gap: 8px; margin-top: 14px; }
    .btn-save { flex: 1; background: #16a34a; color: #fff; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .btn-delete { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 10px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; display: none; }
  </style>
</head>
<body>

  <?php if (!$isLoggedIn): ?>
    <div class="login-modal">
      <form class="login-card" method="POST">
        <h2>🚴 Rider Sign In</h2>
        <p>Private tool for founder field logging. Spots To-Let boards on the ground.</p>
        <?php if ($loginError): ?>
          <div style="background:#fee2e2; color:#b91c1c; padding:8px; border-radius:6px; font-size:12px; margin-bottom:12px;">
            <?php echo htmlspecialchars($loginError); ?>
          </div>
        <?php endif; ?>
        <input type="password" name="login_pass" class="login-input" placeholder="Enter Rider Password" required autofocus>
        <button type="submit" class="login-btn">Unlock Rider App</button>
      </form>
    </div>
  <?php else: ?>

    <header>
      <div class="brand">
        <span>🚴 To-Let Rider</span>
        <span class="brand-badge">Gurgaon Field</span>
      </div>

      <div class="header-actions">
        <button class="btn-icon" id="btnLocation">📍 Me</button>
        <button class="btn-icon" id="btnCoords">🎯 Coords</button>
        <a href="rider.php?logout=1" class="btn-icon" style="text-decoration:none;">Logout</a>
      </div>
    </header>

    <main id="map"></main>

    <!-- Bottom Sheet Form for Adding/Editing Pin -->
    <div class="sheet-overlay" id="sheetOverlay"></div>
    <div class="sheet" id="sheet">
      <div class="sheet-header">
        <h3 class="sheet-title" id="sheetTitle">📍 Drop New To-Let Pin</h3>
        <button class="close-btn" id="closeSheetBtn">&times;</button>
      </div>

      <form id="pinForm" enctype="multipart/form-data">
        <input type="hidden" id="pinId" name="id" value="">
        <input type="hidden" id="pinLat" name="lat" value="">
        <input type="hidden" id="pinLng" name="lng" value="">

        <div class="form-grid">
          <div class="form-group">
            <label>BHK *</label>
            <select name="bhk" id="pinBhk" required>
              <option value="1 RK">1 RK</option>
              <option value="1 BHK">1 BHK</option>
              <option value="2 BHK" selected>2 BHK</option>
              <option value="3 BHK">3 BHK</option>
              <option value="4+ BHK">4+ BHK</option>
            </select>
          </div>

          <div class="form-group">
            <label>Monthly Rent (₹)</label>
            <input type="number" name="rent" id="pinRent" placeholder="e.g. 24000">
          </div>

          <div class="form-group">
            <label>Deposit (₹)</label>
            <input type="number" name="deposit" id="pinDeposit" placeholder="e.g. 24000">
          </div>

          <div class="form-group">
            <label>House / Plot No.</label>
            <input type="text" name="house_no" id="pinHouseNo" placeholder="e.g. 421 / Plot 18">
          </div>

          <div class="form-group full">
            <label>Area / Sector *</label>
            <input type="text" name="area" id="pinArea" placeholder="e.g. Sector 14 / DLF Phase 3" required>
          </div>

          <div class="form-group full">
            <label>Board / Street Notes</label>
            <textarea name="notes" id="pinNotes" placeholder="Board details (e.g. Blue tin board on 1st floor, family preferred, park facing)"></textarea>
          </div>

          <div class="form-group full">
            <label>Board Photo (Camera / Upload)</label>
            <input type="file" name="photo" id="pinPhoto" accept="image/*" capture="environment">
            <div id="photoPreviewWrap" style="margin-top:6px; display:none;">
              <img id="photoPreview" style="height:80px; border-radius:6px; object-fit:cover;" alt="Preview" />
              <button type="button" id="removePhotoBtn" style="font-size:11px; color:#dc2626; background:none; border:none; cursor:pointer;">Remove Photo</button>
            </div>
          </div>
        </div>

        <div class="sheet-actions">
          <button type="button" class="btn-delete" id="deletePinBtn">Delete Pin</button>
          <button type="submit" class="btn-save" id="savePinBtn">Save Board Pin</button>
        </div>
      </form>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js"></script>
    <script>
      const map = L.map('map').setView([<?php echo $cityData[1]; ?>, <?php echo $cityData[2]; ?>], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      let markersLayer = L.layerGroup().addTo(map);
      let listings = [];

      async function loadRiderListings() {
        markersLayer.clearLayers();
        const res = await fetch('api/listings.php?include_all=1');
        listings = await res.json();

        listings.forEach(item => {
          const color = item.status === 'taken' ? '#94a3b8' : (item.days_ago < 2 ? '#16a34a' : '#f59e0b');
          const m = L.circleMarker([item.lat, item.lng], {
            radius: 9,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            fillOpacity: 0.9
          });

          m.bindTooltip(`${item.bhk} • ₹${item.rent ? item.rent.toLocaleString('en-IN') : 'N/A'} • ${item.house_no || item.area}`);
          m.on('click', () => openEditSheet(item));
          markersLayer.addLayer(m);
        });
      }

      // Tap on empty map to drop a new pin
      map.on('click', (e) => {
        openNewSheet(e.latlng.lat, e.latlng.lng);
      });

      const sheetOverlay = document.getElementById('sheetOverlay');
      const sheet = document.getElementById('sheet');
      const pinForm = document.getElementById('pinForm');
      const deletePinBtn = document.getElementById('deletePinBtn');

      function openNewSheet(lat, lng) {
        pinForm.reset();
        document.getElementById('pinId').value = '';
        document.getElementById('pinLat').value = lat.toFixed(7);
        document.getElementById('pinLng').value = lng.toFixed(7);
        document.getElementById('sheetTitle').textContent = `📍 Drop Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        document.getElementById('photoPreviewWrap').style.display = 'none';
        deletePinBtn.style.display = 'none';
        sheetOverlay.style.display = 'block';
        sheet.style.display = 'block';
      }

      function openEditSheet(item) {
        pinForm.reset();
        document.getElementById('pinId').value = item.id;
        document.getElementById('pinLat').value = item.lat;
        document.getElementById('pinLng').value = item.lng;
        document.getElementById('pinBhk').value = item.bhk;
        document.getElementById('pinRent').value = item.rent || '';
        document.getElementById('pinDeposit').value = item.deposit || '';
        document.getElementById('pinHouseNo').value = item.house_no || '';
        document.getElementById('pinArea').value = item.area || '';
        document.getElementById('pinNotes').value = item.notes || '';
        document.getElementById('sheetTitle').textContent = `✏️ Edit Pin #${item.id}`;
        
        if (item.photo_url) {
          document.getElementById('photoPreview').src = item.photo_url;
          document.getElementById('photoPreviewWrap').style.display = 'block';
        } else {
          document.getElementById('photoPreviewWrap').style.display = 'none';
        }

        deletePinBtn.style.display = 'block';
        sheetOverlay.style.display = 'block';
        sheet.style.display = 'block';
      }

      function closeSheet() {
        sheetOverlay.style.display = 'none';
        sheet.style.display = 'none';
      }

      document.getElementById('closeSheetBtn').addEventListener('click', closeSheet);
      sheetOverlay.addEventListener('click', closeSheet);

      // Save form
      pinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('pinId').value;
        const url = id ? 'api/update.php' : 'api/add.php';
        const formData = new FormData(pinForm);

        try {
          const res = await fetch(url, { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success) {
            closeSheet();
            loadRiderListings();
          } else {
            alert(data.error || 'Failed to save');
          }
        } catch (err) {
          alert('Network save error');
        }
      });

      // Soft-delete
      deletePinBtn.addEventListener('click', async () => {
        const id = document.getElementById('pinId').value;
        if (!id || !confirm('Are you sure you want to soft-delete this pin?')) return;

        const formData = new FormData();
        formData.append('id', id);

        try {
          const res = await fetch('api/delete.php', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success) {
            closeSheet();
            loadRiderListings();
          } else {
            alert(data.error || 'Failed to delete');
          }
        } catch (err) {
          alert('Network delete error');
        }
      });

      // 📍 Me button (Geolocation)
      document.getElementById('btnLocation').addEventListener('click', () => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.flyTo([lat, lng], 16);
            L.circleMarker([lat, lng], { radius: 8, color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.8 }).addTo(map)
              .bindPopup('You are here')
              .openPopup();
          }, () => alert('Unable to fetch device location'));
        }
      });

      // 🎯 Coords button
      document.getElementById('btnCoords').addEventListener('click', () => {
        const coords = prompt('Enter coordinates (lat, lng):', '28.4595, 77.0266');
        if (coords) {
          const [lat, lng] = coords.split(',').map(n => parseFloat(n.trim()));
          if (!isNaN(lat) && !isNaN(lng)) {
            map.flyTo([lat, lng], 16);
            openNewSheet(lat, lng);
          }
        }
      });

      loadRiderListings();
    </script>
  <?php endif; ?>

</body>
</html>
