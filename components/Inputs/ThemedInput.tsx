import { MaterialIcons } from '@expo/vector-icons';
import { useState, useMemo, forwardRef } from 'react';
import { TextInput, StyleSheet, StyleProp, ViewStyle, View, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ThemedInputProps = {
    /** The name of the icon to display on the input */
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    /** Label to display on the input */
    label: string;
    /** The value of the input */
    value?: string;
    /** The placeholder of the input */
    placeholder?: string;
    /** Custom styles for the input */
    style?: StyleProp<ViewStyle>;
    /** Whether the input is in an error state */
    isError?: boolean;
    /** The error message to display if the input is in an error state */
    errorMessage?: string;
    /** Whether the input should be secure */
    secureTextEntry?: boolean;
    /** Keyboard type for the input */
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    /** Function to call when the input value changes */
    onChangeText?: (text: string) => void;
    /** Function to call when the input loses focus */
    onBlur?: () => void;
    /** Function to call when the input gains focus */
    onFocus?: () => void;
    /** Function to call when the clear button is pressed */
    onSubmitEditing?: () => void;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Background color for the input */
    backgroundColor?: string; 
};

export const ThemedInput = forwardRef<TextInput, ThemedInputProps>(({
    iconName,
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
    onSubmitEditing = () => { },
    disabled = false,
    backgroundColor // Add backgroundColor prop
}, ref) => {
    const { currentTheme } = useTheme();
    const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
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
            backgroundColor: backgroundColor ? backgroundColor : 
                             currentTheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground,
            borderBottomColor: currentTheme === 'light' ? Colors.light.error : Colors.dark.error,
            borderBottomWidth: isError && errorMessage.length > 0 ? 2 : 0,
        },
        // style,
    ]), [currentTheme, isError, errorMessage, style, backgroundColor]); // Include backgroundColor in dependency array

    const errorLabelStyle = useMemo(() => ({
        color: currentTheme === 'light' ? Colors.light.error : Colors.dark.error
    }), [currentTheme]);

    return (
        <View style={[styles.container, style]}>
            <ThemedView style={inputContainerStyle}>
                {!iconName && <ThemedText style={[styles.label, { color }]} type='defaultSemiBold'>
                    {label}
                </ThemedText>}
                
                <View style={styles.inputRow}>
                    <MaterialCommunityIcons name={iconName} size={20} color={color || currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder} />
                    <TextInput
                        ref={ref}
                        onSubmitEditing={onSubmitEditing}
                        style={[styles.input, { color, marginLeft: iconName ? 10 : 0 }]}
                        secureTextEntry={isSecure}
                        value={localValue}
                        onChangeText={handleChangeText}
                        onBlur={onBlur}
                        onFocus={onFocus}
                        placeholder={placeholder}
                        placeholderTextColor={currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder}
                        accessible
                        aria-label={label}
                        keyboardType={keyboardType}
                        editable={!disabled} 
                    />
                    {localValue.length > 0 && !disabled && ( 
                        <Pressable
                            onPress={secureTextEntry ? onToggleSecureValue : onClearValue}
                            style={[styles.iconTouchable]}
                            hitSlop={{ top: 15, bottom: 10, left: 10, right: 10 }}
                            android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', borderless: false, radius: 10 }}
                        >
                            <MaterialIcons
                                name={secureTextEntry ? (isSecure ? 'visibility' : 'visibility-off') : 'cancel'}
                                size={18}
                                color={color}
                            />
                        </Pressable>
                    )}
                </View>
            </ThemedView >
            {isError && errorMessage.length > 0 && (
                <View style={styles.errorLabelContainer}>
                    <MaterialIcons name="error" size={14} color={errorLabelStyle.color} />
                    <ThemedText style={[styles.errorLabel, errorLabelStyle]}>
                        {errorMessage}
                    </ThemedText>
                </View>
            )}
        </View >
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
    },
    inputContainer: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 16,
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
        marginRight: 10,
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

