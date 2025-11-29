import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { getTripsAPI, getAchievementsAPI } from '../services/api';
import { HistoryEntry, getHistory } from '../utils/historyManager';
import { notifyAchievementUnlocked } from '../utils/notificationManager';
import Wallet from '../components/Wallet';
import Achievements from '../components/Achievements';
import Statistics from '../components/Statistics';
import History from '../components/History';
import SyncStatus from '../components/SyncStatus';
import PendingRequests from '../components/PendingRequests';
import AnimatedCard from '../components/AnimatedCard';
import FadeInView from '../components/FadeInView';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme';
import { t } from '../i18n';

interface Achievement {
  id: string;
  name: string;
  description: string;
  date?: string;
}

const MyPage = () => {
  const { user, logout, token } = useAuth();
  const navigation = useNavigation();
  const [userAchievements, setUserAchievements] = useState<Achievement[]>([]);
  const [userHistory, setUserHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [tripsResponse, achievementsResponse, localHistory] = await Promise.all([
        getTripsAPI().catch(e => {
          console.error("Failed to fetch trips:", e);
          return { data: [] };
        }),
        getAchievementsAPI().catch(e => {
          console.error("Failed to fetch achievements:", e);
          return { data: [] };
        }),
        getHistory(user?.id || null).catch(e => {
          console.error("Failed to fetch local history:", e);
          return [];
        }),
      ]);

      setUserAchievements(achievementsResponse.data || []);
      setUserHistory(localHistory || []);

    } catch (error: any) {
      console.error("Failed to fetch MyPage data:", error);
      // 오류가 발생해도 빈 데이터로 설정하여 화면이 멈추지 않도록 함
      setUserAchievements([]);
      setUserHistory([]);
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 차량 설정이 없으면 설정 페이지로 리다이렉트
  useEffect(() => {
    if (user && !user.vehicle_type && navigation) {
      // 약간의 지연을 두어 네비게이션이 준비될 때까지 대기
      const timer = setTimeout(() => {
        navigation.navigate('Settings' as never);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, navigation]);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const totalSavedEmission = userHistory.reduce((sum, entry) => sum + entry.emission.savedEmission, 0);
  const totalDistance = userHistory.reduce((sum, entry) => sum + entry.route.distance, 0);
  const mostUsedMode = userHistory.reduce((acc, entry) => {
    acc[entry.route.transportMode] = (acc[entry.route.transportMode] || 0) + 1;
    return acc;
  }, {});
  const sortedModes = Object.keys(mostUsedMode).sort((a, b) => mostUsedMode[b] - mostUsedMode[a]);
  const finalMostUsedMode = sortedModes.length > 0 ? sortedModes[0] : 'car';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </SafeAreaView>
    );
  }

  // 사용자 정보가 없지만 토큰이 있는 경우 (네트워크 오류 등)
  if (!user && token) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.errorContent}
        >
          <View style={styles.errorContainer}>
            <Icon name="wifi-off" size={64} color={Theme.colors.textSecondary} />
            <Text style={styles.errorTitle}>서버에 연결할 수 없습니다</Text>
            <Text style={styles.errorMessage}>
              네트워크 연결을 확인하거나 서버가 실행 중인지 확인해주세요.{'\n\n'}
              확인 사항:{'\n'}
              1. 서버가 실행 중인지 확인 (server 폴더에서 npm start){'\n'}
              2. PC와 기기가 같은 Wi-Fi에 연결되어 있는지 확인{'\n'}
              3. 서버 주소가 올바른지 확인 (마이페이지 → 서버 설정){'\n'}
              4. 방화벽이 포트 3001을 차단하지 않는지 확인
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Icon name="refresh" size={20} color={Theme.colors.backgroundLight} />
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 사용자 정보도 없고 토큰도 없는 경우 (로그인 필요)
  if (!user && !token) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.errorContent}
        >
          <View style={styles.errorContainer}>
            <Icon name="account-alert" size={64} color={Theme.colors.textSecondary} />
            <Text style={styles.errorTitle}>로그인이 필요합니다</Text>
            <Text style={styles.errorMessage}>
              마이페이지를 사용하려면 로그인해주세요.
            </Text>
      </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[Theme.colors.primary]}
            tintColor={Theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <FadeInView delay={100}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Icon name="account-circle" size={40} color={Theme.colors.primary} />
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>{t('myPage.title')}</Text>
                <Text style={styles.headerSubtitle}>{t('myPage.greeting', { username: user.username })}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              style={styles.menuButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('common.openMenu')}
              accessibilityHint={t('common.menuHint')}
            >
              <Icon name="menu" size={28} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>
        </FadeInView>
        
        <FadeInView delay={150}>
          <Wallet points={user.points} />
        </FadeInView>
        
        <FadeInView delay={200}>
          <SyncStatus />
        </FadeInView>
        
        <FadeInView delay={200}>
          <AnimatedCard>
      <Achievements achievements={userAchievements} />
          </AnimatedCard>
        </FadeInView>
        
        <FadeInView delay={550}>
          <AnimatedCard>
      <Statistics
        totalSavedEmission={totalSavedEmission}
        totalDistance={totalDistance}
        mostUsedMode={finalMostUsedMode}
        history={userHistory.map(entry => ({
          date: entry.date,
          savedEmission: entry.emission.savedEmission,
        }))}
      />
          </AnimatedCard>
        </FadeInView>
        
        <FadeInView delay={600}>
          <AnimatedCard>
      <History history={userHistory} />
          </AnimatedCard>
        </FadeInView>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: Theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.error,
    backgroundColor: Theme.colors.background,
    gap: Theme.spacing.xs,
  },
  logoutButtonText: {
    ...Theme.typography.body2,
    color: Theme.colors.error,
    fontWeight: '500',
  },
  headerTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  headerSubtitle: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
  },
  cardTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: Theme.colors.background,
    overflow: 'hidden',
  },
  picker: {
    color: Theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  developerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  developerButtonText: {
    flex: 1,
    marginLeft: Theme.spacing.md,
    ...Theme.typography.body1,
    fontWeight: '500',
    color: Theme.colors.text,
  },
  loadingText: {
    ...Theme.typography.body1,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  errorContainer: {
    alignItems: 'center',
    maxWidth: 400,
  },
  errorTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...Theme.typography.body1,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    gap: Theme.spacing.sm,
    ...Theme.shadows.medium,
  },
  retryButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
  },
});

export default MyPage;
