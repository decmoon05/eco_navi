import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme';
import { t } from '../i18n';

interface WalletProps {
  points: number;
}

const Wallet: React.FC<WalletProps> = ({ points }) => {
  const navigation = useNavigation();

  const handleViewHistory = () => {
    navigation.navigate('PointHistory' as never);
  };

  return (
    <View style={styles.outerContainer}>
      {/* 흰색 프레임 */}
      <View style={styles.whiteFrame}>
        {/* 배경 이미지가 있는 카드 */}
        <ImageBackground
          source={require('../../assets/eco_wallet_background.png')}
          style={styles.card}
          resizeMode="cover"
          imageStyle={styles.backgroundImage}
        >
          {/* 중앙 콘텐츠 */}
          <View style={styles.content}>
                <Text style={styles.walletTitle}>{t('wallet.title')}</Text>
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsValue}>{points.toLocaleString()}</Text>
              <Text style={styles.pointsUnit}>P</Text>
            </View>
          </View>

          {/* 내역 보기 버튼 */}
          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleViewHistory}
            activeOpacity={0.7}
            accessibilityRole="button"
                  accessibilityLabel={t('wallet.viewHistory')}
                  accessibilityHint={t('wallet.historyHint')}
          >
                  <Text style={styles.historyButtonText}>{t('wallet.viewHistory')}</Text>
            <Icon name="chevron-right" size={16} color={Theme.colors.primaryDark} />
          </TouchableOpacity>
        </ImageBackground>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: Theme.spacing.md,
  },
  whiteFrame: {
    backgroundColor: Theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 3,
    ...Theme.shadows.small,
  },
  card: {
    borderRadius: 13,
    padding: Theme.spacing.lg,
    minHeight: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    borderRadius: 13,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    paddingVertical: Theme.spacing.md,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.primaryDark,
    marginBottom: Theme.spacing.xs,
    opacity: 0.9,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
  },
  pointsValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Theme.colors.primaryDark,
    lineHeight: 46,
  },
  pointsUnit: {
    fontSize: 24,
    fontWeight: '600',
    color: Theme.colors.primaryDark,
    opacity: 0.9,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 'auto',
    paddingTop: Theme.spacing.md,
    zIndex: 1,
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.primaryDark,
    marginRight: 4,
  },
});

export default Wallet;
