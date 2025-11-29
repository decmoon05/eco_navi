import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';
import ServerSettings from '../components/ServerSettings';
import ProfileSettings from '../components/ProfileSettings';
import GoalSetting from '../components/GoalSetting';
import AnimatedCard from '../components/AnimatedCard';
import FadeInView from '../components/FadeInView';
import { getHistory } from '../utils/historyManager';

const SettingsPage: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateUserVehicle, refreshUser } = useAuth();
  const [selectedVehicle, setSelectedVehicle] = useState(user?.vehicle_type || null);
  const [totalSavedEmission, setTotalSavedEmission] = useState(0);

  React.useEffect(() => {
    loadTotalSavedEmission();
  }, []);

  const loadTotalSavedEmission = async () => {
    try {
      const history = await getHistory(user?.id || null);
      const total = history.reduce((sum, entry) => sum + entry.emission.savedEmission, 0);
      setTotalSavedEmission(total);
    } catch (error) {
      console.error('Failed to load total saved emission:', error);
    }
  };

  const handleVehicleChange = async (vehicleType: string | null) => {
    setSelectedVehicle(vehicleType);
    try {
      await updateUserVehicle(vehicleType as any);
      await refreshUser();
    } catch (error: any) {
      console.error('차량 정보 업데이트 실패:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView delay={100}>
          <View style={styles.header}>
            <Icon name="cog" size={32} color={Theme.colors.primary} />
            <Text style={styles.headerTitle}>설정</Text>
          </View>
        </FadeInView>

        <FadeInView delay={150}>
          <AnimatedCard>
            <ServerSettings />
          </AnimatedCard>
        </FadeInView>

        <FadeInView delay={200}>
          <AnimatedCard>
            <Text style={styles.cardTitle}>{t('settings.profileSettings')}</Text>
            <ProfileSettings />
          </AnimatedCard>
        </FadeInView>

        <FadeInView delay={250}>
          <AnimatedCard>
            <Text style={styles.cardTitle}>{t('settings.vehicleSettings')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedVehicle}
                onValueChange={(itemValue) => handleVehicleChange(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label={t('settings.selectVehicle')} value={null} />
                <Picker.Item label={t('transportModes.car')} value="car" />
                <Picker.Item label={t('transportModes.electric_car')} value="electric_car" />
                <Picker.Item label={t('transportModes.hybrid')} value="hybrid" />
                <Picker.Item label={t('transportModes.hydrogen')} value="hydrogen" />
                <Picker.Item label={t('transportModes.motorcycle')} value="motorcycle" />
                <Picker.Item label={t('transportModes.electric_motorcycle')} value="electric_motorcycle" />
              </Picker>
            </View>
          </AnimatedCard>
        </FadeInView>

        <FadeInView delay={300}>
          <AnimatedCard>
            <GoalSetting
              currentGoal={user?.monthly_goal || 0}
              currentSavedEmission={totalSavedEmission}
              onGoalUpdated={loadTotalSavedEmission}
            />
          </AnimatedCard>
        </FadeInView>

        <FadeInView delay={350}>
          <AnimatedCard>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('NavigationTracking' as never)}
              activeOpacity={0.7}
            >
              <Icon name="map-marker-path" size={24} color={Theme.colors.primary} />
              <Text style={styles.menuItemText}>GPS 위치 추적</Text>
              <Icon name="chevron-right" size={24} color={Theme.colors.textLight} />
            </TouchableOpacity>
          </AnimatedCard>
        </FadeInView>

        {user?.username === 'admin' && (
          <FadeInView delay={400}>
            <AnimatedCard>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('DeveloperSettings' as never)}
                activeOpacity={0.7}
              >
                <Icon name="shield-account" size={24} color={Theme.colors.secondary} />
                <Text style={styles.menuItemText}>{t('settings.adminDashboard')}</Text>
                <Icon name="chevron-right" size={24} color={Theme.colors.textLight} />
              </TouchableOpacity>
            </AnimatedCard>
          </FadeInView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.xs,
  },
  headerTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  cardTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '700',
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  pickerContainer: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    color: Theme.colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  menuItemText: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    flex: 1,
  },
});

export default SettingsPage;

