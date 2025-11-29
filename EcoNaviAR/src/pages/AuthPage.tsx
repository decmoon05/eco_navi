import React, { useState } from 'react';
import { StyleSheet, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Login from '../components/Login';
import Register from '../components/Register';
import PasswordReset from '../components/PasswordReset';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AuthPage = () => {
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  return (
    <View style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Icon name="leaf" size={48} color={Theme.colors.backgroundLight} />
            </View>
            <Text style={styles.headerTitle}>EcoNavi</Text>
            <Text style={styles.headerSubtitle}>친환경 이동의 새로운 시작</Text>
          </View>
          
          {!showPasswordReset ? (
            <>
              <Register />
              <Login />
              <TouchableOpacity 
                onPress={() => setShowPasswordReset(true)}
                style={styles.passwordResetLink}
                activeOpacity={0.7}
              >
                <Text style={styles.passwordResetText}>비밀번호를 잊으셨나요?</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <PasswordReset />
              <TouchableOpacity 
                onPress={() => setShowPasswordReset(false)}
                style={styles.backLink}
                activeOpacity={0.7}
              >
                <Icon name="arrow-left" size={20} color={Theme.colors.backgroundLight} />
                <Text style={styles.backText}>로그인으로 돌아가기</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Theme.spacing.lg,
    paddingTop: Theme.spacing.xxl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.medium,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: Theme.colors.backgroundLight,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '400',
  },
  passwordResetLink: {
    marginTop: Theme.spacing.md,
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  passwordResetText: {
    color: Theme.colors.backgroundLight,
    fontSize: 14,
    fontWeight: '500',
  },
  backLink: {
    marginTop: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  backText: {
    color: Theme.colors.backgroundLight,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: Theme.spacing.xs,
  },
});

export default AuthPage;