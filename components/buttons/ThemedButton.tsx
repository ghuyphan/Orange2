import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableHighlight, StyleProp, ViewStyle, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

/**
 * ThemedButtonProps defines the properties for the ThemedButton component.
 */
export type ThemedButtonProps = {
    /** Light color theme for the button text */
    lightColor?: string;
    /** Dark color theme for the button text */
    darkColor?: string;
    /** Label to display on the button */
    label?: string;
    /** Label to display while the button is in a loading state */
    loadingLabel?: string;
    /** Name of the icon to display in the button */
    iconName?: keyof typeof Ionicons.glyphMap;
    /** Color of the icon to display in the button */
    iconColor?: string;
    /** Size of the icon to display in the button */
    iconSize?: number;
    /** Underlay color for the button */
    underlayColor?: string;
    /** Function to call when the button is pressed */
    onPress: () => void;
    /** Custom styles for the button */
    style?: StyleProp<ViewStyle>;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Whether the button is in a loading state */
    loading?: boolean;
};

/**
 * ThemedButton is a reusable button component that adapts to the current theme.
 * It supports light and dark color themes, displays an optional icon, and handles
 * press events with customizable styles.
 *
 * @param {ThemedButtonProps} props - The properties for the ThemedButton component.
 * @returns {JSX.Element} The ThemedButton component.
 */
export function ThemedButton({
    lightColor,
    darkColor,
    label,
    loadingLabel,
    iconName,
    iconColor,
    iconSize = 20,
    underlayColor,
    onPress,
    style = {},
    disabled = false,
    loading = false,
}: ThemedButtonProps): JSX.Element {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const colorScheme = useColorScheme();

    const buttonStyle = useMemo(() => ([
        {
            backgroundColor: colorScheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
            opacity: disabled || loading ? 0.7 : 1,
        },
        styles.touchable,
    ]), [colorScheme, disabled, loading, style]);

    return (
            <TouchableWithoutFeedback
                onPressIn={onPress}
                disabled={disabled || loading}
                accessible
                accessibilityLabel={label}
                accessibilityRole="button"
                accessibilityHint={`Press to ${label}`}

            // underlayColor={underlayColor || (colorScheme === 'light' ? Colors.light.buttonHighlight : Colors.dark.buttonHighlight)}
            >
                <View style={[buttonStyle, style]}>
                    {loading ? (
                        <>
                            <ActivityIndicator size="small" color={color} />
                            <ThemedText style={[styles.label, { color }]} type='defaultSemiBold'>
                                {loadingLabel}
                            </ThemedText>
                        </>
                    ) : (
                        <>
                            {iconName && <Ionicons name={iconName} size={iconSize} color={iconColor ? iconColor : color} />}
                            {label && <ThemedText style={[styles.label, { color }]} type='defaultSemiBold'>{label}</ThemedText>}
                        </>
                    )}
                </View>
            </TouchableWithoutFeedback>
        // </View>
    );
}

const styles = StyleSheet.create({
    touchable: {
        borderRadius: 50,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 5,

    },
    label: {
        fontSize: 15,
    },
});
