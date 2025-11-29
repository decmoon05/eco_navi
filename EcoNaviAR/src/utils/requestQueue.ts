import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 범용 API 요청 대기 큐 시스템
 * 모든 API 호출을 오프라인 상태에서도 대기시키고 자동으로 재시도
 */

export type RequestType = 
  | 'saveTrip'
  | 'updateProfile'
  | 'setGoal'
  | 'updateVehicle'
  | 'claimQuestReward'
  | 'exchangeProduct'
  | 'refreshUser';

export interface QueuedRequest {
  id: string;
  type: RequestType;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  priority: number; // 높을수록 우선순위 높음 (1-10)
}

const QUEUE_KEY = 'ecoNaviRequestQueue';
const MAX_RETRY_COUNT = 5;
const SYNC_INTERVAL = 30000; // 30초마다 동기화 시도
const BASE_RETRY_DELAY = 1000; // 1초

/**
 * 대기 중인 요청 목록 가져오기
 */
export const getQueuedRequests = async (): Promise<QueuedRequest[]> => {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    if (queueJson) {
      const requests = JSON.parse(queueJson);
      // 우선순위와 타임스탬프로 정렬 (우선순위 높은 것, 오래된 것 먼저)
      return requests.sort((a: QueuedRequest, b: QueuedRequest) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });
    }
  } catch (error) {
    console.error("Failed to parse request queue from AsyncStorage", error);
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
  return [];
};

/**
 * 요청을 대기 큐에 추가
 */
export const queueRequest = async (
  type: RequestType,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: any,
  headers?: Record<string, string>,
  priority: number = 5
): Promise<string> => {
  const request: QueuedRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    endpoint,
    method,
    data,
    headers,
    timestamp: Date.now(),
    retryCount: 0,
    priority,
  };

  try {
    const queue = await getQueuedRequests();
    queue.push(request);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[RequestQueue] 요청이 큐에 추가됨: ${type} (${request.id})`);
    return request.id;
  } catch (error) {
    console.error("Failed to add request to queue", error);
    throw error;
  }
};

/**
 * 대기 중인 요청 개수 가져오기
 */
export const getQueuedRequestsCount = async (): Promise<number> => {
  const queue = await getQueuedRequests();
  return queue.length;
};

/**
 * 특정 요청을 큐에서 제거
 */
export const removeQueuedRequest = async (requestId: string): Promise<void> => {
  try {
    const queue = await getQueuedRequests();
    const filtered = queue.filter((req: QueuedRequest) => req.id !== requestId);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove request from queue", error);
  }
};

/**
 * 큐의 모든 요청 제거
 */
export const clearQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (error) {
    console.error("Failed to clear queue", error);
  }
};

/**
 * 지수 백오프로 재시도 지연 시간 계산
 */
const getRetryDelay = (retryCount: number): number => {
  return BASE_RETRY_DELAY * Math.pow(2, retryCount);
};

/**
 * API 요청 실행 (axios 사용)
 */
const executeRequest = async (request: QueuedRequest): Promise<boolean> => {
  try {
    const axios = (await import('axios')).default;
    const { getApiUrl } = await import('../config/api');
    const baseURL = await getApiUrl();
    const url = `${baseURL}${request.endpoint}`;

    const config: any = {
      method: request.method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
      timeout: 10000,
    };

    if (request.data && (request.method === 'POST' || request.method === 'PUT')) {
      config.data = request.data;
    }

    const response = await axios(config);
    
    // 성공
    return true;
  } catch (error: any) {
    // 4xx 오류는 재시도하지 않음 (클라이언트 오류)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      console.warn(`[RequestQueue] 클라이언트 오류로 재시도하지 않음: ${error.response.status}`);
      return false;
    }

    const isNetworkError = 
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      error.message?.includes('Network request failed');

    if (!isNetworkError) {
      // 네트워크 오류가 아니면 재시도하지 않음
      console.warn(`[RequestQueue] 네트워크 오류가 아니므로 재시도하지 않음:`, error);
      return false;
    }

    throw error; // 네트워크 오류는 재시도
  }
};

/**
 * 대기 중인 요청들을 동기화
 */
export const syncQueuedRequests = async (): Promise<{ synced: number; failed: number; remaining: number }> => {
  const queue = await getQueuedRequests();
  if (queue.length === 0) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  let synced = 0;
  let failed = 0;
  const remaining: QueuedRequest[] = [];

  console.log(`[RequestQueue] ${queue.length}개의 대기 중인 요청 동기화 시작...`);

  for (const request of queue) {
    try {
      const success = await executeRequest(request);
      
      if (success) {
        synced++;
        console.log(`[RequestQueue] 요청 성공: ${request.type} (${request.id})`);
      } else {
        // 클라이언트 오류 등으로 재시도하지 않음
        failed++;
        console.warn(`[RequestQueue] 요청 실패 (재시도 안 함): ${request.type} (${request.id})`);
      }
    } catch (error: any) {
      // 재시도 횟수 증가
      request.retryCount++;
      
      // 최대 재시도 횟수를 초과하지 않았으면 다시 큐에 추가
      if (request.retryCount < MAX_RETRY_COUNT) {
        // 지수 백오프로 다음 재시도까지 대기
        const delay = getRetryDelay(request.retryCount);
        request.timestamp = Date.now() + delay; // 다음 재시도 시간 업데이트
        remaining.push(request);
        console.log(`[RequestQueue] 요청 재시도 예약: ${request.type} (${request.id}), ${request.retryCount}/${MAX_RETRY_COUNT}, ${delay}ms 후`);
      } else {
        // 최대 재시도 횟수 초과 시 실패로 처리
        console.error(`[RequestQueue] 요청 최대 재시도 횟수 초과: ${request.type} (${request.id})`);
        failed++;
      }
    }
  }

  // 동기화 결과를 저장
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));

  if (synced > 0 || failed > 0) {
    console.log(`[RequestQueue] 동기화 완료: 성공 ${synced}개, 실패 ${failed}개, 대기 중 ${remaining.length}개`);
  }

  return { synced, failed, remaining: remaining.length };
};

/**
 * 자동 동기화 비활성화 (일방향 동기화 정책: 클라우드 → 로컬만)
 * 로컬에서 클라우드로 보내는 요청 큐 동기화는 수행하지 않습니다.
 */
let syncInterval: NodeJS.Timeout | null = null;

export const startAutoSync = (): void => {
  // 일방향 동기화 정책: 로컬 → 클라우드 자동 동기화 비활성화
  console.log('[RequestQueue] 일방향 동기화 정책: 로컬 → 클라우드 자동 동기화 비활성화됨');
};

/**
 * 자동 동기화 중지
 */
export const stopAutoSync = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[RequestQueue] 자동 동기화 중지');
  }
};

/**
 * 네트워크 상태 확인 (간단한 방법)
 */
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const { getApiUrl } = await import('../config/api');
    const baseURL = await getApiUrl();
    const response = await fetch(`${baseURL}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3초 타임아웃
    });
    return response.ok;
  } catch {
    return false;
  }
};

