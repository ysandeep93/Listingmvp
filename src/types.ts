export type BHKType = '1 RK' | '1 BHK' | '2 BHK' | '3 BHK' | '4+ BHK';

export type ListingStatus = 'available' | 'taken' | 'removed';
export type ListingSource = 'rider' | 'owner';

export interface Listing {
  id: number;
  lat: number;
  lng: number;
  bhk: BHKType;
  rent: number | null; // monthly INR
  deposit: number | null; // INR
  area: string; // e.g. "Sector 14"
  house_no: string | null;
  notes: string | null;
  photo_url: string | null;
  status: ListingStatus;
  source: ListingSource;
  owner_verified: boolean;
  last_seen_at: string; // ISO date string
  created_at: string;
  // Computed client-side
  days_ago?: number;
}

export interface CityConfig {
  key: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
}

export interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}
