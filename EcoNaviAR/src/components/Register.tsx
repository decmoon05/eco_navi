import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { registerAPI } from '../services/api';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from '../i18n';

// 유효성 검사 함수
const validateUsername = (username: string): { isValid: boolean; message: string } => {
  if (username.length === 0) {
    return { isValid: false, message: '' };
  }
  if (username.length < 3) {
    return { isValid: false, message: '사용자 이름은 3자 이상이어야 합니다.' };
  }
  if (username.length > 20) {
    return { isValid: false, message: t('register.usernameTooLong') };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, message: t('register.usernameInvalid') };
  }
  return { isValid: true, message: '' };
};

const validatePassword = (password: string): { isValid: boolean; message: string; strength: 'weak' | 'medium' | 'strong' } => {
  if (password.length === 0) {
    return { isValid: false, message: '', strength: 'weak' };
  }
  if (password.length < 6) {
    return { isValid: false, message: t('register.passwordTooShort'), strength: 'weak' };
  }
  
  // 비밀번호 강도 계산
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score >= 4) strength = 'strong';
  else if (score >= 2) strength = 'medium';
  
  return { isValid: true, message: '', strength };
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [usernameError, setUsernameError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (usernameTouched) {
      const validation = validateUsername(text);
      setUsernameError(validation.message);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordTouched) {
      const validation = validatePassword(text);
      setPasswordError(validation.message);
      setPasswordStrength(validation.strength);
    } else if (text.length > 0) {
      const validation = validatePassword(text);
      setPasswordStrength(validation.strength);
    } else {
      setPasswordStrength(null);
    }
  };

  const handleUsernameBlur = () => {
    setUsernameTouched(true);
    const validation = validateUsername(username);
    setUsernameError(validation.message);
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    const validation = validatePassword(password);
    setPasswordError(validation.message);
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setUsernameTouched(true);
    setPasswordTouched(true);
    
    const usernameValidation = validateUsername(username);
    const passwordValidation = validatePassword(password);
    
    setUsernameError(usernameValidation.message);
    setPasswordError(passwordValidation.message);
    
    if (!usernameValidation.isValid || !passwordValidation.isValid) {
      setErrorMessage(t('common.error'));
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await registerAPI(username, password);
      setSuccessMessage(response.data.message || t('register.registerSuccess'));
      setUsername('');
      setPassword('');
      setUsernameError('');
      setPasswordError('');
      setPasswordStrength(null);
      setUsernameTouched(false);
      setPasswordTouched(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || t('common.error');
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="account-plus" size={24} color={Theme.colors.secondary} />
        <Text style={styles.title}>{t('register.title')}</Text>
      </View>

      {/* 베타 테스트 공지 */}
      <View style={styles.betaNoticeContainer}>
        <View style={styles.betaNoticeHeader}>
          <Icon name="alert-circle" size={20} color={Theme.colors.warning} />
          <Text style={styles.betaNoticeTitle}>{t('register.betaNotice')}</Text>
        </View>
        <Text style={styles.betaNoticeMessage}>
          {t('register.betaNoticeMessage')}
        </Text>
      </View>
      
      <View>
        <View style={[
          styles.inputContainer,
          usernameTouched && usernameError && styles.inputContainerError,
          usernameTouched && !usernameError && username.length > 0 && styles.inputContainerSuccess
        ]}>
          <Icon 
            name="account" 
            size={20} 
            color={
              usernameTouched && usernameError ? Theme.colors.error :
              usernameTouched && !usernameError && username.length > 0 ? Theme.colors.success :
              Theme.colors.textSecondary
            } 
            style={styles.inputIcon} 
          />
          <TextInput
            style={styles.input}
            placeholder={t('register.usernamePlaceholderFull')}
            placeholderTextColor={Theme.colors.textLight}
            value={username}
            onChangeText={handleUsernameChange}
            onBlur={handleUsernameBlur}
            autoCapitalize="none"
            editable={!isLoading}
          />
          {usernameTouched && !usernameError && username.length > 0 && (
            <Icon name="check-circle" size={20} color={Theme.colors.success} />
          )}
        </View>
        {usernameTouched && usernameError && (
          <Text style={styles.fieldError}>{usernameError}</Text>
        )}
        {usernameTouched && !usernameError && username.length > 0 && (
          <Text style={styles.fieldSuccess}>{t('register.usernameAvailable')}</Text>
        )}
      </View>
      
      <View>
        <View style={[
          styles.inputContainer,
          passwordTouched && passwordError && styles.inputContainerError,
          passwordTouched && !passwordError && password.length > 0 && styles.inputContainerSuccess
        ]}>
          <Icon 
            name="lock" 
            size={20} 
            color={
              passwordTouched && passwordError ? Theme.colors.error :
              passwordTouched && !passwordError && password.length > 0 ? Theme.colors.success :
              Theme.colors.textSecondary
            } 
            style={styles.inputIcon} 
          />
          <TextInput
            style={styles.input}
            placeholder={t('register.passwordPlaceholderFull')}
            placeholderTextColor={Theme.colors.textLight}
            value={password}
            onChangeText={handlePasswordChange}
            onBlur={handlePasswordBlur}
            secureTextEntry
            editable={!isLoading}
          />
          {passwordTouched && !passwordError && password.length > 0 && (
            <Icon name="check-circle" size={20} color={Theme.colors.success} />
          )}
        </View>
        {passwordTouched && passwordError && (
          <Text style={styles.fieldError}>{passwordError}</Text>
        )}
        {passwordStrength && password.length > 0 && (
          <View style={styles.passwordStrengthContainer}>
            <Text style={styles.passwordStrengthLabel}>{t('register.passwordStrengthLabel')}</Text>
            <View style={styles.passwordStrengthBar}>
              <View style={[
                styles.passwordStrengthFill,
                { 
                  width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%',
                  backgroundColor: passwordStrength === 'weak' ? Theme.colors.error : 
                                  passwordStrength === 'medium' ? Theme.colors.warning : 
                                  Theme.colors.success
                }
              ]} />
            </View>
            <Text style={[
              styles.passwordStrengthText,
              { 
                color: passwordStrength === 'weak' ? Theme.colors.error : 
                       passwordStrength === 'medium' ? Theme.colors.warning : 
                       Theme.colors.success
              }
            ]}>
              {passwordStrength === 'weak' ? t('register.weak') : passwordStrength === 'medium' ? t('register.medium') : t('register.strong')}
            </Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <View style={styles.buttonGradient}>
          {isLoading ? (
            <>
              <ActivityIndicator color={Theme.colors.backgroundLight} size="small" />
              <Text style={styles.buttonText}>{t('register.processing')}</Text>
            </>
          ) : (
            <>
              <Icon name="account-plus" size={20} color={Theme.colors.backgroundLight} />
              <Text style={styles.buttonText}>{t('register.registerButton')}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* 에러 메시지 */}
      {errorMessage && (
        <View style={styles.messageContainer}>
          <Icon name="alert-circle" size={18} color={Theme.colors.error} />
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        </View>
      )}

      {/* 성공 메시지 */}
      {successMessage && (
        <View style={[styles.messageContainer, styles.successContainer]}>
          <Icon name="check-circle" size={18} color={Theme.colors.success} />
          <Text style={styles.successMessage}>{successMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.lg,
    ...Theme.shadows.large,
    marginBottom: Theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    marginLeft: Theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
  },
  inputIcon: {
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    ...Theme.typography.body1,
    color: Theme.colors.text,
    paddingVertical: Theme.spacing.md,
  },
  button: {
    borderRadius: Theme.borderRadius.medium,
    overflow: 'hidden',
    marginTop: Theme.spacing.sm,
    ...Theme.shadows.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.secondary,
    gap: Theme.spacing.xs,
  },
  buttonText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.small,
    backgroundColor: Theme.colors.errorLight,
    gap: Theme.spacing.xs,
  },
  successContainer: {
    backgroundColor: Theme.colors.backgroundDark,
  },
  errorMessage: {
    flex: 1,
    ...Theme.typography.body2,
    color: Theme.colors.error,
    lineHeight: 20,
  },
  successMessage: {
    flex: 1,
    ...Theme.typography.body2,
    color: Theme.colors.success,
    lineHeight: 20,
  },
  inputContainerError: {
    borderColor: Theme.colors.error,
    borderWidth: 2,
  },
  inputContainerSuccess: {
    borderColor: Theme.colors.success,
    borderWidth: 2,
  },
  fieldError: {
    ...Theme.typography.caption,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
    marginLeft: Theme.spacing.sm,
    fontSize: 12,
  },
  fieldSuccess: {
    ...Theme.typography.caption,
    color: Theme.colors.success,
    marginTop: Theme.spacing.xs,
    marginLeft: Theme.spacing.sm,
    fontSize: 12,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
    marginLeft: Theme.spacing.sm,
    gap: Theme.spacing.xs,
  },
  passwordStrengthLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: Theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    maxWidth: 100,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  passwordStrengthText: {
    ...Theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  betaNoticeContainer: {
    backgroundColor: Theme.colors.warning + '15',
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.warning + '40',
  },
  betaNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    gap: Theme.spacing.xs,
  },
  betaNoticeTitle: {
    ...Theme.typography.body1,
    color: Theme.colors.warning,
    fontWeight: '700',
  },
  betaNoticeMessage: {
    ...Theme.typography.body2,
    color: Theme.colors.text,
    lineHeight: 22,
  },
});

export default Register;