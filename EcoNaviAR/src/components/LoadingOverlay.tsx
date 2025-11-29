import React from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from '../i18n';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number; // 0-1 사이의 값
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message, progress }) => {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Icon name="map-search" size={48} color={Theme.colors.primary} />
          </View>
          <ActivityIndicator size="large" color={Theme.colors.primary} style={styles.spinner} />
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}
          {progress !== undefined && progress > 0 && (
            <View style={styles.progressContainer}>
              <ProgressBar 
                progress={progress} 
                color={Theme.colors.primary} 
                style={styles.progressBar} 
              />
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                {progress < 1 && (
                  <Text style={styles.progressSubtext}>{t('common.pleaseWait')}</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
    ...Theme.shadows.large,
  },
  iconContainer: {
    marginBottom: Theme.spacing.md,
    opacity: 0.7,
  },
  spinner: {
    marginTop: Theme.spacing.sm,
  },
  message: {
    marginTop: Theme.spacing.lg,
    ...Theme.typography.body1,
    color: Theme.colors.text,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    marginTop: Theme.spacing.lg,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.background,
    overflow: 'hidden',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  progressText: {
    ...Theme.typography.body2,
    color: Theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  progressSubtext: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 11,
  },
});

export default LoadingOverlay;
