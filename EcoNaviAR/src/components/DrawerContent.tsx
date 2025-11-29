import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';

const DrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      id: 'settings',
      label: t('settings.title'),
      icon: 'cog',
      screen: 'Settings' as never,
      color: Theme.colors.primary,
    },
    {
      id: 'developer',
      label: t('settings.adminDashboard'),
      icon: 'shield-account',
      screen: 'DeveloperSettings' as never,
      color: Theme.colors.secondary,
      adminOnly: true,
    },
    {
      id: 'navigation-tracking',
      label: t('settings.gpsTracking'),
      icon: 'map-marker-path',
      screen: 'NavigationTracking' as never,
      color: Theme.colors.info,
    },
  ];

  const handleLogout = () => {
    logout();
    props.navigation.closeDrawer();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Icon name="leaf" size={48} color={Theme.colors.primary} />
        <Text style={styles.appTitle}>EcoNavi</Text>
        {user && (
          <Text style={styles.userName}>{user.username}</Text>
        )}
      </View>

      <DrawerContentScrollView 
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.map((item) => {
          if (item.adminOnly && user?.username !== 'admin') {
            return null;
          }
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate(item.screen);
                props.navigation.closeDrawer();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Icon name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.menuItemText}>{item.label}</Text>
              <Icon name="chevron-right" size={20} color={Theme.colors.textLight} />
            </TouchableOpacity>
          );
        })}
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Icon name="logout" size={24} color={Theme.colors.error} />
          <Text style={styles.logoutText}>{t('common.logout')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  header: {
    padding: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  appTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '700',
    marginTop: Theme.spacing.sm,
  },
  userName: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
  },
  scrollContent: {
    paddingTop: Theme.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    paddingLeft: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    padding: Theme.spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  logoutText: {
    ...Theme.typography.body1,
    color: Theme.colors.error,
    fontWeight: '600',
  },
});

export default DrawerContent;

