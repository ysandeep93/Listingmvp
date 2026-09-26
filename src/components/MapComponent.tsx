import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Listing, CityConfig, BHKType } from '../types';
import { getFreshnessInfo, formatCurrency } from '../utils/dateUtils';
import { CITIES } from '../data/cities';
import { MapPin } from 'lucide-react';

interface Props {
  cityKey: string;
  listings: Listing[];
  selectedBHK: BHKType | 'all';
  maxRent: number | null;
  onSelectListing: (listing: Listing) => void;
  onRenewPin: (id: number) => void;
  onMarkTaken: (id: number) => void;
  onClaimClick: (listing: Listing) => void;
  isRiderMode: boolean;
  onMapClickForRider: (coords: { lat: number; lng: number }) => void;
  onEditListingForRider: (listing: Listing) => void;
  flyToLocation: { lat: number; lng: number; zoom?: number } | null;
  onMapCenterChange?: (coords: { lat: number; lng: number }) => void;
  showCenterTarget?: boolean;
}

export const MapComponent: React.FC<Props> = ({
  cityKey,
  listings,
  selectedBHK,
  maxRent,
  onSelectListing,
  onRenewPin,
  onMarkTaken,
  onClaimClick,
  isRiderMode,
  onMapClickForRider,
  onEditListingForRider,
  flyToLocation,
  onMapCenterChange,
  showCenterTarget = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);

  // Stable callback refs to prevent effect recreation loops
  const onMapCenterChangeRef = useRef(onMapCenterChange);
  onMapCenterChangeRef.current = onMapCenterChange;

  const onMapClickForRiderRef = useRef(onMapClickForRider);
  onMapClickForRiderRef.current = onMapClickForRider;

  const onRenewPinRef = useRef(onRenewPin);
  onRenewPinRef.current = onRenewPin;

  const onMarkTakenRef = useRef(onMarkTaken);
  onMarkTakenRef.current = onMarkTaken;

  const onClaimClickRef = useRef(onClaimClick);
  onClaimClickRef.current = onClaimClick;

  const onEditListingForRiderRef = useRef(onEditListingForRider);
  onEditListingForRiderRef.current = onEditListingForRider;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const city = CITIES[cityKey] || CITIES['gurgaon'];
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([city.lat, city.lng], city.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Track map center only on moveend to avoid flooding renders
    const handleMoveEnd = () => {
      if (onMapCenterChangeRef.current) {
        const center = map.getCenter();
        onMapCenterChangeRef.current({ lat: center.lat, lng: center.lng });
      }
    };

    map.on('moveend', handleMoveEnd);

    // Initial center broadcast
    handleMoveEnd();

    return () => {
      map.off('moveend', handleMoveEnd);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center when city changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const city = CITIES[cityKey];
    if (city) {
      mapInstanceRef.current.setView([city.lat, city.lng], city.zoom);
    }
  }, [cityKey]);

  // Handle fly-to requests
  useEffect(() => {
    if (!mapInstanceRef.current || !flyToLocation) return;
    mapInstanceRef.current.flyTo(
      [flyToLocation.lat, flyToLocation.lng],
      flyToLocation.zoom || 15,
      { duration: 1.2 }
    );
  }, [flyToLocation]);

  // Handle map click for Rider Mode pin dropping
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isRiderMode) return;

      const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
      onMapClickForRiderRef.current?.(coords);

      // Temporary marker for dropping spot
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setLatLng(e.latlng);
      } else {
        const icon = L.divIcon({
          className: 'temp-marker-icon',
          html: `<div style="background:#0284c7; width:20px; height:20px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 10px rgba(2,132,199,0.8);" class="animate-bounce"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        tempMarkerRef.current = L.marker(e.latlng, { icon }).addTo(map);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isRiderMode]);

  // Render vacancy pins
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    // Filter pins
    const visibleListings = listings.filter((item) => {
      // In public mode, only show available listings
      if (!isRiderMode && item.status !== 'available') return false;
      if (selectedBHK !== 'all' && item.bhk !== selectedBHK) return false;
      if (maxRent && item.rent && item.rent > maxRent) return false;

      // In public mode, strictly expire after 7 days
      const freshness = getFreshnessInfo(item.last_seen_at);
      if (!isRiderMode && freshness.isExpired) return false;

      return true;
    });

    visibleListings.forEach((item) => {
      const freshness = getFreshnessInfo(item.last_seen_at);
      const isTaken = item.status === 'taken';

      // Pin color classes
      let bgClass = 'bg-emerald-600';
      let ringClass = 'ring-2 ring-emerald-300';
      if (isTaken) {
        bgClass = 'bg-slate-400 line-through';
        ringClass = 'ring-1 ring-slate-200';
      } else if (freshness.isAmber) {
        bgClass = 'bg-amber-500';
        ringClass = 'ring-2 ring-amber-300';
      }

      const verifiedBadgeHtml = item.owner_verified
        ? `<div class="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow border border-white text-[9px]">✓</div>`
        : '';

      const iconHtml = `
        <div class="relative group cursor-pointer">
          <div class="${bgClass} ${ringClass} text-white font-extrabold text-[10px] w-8 h-8 rounded-full flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-125 border-2 border-white">
            ${item.bhk.replace(' BHK', 'B').replace(' RK', 'RK')}
          </div>
          ${verifiedBadgeHtml}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([item.lat, item.lng], { icon: customIcon });

      if (isRiderMode) {
        marker.on('click', () => {
          onEditListingForRiderRef.current?.(item);
        });
      } else {
        // Build rich popup
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
        const trustBadge = item.owner_verified
          ? `<span style="background:#dcfce7; color:#15803d; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">✅ Owner Verified</span>`
          : `<span style="background:#e0f2fe; color:#0369a1; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">🚴 Rider Spotted</span>`;

        const freshnessBadge = freshness.isFresh
          ? `<span style="background:#ecfdf5; color:#047857; font-size:11px; font-weight:600; padding:2px 6px; border-radius:4px;">⏳ ${freshness.label}</span>`
          : `<span style="background:#fffbeb; color:#b45309; font-size:11px; font-weight:600; padding:2px 6px; border-radius:4px;">⏳ ${freshness.label}</span>`;

        const popupContent = document.createElement('div');
        popupContent.className = 'p-3 text-slate-800 text-xs';
        popupContent.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;">
            <span style="font-size:15px; font-weight:800; color:#0f172a;">${item.bhk}</span>
            <span style="font-size:15px; font-weight:800; color:#16a34a;">${formatCurrency(item.rent)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
            ${trustBadge}
            ${freshnessBadge}
          </div>
          <div style="color:#475569; font-size:12px; margin-bottom:6px; line-height:1.3;">
            ${item.house_no ? `<strong>${item.house_no}</strong>, ` : ''}${item.area}
            ${item.deposit ? `<br><span style="color:#64748b;">Deposit: ${formatCurrency(item.deposit)}</span>` : ''}
          </div>
          ${
            item.notes
              ? `<div style="background:#f8fafc; border-left:3px solid #cbd5e1; padding:6px; border-radius:4px; margin-bottom:8px; font-size:11px; color:#334155;">${item.notes}</div>`
              : ''
          }
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:8px;">
            <button id="renew-btn-${item.id}" style="background:#f8fafc; border:1px solid #cbd5e1; padding:8px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer; min-height:36px; display:flex; align-items:center; justify-content:center;">
              👍 Still there
            </button>
            <button id="taken-btn-${item.id}" style="background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:8px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer; min-height:36px; display:flex; align-items:center; justify-content:center;">
              ❌ Taken
            </button>
          </div>
          <a href="${directionsUrl}" target="_blank" rel="noopener" style="display:flex; align-items:center; justify-content:center; text-align:center; background:#2563eb; color:#fff; padding:9px; border-radius:8px; font-weight:700; font-size:12px; text-decoration:none; margin-top:6px; min-height:38px;">
            📍 Directions in Google Maps
          </a>
          <div id="claim-link-${item.id}" style="text-align:center; margin-top:9px; padding:4px; font-size:11px; color:#2563eb; text-decoration:underline; cursor:pointer; font-weight:600;">
            Is this your flat? Claim & Verify Listing
          </div>
        `;

        // Wire popup click events with mobile autoPanPadding
        marker.bindPopup(popupContent, { 
          minWidth: 250, 
          maxWidth: 290,
          autoPanPadding: [20, 20],
          className: 'mobile-leaflet-popup'
        });

        marker.on('popupopen', () => {
          const renewBtn = document.getElementById(`renew-btn-${item.id}`);
          const takenBtn = document.getElementById(`taken-btn-${item.id}`);
          const claimLink = document.getElementById(`claim-link-${item.id}`);

          if (renewBtn) renewBtn.onclick = () => onRenewPinRef.current?.(item.id);
          if (takenBtn) takenBtn.onclick = () => onMarkTakenRef.current?.(item.id);
          if (claimLink) claimLink.onclick = () => onClaimClickRef.current?.(item);
        });
      }

      markersLayer.addLayer(marker);
    });
  }, [
    listings,
    selectedBHK,
    maxRent,
    isRiderMode,
  ]);

  return (
    <div className="relative w-full h-full flex-1">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Rider Mode Center Target Crosshair */}
      {isRiderMode && showCenterTarget && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[800] flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <span className="w-8 h-8 rounded-full border-2 border-sky-500 bg-sky-500/20 animate-ping absolute" />
            <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-2xl border-2 border-white">
              <MapPin className="w-5 h-5 fill-white text-sky-600" />
            </div>
          </div>
          <div className="bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 backdrop-blur-sm shadow-lg border border-slate-700 whitespace-nowrap">
            🎯 Pin Target
          </div>
        </div>
      )}
    </div>
  );
};
