import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { List } from 'react-native-paper';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from '../i18n';
import { useNavigation } from '@react-navigation/native';

interface Achievement {
  id: string;
  name: string;
  description: string;
  date?: string; // 달성일 (선택 사항)
}

interface AchievementsProps {
  achievements: Achievement[];
}

const Achievements: React.FC<AchievementsProps> = ({ achievements }) => {
  const navigation = useNavigation();
  
  const renderAchievementItem = ({ item }: { item: Achievement }) => (
    <List.Item
      title={item.name}
      description={item.description}
      left={() => <List.Icon icon="trophy" color="#FFD700" />}
      right={() => item.date && <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString()}</Text>}
      style={styles.listItem}
      titleStyle={styles.listItemTitle}
      descriptionStyle={styles.listItemDescription}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Icon name="trophy" size={24} color={Theme.colors.primary} />
        <Text style={styles.title}>{t('myPage.achievements')}</Text>
      </View>
      {achievements.length > 0 ? (
        <FlatList
          data={achievements}
          renderItem={renderAchievementItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Icon name="trophy-outline" size={64} color={Theme.colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>{t('myPage.noAchievements')}</Text>
          <Text style={styles.emptyDescription}>{t('myPage.noAchievementsDescription')}</Text>
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => navigation.navigate('QuestPage' as never)}
            activeOpacity={0.7}
          >
            <Icon name="target" size={20} color={Theme.colors.secondary} />
            <Text style={styles.emptyActionText}>퀘스트 보기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.xs,
  },
  title: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: Theme.colors.secondary,
    borderRadius: Theme.borderRadius.medium,
    gap: Theme.spacing.xs,
    ...Theme.shadows.small,
  },
  emptyActionText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
    fontWeight: '600',
  },
  listItem: {
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  listItemTitle: {
    ...Theme.typography.body1,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  listItemDescription: {
    ...Theme.typography.body2,
    color: Theme.colors.text,
  },
  dateText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    alignSelf: 'center',
  },
});

export default Achievements;
