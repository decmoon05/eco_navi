/**
 * 친환경 테마 색상 팔레트
 * 자연스럽고 부드러운 녹색 계열의 색상 사용
 * 다크모드 지원을 위한 색상 변수화
 */

// 라이트 모드 색상
export const LightColors = {
  // Primary Colors (주요 색상)
  primary: '#2E7D32', // 진한 녹색
  primaryLight: '#4CAF50', // 밝은 녹색
  primaryDark: '#1B5E20', // 어두운 녹색
  
  // Secondary Colors (보조 색상)
  secondary: '#66BB6A', // 연한 녹색
  secondaryLight: '#81C784', // 매우 연한 녹색
  secondaryDark: '#388E3C', // 중간 녹색
  
  // Accent Colors (강조 색상)
  accent: '#8BC34A', // 라임 그린
  accentLight: '#AED581', // 밝은 라임
  accentDark: '#689F38', // 어두운 라임
  
  // Background Colors (배경 색상)
  background: '#F1F8F4', // 매우 연한 녹색 배경
  backgroundLight: '#FFFFFF', // 흰색
  backgroundDark: '#E8F5E9', // 연한 녹색 배경
  
  // Surface Colors (표면 색상)
  surface: '#FFFFFF', // 카드 배경
  surfaceVariant: '#F5FBF7', // 변형된 표면
  
  // Text Colors (텍스트 색상)
  text: '#1B1B1B', // 거의 검은색
  textSecondary: '#424242', // 더 진한 회색 (가독성 개선)
  textLight: '#9E9E9E', // 연한 회색
  textOnPrimary: '#FFFFFF', // 주 색상 위의 텍스트
  
  // Status Colors (상태 색상)
  success: '#4CAF50', // 성공
  warning: '#FF9800', // 경고
  error: '#F44336', // 오류
  errorLight: '#FFEBEE', // 연한 오류 배경
  info: '#2196F3', // 정보
  
  // Neutral Colors (중립 색상)
  border: '#E0E0E0', // 테두리
  divider: '#E8E8E8', // 구분선
  shadow: 'rgba(0, 0, 0, 0.1)', // 그림자
  
  // Gradient Colors (그라데이션)
  gradientStart: '#2E7D32', // 그라데이션 시작
  gradientEnd: '#66BB6A', // 그라데이션 끝
  gradientLight: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
  gradientDark: 'linear-gradient(135deg, #2E7D32 0%, #388E3C 100%)',
} as const;

// 다크 모드 색상
export const DarkColors = {
  // Primary Colors (주요 색상)
  primary: '#66BB6A', // 다크모드에서는 더 밝은 녹색 사용
  primaryLight: '#81C784', // 밝은 녹색
  primaryDark: '#4CAF50', // 중간 녹색
  
  // Secondary Colors (보조 색상)
  secondary: '#81C784', // 연한 녹색
  secondaryLight: '#A5D6A7', // 매우 연한 녹색
  secondaryDark: '#66BB6A', // 중간 녹색
  
  // Accent Colors (강조 색상)
  accent: '#AED581', // 라임 그린
  accentLight: '#C5E1A5', // 밝은 라임
  accentDark: '#9CCC65', // 어두운 라임
  
  // Background Colors (배경 색상)
  background: '#121212', // 다크 배경
  backgroundLight: '#1E1E1E', // 약간 밝은 다크 배경
  backgroundDark: '#0D0D0D', // 매우 어두운 배경
  
  // Surface Colors (표면 색상)
  surface: '#1E1E1E', // 카드 배경
  surfaceVariant: '#2A2A2A', // 변형된 표면
  
  // Text Colors (텍스트 색상)
  text: '#FFFFFF', // 흰색
  textSecondary: '#B0B0B0', // 연한 회색
  textLight: '#757575', // 중간 회색
  textOnPrimary: '#FFFFFF', // 주 색상 위의 텍스트
  
  // Status Colors (상태 색상)
  success: '#66BB6A', // 성공
  warning: '#FFB74D', // 경고
  error: '#EF5350', // 오류
  errorLight: '#3D1F1F', // 연한 오류 배경
  info: '#64B5F6', // 정보
  
  // Neutral Colors (중립 색상)
  border: '#333333', // 테두리
  divider: '#2A2A2A', // 구분선
  shadow: 'rgba(0, 0, 0, 0.3)', // 그림자
  
  // Gradient Colors (그라데이션)
  gradientStart: '#66BB6A', // 그라데이션 시작
  gradientEnd: '#81C784', // 그라데이션 끝
  gradientLight: 'linear-gradient(135deg, #81C784 0%, #A5D6A7 100%)',
  gradientDark: 'linear-gradient(135deg, #66BB6A 0%, #81C784 100%)',
} as const;

// 기본 색상 (라이트 모드)
export const Colors = LightColors;

export type ColorKey = keyof typeof Colors;

