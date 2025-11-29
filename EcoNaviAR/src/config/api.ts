import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 기본 서버 URL (환경에 따라 변경)
// 개발 환경: 로컬 개발 서버
// 프로덕션: 실제 배포 서버
// 
// 참고:
// - Android 에뮬레이터: http://10.0.2.2:3001
// - iOS 시뮬레이터: http://localhost:3001
// - 물리 기기: http://[PC의 로컬 IP]:3001 (예: http://192.168.0.2:3001)
//   물리 기기와 PC가 같은 Wi-Fi 네트워크에 연결되어 있어야 합니다.
const getDefaultApiUrl = (): string => {
  if (!__DEV__) {
    return 'https://econavi-production.up.railway.app';  // 프로덕션: Railway 클라우드 서버
  }
  
  // 개발 모드: 플랫폼에 따라 다른 주소 사용
  if (Platform.OS === 'android') {
    // Android: 에뮬레이터는 10.0.2.2, 물리 기기는 로컬 IP 필요
    // 물리 기기 사용 시 아래 주소를 PC의 실제 로컬 IP로 변경하세요
    // Windows: ipconfig 명령어로 IPv4 주소 확인
    // Mac/Linux: ifconfig 또는 ip addr 명령어로 확인
    return 'http://192.168.0.2:3001';  // 물리 기기용 (PC의 로컬 IP로 변경 필요)
    // return 'http://10.0.2.2:3001';  // 에뮬레이터용
  } else {
    // iOS: 시뮬레이터는 localhost, 물리 기기는 로컬 IP 필요
    return 'http://localhost:3001';  // iOS 시뮬레이터용
    // return 'http://192.168.0.2:3001';  // iOS 물리 기기용 (PC의 로컬 IP로 변경 필요)
  }
};

const DEFAULT_API_URL = getDefaultApiUrl();

// AsyncStorage에서 서버 URL을 가져오거나 기본값 반환
export const getApiUrl = async (): Promise<string> => {
  try {
    const savedUrl = await AsyncStorage.getItem('api_server_url');
    return savedUrl || DEFAULT_API_URL;
  } catch (e) {
    console.error('Failed to get API URL from storage', e);
    return DEFAULT_API_URL;
  }
};

// 서버 URL 저장
export const setApiUrl = async (url: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('api_server_url', url);
  } catch (e) {
    console.error('Failed to save API URL to storage', e);
  }
};

// 서버 URL 검증
export const validateApiUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const protocol = (urlObj as any).protocol || urlObj.href.split(':')[0];
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    // URL 형식이 아니면 문자열로 검증
    return url.startsWith('http://') || url.startsWith('https://');
  }
};

// API baseURL 업데이트 (서비스에서 사용)
export const updateApiBaseURL = async (): Promise<void> => {
  const { updateApiBaseURL: updateBaseURL } = await import('../services/api');
  await updateBaseURL();
};

// 서버 프리셋 타입
export interface ServerPreset {
  id: string;
  name: string;
  url: string;
}

// 기본 프리셋 목록
const DEFAULT_PRESETS: ServerPreset[] = [
  {
    id: 'home_wifi',
    name: '집 Wi-Fi',
    url: 'http://192.168.0.2:3001',
  },
  {
    id: 'hotspot',
    name: '핫스팟',
    url: 'http://10.223.145.79:3001', // 현재 핫스팟 IP (변경 가능)
  },
  {
    id: 'cloud',
    name: '클라우드',
    url: 'https://econavi-production.up.railway.app',
  },
];

// 프리셋 저장 키
const PRESETS_STORAGE_KEY = 'api_server_presets';
const CURRENT_PRESET_ID_KEY = 'api_server_current_preset_id';

// 저장된 프리셋 목록 가져오기
export const getServerPresets = async (): Promise<ServerPreset[]> => {
  try {
    const saved = await AsyncStorage.getItem(PRESETS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 기본 프리셋과 병합 (기본 프리셋이 없으면 추가)
      const merged = [...DEFAULT_PRESETS];
      parsed.forEach((preset: ServerPreset) => {
        if (!merged.find(p => p.id === preset.id)) {
          merged.push(preset);
        }
      });
      return merged;
    }
    return DEFAULT_PRESETS;
  } catch (e) {
    console.error('Failed to get server presets', e);
    return DEFAULT_PRESETS;
  }
};

// 프리셋 저장
export const saveServerPreset = async (preset: ServerPreset): Promise<void> => {
  try {
    const presets = await getServerPresets();
    const index = presets.findIndex(p => p.id === preset.id);
    if (index >= 0) {
      presets[index] = preset;
    } else {
      presets.push(preset);
    }
    await AsyncStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save server preset', e);
  }
};

// 프리셋 삭제
export const deleteServerPreset = async (presetId: string): Promise<void> => {
  try {
    const presets = await getServerPresets();
    const filtered = presets.filter(p => p.id !== presetId);
    // 기본 프리셋은 삭제하지 않음
    const defaultIds = DEFAULT_PRESETS.map(p => p.id);
    const customPresets = filtered.filter(p => !defaultIds.includes(p.id));
    await AsyncStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
  } catch (e) {
    console.error('Failed to delete server preset', e);
  }
};

// 현재 선택된 프리셋 ID 가져오기
export const getCurrentPresetId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(CURRENT_PRESET_ID_KEY);
  } catch (e) {
    console.error('Failed to get current preset ID', e);
    return null;
  }
};

// 현재 프리셋 ID 설정
export const setCurrentPresetId = async (presetId: string | null): Promise<void> => {
  try {
    if (presetId) {
      await AsyncStorage.setItem(CURRENT_PRESET_ID_KEY, presetId);
    } else {
      await AsyncStorage.removeItem(CURRENT_PRESET_ID_KEY);
    }
  } catch (e) {
    console.error('Failed to set current preset ID', e);
  }
};

// 프리셋으로 서버 URL 설정
export const setApiUrlFromPreset = async (presetId: string): Promise<void> => {
  const presets = await getServerPresets();
  const preset = presets.find(p => p.id === presetId);
  if (preset) {
    await setApiUrl(preset.url);
    await setCurrentPresetId(presetId);
  }
};

