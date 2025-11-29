import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { getAdminUsersAPI, getAdminUserDetailAPI, changeUserPasswordAPI, getAdminStatisticsAPI } from '../services/api';
import AnimatedCard from '../components/AnimatedCard';
import FadeInView from '../components/FadeInView';

interface User {
  id: number;
  username: string;
  points: number;
  monthly_goal: number;
  vehicle_type: string | null;
}

interface UserDetail extends User {
  trips: any[];
  statistics: {
    totalSavedEmission: number;
    totalEmission: number;
    totalDistance: number;
    tripCount: number;
  };
}

interface Statistics {
  summary: {
    totalUsers: number;
    totalSavedEmission: number;
    totalEmission: number;
    totalDistance: number;
    totalTripCount: number;
  };
  users: Array<{
    id: number;
    username: string;
    total_saved_emission: number;
    total_emission: number;
    total_distance: number;
    trip_count: number;
  }>;
}

const DeveloperSettingsPage = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'statistics'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // 권한 체크: admin이 아니면 접근 불가
  useEffect(() => {
    if (user?.username !== 'admin') {
      Alert.alert('접근 권한 없음', '관리자만 접근할 수 있는 페이지입니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    }
  }, [user, navigation]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const response = await getAdminUsersAPI();
        setUsers(response.data || []);
      } else {
        const response = await getAdminStatisticsAPI();
        setStatistics(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load admin data:', error);
      const errorMessage = error.response?.status === 404 
        ? '관리자 API를 찾을 수 없습니다. 서버를 재시작해주세요.'
        : error.response?.status === 403
        ? '관리자 권한이 필요합니다.'
        : error.response?.status === 401
        ? '로그인이 필요합니다.'
        : `데이터를 불러오는데 실패했습니다. (${error.response?.status || error.message})`;
      
      Alert.alert('오류', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadUserDetail = async (userId: number) => {
    try {
      const response = await getAdminUserDetailAPI(userId);
      setSelectedUser(response.data);
    } catch (error: any) {
      console.error('Failed to load user detail:', error);
      Alert.alert('오류', '유저 정보를 불러오는데 실패했습니다.');
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword || newPassword.length < 4) {
      Alert.alert('오류', '비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    setChangingPassword(true);
    try {
      await changeUserPasswordAPI(selectedUser.id, newPassword);
      Alert.alert('성공', '비밀번호가 성공적으로 변경되었습니다.');
      setPasswordModalVisible(false);
      setNewPassword('');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      Alert.alert('오류', '비밀번호 변경에 실패했습니다.');
    } finally {
      setChangingPassword(false);
    }
  };

  const formatEmission = (emission: number | null | undefined) => {
    if (emission == null || isNaN(emission)) {
      return '0 g';
    }
    if (emission >= 1000) {
      return `${(emission / 1000).toFixed(2)} kg`;
    }
    return `${emission.toFixed(2)} g`;
  };

  const formatDistance = (distance: number | null | undefined) => {
    if (distance == null || isNaN(distance)) {
      return '0 m';
    }
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)} km`;
    }
    return `${distance.toFixed(2)} m`;
  };

  // 권한이 없으면 빈 화면 반환
  if (user?.username !== 'admin') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>권한이 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FadeInView>
        <View style={styles.header}>
          <Icon name="shield-account" size={32} color={Theme.colors.primary} />
          <Title style={styles.title}>관리자 대시보드</Title>
        </View>
      </FadeInView>

      {/* 탭 메뉴 */}
      <FadeInView delay={100}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <Icon name="account-group" size={20} color={activeTab === 'users' ? Theme.colors.primary : Theme.colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>유저 관리</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'statistics' && styles.activeTab]}
            onPress={() => setActiveTab('statistics')}
          >
            <Icon name="chart-line" size={20} color={activeTab === 'statistics' ? Theme.colors.primary : Theme.colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'statistics' && styles.activeTabText]}>탄소량 통계</Text>
          </TouchableOpacity>
        </View>
      </FadeInView>

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
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>로딩 중...</Text>
          </View>
        ) : activeTab === 'users' ? (
          <>
            {/* 유저 목록 */}
            <FadeInView delay={150}>
              <AnimatedCard>
                <View style={styles.sectionHeader}>
                  <Icon name="account-group" size={24} color={Theme.colors.primary} />
                  <Text style={styles.sectionTitle}>전체 유저 ({users.length}명)</Text>
                </View>
                <Divider style={styles.divider} />
                {users.length === 0 ? (
                  <Text style={styles.emptyText}>등록된 유저가 없습니다.</Text>
                ) : (
                  users.map((user, index) => (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.userItem, index < users.length - 1 && styles.userItemBorder]}
                      onPress={() => loadUserDetail(user.id)}
                    >
                      <View style={styles.userInfo}>
                        <Icon name="account-circle" size={32} color={Theme.colors.primary} />
                        <View style={styles.userDetails}>
                          <Text style={styles.userName}>{user.username}</Text>
                          <Text style={styles.userMeta}>ID: {user.id} | 포인트: {user.points}P</Text>
                        </View>
                      </View>
                      <Icon name="chevron-right" size={24} color={Theme.colors.textLight} />
                    </TouchableOpacity>
                  ))
                )}
              </AnimatedCard>
            </FadeInView>

            {/* 선택된 유저 상세 정보 */}
            {selectedUser && (
              <FadeInView delay={200}>
                <AnimatedCard>
                  <View style={styles.sectionHeader}>
                    <Icon name="account-details" size={24} color={Theme.colors.secondary} />
                    <Text style={styles.sectionTitle}>유저 상세 정보</Text>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setSelectedUser(null)}
                    >
                      <Icon name="close" size={20} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Divider style={styles.divider} />
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>사용자명</Text>
                    <Text style={styles.detailValue}>{selectedUser.username}</Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>포인트</Text>
                    <Text style={styles.detailValue}>{selectedUser.points}P</Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>월간 목표</Text>
                    <Text style={styles.detailValue}>{formatEmission(selectedUser.monthly_goal || 0)}</Text>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>차량 종류</Text>
                    <Text style={styles.detailValue}>{selectedUser.vehicle_type || '미설정'}</Text>
                  </View>

                  <Divider style={styles.divider} />

                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Icon name="leaf" size={24} color={Theme.colors.success} />
                      <Text style={styles.statValue}>{formatEmission(selectedUser.statistics?.totalSavedEmission)}</Text>
                      <Text style={styles.statLabel}>절약한 탄소</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Icon name="car" size={24} color={Theme.colors.warning} />
                      <Text style={styles.statValue}>{formatEmission(selectedUser.statistics?.totalEmission)}</Text>
                      <Text style={styles.statLabel}>배출한 탄소</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Icon name="map-marker-distance" size={24} color={Theme.colors.primary} />
                      <Text style={styles.statValue}>{formatDistance(selectedUser.statistics?.totalDistance)}</Text>
                      <Text style={styles.statLabel}>총 이동거리</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Icon name="map-marker-path" size={24} color={Theme.colors.secondary} />
                      <Text style={styles.statValue}>{selectedUser.statistics?.tripCount || 0}회</Text>
                      <Text style={styles.statLabel}>이동 횟수</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.passwordButton}
                    onPress={() => setPasswordModalVisible(true)}
                  >
                    <Icon name="lock-reset" size={20} color={Theme.colors.error} />
                    <Text style={styles.passwordButtonText}>비밀번호 변경</Text>
                  </TouchableOpacity>
                </AnimatedCard>
              </FadeInView>
            )}

            {/* 비밀번호 변경 모달 */}
            {passwordModalVisible && (
              <FadeInView delay={250}>
                <AnimatedCard>
                  <View style={styles.sectionHeader}>
                    <Icon name="lock-reset" size={24} color={Theme.colors.error} />
                    <Text style={styles.sectionTitle}>비밀번호 변경</Text>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => {
                        setPasswordModalVisible(false);
                        setNewPassword('');
                      }}
                    >
                      <Icon name="close" size={20} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Divider style={styles.divider} />
                  
                  <Text style={styles.modalDescription}>
                    {selectedUser?.username}님의 비밀번호를 변경합니다.
                  </Text>
                  
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="새 비밀번호 (최소 4자)"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!changingPassword}
                  />
                  
                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setPasswordModalVisible(false);
                        setNewPassword('');
                      }}
                      disabled={changingPassword}
                    >
                      <Text style={styles.cancelButtonText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={handleChangePassword}
                      disabled={changingPassword || !newPassword || newPassword.length < 4}
                    >
                      {changingPassword ? (
                        <ActivityIndicator size="small" color={Theme.colors.backgroundLight} />
                      ) : (
                        <Text style={styles.confirmButtonText}>변경</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </AnimatedCard>
              </FadeInView>
            )}
          </>
        ) : (
          /* 탄소량 통계 */
          statistics && (
            <>
              <FadeInView delay={150}>
                <AnimatedCard>
                  <View style={styles.sectionHeader}>
                    <Icon name="chart-pie" size={24} color={Theme.colors.primary} />
                    <Text style={styles.sectionTitle}>전체 통계 요약</Text>
                  </View>
                  <Divider style={styles.divider} />
                  
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryBox}>
                      <Icon name="account-group" size={28} color={Theme.colors.primary} />
                      <Text style={styles.summaryValue}>{statistics.summary.totalUsers}</Text>
                      <Text style={styles.summaryLabel}>전체 유저</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Icon name="leaf" size={28} color={Theme.colors.success} />
                      <Text style={styles.summaryValue}>{formatEmission(statistics.summary?.totalSavedEmission)}</Text>
                      <Text style={styles.summaryLabel}>총 절약 탄소</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Icon name="car" size={28} color={Theme.colors.warning} />
                      <Text style={styles.summaryValue}>{formatEmission(statistics.summary?.totalEmission)}</Text>
                      <Text style={styles.summaryLabel}>총 배출 탄소</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Icon name="map-marker-path" size={28} color={Theme.colors.secondary} />
                      <Text style={styles.summaryValue}>{statistics.summary.totalTripCount}</Text>
                      <Text style={styles.summaryLabel}>총 이동 횟수</Text>
                    </View>
                  </View>
                </AnimatedCard>
              </FadeInView>

              <FadeInView delay={200}>
                <AnimatedCard>
                  <View style={styles.sectionHeader}>
                    <Icon name="trophy" size={24} color={Theme.colors.secondary} />
                    <Text style={styles.sectionTitle}>유저별 탄소 절약량 순위</Text>
                  </View>
                  <Divider style={styles.divider} />
                  
                  {statistics.users.length === 0 ? (
                    <Text style={styles.emptyText}>데이터가 없습니다.</Text>
                  ) : (
                    statistics.users.map((user, index) => (
                      <View key={user.id} style={[styles.rankingItem, index < statistics.users.length - 1 && styles.rankingItemBorder]}>
                        <View style={styles.rankingNumber}>
                          <Text style={styles.rankingNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.rankingInfo}>
                          <Text style={styles.rankingUserName}>{user.username}</Text>
                          <Text style={styles.rankingStats}>
                            절약: {formatEmission(user.total_saved_emission)} | 
                            이동: {formatDistance(user.total_distance)} | 
                            횟수: {user.trip_count || 0}회
                          </Text>
                        </View>
                        <View style={styles.rankingBadge}>
                          <Icon name="leaf" size={20} color={Theme.colors.success} />
                        </View>
                      </View>
                    ))
                  )}
                </AnimatedCard>
              </FadeInView>
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  title: {
    ...Theme.typography.h2,
    color: Theme.colors.text,
    marginLeft: Theme.spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    marginHorizontal: Theme.spacing.xs,
    gap: Theme.spacing.xs,
  },
  activeTab: {
    backgroundColor: Theme.colors.primaryLight,
  },
  tabText: {
    ...Theme.typography.body1,
    color: Theme.colors.textSecondary,
  },
  activeTabText: {
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
  },
  loadingContainer: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...Theme.typography.body1,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  sectionTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  closeButton: {
    padding: Theme.spacing.xs,
  },
  divider: {
    marginVertical: Theme.spacing.md,
  },
  emptyText: {
    ...Theme.typography.body1,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    padding: Theme.spacing.lg,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.md,
  },
  userItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  userName: {
    ...Theme.typography.body1,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  userMeta: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  detailSection: {
    marginBottom: Theme.spacing.md,
  },
  detailLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  detailValue: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statValue: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  statLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.errorLight,
    borderRadius: Theme.borderRadius.medium,
    gap: Theme.spacing.sm,
  },
  passwordButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.error,
  },
  modalDescription: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.md,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    ...Theme.typography.body1,
    color: Theme.colors.text,
    backgroundColor: Theme.colors.background,
    marginBottom: Theme.spacing.md,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  modalButton: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  confirmButton: {
    backgroundColor: Theme.colors.error,
  },
  cancelButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.text,
  },
  confirmButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  summaryBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  summaryValue: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  summaryLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
  },
  rankingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  rankingNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  rankingNumberText: {
    ...Theme.typography.body1,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingUserName: {
    ...Theme.typography.body1,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  rankingStats: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  rankingBadge: {
    padding: Theme.spacing.xs,
  },
});

export default DeveloperSettingsPage;
