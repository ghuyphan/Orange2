import React, { useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { ThemedButton } from '../buttons/ThemedButton';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { t } from '@/i18n';
import { Menu, Surface } from 'react-native-paper';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedEmptyCardProps = {
  lightColor?: string;
  darkColor?: string;
  headerLabel: string;
  footerLabel: string;
  showFooterButton?: boolean;
  footButtonLabel: string;
  cardOnPress?: () => void;
  buttonOnPress?: () => void;
  style?: object;
  footerStyle?: object;
  paddingTop?: number;
  image?: any;
  testID?: string;
  dropdownOptions: { label: string; onPress: () => void; testID?: string; icon?: string }[];
  menuStyle?: object;
  menuContentStyle?: object;
  menuElevation?: number;
  menuMode?: 'flat' | 'elevated';
};

export const DEFAULT_IMAGE = require('@/assets/images/card.png');

export function ThemedEmptyCard({
  lightColor,
  darkColor,
  headerLabel,
  footerLabel,
  showFooterButton = true,
  footButtonLabel,
  cardOnPress,
  buttonOnPress,
  style,
  footerStyle,
  paddingTop,
  image = DEFAULT_IMAGE,
  testID,
  dropdownOptions,
  menuStyle,
  menuContentStyle,
  menuElevation = 0,
  menuMode = 'elevated',
}: ThemedEmptyCardProps) {
  const { currentTheme: colorScheme } = useTheme();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  // const buttonRef = useRef(null);
  const textColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  const colors = useMemo(() => ({
    text: colorScheme === 'light' ? Colors.light.text : Colors.dark.text,
    buttonBackground: colorScheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
    cardBackground: colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
    cardFooter: colorScheme === 'light' ? Colors.light.cardFooter : Colors.dark.cardFooter,
  }), [colorScheme]);

  const styles = useMemo(() => createThemedEmptyCardStyles(paddingTop), [paddingTop]);

  const cardContainerStyle = useMemo(() => [
    { backgroundColor: colors.cardBackground, borderRadius: getResponsiveWidth(4) },
    style,
  ], [colors.cardBackground, style]);

  const footerBackground = useMemo(() => ({ backgroundColor: colors.cardFooter }), [colors.cardFooter]);

  const handleButtonPress = () => {
    if (dropdownOptions?.length > 0) {
      setIsMenuVisible(true);
    } else {
      buttonOnPress?.();
    }
  };

  const renderDropdownItem = (option: { label: string; onPress: () => void; testID?: string; icon?: string }, index: number) => (

    <Pressable
      key={index}
      style={styles.dropdownItem}
      onPress={() => {
        option.onPress();
        setIsMenuVisible(false);
      }}
      testID={option.testID}
    >
      <ThemedText type="defaultSemiBold" numberOfLines={1} style={[styles.dropdownItemText, { color: textColor }]}>
        {t(option.label)}
      </ThemedText>
    </Pressable>
  );

  return (
    <Pressable
      style={cardContainerStyle}
      onPress={cardOnPress}
      testID={testID}
      disabled={!cardOnPress}
    >
      <Surface style={{ borderRadius: getResponsiveWidth(4) }} elevation={menuElevation}>
        <ThemedView style={cardContainerStyle}>
          <View style={styles.cardHeaderContainer}>
            <ThemedText style={[styles.label, { color: colors.text }]} type="title" numberOfLines={2}>
              {t(headerLabel)}
            </ThemedText>
          </View>

          <View style={styles.cardImageContainer}>
            <Image
              source={image}
              style={styles.image}
              accessibilityRole="image"
              accessibilityLabel={t(headerLabel)}
            />
          </View>

          <View style={[styles.cardFooterContainer, footerBackground, footerStyle]}>
            <ThemedText style={{ fontSize: getResponsiveFontSize(16) }} numberOfLines={1}>{t(footerLabel)}</ThemedText>
            {showFooterButton && (
              <Menu
                visible={isMenuVisible}
                onDismiss={() => setIsMenuVisible(false)}
                anchor={
                  <ThemedButton
                    // ref={buttonRef}
                    label={t(footButtonLabel)}
                    onPress={handleButtonPress}
                    style={[styles.cardFooterButton, { backgroundColor: colors.buttonBackground }]}
                  />
                }
                anchorPosition="bottom"
                style={menuStyle}
                contentStyle={[{ borderRadius: getResponsiveWidth(6), backgroundColor: colors.buttonBackground, paddingHorizontal: getResponsiveWidth(2.4) }, menuContentStyle]}
                mode={menuMode}
              >
                {dropdownOptions.map(renderDropdownItem)}
              </Menu>
            )}
          </View>
        </ThemedView>
      </Surface>
    </Pressable >
  );
}

const createThemedEmptyCardStyles = (paddingTop?: number) => StyleSheet.create({
  cardHeaderContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: paddingTop || getResponsiveHeight(2),
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  label: {
    fontSize: getResponsiveFontSize(28),
    lineHeight: getResponsiveFontSize(38),
  },
  cardImageContainer: {
    alignItems: 'center',
    height: getResponsiveHeight(30),
    justifyContent: 'center',
    paddingBottom: getResponsiveHeight(3),
  },
  image: {
    width: getResponsiveWidth(90),
    height: getResponsiveHeight(38),
    resizeMode: 'contain',
  },
  cardFooterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    justifyContent: 'space-between',
    borderBottomLeftRadius: getResponsiveWidth(4),
    borderBottomRightRadius: getResponsiveWidth(4),
  },
  cardFooterButton: {
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  dropdownItem: {
    gap: getResponsiveWidth(2),
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveHeight(1.2),
    paddingHorizontal: getResponsiveWidth(2.4),
  },
  dropdownItemText: {
    fontSize: getResponsiveFontSize(15),
  },
});
