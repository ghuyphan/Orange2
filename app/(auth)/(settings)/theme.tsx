import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, Platform, useColorScheme, Pressable, Appearance } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
    interpolate,
    Extrapolation,
    useAnimatedScrollHandler
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { t } from '@/i18n';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';

import { useLocale } from '@/context/LocaleContext';
import { Ionicons } from '@expo/vector-icons';
import DARK from '@/assets/svgs/dark.svg';
import LIGHT from '@/assets/svgs/light.svg';
import { useTheme } from '@/context/ThemeContext';
import { ThemedStatusToast } from '@/components/toast/ThemedOfflineToast';
import { throttle } from 'lodash';
import { ThemedToast } from '@/components/toast/ThemedToast';

const ThemeScreen: React.FC = () => {
    const colors = useThemeColor({ light: Colors.light.text, dark: Colors.dark.text }, 'text');
    const sectionsColors = useThemeColor({ light: Colors.light.cardBackground, dark: Colors.dark.cardBackground }, 'cardBackground');
    const { setDarkMode, useSystemTheme, isDarkMode } = useTheme();
    const { updateLocale } = useLocale();
    const [isToastVisible, setIsToastVisible] = useState(false);

    const scrollY = useSharedValue(0);

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

    const handleThemeChange = useCallback((theme: string) => {
        if (theme === 'dark') {
            setDarkMode(true);
        } else if (theme === 'light') {
            setDarkMode(false);
        } else {
            useSystemTheme();
            setIsToastVisible(true);
            setTimeout(() => {
                setIsToastVisible(false);
            }, 2000)
        }
    }, [setDarkMode, useSystemTheme]);

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.blurContainer} />

            <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
                <View style={styles.headerContainer}>
                    <ThemedButton
                        iconName="chevron-left"
                        style={styles.titleButton}
                        onPress={onNavigateBack}
                    />
                    <ThemedText type='title' style={styles.title}>{t('themeScreen.title')}</ThemedText>
                </View>
            </Animated.View>

            <Animated.ScrollView style={styles.scrollContainer} onScroll={scrollHandler}>
                <View style={[styles.descriptionContainer, { backgroundColor: sectionsColors }]}>
                    <View style={styles.descriptionItem}>
                        <LIGHT width={120} height={120} />
                        <ThemedText>{t('themeScreen.light')}</ThemedText>
                    </View>
                    <View style={styles.descriptionItem}>
                        <DARK width={120} height={120} />
                        <ThemedText>{t('themeScreen.dark')}</ThemedText>
                    </View>
                </View>

                <ThemedView style={[styles.sectionContainer, { backgroundColor: sectionsColors }]}>
                    <Pressable
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
                        onPress={() => handleThemeChange('light')}
                    >
                        <View style={styles.section}>
                            <View style={styles.leftSectionContainer}>
                                <View style={[
                                    styles.iconContainer,
                                    useColorScheme() === 'dark' ? { backgroundColor: Colors.dark.buttonBackground } : { backgroundColor: Colors.light.buttonBackground }
                                ]}>
                                    <Ionicons name="sunny-outline" size={20} color={colors} />
                                </View>
                                <ThemedText>{t('themeScreen.light')}</ThemedText>
                            </View>
                            {isDarkMode === false && <Ionicons name="checkmark-outline" size={20} color={Colors.light.text} />}
                        </View>
                    </Pressable>

                    <Pressable
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
                        onPress={() => handleThemeChange('dark')}
                    >
                        <View style={styles.section}>
                            <View style={styles.leftSectionContainer}>
                                <View style={[
                                    styles.iconContainer,
                                    useColorScheme() === 'dark' ? { backgroundColor: Colors.dark.buttonBackground } : { backgroundColor: Colors.light.buttonBackground }
                                ]}>
                                    <Ionicons name="moon-outline" size={20} color={colors} />
                                </View>
                                <ThemedText>{t('themeScreen.dark')}</ThemedText>
                            </View>
                            {isDarkMode === true && <Ionicons name="checkmark" size={20} color={Colors.dark.text} />}
                        </View>
                    </Pressable>

                    <Pressable
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
                        onPress={() => handleThemeChange('system')}
                    >
                        <View style={styles.section}>
                            <View style={styles.leftSectionContainer}>
                                <View style={[
                                    styles.iconContainer,
                                    useColorScheme() === 'dark' ? { backgroundColor: Colors.dark.buttonBackground } : { backgroundColor: Colors.light.buttonBackground }
                                ]}>
                                    <Ionicons name="cog-outline" size={20} color={colors} />
                                </View>
                                <ThemedText>{t('themeScreen.system')}</ThemedText>
                            </View>
                            {isDarkMode === undefined && <Ionicons name="checkmark-outline" size={20} color={colors} />}
                        </View>
                    </Pressable>
                </ThemedView>
                <ThemedToast
                    iconName='checkmark-circle'
                    message={t('themeScreen.successMessage')}
                    isVisible={isToastVisible}
                    duration={1000}
                    style={{ position: 'absolute', bottom: 30, left: 15, right: 15 }}
                    onDismiss={() => setIsToastVisible(false)}
                />
            </Animated.ScrollView>
        </ThemedView>
    );
}

export default React.memo(ThemeScreen);

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
    descriptionContainer: {
        flexDirection: 'row',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 35,
        overflow: 'hidden',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    descriptionItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        flexDirection: 'column',

    },
    descriptionText: {
        fontSize: 14,
    },
    sectionContainer: {
        gap: 5,
        borderRadius: 10,
        overflow: 'hidden',
    },
    section: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        pointerEvents: 'none',
    },
    leftSectionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
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
        width: 28,
        aspectRatio: 1,
        borderRadius: 50,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
});