import { CityConfig } from '../types';

export const CITIES: Record<string, CityConfig> = {
  gurgaon: { key: 'gurgaon', name: 'Gurgaon', lat: 28.4595, lng: 77.0266, zoom: 14 },
  bengaluru: { key: 'bengaluru', name: 'Bengaluru', lat: 12.9716, lng: 77.5946, zoom: 12 },
  mumbai: { key: 'mumbai', name: 'Mumbai', lat: 19.076, lng: 72.8777, zoom: 11 },
  delhi: { key: 'delhi', name: 'Delhi', lat: 28.6139, lng: 77.209, zoom: 11 },
  hyderabad: { key: 'hyderabad', name: 'Hyderabad', lat: 17.385, lng: 78.4867, zoom: 12 },
  chennai: { key: 'chennai', name: 'Chennai', lat: 13.0827, lng: 80.2707, zoom: 12 },
  pune: { key: 'pune', name: 'Pune', lat: 18.5204, lng: 73.8567, zoom: 12 },
  kolkata: { key: 'kolkata', name: 'Kolkata', lat: 22.5726, lng: 88.3639, zoom: 12 },
  jaipur: { key: 'jaipur', name: 'Jaipur', lat: 26.9124, lng: 75.7873, zoom: 12 },
  ahmedabad: { key: 'ahmedabad', name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, zoom: 12 },
  kochi: { key: 'kochi', name: 'Kochi', lat: 9.9312, lng: 76.2673, zoom: 12 },
};

export const DEFAULT_CITY = 'gurgaon';
