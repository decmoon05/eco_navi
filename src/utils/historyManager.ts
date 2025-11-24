import { Route, CarbonEmission, Location } from '../types';

export interface HistoryEntry {
  id: number;
  date: string;
  originName: string;
  destinationName: string;
  route: Route;
  emission: CarbonEmission;
}

const HISTORY_KEY = 'ecoNaviHistory';
const MAX_HISTORY_ITEMS = 50;

export const getHistory = (): HistoryEntry[] => {
  try {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    if (historyJson) {
      return JSON.parse(historyJson);
    }
  } catch (error) {
    console.error("Failed to parse history from localStorage", error);
    // If parsing fails, clear corrupted data
    localStorage.removeItem(HISTORY_KEY);
  }
  return [];
};

export const saveTrip = (route: Route, emission: CarbonEmission) => {
  if (!route || !emission) return;

  const newEntry: HistoryEntry = {
    id: Date.now(),
    date: new Date().toISOString(),
    originName: route.origin.name,
    destinationName: route.destination.name,
    route,
    emission,
  };

  try {
    const currentHistory = getHistory();
    const newHistory = [newEntry, ...currentHistory];
    
    // Keep the list at a manageable size
    if (newHistory.length > MAX_HISTORY_ITEMS) {
      newHistory.splice(MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error("Failed to save trip to localStorage", error);
  }
};
