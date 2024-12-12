import React, { useEffect, useState } from 'react';
import { StyleSheet, Keyboard, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Formik } from 'formik';

import { ThemedView } from '@/components/ThemedView';
import { ThemedInput } from '@/components/Inputs/ThemedInput';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedToast } from '@/components/toast/ThemedToast';
// import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { t } from '@/i18n';
import { forgotPasswordSchema } from '@/utils/validationSchemas';
import { forgot } from '@/services/auth';
import { ThemedText } from '@/components/ThemedText';
import { width, height } from '@/constants/Constants';
import { useLocale } from '@/context/LocaleContext';
import LOGO from '@/assets/svgs/orange-logo.svg';
import { useTheme } from '@/context/ThemeContext';

export default function ForgotPasswordScreen() {
  // const colorScheme = useColorScheme();
  const { currentTheme } = useTheme();
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { locale } = useLocale();

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
  }, []);

  const onDismissToast = () => {
    setIsToastVisible(false);
  };

  return (
    <Formik
      initialValues={{ email: '' }}
      validationSchema={forgotPasswordSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
          await forgot(values.email);
          setIsToastVisible(true);
          setErrorMessage(t('forgotPasswordScreen.successMessage'));
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
          extraScrollHeight={70}
          extraHeight={100}
          enableOnAndroid
          showsVerticalScrollIndicator={false}
          scrollEnabled={isKeyboardVisible}
        >
            <View style={styles.topContainer}>
                <View style={styles.logoContainer}>
                    <LOGO width={width * 0.14} height={width * 0.14} />
                </View>
                <ThemedText style={styles.title} type='title'>{t('forgotPasswordScreen.forgotPassword')}</ThemedText>
            </View>
          <View style={styles.inputContainer}>
          <ThemedInput
            label={t('forgotPasswordScreen.email')}
            placeholder={t('forgotPasswordScreen.emailPlaceholder')}
            onChangeText={handleChange('email')}
            isError={touched.email && errors.email ? true : false}
            onBlur={handleBlur('email')}
            value={values.email}
            errorMessage={touched.email && errors.email ? errors.email : ''}
          />
          </View>
          <ThemedButton
            label={t('forgotPasswordScreen.sendResetLink')}
            style={styles.forgotButton}
            onPress={handleSubmit}
            loadingLabel={t('forgotPasswordScreen.sendingResetLink')}
            loading={isSubmitting}
          />
          <ThemedToast
            message={errorMessage}
            isVisible={isToastVisible}
            style={styles.toastContainer}
            onDismiss={onDismissToast}
            onVisibilityToggle={setIsToastVisible}
            iconName='info'
          />
        </KeyboardAwareScrollView>
      )}
    </Formik >
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    marginHorizontal: 15,
    maxHeight: '130%',
  },
  topContainer: {
    marginTop: 105,
    gap: 20,
    alignItems: 'center'
},
  logoContainer: {
    backgroundColor: '#FFF5E1',
    padding: 14,
    borderRadius: 20,
    alignSelf: 'center',
},
  title: {
    // marginBottom: 20,
    fontSize: 25,
    textAlign: 'center',
  },
  inputContainer:{
    // padding: 5,
    borderRadius: 16,
    // gap: 5,
    marginBottom: 10,
    marginTop: 20
  },
  forgotButton: {
    marginTop: 20,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
  }
});
