import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { PointTransaction, getPointHistory } from '../utils/pointHistoryManager';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t, getCurrentLanguage } from '../i18n';

const PointHistoryPage: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const history = await getPointHistory(user?.id || null);
      setTransactions(history);
    } catch (error) {
      console.error('Failed to load point history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const currentLang = getCurrentLanguage();
    if (diffMins < 1) return currentLang === 'ko' ? '방금 전' : 'Just now';
    if (diffMins < 60) return currentLang === 'ko' ? `${diffMins}분 전` : `${diffMins} min ago`;
    if (diffHours < 24) return currentLang === 'ko' ? `${diffHours}시간 전` : `${diffHours} hours ago`;
    if (diffDays === 0) return currentLang === 'ko' ? '오늘' : 'Today';
    if (diffDays === 1) return currentLang === 'ko' ? '어제' : 'Yesterday';
    if (diffDays < 7) return currentLang === 'ko' ? `${diffDays}일 전` : `${diffDays} days ago`;
    
    return date.toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'trip':
        return 'map-marker-path';
      case 'achievement':
        return 'trophy';
      case 'quest':
        return 'flag-checkered';
      case 'product':
        return 'store';
      default:
        return 'wallet';
    }
  };

  const renderTransaction = ({ item }: { item: PointTransaction }) => {
    const isEarned = item.type === 'earned';
    
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: isEarned ? Theme.colors.success + '15' : Theme.colors.error + '15' }
          ]}>
            <Icon 
              name={getCategoryIcon(item.category)} 
              size={24} 
              color={isEarned ? Theme.colors.success : Theme.colors.error} 
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[
            styles.transactionAmount,
            { color: isEarned ? Theme.colors.success : Theme.colors.error }
          ]}>
            {isEarned ? '+' : '-'}{item.amount.toLocaleString()}P
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('pointHistory.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('pointHistory.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="wallet-outline" size={64} color={Theme.colors.textLight} />
          <Text style={styles.emptyTitle}>{t('pointHistory.empty')}</Text>
          <Text style={styles.emptyDescription}>{t('pointHistory.emptyDescription')}</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Theme.spacing.md,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.small,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs / 2,
  },
  transactionDate: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    ...Theme.typography.body1,
    fontWeight: '700',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  emptyTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '600',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default PointHistoryPage;
