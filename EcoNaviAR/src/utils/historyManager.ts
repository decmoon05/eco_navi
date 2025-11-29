import AsyncStorage from '@react-native-async-storage/async-storage';
import { Route, CarbonEmission, Location } from '../types';

export interface HistoryEntry {
  id: number;
  date: string;
  originName: string;
  destinationName: string;
  route: Route;
  emission: CarbonEmission;
}

const HISTORY_KEY_PREFIX = 'ecoNaviHistory_';
const MAX_HISTORY_ITEMS = 50;

// 유저 ID를 기반으로 히스토리 키 생성
const getHistoryKey = (userId: number | null): string => {
  if (userId) {
    return `${HISTORY_KEY_PREFIX}${userId}`;
  }
  // 로그인하지 않은 경우 기본 키 사용 (마이그레이션용)
  return `${HISTORY_KEY_PREFIX}guest`;
};

export const getHistory = async (userId: number | null = null): Promise<HistoryEntry[]> => {
  try {
    const key = getHistoryKey(userId);
    const historyJson = await AsyncStorage.getItem(key);
    if (historyJson) {
      const parsed = JSON.parse(historyJson);
      // 배열인지 확인
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // 배열이 아니면 빈 배열 반환하고 저장소 정리
      await AsyncStorage.removeItem(key);
      return [];
    }
  } catch (error) {
    console.error("Failed to parse history from AsyncStorage", error);
    // If parsing fails, clear corrupted data
    try {
      const key = getHistoryKey(userId);
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error("Failed to clear corrupted history", e);
    }
  }
  return [];
};

export const saveTrip = async (route: Route, emission: CarbonEmission, userId: number | null = null) => {
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
    const key = getHistoryKey(userId);
    const currentHistory = await getHistory(userId);
    const newHistory = [newEntry, ...currentHistory];
    
    // Keep the list at a manageable size
    if (newHistory.length > MAX_HISTORY_ITEMS) {
      newHistory.splice(MAX_HISTORY_ITEMS);
    }

    await AsyncStorage.setItem(key, JSON.stringify(newHistory));
  } catch (error) {
    console.error("Failed to save trip to AsyncStorage", error);
  }
};

// 특정 사용자의 히스토리 클리어
export const clearHistory = async (userId: number | null = null) => {
  try {
    const key = getHistoryKey(userId);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear history from AsyncStorage", error);
  }
};
