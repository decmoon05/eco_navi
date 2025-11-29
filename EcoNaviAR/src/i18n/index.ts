import AsyncStorage from '@react-native-async-storage/async-storage';

// 번역 리소스 (동적 import로 변경)
const ko = require('./locales/ko.json');
const en = require('./locales/en.json');

export type Language = 'ko' | 'en';

const LANGUAGE_KEY = 'ecoNavi_language';

// 번역 리소스
const resources = {
  ko,
  en,
};

// 현재 언어 상태
let currentLanguage: Language = 'ko';

// AsyncStorage에서 언어 설정 불러오기
export const getStoredLanguage = async (): Promise<Language> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLanguage === 'ko' || storedLanguage === 'en') {
      currentLanguage = storedLanguage;
      return storedLanguage;
    }
    return 'ko'; // 기본값은 한국어
  } catch (error) {
    console.error('Failed to load language from storage:', error);
    return 'ko';
  }
};

// 언어 설정 저장
export const setStoredLanguage = async (language: Language): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    currentLanguage = language;
  } catch (error) {
    console.error('Failed to save language to storage:', error);
  }
};

// 현재 언어 가져오기
export const getCurrentLanguage = (): Language => {
  return currentLanguage;
};

// 번역 함수 (useTranslation hook 대신 사용)
export const t = (key: string, params?: Record<string, any>): string => {
  const keys = key.split('.');
  let value: any = resources[currentLanguage];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // 폴백: 한국어로 시도
      value = resources['ko'];
      for (const k2 of keys) {
        if (value && typeof value === 'object' && k2 in value) {
          value = value[k2];
        } else {
          return key; // 번역을 찾을 수 없으면 키 반환
        }
      }
      break;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // 파라미터 치환 (간단한 구현)
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? String(params[paramKey]) : match;
    });
  }
  
  return value;
};

// 초기화 함수
export const initI18n = async (): Promise<void> => {
  currentLanguage = await getStoredLanguage();
};

// i18n 객체 (호환성을 위해)
const i18n = {
  language: currentLanguage,
  changeLanguage: (lang: Language) => {
    currentLanguage = lang;
  },
  t,
};

export default i18n;
