/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Listing, BHKType } from './types';
import { INITIAL_LISTINGS } from './data/initialListings';
import { CITIES, DEFAULT_CITY } from './data/cities';
import { getFreshnessInfo } from './utils/dateUtils';
import { Navbar } from './components/Navbar';
import { MapComponent } from './components/MapComponent';
import { RiderDrawer } from './components/RiderDrawer';
import { OwnerClaimModal } from './components/OwnerClaimModal';
import { HostingerModal } from './components/HostingerModal';
import { FreshnessLegend } from './components/FreshnessLegend';
import { CheckCircle2, AlertCircle, Info, Bike, Navigation } from 'lucide-react';

export default function App() {
  const [listings, setListings] = useState<Listing[]>(() => {
    const saved = localStorage.getItem('tlm_listings_v1');
    if (saved) {
      try {
        const parsed: Listing[] = JSON.parse(saved);
        return parsed.map((item) => ({ ...item, photo_url: null }));
      } catch (e) {
        console.error('Failed to parse cached listings', e);
      }
    }
    return INITIAL_LISTINGS;
  });

  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem('tlm_city') || DEFAULT_CITY;
  });

  const [selectedBHK, setSelectedBHK] = useState<BHKType | 'all'>('all');
  const [maxRent, setMaxRent] = useState<number | null>(null);

  // Modals & Panels
  const [isRiderOpen, setIsRiderOpen] = useState(false);
  const [isRiderFormExpanded, setIsRiderFormExpanded] = useState(false);
  const [isHostingerOpen, setIsHostingerOpen] = useState(false);
  const [claimListing, setClaimListing] = useState<Listing | null>(null);

  // Map & Rider Interaction State
  const [selectedCoordsForRider, setSelectedCoordsForRider] = useState<{ lat: number; lng: number } | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [editingListingForRider, setEditingListingForRider] = useState<Listing | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync listings with localStorage
  useEffect(() => {
    localStorage.setItem('tlm_listings_v1', JSON.stringify(listings));
  }, [listings]);

  // Sync city selection
  const handleCityChange = (cityKey: string) => {
    setSelectedCity(cityKey);
    localStorage.setItem('tlm_city', cityKey);
    const city = CITIES[cityKey];
    if (city) {
      setFlyToLocation({ lat: city.lat, lng: city.lng, zoom: city.zoom });
    }
  };

  // Search selection handler
  const handleSearchSelect = (lat: number, lng: number) => {
    setFlyToLocation({ lat, lng, zoom: 16 });
  };

  // Renew pin freshness ("Still there")
  const handleRenewPin = (id: number) => {
    setListings((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            last_seen_at: new Date().toISOString(),
          };
        }
        return item;
      })
    );
    showToast('👍 Freshness renewed! This pin will stay active for 7 more days.');
  };

  // Mark pin as taken
  const handleMarkTaken = (id: number) => {
    setListings((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: 'taken',
          };
        }
        return item;
      })
    );
    showToast('❌ Marked as Taken. Thanks for keeping the vacancy map clean!', 'info');
  };

  // Save new or updated pin from Rider app
  const handleSaveListing = (listingData: Partial<Listing>) => {
    if (listingData.id) {
      // Update
      setListings((prev) =>
        prev.map((item) => (item.id === listingData.id ? ({ ...item, ...listingData } as Listing) : item))
      );
      showToast('✏️ Pin updated and refreshed on the map.');
    } else {
      // Create new
      const newListing: Listing = {
        id: Date.now(),
        lat: listingData.lat || 28.4595,
        lng: listingData.lng || 77.0266,
        bhk: listingData.bhk || '2 BHK',
        rent: listingData.rent || null,
        deposit: listingData.deposit || null,
        area: listingData.area || 'Gurgaon',
        house_no: listingData.house_no || null,
        notes: listingData.notes || null,
        photo_url: listingData.photo_url || null,
        status: 'available',
        source: 'rider',
        owner_verified: false,
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setListings((prev) => [newListing, ...prev]);
      showToast('🚴 ToLetMap pin dropped! Immediately live on public map.');
    }
    setEditingListingForRider(null);
    setSelectedCoordsForRider(null);
  };

  // Delete pin (soft delete)
  const handleDeleteListing = (id: number) => {
    setListings((prev) => prev.filter((item) => item.id !== id));
    setIsRiderFormExpanded(false);
    setEditingListingForRider(null);
    showToast('🗑️ Pin removed from vacancy map.');
  };

  // Owner Claim Success Handler
  const handleClaimSuccess = (updatedListing: Listing) => {
    setListings((prev) =>
      prev.map((item) => (item.id === updatedListing.id ? updatedListing : item))
    );
    showToast('✅ Verified Owner badge awarded! Freshness extended.');
  };

  // Locate User (Geolocation with smart fallback for iframe sandbox / permissions)
  const handleLocateUser = () => {
    const city = CITIES[selectedCity] || CITIES['gurgaon'];

    if (!('geolocation' in navigator)) {
      setFlyToLocation({ lat: city.lat, lng: city.lng, zoom: 15 });
      setSelectedCoordsForRider({ lat: city.lat, lng: city.lng });
      showToast(`📍 Geolocation not supported. Centered on ${city.name}.`, 'info');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFlyToLocation({ lat, lng, zoom: 16 });
        setSelectedCoordsForRider({ lat, lng });
        showToast('📍 Located your current street position.');
      },
      (err) => {
        // Fallback gracefully without scary error
        setFlyToLocation({ lat: city.lat, lng: city.lng, zoom: 15 });
        setSelectedCoordsForRider({ lat: city.lat, lng: city.lng });

        if (err.code === 1) {
          showToast(
            `📍 Preview iframe limits device GPS. Centered on ${city.name} — pan map or tap street to drop pin!`,
            'info'
          );
        } else {
          showToast(`📍 Centered on ${city.name}. Pan map or tap street to drop pin!`, 'info');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 60000,
      }
    );
  };

  // Fast forward 1 day (Simulation tool to demonstrate self-cleaning)
  const handleSimulateAging = () => {
    setListings((prev) =>
      prev.map((item) => {
        const currentDate = new Date(item.last_seen_at).getTime();
        // push date back 24 hours
        const newDate = new Date(currentDate - 24 * 3600 * 1000).toISOString();
        return {
          ...item,
          last_seen_at: newDate,
        };
      })
    );
    showToast('⏱️ Fast-forwarded 24 hours: see pins transition from green to amber and auto-expire after 7 days!', 'info');
  };

  // Handle map center changes from Leaflet safely
  const handleMapCenterChange = useCallback((center: { lat: number; lng: number }) => {
    setCurrentMapCenter((prev) => {
      if (prev && Math.abs(prev.lat - center.lat) < 0.00001 && Math.abs(prev.lng - center.lng) < 0.00001) {
        return prev;
      }
      return center;
    });
  }, []);

  // Calculate active freshness stats
  const activeAvailable = listings.filter((l) => l.status === 'available');
  const freshCount = activeAvailable.filter((l) => getFreshnessInfo(l.last_seen_at).isFresh).length;
  const amberCount = activeAvailable.filter((l) => getFreshnessInfo(l.last_seen_at).isAmber).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        selectedCity={selectedCity}
        onCityChange={handleCityChange}
        selectedBHK={selectedBHK}
        onBHKChange={setSelectedBHK}
        maxRent={maxRent}
        onMaxRentChange={setMaxRent}
        onSearchSelect={handleSearchSelect}
        onToggleRider={() => {
          if (!isRiderOpen) {
            setIsRiderOpen(true);
            setIsRiderFormExpanded(false);
            setEditingListingForRider(null);
            showToast('🚴 Rider Mode Active: Move map to target or tap any street to drop pin.', 'info');
          } else {
            setIsRiderOpen(false);
            setIsRiderFormExpanded(false);
          }
        }}
        isRiderOpen={isRiderOpen}
        onOpenHostinger={() => setIsHostingerOpen(true)}
        onRefresh={() => showToast('Map feed refreshed with latest street reports.')}
        activeCount={activeAvailable.length}
      />

      {/* Rider Mode Street Notification Banner */}
      {isRiderOpen && (
        <div className="bg-sky-600 text-white text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 flex items-center justify-between shadow-md z-[995] shrink-0">
          <div className="flex items-center gap-1.5 truncate pr-2">
            <Bike className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span className="font-semibold truncate">
              Rider Mode Active: Pan map to target or tap street to drop pin
            </span>
          </div>
          <button
            onClick={() => {
              setIsRiderOpen(false);
              setIsRiderFormExpanded(false);
            }}
            className="text-[10px] sm:text-[11px] underline hover:text-sky-100 font-bold shrink-0"
          >
            ✕ Exit
          </button>
        </div>
      )}

      {/* Main Map View */}
      <main className="flex-1 relative overflow-hidden">
        <MapComponent
          cityKey={selectedCity}
          listings={listings}
          selectedBHK={selectedBHK}
          maxRent={maxRent}
          onSelectListing={() => {}}
          onRenewPin={handleRenewPin}
          onMarkTaken={handleMarkTaken}
          onClaimClick={(listing) => setClaimListing(listing)}
          isRiderMode={isRiderOpen}
          onMapClickForRider={(coords) => {
            setSelectedCoordsForRider(coords);
            setEditingListingForRider(null);
            setIsRiderOpen(true);
            setIsRiderFormExpanded(true);
          }}
          onEditListingForRider={(listing) => {
            setEditingListingForRider(listing);
            setIsRiderOpen(true);
            setIsRiderFormExpanded(true);
          }}
          flyToLocation={flyToLocation}
          onMapCenterChange={handleMapCenterChange}
          showCenterTarget={isRiderOpen && !isRiderFormExpanded}
        />

        {/* Floating Quick Locate Me FAB (Hidden when rider dock is active to avoid overlap) */}
        {!isRiderOpen && (
          <button
            onClick={handleLocateUser}
            className="absolute bottom-16 right-3 sm:bottom-6 sm:right-6 z-[990] bg-white text-slate-800 hover:text-sky-600 p-3 sm:p-3.5 rounded-full shadow-2xl border border-slate-200 flex items-center justify-center transition active:scale-90 hover:shadow-sky-100"
            title="Locate my position on map"
          >
            <Navigation className="w-5 h-5 text-sky-600" />
          </button>
        )}

        {/* Freshness Stats Legend (Hidden when rider dock is active on mobile to avoid overlap) */}
        {!isRiderOpen && (
          <FreshnessLegend
            totalActive={activeAvailable.length}
            totalGreen={freshCount}
            totalAmber={amberCount}
            onSimulateAging={handleSimulateAging}
          />
        )}
      </main>

      {/* Rider Drawer Panel */}
      <RiderDrawer
        isOpen={isRiderOpen}
        onClose={() => {
          setIsRiderOpen(false);
          setIsRiderFormExpanded(false);
          setEditingListingForRider(null);
        }}
        selectedCoordinates={selectedCoordsForRider}
        editingListing={editingListingForRider}
        onSaveListing={handleSaveListing}
        onDeleteListing={handleDeleteListing}
        onLocateUser={handleLocateUser}
        currentMapCenter={currentMapCenter}
        selectedCityKey={selectedCity}
        onSelectQuickArea={(lat, lng, name) => {
          setFlyToLocation({ lat, lng, zoom: 16 });
          setSelectedCoordsForRider({ lat, lng });
          showToast(`📍 Jumped to ${name}`);
        }}
        isExpanded={isRiderFormExpanded}
        onToggleExpanded={(expanded) => setIsRiderFormExpanded(expanded)}
      />

      {/* Owner Claim Modal */}
      <OwnerClaimModal
        listing={claimListing}
        onClose={() => setClaimListing(null)}
        onClaimSuccess={handleClaimSuccess}
      />

      {/* Hostinger Code Viewer Modal */}
      <HostingerModal
        isOpen={isHostingerOpen}
        onClose={() => setIsHostingerOpen(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[3000] max-w-sm bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in text-xs font-semibold">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
