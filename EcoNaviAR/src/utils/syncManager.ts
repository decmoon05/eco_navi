import AsyncStorage from '@react-native-async-storage/async-storage';
import { Route, CarbonEmission } from '../types';
import { saveTripAPI } from '../services/api';
import { notifyAchievementUnlocked } from './notificationManager';
import { startAutoSync as startRequestQueueSync, stopAutoSync as stopRequestQueueSync } from './requestQueue';

export interface PendingTrip {
  id: string;
  route: Route;
  emission: CarbonEmission;
  timestamp: number;
  retryCount: number;
}

const PENDING_TRIPS_KEY = 'ecoNaviPendingTrips';
const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30000; // 30초마다 동기화 시도

/**
 * 오프라인 상태에서 저장된 이동 기록을 가져옵니다.
 */
export const getPendingTrips = async (): Promise<PendingTrip[]> => {
  try {
    const pendingJson = await AsyncStorage.getItem(PENDING_TRIPS_KEY);
    if (pendingJson) {
      return JSON.parse(pendingJson);
    }
  } catch (error) {
    console.error("Failed to parse pending trips from AsyncStorage", error);
    await AsyncStorage.removeItem(PENDING_TRIPS_KEY);
  }
  return [];
};

/**
 * 이동 기록을 서버(클라우드)에 직접 저장합니다. (랭킹, 리포트 등에 즉시 반영)
 * saveTripAPI는 이미 apiWithQueue를 사용하여 오프라인 시 자동으로 큐에 추가됩니다.
 */
export const saveTripWithSync = async (
  route: Route,
  emission: CarbonEmission
): Promise<{ success: boolean; message: string; newlyAchieved?: any[] }> => {
  try {
    // 서버(클라우드)에 직접 저장 (랭킹, 리포트에 즉시 반영)
    // saveTripAPI는 apiWithQueue를 사용하여 네트워크 오류 시 자동으로 큐에 추가됨
    const response = await saveTripAPI(route, emission);
    
    // 서버 응답에서 업적 정보 추출
    const newlyAchieved = response?.data?.newlyAchieved || [];
    
    // 업적 알림 표시
    if (newlyAchieved && newlyAchieved.length > 0) {
      for (const achievement of newlyAchieved) {
        await notifyAchievementUnlocked(achievement);
      }
    }
    
    console.log('[SyncManager] 이동 기록이 서버(클라우드)에 저장되었습니다.');
    return {
      success: true,
      message: '이동 기록이 저장되었습니다. 랭킹과 리포트에 반영됩니다.',
      newlyAchieved
    };
  } catch (error: any) {
    console.error('[SyncManager] 서버 저장 실패:', error);
    
    // 네트워크 오류인 경우 (apiWithQueue가 이미 큐에 추가했을 수 있음)
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                          error.code === 'ECONNREFUSED' || 
                          error.code === 'ENOTFOUND' ||
                          error.code === 'ETIMEDOUT' ||
                          error.code === 'ECONNABORTED' ||
                          error.message === 'Network Error' ||
                          error.message?.includes('Network request failed') ||
                          error.message?.includes('대기 큐에 추가');
    
    if (isNetworkError) {
      // apiWithQueue가 이미 요청 큐에 추가했을 수 있지만, 
      // 명시적으로 pending trips 큐에도 추가하여 확실히 처리
      const pendingTrip: PendingTrip = {
        id: Date.now().toString(),
        route,
        emission,
        timestamp: Date.now(),
        retryCount: 0
      };
      await addPendingTrip(pendingTrip);
      
      return {
        success: false,
        message: '네트워크 연결이 원활하지 않습니다. 오프라인 큐에 저장되었으며, 연결 시 자동으로 서버에 업로드되어 랭킹과 리포트에 반영됩니다.',
        newlyAchieved: []
      };
    }
    
    // 기타 오류 (인증 오류 등)는 그대로 전달
    throw error;
  }
};

/**
 * 오프라인 큐에 이동 기록을 추가합니다.
 */
const addPendingTrip = async (trip: PendingTrip): Promise<void> => {
  try {
    const pendingTrips = await getPendingTrips();
    pendingTrips.push(trip);
    await AsyncStorage.setItem(PENDING_TRIPS_KEY, JSON.stringify(pendingTrips));
  } catch (error) {
    console.error("Failed to add pending trip to AsyncStorage", error);
  }
};

/**
 * 오프라인 큐의 이동 기록을 서버에 동기화합니다.
 */
export const syncPendingTrips = async (): Promise<{ synced: number; failed: number }> => {
  const pendingTrips = await getPendingTrips();
  if (pendingTrips.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;
  const remainingTrips: PendingTrip[] = [];

  for (const trip of pendingTrips) {
    try {
      await saveTripAPI(trip.route, trip.emission);
      synced++;
    } catch (error: any) {
      // 재시도 횟수 증가
      trip.retryCount++;
      
      // 최대 재시도 횟수를 초과하지 않았으면 다시 큐에 추가
      if (trip.retryCount < MAX_RETRY_COUNT) {
        remainingTrips.push(trip);
      } else {
        // 최대 재시도 횟수 초과 시 실패로 처리
        console.error(`Failed to sync trip after ${MAX_RETRY_COUNT} retries:`, trip.id);
        failed++;
      }
    }
  }

  // 동기화 결과를 저장
  await AsyncStorage.setItem(PENDING_TRIPS_KEY, JSON.stringify(remainingTrips));

  return { synced, failed };
};

/**
 * 자동 동기화 비활성화 (일방향 동기화 정책: 클라우드 → 로컬만)
 * 로컬에서 클라우드로 보내는 동기화는 수행하지 않습니다.
 */
let syncInterval: NodeJS.Timeout | null = null;

export const startAutoSync = (): void => {
  // 일방향 동기화 정책: 로컬 → 클라우드 자동 동기화 비활성화
  // 클라우드에서 로컬로만 동기화하므로 자동 동기화 불필요
  console.log('[SyncManager] 일방향 동기화 정책: 로컬 → 클라우드 자동 동기화 비활성화됨');
};

export const stopAutoSync = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  // 범용 요청 큐 동기화 중지
  stopRequestQueueSync();
};

/**
 * 오프라인 큐의 이동 기록 개수를 가져옵니다.
 */
export const getPendingTripsCount = async (): Promise<number> => {
  const pendingTrips = await getPendingTrips();
  return pendingTrips.length;
};
