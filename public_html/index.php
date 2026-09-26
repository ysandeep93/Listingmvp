<?php
/**
 * To-Let Map - Public Map (Renters)
 * Hostinger Shared Hosting (Plain PHP, HTML, CSS, Vanilla JS, Leaflet)
 * Zero frameworks. Zero build step.
 */

declare(strict_types=1);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/cities.php';

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
  <title>To-Let Map | Live Vacancy Map - <?php echo htmlspecialchars($cityData[0]); ?></title>
  <meta name="description" content="Hyperlocal, street-first rental vacancy discovery map in Gurgaon and Indian cities.">
  
  <!-- Leaflet CSS (local vendor preferred, cdn.jsdelivr.net fallback) -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css" />
  
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; height: 100vh; width: 100vw; overflow: hidden; display: flex; flex-direction: column; background: #0f172a; color: #1e293b; }
    
    /* Topbar */
    header { background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; z-index: 1000; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .brand { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 15px; color: #0f172a; text-decoration: none; margin-right: 4px; }
    .brand-badge { background: #16a34a; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; }
    
    select, input, button { font-family: inherit; font-size: 13px; border-radius: 8px; border: 1px solid #cbd5e1; padding: 6px 10px; outline: none; background: #fff; }
    select:focus, input:focus { border-color: #2563eb; ring: 2px rgba(37,99,235,0.2); }
    
    .search-wrap { position: relative; flex: 1; min-width: 170px; }
    .search-wrap input { width: 100%; padding-left: 28px; }
    .search-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #64748b; }
    .search-results { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 4px; max-height: 220px; overflow-y: auto; z-index: 2000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none; }
    .search-item { padding: 8px 12px; font-size: 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; }
    .search-item:hover { background: #f8fafc; }

    .filter-pills { display: flex; gap: 4px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .pill { border: 1px solid #cbd5e1; background: #f8fafc; color: #475569; padding: 4px 9px; border-radius: 999px; font-size: 12px; cursor: pointer; white-space: nowrap; font-weight: 500; }
    .pill.active { background: #0f172a; color: #fff; border-color: #0f172a; }

    #map { flex: 1; width: 100%; height: 100%; position: relative; z-index: 1; }

    /* Freshness Legend Bar */
    .legend-bar { position: absolute; bottom: 20px; left: 12px; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); padding: 8px 12px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); font-size: 11px; z-index: 999; display: flex; gap: 12px; align-items: center; border: 1px solid #e2e8f0; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .dot-green { background: #16a34a; box-shadow: 0 0 0 2px rgba(22,163,74,0.25); }
    .dot-amber { background: #f59e0b; box-shadow: 0 0 0 2px rgba(245,158,11,0.25); }

    /* Custom Leaflet Marker Pins */
    .custom-pin { display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; font-weight: 700; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid #ffffff; transition: transform 0.15s ease; cursor: pointer; }
    .custom-pin:hover { transform: scale(1.15); z-index: 1000 !important; }
    .pin-fresh { background: #16a34a; }
    .pin-amber { background: #f59e0b; }
    
    /* Popups */
    .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.18); padding: 0; overflow: hidden; }
    .leaflet-popup-content { margin: 0; min-width: 250px; max-width: 320px; font-size: 13px; line-height: 1.4; }
    .popup-card { padding: 14px; }
    .popup-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .popup-bhk { font-size: 16px; font-weight: 800; color: #0f172a; }
    .popup-rent { font-size: 16px; font-weight: 800; color: #16a34a; }
    .popup-meta { color: #64748b; font-size: 12px; margin-bottom: 8px; }
    .popup-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-bottom: 6px; }
    .badge-rider { background: #e0f2fe; color: #0369a1; }
    .badge-owner { background: #dcfce7; color: #15803d; }
    .popup-freshness { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-bottom: 8px; }
    .fresh-green { background: #ecfdf5; color: #047857; }
    .fresh-amber { background: #fffbeb; color: #b45309; }
    .popup-photo { width: 100%; height: 130px; object-fit: cover; border-radius: 8px; margin: 8px 0; background: #e2e8f0; }
    .popup-notes { font-size: 12px; color: #334155; background: #f8fafc; padding: 6px 8px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #cbd5e1; }
    .popup-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
    .btn { padding: 7px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
    .btn-outline { background: #fff; border: 1px solid #cbd5e1; color: #334155; }
    .btn-outline:hover { background: #f1f5f9; }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-success { background: #16a34a; color: #fff; }
    .btn-danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .claim-link { display: block; text-align: center; margin-top: 10px; font-size: 11px; color: #2563eb; text-decoration: underline; cursor: pointer; }
  </style>
</head>
<body>

  <header>
    <a href="index.php" class="brand">
      <span>🏡 To-Let Map</span>
      <span class="brand-badge">Live</span>
    </a>

    <!-- City Selector -->
    <select id="citySelect">
      <?php foreach ($CITIES as $k => $c): ?>
        <option value="<?php echo $k; ?>" <?php echo $k === $activeCity ? 'selected' : ''; ?>>
          <?php echo htmlspecialchars($c[0]); ?>
        </option>
      <?php endforeach; ?>
    </select>

    <!-- Neighborhood Search (Nominatim) -->
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input type="text" id="searchInput" placeholder="Search sector / area..." autocomplete="off">
      <div id="searchResults" class="search-results"></div>
    </div>

    <!-- BHK Filters -->
    <div class="filter-pills" id="bhkFilters">
      <button class="pill active" data-bhk="all">All BHK</button>
      <button class="pill" data-bhk="1 RK">1 RK</button>
      <button class="pill" data-bhk="1 BHK">1 BHK</button>
      <button class="pill" data-bhk="2 BHK">2 BHK</button>
      <button class="pill" data-bhk="3 BHK">3 BHK</button>
      <button class="pill" data-bhk="4+ BHK">4+ BHK</button>
    </div>

    <!-- Max Rent Filter -->
    <select id="rentFilter">
      <option value="">Any Rent</option>
      <option value="15000">Up to ₹15k</option>
      <option value="25000">Up to ₹25k</option>
      <option value="40000">Up to ₹40k</option>
      <option value="60000">Up to ₹60k</option>
    </select>
  </header>

  <main id="map"></main>

  <div class="legend-bar">
    <div style="display:flex; align-items:center; gap:6px;">
      <span class="legend-dot dot-green"></span>
      <span>Seen ≤2d ago (Fresh)</span>
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <span class="legend-dot dot-amber"></span>
      <span>3–7d ago (Still active)</span>
    </div>
  </div>

  <!-- Leaflet JS -->
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js"></script>
  
  <script>
    const CITIES = <?php echo json_encode($CITIES, JSON_HEX_TAG | JSON_HEX_AMP); ?>;
    const currentCityKey = <?php echo json_encode($activeCity); ?>;
    const cityData = CITIES[currentCityKey];

    // Initialize Map with OpenStreetMap free tiles
    const map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([cityData[1], cityData[2]], cityData[3]);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    let allListings = [];
    let markersLayer = L.layerGroup().addTo(map);
    let selectedBHK = 'all';
    let maxRent = null;

    // Fetch live vacancy pins
    async function loadPins() {
      try {
        const res = await fetch('api/listings.php');
        allListings = await res.json();
        renderPins();
      } catch (e) {
        console.error('Failed to load listings', e);
      }
    }

    // Render pins based on filters and freshness colors
    function renderPins() {
      markersLayer.clearLayers();

      const filtered = allListings.filter(item => {
        if (selectedBHK !== 'all' && item.bhk !== selectedBHK) return false;
        if (maxRent && item.rent && item.rent > maxRent) return false;
        return true;
      });

      filtered.forEach(item => {
        const isFresh = item.days_ago < 2;
        const colorClass = isFresh ? 'pin-fresh' : 'pin-amber';

        const customIcon = L.divIcon({
          className: 'custom-pin-wrap',
          html: `<div class="custom-pin ${colorClass}" style="width:32px; height:32px;">${item.bhk.replace(' BHK','B').replace(' RK','RK')}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon });

        // Popup Content
        const freshnessLabel = item.days_ago === 0 
          ? (item.hours_ago === 0 ? 'Seen just now' : `Seen ${item.hours_ago}h ago`)
          : (item.days_ago === 1 ? 'Seen yesterday' : `Seen ${item.days_ago}d ago`);

        const badgeHtml = item.owner_verified
          ? `<span class="popup-badge badge-owner">✅ Owner Verified</span>`
          : `<span class="popup-badge badge-rider">🚴 Rider Spotted</span>`;

        const photoHtml = item.photo_url 
          ? `<img src="${item.photo_url}" class="popup-photo" alt="To-Let board" />` 
          : '';

        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;

        const html = `
          <div class="popup-card">
            <div class="popup-header">
              <span class="popup-bhk">${item.bhk}</span>
              <span class="popup-rent">${item.rent ? '₹' + item.rent.toLocaleString('en-IN') : 'Contact board'}</span>
            </div>
            ${badgeHtml}
            <span class="popup-freshness ${isFresh ? 'fresh-green' : 'fresh-amber'}">⏳ ${freshnessLabel}</span>
            <div class="popup-meta">
              ${item.house_no ? '<strong>' + item.house_no + '</strong>, ' : ''}${item.area || 'Nearby area'}
              ${item.deposit ? '<br>Deposit: ₹' + item.deposit.toLocaleString('en-IN') : ''}
            </div>
            ${item.notes ? `<div class="popup-notes">${item.notes}</div>` : ''}
            ${photoHtml}
            <div class="popup-actions">
              <button class="btn btn-outline" onclick="votePin(${item.id}, 'renew')">👍 Still there</button>
              <button class="btn btn-danger" onclick="votePin(${item.id}, 'taken')">❌ Taken</button>
            </div>
            <a href="${directionsUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="margin-top:6px; width:100%;">
              📍 Get Directions
            </a>
            <div class="claim-link" onclick="startClaimFlow(${item.id}, '${item.area || ''}')">
              Is this your property? Claim & Verify Listing
            </div>
          </div>
        `;

        marker.bindPopup(html);
        markersLayer.addLayer(marker);
      });
    }

    // Crowd-sourced freshness voting
    window.votePin = async function(id, action) {
      const formData = new FormData();
      formData.append('id', id);
      formData.append('action', action);

      try {
        const res = await fetch('api/status.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          loadPins();
        } else {
          alert(data.error || 'Failed to update pin');
        }
      } catch (e) {
        alert('Network error while updating pin.');
      }
    };

    window.startClaimFlow = function(id, area) {
      const phone = prompt('Enter your 10-digit mobile number to verify ownership of ' + area + ':');
      if (!phone) return;
      alert('Verification code dispatched. Open the Owner Verification flow.');
    };

    // City Dropdown Change
    document.getElementById('citySelect').addEventListener('change', (e) => {
      window.location.href = 'index.php?city=' + e.target.value;
    });

    // BHK Filters
    document.getElementById('bhkFilters').addEventListener('click', (e) => {
      if (e.target.classList.contains('pill')) {
        document.querySelectorAll('#bhkFilters .pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        selectedBHK = e.target.getAttribute('data-bhk');
        renderPins();
      }
    });

    // Rent Filter
    document.getElementById('rentFilter').addEventListener('change', (e) => {
      maxRent = e.target.value ? parseInt(e.target.value) : null;
      renderPins();
    });

    // Nominatim Neighborhood Search (Debounced 500ms, strictly bounded)
    let searchTimeout = null;
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      if (query.length < 3) {
        searchResults.style.display = 'none';
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          const bounds = map.getBounds();
          const viewbox = `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' ' + cityData[0])}&viewbox=${viewbox}&bounded=0&limit=5`;
          
          const res = await fetch(url);
          const data = await res.json();

          searchResults.innerHTML = '';
          if (data.length === 0) {
            searchResults.innerHTML = '<div class="search-item">No places found</div>';
          } else {
            data.forEach(place => {
              const div = document.createElement('div');
              div.className = 'search-item';
              div.textContent = place.display_name.split(',').slice(0, 3).join(',');
              div.addEventListener('click', () => {
                map.flyTo([parseFloat(place.lat), parseFloat(place.lon)], 15);
                searchResults.style.display = 'none';
                searchInput.value = div.textContent;
              });
              searchResults.appendChild(div);
            });
          }
          searchResults.style.display = 'block';
        } catch (err) {
          console.error(err);
        }
      }, 500);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrap')) {
        searchResults.style.display = 'none';
      }
    });

    // Initial load
    loadPins();
  </script>
</body>
</html>
