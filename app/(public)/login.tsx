import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Keyboard, Pressable } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedInput } from '@/components/Inputs/ThemedInput';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedTextButton } from '@/components/buttons/ThemedTextButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
import { Colors } from '@/constants/Colors';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';
import { t } from '@/i18n';
import { loginSchema } from '@/utils/validationSchemas';
import { login } from '@/services/auth';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { Logo } from '@/components/AppLogo';
import GB from '@/assets/svgs/GB.svg';
import VN from '@/assets/svgs/VN.svg';
import RU from '@/assets/svgs/RU.svg';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMMKVString } from 'react-native-mmkv';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';

// Define the valid language keys:  VERY IMPORTANT
type LanguageKey = 'vi' | 'ru' | 'en';

// Define the LanguageOption type
interface LanguageOption {
  label: string;
  flag: React.ReactNode;
}

// Use the LanguageKey type in the languageOptions object:
const languageOptions: Record<LanguageKey, LanguageOption> = {
  vi: { label: 'Tiếng Việt', flag: <VN width={getResponsiveWidth(7.2)} height={getResponsiveHeight(3)} /> },
  ru: { label: 'Русский', flag: <RU width={getResponsiveWidth(7.2)} height={getResponsiveHeight(3)} /> },
  en: { label: 'English', flag: <GB width={getResponsiveWidth(7.2)} height={getResponsiveHeight(3)} /> },
};


