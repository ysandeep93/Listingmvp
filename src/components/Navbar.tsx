import React, { useState, useEffect, useRef } from 'react';
import { BHKType, SearchResult } from '../types';
import { CITIES } from '../data/cities';
import { 
  Search, 
  Bike, 
  Server, 
  MapPin, 
  RotateCw,
  Home,
  SlidersHorizontal,
  X
} from 'lucide-react';

interface Props {
  selectedCity: string;
  onCityChange: (cityKey: string) => void;
  selectedBHK: BHKType | 'all';
  onBHKChange: (bhk: BHKType | 'all') => void;
  maxRent: number | null;
  onMaxRentChange: (rent: number | null) => void;
  onSearchSelect: (lat: number, lng: number, name: string) => void;
  onToggleRider: () => void;
  isRiderOpen: boolean;
  onOpenHostinger: () => void;
  onRefresh: () => void;
  activeCount: number;
}

export const Navbar: React.FC<Props> = ({
  selectedCity,
  onCityChange,
  selectedBHK,
  onBHKChange,
  maxRent,
  onMaxRentChange,
  onSearchSelect,
  onToggleRider,
  isRiderOpen,
  onOpenHostinger,
  onRefresh,
  activeCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search with Nominatim public API (respects 1 req/sec with 500ms debounce)
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const cityName = CITIES[selectedCity]?.name || 'Gurgaon';
        const query = encodeURIComponent(`${searchQuery.trim()} ${cityName}`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`
        );
        const data = await res.json();
        setSearchResults(data || []);
        setShowResults(true);
      } catch (err) {
        console.error('Nominatim error', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCity]);

  // Click outside listener for search results
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const bhkOptions: (BHKType | 'all')[] = ['all', '1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'];

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm z-[1000] relative">
      {/* Top Navigation Row */}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        {/* Brand & City Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1.5 font-black text-slate-900 tracking-tight text-sm sm:text-base">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
              <Home className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="font-extrabold tracking-tight text-slate-900">
              ToLet<span className="text-emerald-600">Map</span>
            </span>
            <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider hidden min-[360px]:inline">
              Live
            </span>
          </div>

          {/* City Selector */}
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold text-slate-800 text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer transition-colors max-w-[110px] sm:max-w-none"
          >
            {Object.entries(CITIES).map(([k, c]) => (
              <option key={k} value={k}>
                {c.name} {k === 'gurgaon' ? '🎯' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Search Bar (Hidden on mobile, placed below on mobile for clean touch ergonomics) */}
        <div className="relative flex-1 max-w-md hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${CITIES[selectedCity]?.name || 'Gurgaon'} sector, block, or landmark...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 3 && setShowResults(true)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-7 top-1/2 -translate-y-1/2">
                <RotateCw className="w-3 h-3 text-slate-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[2000] max-h-56 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={() => {
                    onSearchSelect(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
                    setShowResults(false);
                    setSearchQuery(result.display_name.split(',')[0]);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 flex items-start gap-2 text-slate-700"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="truncate">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Refresh count */}
          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            title={`Refresh feed (${activeCount} active vacancies)`}
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Rider App Toggle Button */}
          <button
            onClick={onToggleRider}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
              isRiderOpen
                ? 'bg-sky-600 text-white ring-2 ring-sky-400'
                : 'bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100'
            }`}
            title="Open Rider Field App"
          >
            <Bike className="w-4 h-4" />
            <span className="font-extrabold">Rider</span>
          </button>

          {/* Hostinger PHP Drawer Button */}
          <button
            onClick={onOpenHostinger}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all active:scale-95"
            title="Inspect Hostinger PHP & MySQL code"
          >
            <Server className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PHP</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Input (Visible on < md screens) */}
      <div className="px-3 pb-2 md:hidden">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${CITIES[selectedCity]?.name || 'Gurgaon'} sector or street...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 3 && setShowResults(true)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8.5 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isSearching && (
            <div className="absolute right-7 top-1/2 -translate-y-1/2">
              <RotateCw className="w-3 h-3 text-slate-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Mobile Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[2000] max-h-52 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => {
                  onSearchSelect(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
                  setShowResults(false);
                  setSearchQuery(result.display_name.split(',')[0]);
                }}
                className="w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 border-b border-slate-100 flex items-start gap-2 text-slate-700 active:bg-slate-100"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="truncate">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Horizontal Scrolling Quick Filter Bar (Works seamlessly on phones & desktops) */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0 pl-0.5 mr-1">
          <SlidersHorizontal className="w-3 h-3" />
          Filter:
        </span>

        {/* BHK Pill Buttons */}
        {bhkOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => onBHKChange(opt)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
              selectedBHK === opt
                ? 'bg-slate-900 text-white shadow-sm font-bold'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200'
            }`}
          >
            {opt === 'all' ? 'All BHK' : opt}
          </button>
        ))}

        {/* Max Rent Filter Pill */}
        <div className="shrink-0 pl-1">
          <select
            value={maxRent || ''}
            onChange={(e) => onMaxRentChange(e.target.value ? parseInt(e.target.value) : null)}
            className="bg-white border border-slate-300 text-xs font-semibold text-slate-700 rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-slate-400"
          >
            <option value="">Any Rent</option>
            <option value="15000">≤ ₹15k</option>
            <option value="25000">≤ ₹25k</option>
            <option value="40000">≤ ₹40k</option>
            <option value="60000">≤ ₹60k</option>
          </select>
        </div>
      </div>
    </header>
  );
};
