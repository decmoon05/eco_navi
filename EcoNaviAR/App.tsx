import React from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { startAutoSync, stopAutoSync } from './src/utils/syncManager';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from './src/theme';
import { t } from './src/i18n';

import AuthPage from './src/pages/AuthPage';
import MainPage from './src/pages/MainPage';
import MyPage from './src/pages/MyPage';
import RankingPage from './src/pages/RankingPage';
import StorePage from './src/pages/StorePage';
import ReportPage from './src/pages/ReportPage';
import QuestPage from './src/pages/QuestPage';
import SettingsPage from './src/pages/SettingsPage';

import RouteResultPage from './src/pages/RouteResultPage';
import DeveloperSettingsPage from './src/pages/DeveloperSettingsPage';
import NavigationTrackingPage from './src/pages/NavigationTrackingPage';
import PointHistoryPage from './src/pages/PointHistoryPage';
import DrawerContent from './src/components/DrawerContent';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// 메인 화면과 결과 화면을 위한 스택 네비게이터
const MainStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="MainPage" 
      component={MainPage} 
      options={{ headerShown: false }} // 탭의 일부이므로 헤더를 숨김
    />
    <Stack.Screen 
      name="RouteResultPage" 
      component={RouteResultPage}
      options={{ title: '경로 검색 결과' }} // 결과 페이지에서는 헤더를 표시
    />
  </Stack.Navigator>
);

const MainAppTabs = () => {
  const getTabTitle = (routeName: string): string => {
    switch (routeName) {
      case 'Main':
        return t('tabBar.routeSearch');
      case 'MyPage':
        return t('tabBar.myPage');
      case 'Ranking':
        return t('tabBar.ranking');
      case 'Store':
        return t('tabBar.store');
      case 'Report':
        return t('tabBar.report');
      case 'Quest':
        return t('tabBar.quest');
      default:
        return routeName;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarLabel: getTabTitle(route.name),
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = 'home'; // 기본값

            if (route.name === 'Main') {
              iconName = focused ? 'map' : 'map-outline';
            } else if (route.name === 'MyPage') {
              iconName = focused ? 'account' : 'account-outline';
            } else if (route.name === 'Ranking') {
              iconName = focused ? 'trophy' : 'trophy-outline';
            } else if (route.name === 'Store') {
              iconName = focused ? 'store' : 'store-outline';
            } else if (route.name === 'Report') {
              iconName = focused ? 'chart-bar' : 'chart-bar-stacked';
            } else if (route.name === 'Quest') {
              iconName = focused ? 'flag-checkered' : 'flag-variant-outline';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2E7D32',
          tabBarInactiveTintColor: '#9E9E9E',
        })}
      >
        <Tab.Screen name="Main" component={MainStack} />
        <Tab.Screen name="MyPage" component={MyPage} />
        <Tab.Screen name="Ranking" component={RankingPage} />
        <Tab.Screen name="Store" component={StorePage} />
        <Tab.Screen name="Report" component={ReportPage} />
        <Tab.Screen name="Quest" component={QuestPage} />
      </Tab.Navigator>
    </View>
  );
};

// Drawer Navigator로 감싸기
const MainAppWithDrawer = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
        drawerType: 'front',
        drawerStyle: {
          width: 280,
        },
      }}
    >
      <Drawer.Screen name="MainAppTabs" component={MainAppTabs} />
    </Drawer.Navigator>
  );
};


const AppNavigator = () => {
  const { token, isLoading, user } = useAuth();
  const navigationRef = React.useRef<any>(null);

  // 차량 설정이 없으면 설정 페이지로 이동
  React.useEffect(() => {
    if (!isLoading && token && user && !user.vehicle_type && navigationRef.current) {
      // 약간의 지연을 두어 네비게이션 컨테이너가 준비될 때까지 대기
      setTimeout(() => {
        navigationRef.current?.navigate('Settings');
      }, 100);
    }
  }, [isLoading, token, user]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Icon name="leaf" size={64} color={Theme.colors.backgroundLight} />
          <Text style={styles.loadingTitle}>EcoNavi</Text>
          <ActivityIndicator size="large" color={Theme.colors.backgroundLight} style={styles.loadingSpinner} />
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <>
            <Stack.Screen name="MainApp" component={MainAppWithDrawer} />
            <Stack.Screen 
              name="Settings" 
              component={SettingsPage}
              options={{ 
                title: '설정',
                headerShown: true,
              }}
            />
            <Stack.Screen 
              name="DeveloperSettings" 
              component={DeveloperSettingsPage}
              options={{ 
                title: '개발자 설정',
                headerShown: true,
              }}
            />
            <Stack.Screen 
              name="NavigationTracking" 
              component={NavigationTrackingPage}
              options={{ 
                title: 'GPS 위치 추적',
                headerShown: true,
              }}
            />
            <Stack.Screen 
              name="PointHistory" 
              component={PointHistoryPage}
              options={{ 
                title: '포인트 내역',
                headerShown: false,
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthPage} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  // i18n 초기화
  React.useEffect(() => {
    const { initI18n } = require('./src/i18n');
    initI18n();
  }, []);

  // 앱 시작 시 자동 동기화 시작
  React.useEffect(() => {
    startAutoSync();
    
    // 앱 종료 시 동기화 중지
    return () => {
      stopAutoSync();
    };
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <PaperProvider>
          <AppNavigator />
        </PaperProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Theme.colors.backgroundLight,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
    letterSpacing: -0.5,
  },
  loadingSpinner: {
    marginTop: Theme.spacing.md,
  },
});

export default App;