export default function LoginScreen() {
  const { locale, updateLocale } = useLocale();
  const [storedLocale, setStoredLocale] = useMMKVString('locale'); // Use MMKV to get stored locale
  const { currentTheme } = useTheme();
  const cardColor = currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground;
  const authRefreshError = useSelector((state: RootState) => state.error.message);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const bottomSheetRef = useRef<any>(null); // Ref for the bottom sheet


  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, [isKeyboardVisible]);

  useEffect(() => {
    if (authRefreshError !== null) {
      setIsToastVisible(true);
      setErrorMessage(authRefreshError);
    }
  }, [authRefreshError]);

  const onDismissToast = () => {
    setIsToastVisible(false);
  };

  const onNavigateToRegister = () => {
    Keyboard.dismiss();
    router.push('/register');
  };

  const onNavigateToForgot = () => {
    Keyboard.dismiss();
    router.push('/forgot-password');
  };

  const handleLanguageChange = useCallback(
    (newLocale: LanguageKey) => {  // Use LanguageKey here
      updateLocale(newLocale);
      setStoredLocale(newLocale);  //  Save to MMKV **********************
      bottomSheetRef.current?.close(); // Close the bottom sheet
    },
    [updateLocale, setStoredLocale]
  );

  const handleSystemLocale = useCallback(() => {
    updateLocale(undefined);
    setStoredLocale(undefined); // Save to MMKV ***********************
    bottomSheetRef.current?.close(); // Close the bottom sheet
  }, [updateLocale, setStoredLocale]);

  const toggleLanguageDropdown = () => {
    bottomSheetRef.current?.expand(); // Open the bottom sheet
  };

  const renderLanguageOptions = () => {
    const colors = currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon;
    const textColors = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;

    return (
      <View style={[styles.languageOptionsContainer, { backgroundColor: cardColor }]}>
        {Object.entries(languageOptions).map(([key, { label, flag }]) => (
          <Pressable key={key} onPress={() => handleLanguageChange(key as LanguageKey)} style={styles.languageOption}>
            <View style={styles.leftSectionContainer}>
              <View style={styles.flagIconContainer}>{flag}</View>
              <ThemedText style={{ color: textColors }}>{label}</ThemedText>
            </View>
            {storedLocale === key && (
              <MaterialIcons name="check" size={getResponsiveFontSize(18)} color={colors} />
            )}
          </Pressable>
        ))}
        <Pressable onPress={handleSystemLocale} style={styles.languageOption}>
          <View style={styles.leftSectionContainer}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={getResponsiveFontSize(18)}
              color={colors}
            />
            <ThemedText style={{ color: textColors }}>{t('languageScreen.system')}</ThemedText>
          </View>
          {storedLocale === undefined && (
            <MaterialIcons name="check" size={getResponsiveFontSize(18)} color={colors} />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validationSchema={loginSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
          await login(values.email, values.password);
          router.replace('/(auth)/home');
        } catch (error) {
          const errorAsError = error as Error;
          setIsToastVisible(true);
          setErrorMessage(errorAsError.toString());
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          style={[{ backgroundColor: currentTheme === 'light' ? Colors.light.background : Colors.dark.background }]}
          contentContainerStyle={styles.container}
          extraScrollHeight={getResponsiveHeight(8.5)}
          extraHeight={getResponsiveHeight(24)}
          enableOnAndroid={true}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isKeyboardVisible}
        >
          <View style={styles.languageSelectorContainer}>
            <ThemedTextButton
              onPress={toggleLanguageDropdown}
              label={storedLocale ? (languageOptions[storedLocale as LanguageKey]?.label || t('languageScreen.system')) : t('languageScreen.system')} // Cast storedLocale
              rightIconName='chevron-down'
            />
          </View>

          {/* Logo Centered */}
          <View style={styles.logoContainer}>
            <Logo size={getResponsiveWidth(4)} />
          </View>

          {/* Input Fields */}
          <View style={styles.inputsWrapper}>
            <ThemedInput
              placeholder={t('loginScreen.emailPlaceholder')}
              onChangeText={handleChange('email')}
              isError={touched.email && errors.email ? true : false}
              onBlur={handleBlur('email')}
              value={values.email}
              errorMessage={touched.email && errors.email ? t(`loginScreen.errors.${errors.email}`) : ''}
              disabled={isSubmitting}
              disableOpacityChange={true}
            />

            <ThemedInput
              placeholder={t('loginScreen.passwordPlaceholder')}
              secureTextEntry={true}
              onChangeText={handleChange('password')}
              isError={touched.password && errors.password ? true : false}
              onBlur={handleBlur('password')}
              value={values.password}
              errorMessage={touched.password && errors.password ? t(`loginScreen.errors.${errors.password}`) : ''}
              disabled={isSubmitting}
              disableOpacityChange={true}
            />
          </View>

          {/* Login Button */}
          <ThemedButton
            label={t('loginScreen.login')}
            style={styles.loginButton}
            onPress={handleSubmit}
            loadingLabel={t('loginScreen.loggingIn')}
            loading={isSubmitting}
            textStyle={styles.loginButtonText}
          />

          {/* Forgot Password */}
          <View style={styles.forgotButtonContainer}>
            <ThemedTextButton
              label={t('loginScreen.forgotPassword')}
              onPress={onNavigateToForgot}
              style={{opacity: 0.7}}
            />
          </View>

          {/* Meta Logo */}
          <View style={styles.metaLogoContainer}>
            <ThemedButton
              label={t('loginScreen.registerNow')}
              onPress={onNavigateToRegister}
              style={styles.createAccountButton}
              textStyle={styles.createAccountButtonText}
              outline
            />
            <ThemedText type='defaultSemiBold' style={styles.metaText}>{t('common.appName')}</ThemedText>
          </View>

          {/* Toast for errors */}
          <ThemedToast
            duration={5000}
            message={errorMessage}
            isVisible={isToastVisible}
            style={styles.toastContainer}
            onDismiss={onDismissToast}
            onVisibilityToggle={setIsToastVisible}
            iconName="error"
          />
          {/* Bottom Sheet for Language Selection */}
          <ThemedReuseableSheet
            ref={bottomSheetRef}
            title={t('loginScreen.selectLanguage')}
            snapPoints={['40%']} // Adjust the height as needed
            showCloseButton={true}
            contentType='custom'
            customContent={renderLanguageOptions()}
          />
        </KeyboardAwareScrollView>
      )}
    </Formik>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  languageSelectorContainer: {
    alignItems: 'center',
    marginTop: getResponsiveHeight(13),
    position: 'relative',
  },
  languageText: {
    fontSize: getResponsiveFontSize(16),
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: getResponsiveHeight(6),
    marginBottom: getResponsiveHeight(8),
  },
  inputsWrapper: {
    gap: getResponsiveHeight(2),
    width: '100%',
    marginBottom: getResponsiveHeight(2),
  },
  passwordContainer: {
    marginBottom: getResponsiveHeight(3),
  },
  loginButton: {
    height: getResponsiveHeight(6),
    marginBottom: getResponsiveHeight(2),
  },
  loginButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  forgotButtonContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveHeight(4),
  },
  createAccountContainer: {
    alignItems: 'center',
    marginTop: getResponsiveHeight(2),
  },
  createAccountButton: {
    borderRadius: getResponsiveWidth(8),
    height: getResponsiveHeight(6),
    width: '100%',
    marginBottom: getResponsiveHeight(2),
  },
  createAccountButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  metaLogoContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: getResponsiveHeight(4),
  },
  metaText: {
    fontSize: getResponsiveFontSize(16),
    color: '#999',
  },
  toastContainer: {
    position: 'absolute',
    bottom: getResponsiveHeight(1.8),
    left: 0,
    right: 0,
    marginHorizontal: getResponsiveWidth(3.6),
  },

  flagIconContainer: {
    width: getResponsiveWidth(4.8),
    aspectRatio: 1,
    borderRadius: getResponsiveWidth(12),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  languageOptionsContainer: {
    marginTop: getResponsiveHeight(1.8),
    marginHorizontal: getResponsiveWidth(3.6),
    borderRadius: getResponsiveWidth(4),
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: getResponsiveWidth(4),
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
  },
  leftSectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
  },
});