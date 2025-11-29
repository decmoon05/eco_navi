import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from '../types';

export interface FavoriteLocation {
  id: string;
  name: string;
  location: Location;
  category: 'home' | 'work' | 'favorite' | 'custom';
  createdAt: string;
  lastUsedAt?: string;
}

const FAVORITES_KEY = 'ecoNaviFavorites';
const MAX_FAVORITES = 20;

export const getFavoriteLocations = async (): Promise<FavoriteLocation[]> => {
  try {
    const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
    if (favoritesJson) {
      return JSON.parse(favoritesJson);
    }
  } catch (error) {
    console.error('Failed to load favorite locations:', error);
    await AsyncStorage.removeItem(FAVORITES_KEY);
  }
  return [];
};

export const saveFavoriteLocation = async (favorite: Omit<FavoriteLocation, 'id' | 'createdAt'>): Promise<FavoriteLocation> => {
  try {
    const currentFavorites = await getFavoriteLocations();
    
    // 집 또는 회사인 경우, 기존 집/회사 항목 제거 (하나만 유지)
    if (favorite.category === 'home' || favorite.category === 'work') {
      const existingCategoryIndex = currentFavorites.findIndex(
        (f) => f.category === favorite.category
      );
      if (existingCategoryIndex >= 0) {
        // 기존 집/회사 항목 제거
        currentFavorites.splice(existingCategoryIndex, 1);
      }
    }
    
    // 중복 체크 (같은 위치가 이미 있는지)
    const existingIndex = currentFavorites.findIndex(
      (f) => f.location.lat === favorite.location.lat && 
             f.location.lng === favorite.location.lng
    );
    
    const newFavorite: FavoriteLocation = {
      ...favorite,
      id: existingIndex >= 0 ? currentFavorites[existingIndex].id : `fav_${Date.now()}`,
      createdAt: existingIndex >= 0 ? currentFavorites[existingIndex].createdAt : new Date().toISOString(),
    };
    
    if (existingIndex >= 0) {
      // 기존 항목 업데이트
      currentFavorites[existingIndex] = newFavorite;
    } else {
      // 새 항목 추가
      if (currentFavorites.length >= MAX_FAVORITES) {
        // 가장 오래된 항목 제거 (집/회사는 제외)
        const nonEssentialFavorites = currentFavorites.filter(f => f.category !== 'home' && f.category !== 'work');
        if (nonEssentialFavorites.length > 0) {
          nonEssentialFavorites.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const toRemove = nonEssentialFavorites[0];
          const removeIndex = currentFavorites.findIndex(f => f.id === toRemove.id);
          if (removeIndex >= 0) {
            currentFavorites.splice(removeIndex, 1);
          }
        }
      }
      currentFavorites.push(newFavorite);
    }
    
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(currentFavorites));
    return newFavorite;
  } catch (error) {
    console.error('Failed to save favorite location:', error);
    throw error;
  }
};

export const deleteFavoriteLocation = async (id: string): Promise<void> => {
  try {
    const currentFavorites = await getFavoriteLocations();
    const newFavorites = currentFavorites.filter(f => f.id !== id);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  } catch (error) {
    console.error('Failed to delete favorite location:', error);
    throw error;
  }
};

export const updateFavoriteLastUsed = async (id: string): Promise<void> => {
  try {
    const currentFavorites = await getFavoriteLocations();
    const favorite = currentFavorites.find(f => f.id === id);
    if (favorite) {
      favorite.lastUsedAt = new Date().toISOString();
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(currentFavorites));
    }
  } catch (error) {
    console.error('Failed to update favorite last used:', error);
  }
};

export const getFrequentlyUsedLocations = async (limit: number = 5): Promise<FavoriteLocation[]> => {
  try {
    const favorites = await getFavoriteLocations();
    return favorites
      .filter(f => f.lastUsedAt)
      .sort((a, b) => {
        const aTime = new Date(a.lastUsedAt || 0).getTime();
        const bTime = new Date(b.lastUsedAt || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get frequently used locations:', error);
    return [];
  }
};

export const getHomeLocation = async (): Promise<FavoriteLocation | null> => {
  const favorites = await getFavoriteLocations();
  return favorites.find(f => f.category === 'home') || null;
};

export const getWorkLocation = async (): Promise<FavoriteLocation | null> => {
  const favorites = await getFavoriteLocations();
  return favorites.find(f => f.category === 'work') || null;
};

