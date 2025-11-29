import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getMeAPI, updateVehicleTypeAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearHistory } from '../utils/historyManager';
import { clearSearchHistory } from '../utils/searchHistoryManager';

interface User {
  id: number;
  username: string;
  points: number;
  monthly_goal: number;
  vehicle_type: 'car' | 'electric_car' | 'hybrid' | 'hydrogen' | 'motorcycle' | 'electric_motorcycle' | null;
  is_admin?: boolean;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserVehicle: (vehicleType: 'car' | 'electric_car' | 'hybrid' | 'hydrogen' | 'motorcycle' | 'electric_motorcycle') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      const currentUserId = user?.id || null;
      
      // 토큰 제거
      await AsyncStorage.removeItem('token');
      
      // 사용자별 데이터 클리어
      if (currentUserId !== null) {
        console.log(`[AuthContext] 사용자 ${currentUserId}의 데이터 클리어 중...`);
        await Promise.all([
          clearHistory(currentUserId),
          clearSearchHistory(currentUserId),
        ]);
        console.log(`[AuthContext] 사용자 ${currentUserId}의 데이터 클리어 완료`);
      }
      
      setUser(null);
      setToken(null);
    } catch (e) {
      console.error("Failed to logout and clear user data", e);
    }
  }, [user]);

  const fetchUser = useCallback(async (currentToken: string) => {
    if (!currentToken) {
      console.log('[AuthContext] 토큰이 없어 사용자 정보 조회를 건너뜁니다.');
      setUser(null);
      return;
    }

    try {
      console.log('[AuthContext] 사용자 정보 조회 시작...');
      const response = await getMeAPI();
      console.log('[AuthContext] 사용자 정보 조회 성공:', response.data?.username);
      setUser(response.data);
    } catch (e: any) {
      const isNetworkError = e.code === 'ERR_NETWORK' || 
                             e.code === 'ECONNREFUSED' || 
                             e.code === 'ENOTFOUND' ||
                             e.code === 'ETIMEDOUT' ||
                             e.code === 'ECONNABORTED' ||
                             e.message === 'Network Error' ||
                             e.message?.includes('Network request failed');
      
      // 더 자세한 오류 정보 출력
      const errorDetails = {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        code: e.code,
        url: e.config?.url,
        baseURL: e.config?.baseURL,
        isNetworkError,
        headers: e.config?.headers,
      };
      
      console.error("[AuthContext] Failed to fetch user data", JSON.stringify(errorDetails, null, 2));
      
      // 401 또는 403 오류인 경우에만 로그아웃 (토큰 만료/무효)
      if (e.response?.status === 401 || e.response?.status === 403) {
        console.log('[AuthContext] 인증 오류로 로그아웃 처리 (토큰 만료 또는 무효)');
        try {
          await AsyncStorage.removeItem('token');
          setUser(null);
          setToken(null);
        } catch (storageError) {
          console.error("Failed to remove token from storage", storageError);
        }
      } else if (isNetworkError) {
        // 네트워크 오류인 경우: 토큰은 유지하되 사용자 정보는 null로 설정
        // 오프라인 모드로 작동할 수 있도록 함
        console.warn('[AuthContext] 네트워크 오류 - 오프라인 모드로 전환');
        setUser(null); // 사용자 정보는 null로 설정하되 토큰은 유지
        // 나중에 네트워크가 복구되면 refreshUser()를 호출하여 재시도 가능
      } else {
        // 기타 오류 (500 등)
        console.error('[AuthContext] 서버 오류:', e.response?.status, e.response?.data);
        setUser(null);
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (token) {
      await fetchUser(token);
    }
  }, [token, fetchUser]);

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          await fetchUser(storedToken);
        }
      } catch (e) {
        console.error("Failed to load token from storage", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, [fetchUser]);

  const login = async (newToken: string) => {
    try {
      console.log('[AuthContext] 로그인 시작, 토큰 저장 중...');
      
      // 이전 사용자 ID 저장 (상태 업데이트 전에)
      const previousUserId = user?.id || null;
      
      await AsyncStorage.setItem('token', newToken);
      setToken(newToken);
      console.log('[AuthContext] 토큰 저장 완료, 사용자 정보 조회 중...');
      
      // 사용자 정보 조회
      try {
        const response = await getMeAPI();
        const newUser = response.data;
        
        // 새 사용자와 이전 사용자가 다른 경우 이전 사용자 데이터 클리어
        if (previousUserId !== null && newUser && newUser.id !== previousUserId) {
          console.log(`[AuthContext] 사용자 변경 감지: ${previousUserId} -> ${newUser.id}`);
          console.log(`[AuthContext] 이전 사용자 ${previousUserId}의 데이터 클리어 중...`);
          await Promise.all([
            clearHistory(previousUserId),
            clearSearchHistory(previousUserId),
          ]);
          console.log(`[AuthContext] 이전 사용자 ${previousUserId}의 데이터 클리어 완료`);
        }
        
        // 사용자 정보 설정
        setUser(newUser);
      } catch (fetchError: any) {
        // fetchUser와 동일한 오류 처리 로직
        const isNetworkError = fetchError.code === 'ERR_NETWORK' || 
                               fetchError.code === 'ECONNREFUSED' || 
                               fetchError.code === 'ENOTFOUND' ||
                               fetchError.code === 'ETIMEDOUT' ||
                               fetchError.code === 'ECONNABORTED' ||
                               fetchError.message === 'Network Error' ||
                               fetchError.message?.includes('Network request failed');
        
        if (fetchError.response?.status === 401 || fetchError.response?.status === 403) {
          console.log('[AuthContext] 인증 오류로 로그아웃 처리');
          await AsyncStorage.removeItem('token');
          setUser(null);
          setToken(null);
        } else if (isNetworkError) {
          console.warn('[AuthContext] 네트워크 오류 - 오프라인 모드로 전환');
          setUser(null);
        } else {
          console.error('[AuthContext] 서버 오류:', fetchError.response?.status);
          setUser(null);
        }
      }
      
      console.log('[AuthContext] 로그인 완료');
    } catch (e: any) {
      console.error("[AuthContext] Failed to save token or fetch user", {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
      });
      // 토큰은 저장했으므로, 사용자 정보 조회 실패해도 로그인은 유지
      // (네트워크 오류 등으로 인한 일시적 실패일 수 있음)
    }
  };

  const updateUserVehicle = async (vehicleType: 'car' | 'electric_car') => {
    try {
      await updateVehicleTypeAPI(vehicleType);
      // 상태를 즉시 업데이트하여 UI에 반영
      setUser(prevUser => prevUser ? { ...prevUser, vehicle_type: vehicleType } : null);
    } catch (error) {
      console.error("Failed to update vehicle type", error);
      throw error; // 오류를 다시 던져서 호출한 쪽에서 처리할 수 있도록 함
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, refreshUser, updateUserVehicle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
