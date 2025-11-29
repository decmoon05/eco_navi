import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { t, setStoredLanguage, type Language, getStoredLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { loginAPI, updateApiBaseURL } from '../services/api';
import { getApiUrl, setApiUrl, validateApiUrl } from '../config/api';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Login = () => {
  const [currentLang, setCurrentLang] = useState<Language>('ko');

  // 언어 초기화
  useEffect(() => {
    const initLanguage = async () => {
      const lang = await getStoredLanguage();
      setCurrentLang(lang);
    };
    initLanguage();
  }, []);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [serverType, setServerType] = useState<'local' | 'cloud'>('local');
  const [serverUrl, setServerUrl] = useState('');
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'error' | null>(null);
  const [serverUrlError, setServerUrlError] = useState<string>('');
  const [serverUrlTouched, setServerUrlTouched] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const { login } = useAuth();

  // 언어 초기화
  useEffect(() => {
    const initLanguage = async () => {
      const lang = await getStoredLanguage();
      setCurrentLang(lang);
    };
    initLanguage();
  }, []);

  const handleLanguageChange = async (lang: Language) => {
    await setStoredLanguage(lang);
    setCurrentLang(lang);
    setShowLanguageSelector(false);
  };

  // 서버 URL 로드
  useEffect(() => {
    loadServerUrl();
  }, []);

  const loadServerUrl = async () => {
    try {
      const url = await getApiUrl();
      setServerUrl(url);
      // URL이 클라우드인지 로컬인지 판단
      if (url.startsWith('https://')) {
        setServerType('cloud');
      } else {
        setServerType('local');
      }
    } catch (e) {
      console.error('Failed to load server URL:', e);
    }
  };

  // 서버 타입에 따른 기본 URL 설정
  useEffect(() => {
    if (showServerSettings) {
      if (serverType === 'local') {
        if (!serverUrl || serverUrl.startsWith('https://')) {
          setServerUrl('http://192.168.0.2:3001');
        }
      } else {
        if (!serverUrl || serverUrl.startsWith('http://')) {
          setServerUrl('https://econavi-production.up.railway.app');
        }
      }
      setServerUrlError('');
      setServerUrlTouched(false);
    }
  }, [serverType, showServerSettings]);

  // 서버 URL 유효성 검사
  const validateServerUrl = (url: string): string => {
    if (!url.trim()) {
      return t('login.serverUrlRequired');
    }
    if (!validateApiUrl(url.trim())) {
      return t('login.invalidUrlFormat');
    }
    if (serverType === 'local' && !url.startsWith('http://')) {
      return t('login.localMustHttp');
    }
    if (serverType === 'cloud' && !url.startsWith('https://')) {
      return t('login.cloudMustHttps');
    }
    return '';
  };

  const handleServerUrlChange = (text: string) => {
    setServerUrl(text);
    setConnectionTestResult(null);
    if (serverUrlTouched) {
      const error = validateServerUrl(text);
      setServerUrlError(error);
    }
  };

  const handleServerUrlBlur = () => {
    setServerUrlTouched(true);
    const error = validateServerUrl(serverUrl);
    setServerUrlError(error);
  };

  const handleTestConnection = async () => {
    if (!serverUrl.trim() || !validateApiUrl(serverUrl.trim())) {
      setErrorMessage(t('login.validUrl'));
      setConnectionTestResult('error');
      return;
    }

    setIsTestingConnection(true);
    setErrorMessage('');
    setSuccessMessage('');
    setConnectionTestResult(null);
    
    try {
      const testUrl = serverUrl.trim().replace(/\/$/, ''); // 끝의 슬래시 제거
      const response = await fetch(`${testUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      } as any);
      
      if (response.ok) {
        setSuccessMessage(t('login.connectionSuccess'));
        setConnectionTestResult('success');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(`${t('login.serverResponseError')}: ${response.status}`);
        setConnectionTestResult('error');
      }
    } catch (error: any) {
      setErrorMessage(`${t('login.connectionFailed')}: ${error.message || t('login.unknownError')}`);
      setConnectionTestResult('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveServerUrl = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setServerUrlTouched(true);
    
    const error = validateServerUrl(serverUrl);
    if (error) {
      setServerUrlError(error);
      return;
    }

    try {
      const urlToSave = serverUrl.trim().replace(/\/$/, ''); // 끝의 슬래시 제거
      await setApiUrl(urlToSave);
      await updateApiBaseURL();
      setSuccessMessage(t('login.saveServerUrl'));
      setServerUrlError('');
      setTimeout(() => {
        setShowServerSettings(false);
        setSuccessMessage('');
      }, 1500);
    } catch (error) {
      setServerUrlError(t('login.saveServerUrlFailed'));
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!username || !password) {
      setErrorMessage(t('login.fillAllFields'));
      return;
    }
    
    // 서버 URL이 설정되지 않았으면 먼저 설정하도록 안내
    if (!serverUrl || !validateApiUrl(serverUrl)) {
      setErrorMessage(t('login.setServerFirst'));
      setShowServerSettings(true);
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage(t('login.connecting'));
    
    try {
      // 서버 URL 저장 및 즉시 반영
      const urlToSave = serverUrl.trim().replace(/\/$/, '');
      await setApiUrl(urlToSave);
      await updateApiBaseURL();
      
      // 저장된 URL 확인
      const currentUrl = await getApiUrl();
      console.log('[Login] 로그인 시도:', username);
      console.log('[Login] 서버 URL:', currentUrl);
      
      setLoadingMessage(t('login.loggingIn'));
      const response = await loginAPI(username, password);
      console.log('[Login] 로그인 응답:', response.status, response.data);
      
      if (response.data && response.data.token) {
        console.log('[Login] 토큰 받음, 로그인 처리 중...');
        setLoadingMessage(t('login.loadingUserInfo'));
        await login(response.data.token);
        console.log('[Login] 로그인 처리 완료');
        setSuccessMessage(t('login.loginSuccess'));
      } else {
        console.error('[Login] 토큰이 응답에 없음:', response.data);
        setErrorMessage(t('login.loginFailedToken'));
      }
    } catch (error: any) {
      console.error('[Login] 로그인 오류:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        code: error.code,
      });
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message?.includes('Network request failed') || error.message === 'Network Error') {
        setErrorMessage(
          t('login.cannotConnect') + '\n\n' +
          t('login.checkServer') + '\n' +
          t('login.checkAddress') + '\n' +
          t('login.testFirst')
        );
        setShowServerSettings(true);
      } else {
        const errorMsg = error.response?.data?.message || error.message || t('login.unknownError');
        setErrorMessage(errorMsg);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Icon name="login" size={24} color={Theme.colors.primary} />
          <Text style={styles.title}>{t('login.title')}</Text>
        </View>

        {/* 언어 선택 */}
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setShowLanguageSelector(!showLanguageSelector)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('common.language')}
        >
          <Icon name="translate" size={20} color={Theme.colors.textSecondary} />
          <Text style={styles.languageText}>
            {t('common.language')}: {currentLang === 'ko' ? t('common.korean') : t('common.english')}
          </Text>
          <Icon 
            name={showLanguageSelector ? "chevron-up" : "chevron-down"} 
            size={18} 
            color={Theme.colors.textSecondary} 
          />
        </TouchableOpacity>

        {showLanguageSelector && (
          <View style={styles.languageSelector}>
            <TouchableOpacity
              style={[
                styles.languageOption,
                currentLang === 'ko' && styles.languageOptionActive
              ]}
              onPress={() => handleLanguageChange('ko')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.languageOptionText,
                currentLang === 'ko' && styles.languageOptionTextActive
              ]}>
                {t('common.korean')}
              </Text>
              {currentLang === 'ko' && (
                <Icon name="check" size={20} color={Theme.colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageOption,
                currentLang === 'en' && styles.languageOptionActive
              ]}
              onPress={() => handleLanguageChange('en')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.languageOptionText,
                currentLang === 'en' && styles.languageOptionTextActive
              ]}>
                {t('common.english')}
              </Text>
              {currentLang === 'en' && (
                <Icon name="check" size={20} color={Theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 서버 설정 섹션 */}
        <TouchableOpacity
          style={styles.serverSettingsButton}
          onPress={() => setShowServerSettings(!showServerSettings)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={showServerSettings ? t('login.hideServerSettings') : t('login.serverSettings')}
          accessibilityHint={t('login.menuHint')}
        >
          <Icon 
            name={showServerSettings ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={Theme.colors.textSecondary} 
          />
          <Text style={styles.serverSettingsText}>
            {showServerSettings ? t('login.hideServerSettings') : t('login.serverSettings')}
          </Text>
          <Icon name="server-network" size={20} color={Theme.colors.textSecondary} />
        </TouchableOpacity>

        {showServerSettings && (
          <View style={styles.serverSettingsCard}>
            <Text style={styles.serverSettingsTitle}>{t('login.serverAddressTitle')}</Text>
            
            {/* 서버 타입 선택 */}
            <View style={styles.serverTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.serverTypeButton,
                  serverType === 'local' && styles.serverTypeButtonActive
                ]}
                onPress={() => setServerType('local')}
                activeOpacity={0.8}
              >
                <Icon 
                  name="home" 
                  size={18} 
                  color={serverType === 'local' ? Theme.colors.backgroundLight : Theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.serverTypeText,
                  serverType === 'local' && styles.serverTypeTextActive
                ]}>
                  {t('login.localDev')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.serverTypeButton,
                  serverType === 'cloud' && styles.serverTypeButtonActive
                ]}
                onPress={() => setServerType('cloud')}
                activeOpacity={0.8}
              >
                <Icon 
                  name="cloud" 
                  size={18} 
                  color={serverType === 'cloud' ? Theme.colors.backgroundLight : Theme.colors.textSecondary} 
                />
                <Text style={[
                  styles.serverTypeText,
                  serverType === 'cloud' && styles.serverTypeTextActive
                ]}>
                  {t('login.cloud')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 서버 URL 입력 */}
            <View>
              <View style={[
                styles.inputContainer,
                serverUrlTouched && serverUrlError && styles.inputContainerError,
                serverUrlTouched && !serverUrlError && serverUrl.length > 0 && styles.inputContainerSuccess
              ]}>
                <Icon 
                  name="server" 
                  size={20} 
                  color={
                    serverUrlTouched && serverUrlError ? Theme.colors.error :
                    serverUrlTouched && !serverUrlError && serverUrl.length > 0 ? Theme.colors.success :
                    Theme.colors.textSecondary
                  } 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder={
                    serverType === 'local' 
                      ? "http://192.168.0.2:3001" 
                      : "https://econavi-production.up.railway.app"
                  }
                  placeholderTextColor={Theme.colors.textLight}
                  value={serverUrl}
                  onChangeText={handleServerUrlChange}
                  onBlur={handleServerUrlBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!isLoading}
                />
                {serverUrlTouched && !serverUrlError && serverUrl.length > 0 && (
                  <Icon name="check-circle" size={20} color={Theme.colors.success} />
                )}
              </View>
              {serverUrlTouched && serverUrlError && (
                <Text style={styles.fieldError}>{serverUrlError}</Text>
              )}
              {serverUrlTouched && !serverUrlError && serverUrl.length > 0 && (
                <Text style={styles.fieldSuccess}>{t('login.correctUrlFormat')}</Text>
              )}
            </View>

            {/* 연결 테스트 및 저장 버튼 */}
            <View style={styles.serverButtonRow}>
              <TouchableOpacity
                style={[
                  styles.serverButton, 
                  styles.testButton,
                  connectionTestResult === 'success' && styles.testButtonSuccess,
                  connectionTestResult === 'error' && styles.testButtonError
                ]}
                onPress={handleTestConnection}
                disabled={isTestingConnection}
                activeOpacity={0.8}
              >
                {isTestingConnection ? (
                  <ActivityIndicator size="small" color={Theme.colors.backgroundLight} />
                ) : (
                  <>
                    <Icon 
                      name={
                        connectionTestResult === 'success' ? 'check-circle' :
                        connectionTestResult === 'error' ? 'close-circle' :
                        'network-check'
                      } 
                      size={16} 
                      color={Theme.colors.backgroundLight} 
                    />
                    <Text style={styles.serverButtonText}>{t('login.testConnection')}</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.serverButton, styles.saveButton]}
                onPress={handleSaveServerUrl}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Icon name="content-save" size={16} color={Theme.colors.backgroundLight} />
                <Text style={styles.serverButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>

            {/* 연결 테스트 결과 메시지 */}
            {connectionTestResult === 'success' && successMessage && (
              <View style={styles.messageContainer}>
                <Icon name="check-circle" size={16} color={Theme.colors.success} />
                <Text style={styles.successMessage}>{successMessage}</Text>
              </View>
            )}
            {connectionTestResult === 'error' && errorMessage && (
              <View style={styles.messageContainer}>
                <Icon name="alert-circle" size={16} color={Theme.colors.error} />
                <Text style={styles.errorMessage}>{errorMessage}</Text>
              </View>
            )}

            <Text style={styles.serverHint}>
              {serverType === 'local' 
                ? t('login.localHint')
                : t('login.cloudHint')}
            </Text>
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <Icon name="account" size={20} color={Theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('login.usernamePlaceholder')}
            placeholderTextColor={Theme.colors.textLight}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!isLoading}
            accessibilityLabel={t('login.username')}
            accessibilityHint={t('login.usernamePlaceholder')}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Icon name="lock" size={20} color={Theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('login.passwordPlaceholder')}
            placeholderTextColor={Theme.colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
            accessibilityLabel={t('login.password')}
            accessibilityHint={t('login.passwordPlaceholder')}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isLoading ? t('login.loggingIn') : t('login.loginButton')}
          accessibilityHint={t('login.title')}
          accessibilityState={{ disabled: isLoading }}
        >
          <View style={styles.buttonGradient}>
            {isLoading ? (
              <>
                <ActivityIndicator color={Theme.colors.backgroundLight} size="small" />
                {loadingMessage ? (
                  <Text style={styles.buttonText}>{loadingMessage}</Text>
                ) : (
                  <Text style={styles.buttonText}>처리 중...</Text>
                )}
              </>
            ) : (
              <>
                <Icon name="login" size={20} color={Theme.colors.backgroundLight} />
                  <Text style={styles.buttonText}>{t('login.loginButton')}</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* 에러 메시지 */}
        {errorMessage && !showServerSettings && (
          <View style={styles.messageContainer}>
            <Icon name="alert-circle" size={18} color={Theme.colors.error} />
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          </View>
        )}

        {/* 성공 메시지 */}
        {successMessage && !showServerSettings && (
          <View style={styles.messageContainer}>
            <Icon name="check-circle" size={18} color={Theme.colors.success} />
            <Text style={styles.successMessage}>{successMessage}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Theme.spacing.md,
  },
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
  serverSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  serverSettingsText: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    ...Theme.typography.body2,
    color: Theme.colors.text,
  },
  serverSettingsCard: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  serverSettingsTitle: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: Theme.spacing.md,
  },
  serverTypeContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  serverTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    gap: Theme.spacing.xs,
  },
  serverTypeButtonActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  serverTypeText: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
  },
  serverTypeTextActive: {
    color: Theme.colors.backgroundLight,
    fontWeight: '600',
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
  serverButtonRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  serverButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
    gap: Theme.spacing.xs,
  },
  testButton: {
    backgroundColor: Theme.colors.secondary,
  },
  saveButton: {
    backgroundColor: Theme.colors.primary,
  },
  serverButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
    fontSize: 14,
  },
  serverHint: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
    lineHeight: 18,
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
    backgroundColor: Theme.colors.primary,
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
    gap: Theme.spacing.xs,
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
  testButtonSuccess: {
    backgroundColor: Theme.colors.success,
  },
  testButtonError: {
    backgroundColor: Theme.colors.error,
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
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: Theme.spacing.xs,
  },
  languageText: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    ...Theme.typography.body2,
    color: Theme.colors.text,
  },
  languageSelector: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  languageOptionActive: {
    backgroundColor: Theme.colors.primary + '15',
  },
  languageOptionText: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
  },
  languageOptionTextActive: {
    color: Theme.colors.primary,
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

export default Login;
