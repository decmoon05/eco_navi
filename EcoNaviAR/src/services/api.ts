import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Route, CarbonEmission } from '../types';
import { getApiUrl } from '../config/api';

// 동적 baseURL을 위한 axios 인스턴스 생성 함수
const createApiClient = async () => {
  const baseURL = await getApiUrl();
  return axios.create({ baseURL });
};

// 기본 apiClient (초기화 시 사용)
let apiClient = axios.create({
  baseURL: 'http://10.0.2.2:3001', // 기본값 (초기 로드 시)
  timeout: 10000, // 10초 타임아웃
});

// baseURL 업데이트 함수
export const updateApiBaseURL = async () => {
  const baseURL = await getApiUrl();
  apiClient.defaults.baseURL = baseURL;
  apiClient.defaults.timeout = 10000; // 타임아웃 설정
  console.log('[API] Base URL updated to:', baseURL);
  
  // 네트워크 연결 테스트 (선택적)
  try {
    const testResponse = await apiClient.get('/health', { timeout: 5000 }).catch(() => null);
    if (testResponse) {
      console.log('[API] 서버 연결 확인 성공');
    } else {
      console.warn('[API] 서버 연결 확인 실패 (서버가 실행 중이지 않을 수 있습니다)');
    }
  } catch (e: any) {
    // /health 엔드포인트가 없을 수 있으므로 무시
    if (e.code !== 'ECONNABORTED' && e.code !== 'ERR_NETWORK') {
      console.warn('[API] 서버 연결 확인 중 오류:', e.message);
    }
  }
};

// 초기화 시 baseURL 업데이트
updateApiBaseURL();

// 요청 인터셉터를 사용하여 모든 요청에 JWT 토큰과 최신 baseURL을 추가
apiClient.interceptors.request.use(async (config) => {
  try {
    // 매 요청마다 최신 baseURL 확인 (비동기 업데이트 대응)
    const currentBaseURL = await getApiUrl();
    
    // apiClient의 baseURL도 업데이트 (다음 요청을 위해)
    if (apiClient.defaults.baseURL !== currentBaseURL) {
      apiClient.defaults.baseURL = currentBaseURL;
      console.log('[API] Interceptor: Base URL updated to:', currentBaseURL);
    }
    
    // config.baseURL을 직접 설정하여 이 요청에 즉시 적용
    config.baseURL = currentBaseURL;
    
    // apiClient.defaults.baseURL도 업데이트 (다음 요청을 위해)
    if (currentBaseURL !== apiClient.defaults.baseURL) {
      apiClient.defaults.baseURL = currentBaseURL;
      console.log('[API] Base URL 동적 업데이트:', currentBaseURL);
    }
    
    // JWT 토큰 추가
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error("Failed to get token or baseURL from storage for API request", e);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const saveTripAPI = async (route: Route, emission: CarbonEmission) => {
  const { callAPIWithQueue } = await import('../utils/apiWithQueue');
  return callAPIWithQueue(
    () => apiClient.post('/trips', { route, emission }),
    'saveTrip',
    '/trips',
    'POST',
    { route, emission },
    { priority: 5 } // 이동 기록은 기본 우선순위
  );
};

export const getTripsAPI = () => {
  return apiClient.get('/trips');
};

export const getMeAPI = () => {
  return apiClient.get('/me');
};

export const setGoalAPI = async (monthly_goal: number) => {
  const { callAPIWithQueue } = await import('../utils/apiWithQueue');
  return callAPIWithQueue(
    () => apiClient.post('/goal', { monthly_goal }),
    'setGoal',
    '/goal',
    'POST',
    { monthly_goal },
    { priority: 7 } // 목표 설정은 높은 우선순위
  );
};

export const getAchievementsAPI = () => {
  return apiClient.get('/achievements');
};

export const getRankingAPI = () => {
  return apiClient.get('/ranking');
};

export const exchangeProductAPI = async (productId: number) => {
  const { callAPIWithQueue } = await import('../utils/apiWithQueue');
  return callAPIWithQueue(
    () => apiClient.post(`/products/${productId}/exchange`),
    'exchangeProduct',
    `/products/${productId}/exchange`,
    'POST',
    undefined,
    { priority: 9 } // 상품 교환은 매우 높은 우선순위
  );
};

export const getProductsAPI = () => {
  return apiClient.get('/products');
};

export const getReportAPI = (year: number, month: number) => {
  return apiClient.get(`/reports/${year}/${month}`);
};

export const getQuestsAPI = () => {
  return apiClient.get('/quests');
};

export const claimQuestRewardAPI = async (questId: string) => {
  const { callAPIWithQueue } = await import('../utils/apiWithQueue');
  return callAPIWithQueue(
    () => apiClient.post(`/quests/${questId}/reward`),
    'claimQuestReward',
    `/quests/${questId}/reward`,
    'POST',
    undefined,
    { priority: 8 } // 퀘스트 보상은 높은 우선순위
  );
};

export const updateVehicleTypeAPI = async (vehicleType: 'car' | 'electric_car' | 'hybrid' | 'hydrogen' | 'motorcycle' | 'electric_motorcycle') => {
  const { callAPIWithQueue } = await import('../utils/apiWithQueue');
  return callAPIWithQueue(
    () => apiClient.post('/me/vehicle', { vehicleType }),
    'updateVehicle',
    '/me/vehicle',
    'POST',
    { vehicleType },
    { priority: 6 }
  );
};

// 로그인 API
export const loginAPI = (username: string, password: string) => {
  return apiClient.post('/login', { username, password });
};

// 회원가입 API
export const registerAPI = (username: string, password: string) => {
  return apiClient.post('/register', { username, password });
};

// 비밀번호 재설정 요청 API (사용자 이름 확인)
export const requestPasswordResetAPI = (username: string) => {
  return apiClient.post('/password/reset-request', { username });
};

// 비밀번호 재설정 API (토큰과 새 비밀번호)
export const resetPasswordAPI = (resetToken: string, newPassword: string) => {
  return apiClient.post('/password/reset', { resetToken, newPassword });
};

// 비밀번호 변경 API (로그인 상태에서)
export const changePasswordAPI = (currentPassword: string, newPassword: string) => {
  return apiClient.post('/password/change', { currentPassword, newPassword });
};

// 프로필 수정 API
export const updateProfileAPI = async (username: string) => {
  const { callAPIWithQueue } = await import('../utils/apiWithQueue');
  return callAPIWithQueue(
    () => apiClient.put('/me/profile', { username }),
    'updateProfile',
    '/me/profile',
    'PUT',
    { username },
    { priority: 6 }
  );
};

// ==================== 관리자 API ====================
// 개발자/관리자용 API

// 모든 유저 목록 조회
export const getAdminUsersAPI = () => {
  return apiClient.get('/admin/users');
};

// 특정 유저의 상세 정보 (탄소량 포함)
export const getAdminUserDetailAPI = (userId: number) => {
  return apiClient.get(`/admin/users/${userId}`);
};

// 유저 비밀번호 변경
export const changeUserPasswordAPI = (userId: number, newPassword: string) => {
  return apiClient.post(`/admin/users/${userId}/password`, { newPassword });
};

// 전체 탄소량 통계
export const getAdminStatisticsAPI = () => {
  return apiClient.get('/admin/statistics');
};

// 데이터베이스 백업 API
export const backupDatabaseAPI = () => {
  return apiClient.get('/admin/backup');
};

// 데이터베이스 복원 API
export const restoreDatabaseAPI = (backupData: any) => {
  return apiClient.post('/admin/restore', { data: backupData });
};
