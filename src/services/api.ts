import axios from 'axios';
import { Route, CarbonEmission } from '../types';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001',
});

// 요청 인터셉터를 사용하여 모든 요청에 JWT 토큰을 추가
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const saveTripAPI = (route: Route, emission: CarbonEmission) => {
  return apiClient.post('/trips', { route, emission });
};

export const getTripsAPI = () => {
  return apiClient.get('/trips');
};

export const getMeAPI = () => {
  return apiClient.get('/me');
};

export const setGoalAPI = (monthly_goal: number) => {
  return apiClient.post('/goal', { monthly_goal });
};

export const getAchievementsAPI = () => {
  return apiClient.get('/achievements');
};

export const getRankingAPI = () => {
  return apiClient.get('/ranking');
};

export const exchangeProductAPI = (productId: number) => {
  return apiClient.post(`/products/${productId}/exchange`);
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

export const claimQuestRewardAPI = (questId: string) => {
  return apiClient.post(`/quests/${questId}/reward`);
};
