import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PointTransaction {
  id: number;
  date: string;
  type: 'earned' | 'spent'; // 'earned': 획득, 'spent': 사용
  amount: number; // 절댓값 (항상 양수)
  description: string;
  category?: 'trip' | 'achievement' | 'quest' | 'product' | 'other'; // 트랜잭션 카테고리
}

const POINT_HISTORY_KEY_PREFIX = 'ecoNaviPointHistory_';
const MAX_HISTORY_ITEMS = 100;

const getHistoryKey = (userId: number | null): string => {
  if (userId !== null && userId !== undefined) {
    return `${POINT_HISTORY_KEY_PREFIX}${userId}`;
  }
  return `${POINT_HISTORY_KEY_PREFIX}guest`;
};

export const getPointHistory = async (userId: number | null = null): Promise<PointTransaction[]> => {
  try {
    const key = getHistoryKey(userId);
    const historyJson = await AsyncStorage.getItem(key);
    if (historyJson) {
      const parsed = JSON.parse(historyJson);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // 최신순 정렬
      }
      await AsyncStorage.removeItem(key);
      return [];
    }
  } catch (error) {
    console.error("Failed to parse point history from AsyncStorage", error);
    try {
      const key = getHistoryKey(userId);
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // Ignore
    }
  }
  return [];
};

export const addPointTransaction = async (
  userId: number | null,
  type: 'earned' | 'spent',
  amount: number,
  description: string,
  category: 'trip' | 'achievement' | 'quest' | 'product' | 'other' = 'other'
): Promise<void> => {
  if (amount <= 0) return;

  const transaction: PointTransaction = {
    id: Date.now(),
    date: new Date().toISOString(),
    type,
    amount,
    description,
    category,
  };

  try {
    const key = getHistoryKey(userId);
    const currentHistory = await getPointHistory(userId);
    const newHistory = [transaction, ...currentHistory];
    
    // Keep the list at a manageable size
    if (newHistory.length > MAX_HISTORY_ITEMS) {
      newHistory.splice(MAX_HISTORY_ITEMS);
    }

    await AsyncStorage.setItem(key, JSON.stringify(newHistory));
  } catch (error) {
    console.error("Failed to save point transaction to AsyncStorage", error);
  }
};

export const clearPointHistory = async (userId: number | null = null): Promise<void> => {
  try {
    const key = getHistoryKey(userId);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear point history from AsyncStorage", error);
  }
};


