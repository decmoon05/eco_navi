import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location, RouteData } from '../types';

export interface SearchHistoryEntry {
  id: number;
  searchTime: string; // 검색한 시간
  origin: Location;
  destination: Location;
  transportMode: string;
  // routesData는 너무 커서 저장하지 않음 (필요시 다시 검색)
}

const SEARCH_HISTORY_KEY_PREFIX = 'ecoNaviSearchHistory_';
const MAX_SEARCH_HISTORY_ITEMS = 20;

// 유저 ID를 기반으로 검색 기록 키 생성
const getSearchHistoryKey = (userId: number | null): string => {
  if (userId) {
    return `${SEARCH_HISTORY_KEY_PREFIX}${userId}`;
  }
  // 로그인하지 않은 경우 기본 키 사용 (마이그레이션용)
  return `${SEARCH_HISTORY_KEY_PREFIX}guest`;
};

export const getSearchHistory = async (userId: number | null = null): Promise<SearchHistoryEntry[]> => {
  try {
    const key = getSearchHistoryKey(userId);
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
  } catch (error: any) {
    console.error("Failed to parse search history from AsyncStorage", error);
    // "Row too big" 오류인 경우 데이터 삭제
    if (error?.message?.includes('too big') || error?.message?.includes('CursorWindow')) {
      try {
        const key = getSearchHistoryKey(userId);
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.error("Failed to clear corrupted search history", e);
      }
    }
  }
  return [];
};

export const saveSearchHistory = async (
  origin: Location,
  destination: Location,
  transportMode: string,
  routesData?: { [key: string]: RouteData }, // 선택적 (사용하지 않음)
  userId: number | null = null
) => {
  if (!origin || !destination) return;

  const newEntry: SearchHistoryEntry = {
    id: Date.now(),
    searchTime: new Date().toISOString(),
    origin,
    destination,
    transportMode,
  };

  try {
    const key = getSearchHistoryKey(userId);
    const currentHistory = await getSearchHistory(userId);
    // 중복 검색 제거 (같은 출발지/도착지/수단이면 최신 것으로 교체)
    const filteredHistory = currentHistory.filter(
      entry => !(
        entry.origin.lat === origin.lat &&
        entry.origin.lng === origin.lng &&
        entry.destination.lat === destination.lat &&
        entry.destination.lng === destination.lng &&
        entry.transportMode === transportMode
      )
    );
    const newHistory = [newEntry, ...filteredHistory];
    
    // 최대 개수 제한
    if (newHistory.length > MAX_SEARCH_HISTORY_ITEMS) {
      newHistory.splice(MAX_SEARCH_HISTORY_ITEMS);
    }

    // 데이터 크기 제한을 위해 JSON 크기 확인
    const historyJson = JSON.stringify(newHistory);
    if (historyJson.length > 1000000) { // 1MB 제한
      // 오래된 항목 제거
      const trimmedHistory = newHistory.slice(0, Math.floor(MAX_SEARCH_HISTORY_ITEMS / 2));
      await AsyncStorage.setItem(key, JSON.stringify(trimmedHistory));
    } else {
      await AsyncStorage.setItem(key, historyJson);
    }
  } catch (error) {
    console.error("Failed to save search history to AsyncStorage", error);
    // 저장 실패 시 오래된 데이터 삭제 시도
    try {
      const key = getSearchHistoryKey(userId);
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error("Failed to clear corrupted search history", e);
    }
  }
};

export const deleteSearchHistory = async (id: number, userId: number | null = null) => {
  try {
    const key = getSearchHistoryKey(userId);
    const currentHistory = await getSearchHistory(userId);
    const newHistory = currentHistory.filter(entry => entry.id !== id);
    await AsyncStorage.setItem(key, JSON.stringify(newHistory));
  } catch (error) {
    console.error("Failed to delete search history from AsyncStorage", error);
  }
};

export const clearSearchHistory = async (userId: number | null = null) => {
  try {
    const key = getSearchHistoryKey(userId);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear search history from AsyncStorage", error);
  }
};

