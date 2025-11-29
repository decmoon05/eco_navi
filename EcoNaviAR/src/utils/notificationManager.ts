import { Alert, Platform } from 'react-native';

export type NotificationType = 'quest_completed' | 'achievement_unlocked' | 'trip_saved' | 'sync_completed' | 'error';

export interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // 밀리초 단위
}

/**
 * 알림을 표시하는 함수
 * 현재는 Alert를 사용하지만, 나중에 푸시 알림으로 확장 가능
 */
export const showNotification = (data: NotificationData): void => {
  const { title, message, type } = data;

  // 타입에 따라 아이콘 추가
  let icon = '';
  switch (type) {
    case 'quest_completed':
      icon = '🎯';
      break;
    case 'achievement_unlocked':
      icon = '🏆';
      break;
    case 'trip_saved':
      icon = '✅';
      break;
    case 'sync_completed':
      icon = '🔄';
      break;
    case 'error':
      icon = '⚠️';
      break;
  }

  Alert.alert(
    `${icon} ${title}`,
    message,
    [{ text: '확인' }],
    { cancelable: true }
  );
};

/**
 * 퀘스트 완료 알림
 */
export const notifyQuestCompleted = (questName: string, points: number): void => {
  showNotification({
    type: 'quest_completed',
    title: '퀘스트 완료!',
    message: `"${questName}" 퀘스트를 완료했습니다!\n+${points} 포인트를 획득했습니다.`,
  });
};

/**
 * 업적 달성 알림
 */
export const notifyAchievementUnlocked = (achievementName: string): void => {
  showNotification({
    type: 'achievement_unlocked',
    title: '업적 달성!',
    message: `"${achievementName}" 업적을 달성했습니다!`,
  });
};

/**
 * 이동 기록 저장 완료 알림
 */
export const notifyTripSaved = (savedEmission: number): void => {
  const emissionText = savedEmission > 0 
    ? `탄소 ${formatEmission(savedEmission)}를 절약했습니다!`
    : '이동 기록이 저장되었습니다.';
  
  showNotification({
    type: 'trip_saved',
    title: '이동 기록 저장',
    message: emissionText,
  });
};

/**
 * 동기화 완료 알림
 */
export const notifySyncCompleted = (synced: number, failed: number): void => {
  if (synced > 0 && failed === 0) {
    showNotification({
      type: 'sync_completed',
      title: '동기화 완료',
      message: `${synced}개의 이동 기록이 서버에 동기화되었습니다.`,
    });
  } else if (synced > 0 && failed > 0) {
    showNotification({
      type: 'sync_completed',
      title: '동기화 부분 완료',
      message: `${synced}개 성공, ${failed}개 실패`,
    });
  }
};

/**
 * 에러 알림
 */
export const notifyError = (message: string): void => {
  showNotification({
    type: 'error',
    title: '오류',
    message,
  });
};

/**
 * 탄소 배출량 포맷팅 (간단한 버전)
 */
const formatEmission = (emission: number): string => {
  if (emission >= 1000) {
    return `${(emission / 1000).toFixed(1)}kg`;
  }
  return `${emission.toFixed(1)}g`;
};



