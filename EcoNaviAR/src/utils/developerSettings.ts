import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVELOPER_SETTINGS_KEY = 'developerSettings';

export interface DeveloperSettings {
  navigationTrackingEnabled: boolean; // 네비게이션 추적 기능 활성화 여부
}

const DEFAULT_SETTINGS: DeveloperSettings = {
  navigationTrackingEnabled: false,
};

/**
 * 개발자 설정을 불러옵니다.
 */
export const getDeveloperSettings = async (): Promise<DeveloperSettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(DEVELOPER_SETTINGS_KEY);
    if (settingsJson) {
      return JSON.parse(settingsJson);
    }
  } catch (error) {
    console.error('Failed to load developer settings:', error);
  }
  return DEFAULT_SETTINGS;
};

/**
 * 개발자 설정을 저장합니다.
 */
export const saveDeveloperSettings = async (settings: DeveloperSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(DEVELOPER_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save developer settings:', error);
  }
};

/**
 * 네비게이션 추적 기능이 활성화되어 있는지 확인합니다.
 */
export const isNavigationTrackingEnabled = async (): Promise<boolean> => {
  const settings = await getDeveloperSettings();
  return settings.navigationTrackingEnabled;
};



