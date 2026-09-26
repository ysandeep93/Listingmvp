import React, { useState, useEffect } from 'react';
import { Listing, BHKType } from '../types';
import { 
  Bike, 
  X, 
  MapPin, 
  Trash2, 
  Navigation, 
  Target, 
  Lock, 
  ChevronDown,
  ChevronUp,
  Compass,
  Check
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCoordinates: { lat: number; lng: number } | null;
  editingListing: Listing | null;
  onSaveListing: (listing: Partial<Listing>) => void;
  onDeleteListing: (id: number) => void;
  onLocateUser: () => void;
  currentMapCenter?: { lat: number; lng: number } | null;
  selectedCityKey?: string;
  onSelectQuickArea?: (lat: number, lng: number, name: string) => void;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

const CITY_SECTORS: Record<string, { name: string; area: string; lat: number; lng: number }[]> = {
  gurgaon: [
    { name: 'DLF Ph 3', area: 'DLF Phase 3 (U/V Block)', lat: 28.4912, lng: 77.0995 },
    { name: 'Sec 14', area: 'Sector 14', lat: 28.4712, lng: 77.0425 },
    { name: 'Sec 45', area: 'Sector 45 (Near Metro)', lat: 28.4412, lng: 77.0715 },
    { name: 'Sec 56', area: 'Sector 56 (Golf Course Ext)', lat: 28.4231, lng: 77.1042 },
    { name: 'Sec 23', area: 'Sector 23 (Palam Vihar)', lat: 28.5085, lng: 77.0492 },
    { name: 'Sushant Lok', area: 'Sushant Lok Phase 1', lat: 28.4611, lng: 77.0856 },
  ],
  bengaluru: [
    { name: 'Koramangala', area: 'Koramangala 4th Block', lat: 12.9352, lng: 77.6245 },
    { name: 'Indiranagar', area: 'Indiranagar 100ft Rd', lat: 12.9784, lng: 77.6408 },
    { name: 'HSR Layout', area: 'HSR Layout Sector 1', lat: 12.9121, lng: 77.6446 },
    { name: 'Whitefield', area: 'Whitefield Main Rd', lat: 12.9698, lng: 77.7499 },
  ],
};

export const RiderDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedCoordinates,
  editingListing,
  onSaveListing,
  onDeleteListing,
  onLocateUser,
  currentMapCenter,
  selectedCityKey = 'gurgaon',
  onSelectQuickArea,
  isExpanded,
  onToggleExpanded,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('tlm_rider_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Form State
  const [bhk, setBhk] = useState<BHKType>('2 BHK');
  const [rent, setRent] = useState<string>('');
  const [deposit, setDeposit] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [houseNo, setHouseNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lat, setLat] = useState<number>(28.4595);
  const [lng, setLng] = useState<number>(77.0266);
  const [showCoordInputs, setShowCoordInputs] = useState(false);

  // Sync state when editing listing or coordinates change
  useEffect(() => {
    if (editingListing) {
      setBhk(editingListing.bhk);
      setRent(editingListing.rent?.toString() || '');
      setDeposit(editingListing.deposit?.toString() || '');
      setArea(editingListing.area);
      setHouseNo(editingListing.house_no || '');
      setNotes(editingListing.notes || '');
      setLat(editingListing.lat);
      setLng(editingListing.lng);
    } else if (selectedCoordinates) {
      setLat(selectedCoordinates.lat);
      setLng(selectedCoordinates.lng);
    }
  }, [editingListing, selectedCoordinates]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'rider_gurgaon_2026' || passwordInput === 'rider') {
      setIsAuthenticated(true);
      localStorage.setItem('tlm_rider_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Invalid password. Demo password: rider_gurgaon_2026');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('tlm_rider_auth');
  };

  const handleDropHere = () => {
    // Target either explicitly selected coords or map center
    const targetLat = selectedCoordinates?.lat || currentMapCenter?.lat || lat;
    const targetLng = selectedCoordinates?.lng || currentMapCenter?.lng || lng;
    setLat(targetLat);
    setLng(targetLng);
    if (!area) {
      setArea(selectedCityKey === 'gurgaon' ? 'Gurgaon' : '');
    }
    onToggleExpanded(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!area.trim()) {
      alert('Area / Sector is required.');
      return;
    }

    onSaveListing({
      id: editingListing?.id,
      lat,
      lng,
      bhk,
      rent: rent ? parseInt(rent) : null,
      deposit: deposit ? parseInt(deposit) : null,
      area: area.trim(),
      house_no: houseNo.trim() || null,
      notes: notes.trim() || null,
      photo_url: null,
      status: 'available',
      source: 'rider',
      owner_verified: editingListing?.owner_verified || false,
      last_seen_at: new Date().toISOString(),
    });

    // Reset fields & collapse so rider can see the pin dropped on map
    setRent('');
    setDeposit('');
    setHouseNo('');
    setNotes('');
    onToggleExpanded(false);
  };

  const quickSectors = CITY_SECTORS[selectedCityKey] || CITY_SECTORS['gurgaon'];
  const activeLat = (selectedCoordinates?.lat || currentMapCenter?.lat || lat).toFixed(4);
  const activeLng = (selectedCoordinates?.lng || currentMapCenter?.lng || lng).toFixed(4);

  // 1. Unauthenticated Login Modal
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-500 rounded-lg text-white">
                <Bike className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm">Rider Field Login</span>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 text-center">
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Rider Unlock</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter password to drop and update ToLetMap vacancy pins.
            </p>

            <form onSubmit={handleLogin} className="space-y-3">
              {authError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  {authError}
                </div>
              )}
              <input
                type="password"
                placeholder="Enter Rider Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:border-sky-500"
                autoFocus
              />
              <div className="bg-sky-50 text-sky-800 text-[11px] p-2 rounded-lg text-left">
                🔑 Demo Password: <strong>rider_gurgaon_2026</strong>
              </div>
              <button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95"
              >
                Unlock Rider Tool
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. Minimized Street Mode: Sleek Floating Bottom Dock (Map remains 100% visible & interactive!)
  if (!isExpanded) {
    return (
      <div className="fixed inset-x-3 bottom-3 sm:bottom-4 sm:left-auto sm:right-4 sm:w-96 z-[1200] bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 p-3 flex flex-col gap-2.5 backdrop-blur-md animate-slide-up">
        {/* Dock Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
            </span>
            <span className="font-extrabold text-white tracking-tight flex items-center gap-1">
              <Bike className="w-3.5 h-3.5 text-sky-400" />
              Rider Street Mode
            </span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              {activeLat}, {activeLng}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              className="p-1 text-slate-400 hover:text-white"
              title="Lock Rider Tool"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white"
              title="Exit Rider Mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDropHere}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
          >
            <MapPin className="w-4 h-4" />
            <span>📍 Drop Pin Here</span>
          </button>

          <button
            onClick={onLocateUser}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-700 active:scale-95 transition-all"
            title="Locate my position on map"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
            <span>Locate</span>
          </button>

          <button
            onClick={() => onToggleExpanded(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl border border-slate-700 active:scale-95 transition-all"
            title="Open Details Form"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Area Jump Chips (Instant teleport for rider) */}
        {quickSectors && quickSectors.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">
              Sector:
            </span>
            {quickSectors.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  if (onSelectQuickArea) {
                    onSelectQuickArea(s.lat, s.lng, s.area);
                  }
                  setArea(s.area);
                  setLat(s.lat);
                  setLng(s.lng);
                }}
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 border border-slate-700 active:scale-95 transition-all"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Expanded Full Form Sheet (Allows entry of BHK, Rent, Deposit, House No, Notes)
  return (
    <div className="fixed inset-x-0 bottom-0 max-h-[85vh] sm:max-h-none sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-md z-[1500] bg-white shadow-2xl flex flex-col rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-slate-200 animate-slide-up">
      {/* Minimize / View Map Tap Handle */}
      <button
        onClick={() => onToggleExpanded(false)}
        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-600 transition-colors shrink-0"
      >
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        <span>Minimize to View Map</span>
      </button>

      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-500 rounded-lg text-white">
            <Bike className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold">
                {editingListing ? `✏️ Edit Pin #${editingListing.id}` : '📍 Drop Street Board Pin'}
              </h2>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Target: {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleExpanded(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg text-xs flex items-center gap-0.5 bg-slate-800"
            title="Minimize form to see map"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            title="Exit Rider Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Quick Location Helpers Bar */}
        <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={onLocateUser}
            className="flex items-center gap-1 bg-white border border-slate-300 px-2.5 py-1 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition active:scale-95 text-[11px]"
          >
            <Navigation className="w-3 h-3 text-sky-600" />
            📍 Locate Me
          </button>

          <button
            type="button"
            onClick={() => setShowCoordInputs(!showCoordInputs)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg"
          >
            <Target className="w-3 h-3 text-emerald-600" />
            <span>{showCoordInputs ? 'Hide Coords' : '🎯 Edit Coords'}</span>
          </button>
        </div>

        {/* Manual Coords Input (if toggled) */}
        {showCoordInputs && (
          <div className="bg-amber-50 p-2.5 border-b border-amber-200 text-xs flex gap-2 shrink-0">
            <div className="flex-1">
              <span className="block text-[10px] font-bold text-amber-800">Latitude</span>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || lat)}
                className="w-full px-2 py-1 bg-white border border-amber-300 rounded text-xs"
              />
            </div>
            <div className="flex-1">
              <span className="block text-[10px] font-bold text-amber-800">Longitude</span>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || lng)}
                className="w-full px-2 py-1 bg-white border border-amber-300 rounded text-xs"
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                BHK Type *
              </label>
              <select
                value={bhk}
                onChange={(e) => setBhk(e.target.value as BHKType)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-white text-xs outline-none focus:border-sky-500"
              >
                <option value="1 RK">1 RK</option>
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="4+ BHK">4+ BHK</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Monthly Rent (₹)
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 24000"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-sky-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Deposit (₹)
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 24000"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-sky-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                House / Plot No.
              </label>
              <input
                type="text"
                placeholder="e.g. 421 / Plot 18"
                value={houseNo}
                onChange={(e) => setHouseNo(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-sky-500 text-xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Area / Sector / Street *
              </label>
              {quickSectors && quickSectors.length > 0 && (
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  {quickSectors.slice(0, 3).map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        setArea(s.area);
                        setLat(s.lat);
                        setLng(s.lng);
                      }}
                      className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold"
                    >
                      +{s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. Sector 14 / DLF Phase 3"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-sky-500 font-semibold text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Street & Board Notes
            </label>
            <textarea
              rows={2}
              placeholder="Board details (e.g. yellow metal board on 1st floor balcony, family only, park facing)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500 resize-none text-xs"
            />
          </div>

          <div className="pt-2 flex gap-2 pb-6 sm:pb-2">
            {editingListing && (
              <button
                type="button"
                onClick={() => onDeleteListing(editingListing.id)}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-3 rounded-xl font-bold flex items-center gap-1.5 transition-colors active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {editingListing ? 'Update Board Pin' : 'Save Street Pin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
