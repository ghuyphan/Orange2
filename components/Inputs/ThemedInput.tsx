import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, useMemo } from 'react';
import { TextInput, StyleSheet, TouchableHighlight, View, TouchableWithoutFeedback, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedInputProps = {
    /** Light color theme for the input text */
    lightColor?: string;
    /** Dark color theme for the input text */
    darkColor?: string;
    /** Label to display on the input */
    label: string;
    /** The value of the input */
    value?: string;
    /** The placeholder of the input */
    placeholder?: string;
    /** Custom styles for the input */
    style?: object;
    /** Whether the input is in an error state */
    isError?: boolean;
    /** The error message to display if the input is in an error state */
    errorMessage?: string;
    /** Whether the input should be secure */
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
    /** Function to call when the input value changes */
    onChangeText?: (text: string) => void;
    /** Function to call when the input loses focus */
    onBlur?: () => void;
    /** Function to call when the input gains focus */
    onFocus?: () => void;
    /** Function to call when the clear button is pressed */
    onSubmitEditing?: () => void
};

export function ThemedInput({
    lightColor,
    darkColor,
    label,
    placeholder,
    value = '',
    style,
    isError = false,
    errorMessage = '',
    secureTextEntry = false,
    keyboardType = 'default',
    onChangeText = () => { },
    onBlur = () => { },
    onFocus = () => { },
    onSubmitEditing = () => { }
}: ThemedInputProps) {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const colorScheme = useColorScheme();
    const [localValue, setLocalValue] = useState(value);
    const [isSecure, setIsSecure] = useState(secureTextEntry);

    const onClearValue = () => {
        setLocalValue('');
        onChangeText('');
    };

    const onToggleSecureValue = () => setIsSecure(prevState => !prevState);

    const handleChangeText = (text: string) => {
        setLocalValue(text);
        onChangeText(text);
    };

    const inputContainerStyle = useMemo(() => ([
        styles.inputContainer,
        {
            backgroundColor: colorScheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground,
            borderBottomColor: colorScheme === 'light' ? Colors.light.error : Colors.dark.error,
            borderBottomWidth: isError && errorMessage.length > 0 ? 2 : 0
        },
        style,
    ]), [colorScheme, isError, errorMessage, style]);

    const errorLabelStyle = useMemo(() => ({
        color: colorScheme === 'light' ? Colors.light.error : Colors.dark.error
    }), [colorScheme]);

    return (
        <View style={[styles.container, { marginBottom: isError ? 0 : 20 }]}>
            <ThemedView style={inputContainerStyle}>
                <ThemedText style={[styles.label, { color }]} type='defaultSemiBold'>
                    {label}
                </ThemedText>
                <View style={styles.inputRow}>
                    <TextInput
                        onSubmitEditing={onSubmitEditing}
                        style={[styles.input, { color }]}
                        secureTextEntry={isSecure}
                        value={localValue}
                        onChangeText={handleChangeText}
                        onBlur={onBlur}
                        onFocus={onFocus}
                        placeholder={placeholder}
                        placeholderTextColor={colorScheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder}
                        accessible
                        aria-label={label}
                        keyboardType={keyboardType}
                    />
                    {localValue.length > 0 && (

                        <Pressable
                            onPress={secureTextEntry ? onToggleSecureValue : onClearValue}
                            style={[styles.iconTouchable]}
                            hitSlop={{ top: 15, bottom: 10, left: 10, right: 10 }}
                            android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', borderless: false, radius: 10 }}

                        >
                            <Ionicons
                                name={secureTextEntry ? (isSecure ? 'eye-sharp' : 'eye-off-sharp') : 'close-circle-sharp'}
                                size={18}
                                color={color}
                            />
                        </Pressable>

                    )}
                </View>
            </ThemedView >
            {isError && errorMessage.length > 0 && (
                <View style={styles.errorLabelContainer}>
                    <Ionicons name="alert-circle" size={14} color={errorLabelStyle.color} />
                    <ThemedText style={[styles.errorLabel, errorLabelStyle]}>
                        {errorMessage}
                    </ThemedText>
                </View>
            )
            }
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
    },
    inputContainer: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        flexDirection: 'column',
    },
    label: {
        fontSize: 13,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',

    },
    input: {
        fontSize: 16,
        height: 30,
        flex: 1,  // Allows the input to take available space but not overlap the button
    },
    iconTouchable: {
        borderRadius: 50,
        overflow: 'hidden',
    },
    errorLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 10,
    },
    errorLabel: {
        fontSize: 14,
    },
});