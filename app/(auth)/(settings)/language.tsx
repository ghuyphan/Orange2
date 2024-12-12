import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { t } from '@/i18n';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import GB from '@/assets/svgs/GB.svg';
import VN from '@/assets/svgs/VN.svg';
import RU from '@/assets/svgs/RU.svg';
import { useLocale } from '@/context/LocaleContext';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMMKVString } from 'react-native-mmkv';
import { useTheme } from '@/context/ThemeContext';

const LanguageScreen = () => {
  const { updateLocale } = useLocale();
  const [locale] = useMMKVString('locale');
  const scrollY = useSharedValue(0);

  const { currentTheme: theme } = useTheme();
  const colors = useMemo(() => (theme === 'light' ? Colors.light.icon : Colors.dark.icon), [theme]);
  const sectionsColors = useMemo(() => (
    theme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground
  ), [theme]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const titleContainerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 140], [0, -35], Extrapolation.CLAMP);
    const opacity = withTiming(scrollY.value > 70 ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: scrollY.value > 50 ? 0 : 20,
    };
  });

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const handleLanguageChange = useCallback((newLocale: string) => {
    updateLocale(newLocale);
  }, [updateLocale]);

  const handleSystemLocale = useCallback(() => {
    updateLocale(undefined);
  }, [updateLocale]);

  const renderLanguageOption = (language: string, flag: React.ReactNode, localeCode: string) => (
    <Pressable
      android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
      onPress={() => handleLanguageChange(localeCode)}
      key={localeCode} 
    >
      <View style={styles.section}>
        <View style={styles.leftSectionContainer}>
          <View style={styles.flagIconContainer}>
            {flag}
          </View>
          <ThemedText>{t(`languageScreen.${language}`)}</ThemedText>
        </View>
        {locale === localeCode && (
          <MaterialIcons name="check" size={20} color={colors} />
        )}
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.blurContainer} />
      <Animated.View style={[styles.titleContainer, titleContainerStyle]} pointerEvents="auto">
        <View style={styles.headerContainer}>
          <View style={styles.titleButtonContainer}>
            <ThemedButton
              iconName="chevron-left"
              style={styles.titleButton}
              onPress={onNavigateBack}
            />
          </View>
          <ThemedText style={styles.title} type="title">{t('languageScreen.title')}</ThemedText>
        </View>
      </Animated.View>
      <Animated.ScrollView style={styles.scrollContainer} onScroll={scrollHandler}>
        <View style={[styles.sectionContainer, { backgroundColor: sectionsColors }]}>
          {renderLanguageOption('vietnamese', <VN width={35} height={35} />, 'vi')}
          {renderLanguageOption('russian', <RU width={35} height={35} />, 'ru')}
          {renderLanguageOption('english', <GB width={35} height={35} />, 'en')}

          <Pressable
            android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
            onPress={handleSystemLocale}
          >
            <View style={styles.section}>
              <View style={styles.leftSectionContainer}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: theme === 'dark' ? Colors.dark.buttonBackground : Colors.light.buttonBackground }
                ]}>
                  <MaterialCommunityIcons name="cog-outline" size={20} color={colors} />
                </View>
                <ThemedText>{t('languageScreen.system')}</ThemedText>
              </View>
              {locale === undefined && (
                <MaterialIcons name="check" size={20} color={colors} />
              )}
            </View>
          </Pressable>
        </View>
      </Animated.ScrollView>
    </ThemedView>
  );
};

export default React.memo(LanguageScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 45,
    left: 0,
    right: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 15,
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  title: {
    fontSize: 28,
  },
  titleButton: {
    zIndex: 11,
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STATUSBAR_HEIGHT,
    zIndex: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingTop: STATUSBAR_HEIGHT + 105,
  },
  sectionContainer: {
    gap: 5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10, 
  },
  leftSectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flagIconContainer: {
    width: 25,
    aspectRatio: 1,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 25,
    aspectRatio: 1,
    borderRadius: 50,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});