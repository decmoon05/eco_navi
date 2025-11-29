import { queueRequest, RequestType } from './requestQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API 호출을 래핑하여 네트워크 오류 시 자동으로 대기 큐에 추가
 */

interface QueueOptions {
  priority?: number; // 1-10, 기본값 5
  skipQueue?: boolean; // true면 큐에 추가하지 않음
}

/**
 * API 호출을 실행하고 실패 시 큐에 추가
 */
export const callAPIWithQueue = async <T>(
  apiCall: () => Promise<T>,
  type: RequestType,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: any,
  options: QueueOptions = {}
): Promise<T> => {
  const { priority = 5, skipQueue = false } = options;

  try {
    // 먼저 API 호출 시도
    return await apiCall();
  } catch (error: any) {
    const isNetworkError = 
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      error.message?.includes('Network request failed');

    // 네트워크 오류이고 큐에 추가하도록 설정된 경우
    if (isNetworkError && !skipQueue) {
      console.log(`[APIWithQueue] 네트워크 오류로 큐에 추가: ${type}`);
      
      // 토큰 가져오기
      let token: string | null = null;
      try {
        token = await AsyncStorage.getItem('token');
      } catch (e) {
        console.error("Failed to get token for queued request", e);
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // 큐에 추가
      await queueRequest(type, endpoint, method, data, headers, priority);
      
      // 오류를 다시 던져서 호출한 쪽에서 처리할 수 있도록 함
      throw new Error('네트워크 오류로 인해 요청이 대기 큐에 추가되었습니다. 연결이 복구되면 자동으로 처리됩니다.');
    }

    // 네트워크 오류가 아니거나 큐에 추가하지 않는 경우 원래 오류를 던짐
    throw error;
  }
};



