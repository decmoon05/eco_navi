import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme';
import { t } from '../i18n';

interface HeaderWithMenuProps {
  title?: string;
  subtitle?: string;
  showMenu?: boolean;
}

const HeaderWithMenu: React.FC<HeaderWithMenuProps> = ({ 
  title, 
  subtitle,
  showMenu = true 
}) => {
  const navigation = useNavigation();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View style={styles.header}>
      {title && (
        <View style={styles.headerContent}>
          {title && (
            <>
              <Icon name="leaf" size={title ? 24 : 32} color={Theme.colors.primary} />
              <View style={styles.headerText}>
                {title && <Text style={styles.headerTitle}>{title}</Text>}
                {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
              </View>
            </>
          )}
        </View>
      )}
      {showMenu && (
        <TouchableOpacity
          onPress={openDrawer}
          style={styles.menuButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.openMenu')}
          accessibilityHint={t('common.menuHint')}
        >
          <Icon name="menu" size={28} color={Theme.colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  menuButton: {
    padding: Theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HeaderWithMenu;

