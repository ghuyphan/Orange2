import React, {
  useCallback,
  useState,
  useRef,
  useEffect
} from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView // Import standard ScrollView
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/buttons";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import Avatar, { AvatarConfig as NiceAvatarConfig, SexType, HairStyleType } from "@zamplyy/react-native-nice-avatar";
import { LinearGradient } from "expo-linear-gradient";
import { t } from "@/i18n";
import {
  getResponsiveWidth,
  getResponsiveHeight,
  getResponsiveFontSize
} from "@/utils/responsive";
import { useTheme } from "@/context/ThemeContext";
import ThemedReuseableSheet from "@/components/bottomsheet/ThemedReusableSheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet"; // Keep if ref type relies on it
import { updateAvatarConfig } from "@/store/reducers/authSlice";
import { updateUserAvatarCombined } from "@/services/localDB/userDB";
import { Colors } from "@/constants/Colors";
// Import Color Picker components - Removed OpacitySlider and Swatches from explicit import
import ColorPicker, { Preview, HueSlider, Panel1 } from 'reanimated-color-picker';

// Define proper types for avatar configuration that extends the NiceAvatarConfig
type CustomAvatarConfig = Omit<NiceAvatarConfig, 'sex' | 'hairStyle'> & {
  sex?: SexType;
  hairStyle?: HairStyleType;
  faceColor?: string;
  earSize?: 'small' | 'big';
  hairColor?: string;
  hatStyle?: 'none' | 'beanie' | 'turban';
  hatColor?: string;
  eyeStyle?: 'circle' | 'oval' | 'smile';
  glassesStyle?: 'none' | 'round' | 'square';
  noseStyle?: 'short' | 'long' | 'round';
  mouthStyle?: 'laugh' | 'smile' | 'peace';
  shirtStyle?: 'hoody' | 'short' | 'polo';
  shirtColor?: string;
};

// Define a common margin style for options.
const commonOptionMargin = {
  marginRight: getResponsiveWidth(2),
  marginBottom: getResponsiveHeight(1)
};

// Function to generate styles based on theme colors
const getThemedStyles = (themeColors: typeof Colors.light | typeof Colors.dark) => {
  // --- Adjusted Avatar Size ---
  const baseAvatarSize = getResponsiveWidth(30); // Even smaller avatar
  // --- Adjusted Initial Offset ---
  const avatarInitialOffset = getResponsiveHeight(18); // Increased top margin for more space

  return StyleSheet.create({
      container: {
          flex: 1,
          paddingHorizontal: getResponsiveWidth(3.6),
          backgroundColor: themeColors.background
      },
      headerContainer: {
          position: "absolute",
          top: getResponsiveHeight(10),
          left: getResponsiveWidth(3.6),
          right: getResponsiveWidth(3.6),
          flexDirection: "row",
          alignItems: "center",
          zIndex: 10,
          marginLeft: getResponsiveWidth(13),
      },
      headerButtonContainer: {
          position: "absolute",
          top: getResponsiveHeight(10),
          left: getResponsiveWidth(3.6),
          flexDirection: "row",
          alignItems: "center",
          zIndex: 11,
      },
      titleButton: {
          marginRight: getResponsiveWidth(3.6)
      },
      title: {
          fontSize: getResponsiveFontSize(28)
      },
      avatarContainer: {
          alignItems: "center",
          marginTop: avatarInitialOffset, // Use updated static offset
      },
      gradient: {
          // Adjust border radius if needed based on smaller avatar size, 50 should still be fine (circular)
          borderRadius: getResponsiveWidth(50),
          padding: getResponsiveWidth(1.2),
      },
      scrollView: {
          flex: 1,
          marginTop: getResponsiveHeight(3), // Slightly increased margin below smaller avatar
          paddingHorizontal: getResponsiveWidth(4.8),
          borderRadius: getResponsiveWidth(4),
          backgroundColor: themeColors.cardBackground
      },
      scrollContainer: {
          paddingTop: getResponsiveHeight(2),
          paddingBottom: getResponsiveHeight(1.8),
      },
      selectorContainer: {
          marginBottom: getResponsiveHeight(2.5)
      },
      label: {
          fontSize: getResponsiveFontSize(16),
          marginBottom: getResponsiveHeight(1.2),
      },
      optionsRow: {
          flexDirection: "row",
          flexWrap: "wrap"
      },
      optionCircle: {
          ...commonOptionMargin,
          width: getResponsiveWidth(8),
          height: getResponsiveWidth(8),
          borderRadius: getResponsiveWidth(4),
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: themeColors.border
      },
      selectedOption: {
          borderWidth: 2,
          // borderColor set dynamically
      },
      customOption: {
          borderStyle: "dashed",
          // borderColor set dynamically
      },
      genericOption: {
          ...commonOptionMargin,
          paddingHorizontal: getResponsiveWidth(3),
          paddingVertical: getResponsiveHeight(1),
          borderWidth: 1,
          borderColor: themeColors.border,
          borderRadius: getResponsiveWidth(4)
      },
      genericOptionText: {
          fontSize: getResponsiveFontSize(14)
      },
      saveButton: {
          marginTop: getResponsiveHeight(2),
          marginBottom: getResponsiveHeight(3)
      },
      // --- Bottom Sheet Styles ---
      customSheetContent: {
          flex: 1,
          paddingHorizontal: getResponsiveWidth(5),
          paddingVertical: getResponsiveHeight(2),
          alignItems: 'center',
      },
      sheetTitle: {
          fontSize: getResponsiveFontSize(18),
          marginBottom: getResponsiveHeight(2),
          textAlign: 'center',
          fontWeight: 'bold',
      },
      colorPickerContainer: {
          width: '90%',
          marginBottom: getResponsiveHeight(2),
      },
      previewStyle: {
          height: getResponsiveHeight(5),
          borderRadius: getResponsiveWidth(2),
          marginBottom: getResponsiveHeight(2),
      },
      panelStyle: {
          marginBottom: getResponsiveHeight(2),
      },
      hueSliderStyle: {
          marginBottom: getResponsiveHeight(2),
      },
      // Removed opacitySliderStyle and swatchesStyle
      selectButtonContainer: {
          width: '90%',
          marginTop: getResponsiveHeight(1),
      },
      selectButton: {
          // Inherits ThemedButton styles
      }
  });
};

const EditAvatarScreen = () => {
  const { currentTheme } = useTheme();
  const themeColors = Colors[currentTheme];
  const styles = getThemedStyles(themeColors);

  const dispatch = useDispatch();
  const currentAvatarConfig = useSelector(
      (state: RootState) => state.auth.avatarConfig
  );
  const selectedColor = themeColors.tint;
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [avatarConfig, setAvatarConfig] = useState<CustomAvatarConfig>(() => {
      const defaultConfig = currentAvatarConfig || {};
      return {
          sex: defaultConfig.sex || "man",
          faceColor: defaultConfig.faceColor || "#F5E6CA",
          earSize: defaultConfig.earSize || "small",
          hairStyle: defaultConfig.hairStyle,
          hairColor: defaultConfig.hairColor || "#4B3621",
          hatStyle: defaultConfig.hatStyle || "none",
          hatColor: defaultConfig.hatColor || "#000000",
          eyeStyle: defaultConfig.eyeStyle || "circle",
          glassesStyle: defaultConfig.glassesStyle || "none",
          noseStyle: defaultConfig.noseStyle || "short",
          mouthStyle: defaultConfig.mouthStyle || "smile",
          shirtStyle: defaultConfig.shirtStyle || "short",
          shirtColor: defaultConfig.shirtColor || "#5DADE2",
          ...defaultConfig,
      };
  });

  // --- Constants ---
  const baseAvatarSize = getResponsiveWidth(30); // Use the smaller size

  // --- Avatar Options Arrays (Keep as is) ---
  const faceColors = ["#F5E6CA", "#FFE0BD", "#FFDAB9", "#FFCD94", "#F9C9B6", "#E8BEAC", "#E0CDBA", "#E6D5AE", "#D9B99B", "#EAC086", "#C8B89A", "#BCAFA0", "#D1A17A", "#C68642", "#A1887F", "#8D5524", "#6B4423", "#58331A", "#432616", "#3E271B"];
  const earSizes = ["small", "big"];
  const maleHairStyles: HairStyleType[] = ["normal", "thick", "mohawk"];
  const femaleHairStyles: HairStyleType[] = ["womanLong", "womanShort"];
  const hairColors = [ "#E6BE8A", "#E79CC2", "#23B5D3", "#C19A6B", "#A67B5B", "#B87333", "#8C5A56", "#652DC1", "#704214", "#4B3621", "#000000" ];
  const hatStyles = ["none", "beanie", "turban"];
  const hatColors = [ "#000000", "#FFFFFF", "#8B4513", "#FDFD96", "#B1E693", "#B5EAD7", "#AEC6CF", "#C3B1E1", "#FFB7B2", "#FFD1DC", "#FFC0CB" ];
  const eyeStyles = ["circle", "oval", "smile"];
  const glassesStyles = ["none", "round", "square"];
  const noseStyles = ["short", "long", "round"];
  const mouthStyles = ["laugh", "smile", "peace"];
  const shirtStyles = ["hoody", "short", "polo"];
  const shirtColors = [ "#5DADE2", "#CFE8EF", "#B0E0E6", "#58D68D", "#C1E1C1", "#F4D03F", "#F0E6CC", "#F8B195", "#FAE8E0", "#EC7063", "#FFB6C1", "#D3B4AC", "#E8D3EB", "#CBC3E3" ];

  // --- Custom Color Bottom Sheet State ---
  const customColorSheetRef = useRef<BottomSheet>(null);
  const [customColorProperty, setCustomColorProperty] =
      useState<keyof CustomAvatarConfig | null>(null);
  const [temporaryColor, setTemporaryColor] = useState<string>('#ffffff');

  // --- UPDATED: Callback function for color change completion ---
  const handleColorComplete = useCallback(({ hex }: { hex: string }) => {
      // Update the temporary color state only when interaction ends
      setTemporaryColor(hex);
  }, []); // No dependencies needed

  const openCustomColorSheet = useCallback((property: keyof CustomAvatarConfig) => {
      setCustomColorProperty(property);
      const currentVal = avatarConfig[property] as string;
      setTemporaryColor(currentVal || '#ffffff');
      customColorSheetRef.current?.expand();
  }, [avatarConfig]);

  // --- Option Select Handler (used for presets and confirmation) ---
  const handleOptionSelect = useCallback((property: keyof CustomAvatarConfig, option: string) => {
      setAvatarConfig((prev: CustomAvatarConfig) => ({
          ...prev,
          [property]: option as any
      }));
  }, []);

  // --- Callback to confirm color selection from sheet ---
  const handleConfirmColor = useCallback(() => {
      if (customColorProperty) {
          handleOptionSelect(customColorProperty, temporaryColor);
      }
      customColorSheetRef.current?.close();
  }, [customColorProperty, temporaryColor, handleOptionSelect]);

  // --- Save Handler ---
  const handleSave = useCallback(async () => {
      dispatch(updateAvatarConfig(avatarConfig));
      if (currentUser?.id) {
          try {
              await updateUserAvatarCombined(currentUser.id, avatarConfig);
              console.log("Avatar updated successfully in Redux and local DB.");
          } catch (error) {
              console.error("Failed to update avatar in local DB:", error);
          }
      }
      router.back();
  }, [avatarConfig, currentUser, dispatch]);

  // --- useEffect for Hair Style ---
  useEffect(() => {
      const currentHairStyle = avatarConfig.hairStyle;
      const isFemale = avatarConfig.sex === "woman";
      const allowedHairStyles = isFemale ? femaleHairStyles : maleHairStyles;
      if (!currentHairStyle || !allowedHairStyles.includes(currentHairStyle)) {
          setAvatarConfig((prev: CustomAvatarConfig) => ({
              ...prev,
              hairStyle: allowedHairStyles[0]
          }));
      }
  }, [avatarConfig.sex, avatarConfig.hairStyle]);

  // --- Avatar Options Definition ---
  const avatarOptions: Array<{
      label: string;
      options: string[];
      property: keyof CustomAvatarConfig;
      isColor?: boolean;
  }> = [
          { label: t("editAvatarScreen.gender"), options: ["man", "woman"], property: "sex" },
          { label: t("editAvatarScreen.faceColor"), options: faceColors, property: "faceColor", isColor: true },
          { label: t("editAvatarScreen.earSize"), options: earSizes, property: "earSize" },
          {
              label: t("editAvatarScreen.hairStyle"),
              options: avatarConfig.sex === "woman" ? femaleHairStyles : maleHairStyles,
              property: "hairStyle"
          },
          { label: t("editAvatarScreen.hairColor"), options: hairColors, property: "hairColor", isColor: true },
          { label: t("editAvatarScreen.hatStyle"), options: hatStyles, property: "hatStyle" },
          ...(avatarConfig.hatStyle !== 'none' ? [{ label: t("editAvatarScreen.hatColor"), options: hatColors, property: "hatColor" as keyof CustomAvatarConfig, isColor: true }] : []),
          { label: t("editAvatarScreen.eyeStyle"), options: eyeStyles, property: "eyeStyle" },
          { label: t("editAvatarScreen.glassesStyle"), options: glassesStyles, property: "glassesStyle" },
          { label: t("editAvatarScreen.noseStyle"), options: noseStyles, property: "noseStyle" },
          { label: t("editAvatarScreen.mouthStyle"), options: mouthStyles, property: "mouthStyle" },
          { label: t("editAvatarScreen.shirtStyle"), options: shirtStyles, property: "shirtStyle" },
          { label: t("editAvatarScreen.shirtColor"), options: shirtColors, property: "shirtColor", isColor: true }
      ];

  // --- Render Option Selector ---
  const renderOptionSelector = (
      label: string,
      options: string[],
      property: keyof CustomAvatarConfig,
      isColor: boolean | undefined
  ) => {
      const currentPropertyValue = avatarConfig[property];
      const isCustomColorSelected = typeof currentPropertyValue === 'string' && isColor && !options.includes(currentPropertyValue);

      return (
          <View style={styles.selectorContainer} key={property}>
              <ThemedText style={styles.label}>{label}</ThemedText>
              <View style={styles.optionsRow}>
                  {options.map((option, index) => {
                      const isSelected = currentPropertyValue === option;
                      if (isColor) {
                          return (
                              <TouchableOpacity
                                  key={`${property}-${option}-${index}`}
                                  onPress={() => handleOptionSelect(property, option)}
                                  style={[
                                      styles.optionCircle,
                                      { backgroundColor: option },
                                      isSelected && [styles.selectedOption, { borderColor: selectedColor }]
                                  ]}
                              />
                          );
                      } else {
                          return (
                              <TouchableOpacity
                                  key={`${property}-${option}-${index}`}
                                  onPress={() => handleOptionSelect(property, option)}
                                  style={[
                                      styles.genericOption,
                                      isSelected && [styles.selectedOption, { borderColor: selectedColor }]
                                  ]}
                              >
                                  <ThemedText style={styles.genericOptionText}>
                                      {t(`editAvatarScreen.options.${property}.${option}`) || option}
                                  </ThemedText>
                              </TouchableOpacity>
                          );
                      }
                  })}
                  {isColor && property !== 'faceColor' && (
                      <Pressable
                          key={`${property}-custom`}
                          onPress={() => openCustomColorSheet(property)}
                          style={[
                              styles.optionCircle,
                              styles.customOption,
                              {
                                  backgroundColor: isCustomColorSelected ? currentPropertyValue : 'transparent',
                                  borderColor: isCustomColorSelected ? selectedColor : themeColors.text
                              },
                              isCustomColorSelected && styles.selectedOption,
                          ]}
                      >
                          <MaterialCommunityIcons
                              name="plus"
                              size={20}
                              color={themeColors.text}
                          />
                      </Pressable>
                  )}
              </View>
          </View>
      );
  };

  // --- Return JSX ---
  return (
      <ThemedView style={styles.container}>
          {/* Static Header */}
          <View style={styles.headerContainer}>
              <ThemedText style={styles.title} type="title">
                  {t("editAvatarScreen.title")}
              </ThemedText>
          </View>
          <View style={styles.headerButtonContainer}>
              <ThemedButton
                  iconName="chevron-left"
                  style={styles.titleButton}
                  onPress={() => router.back()}
              />
          </View>

          {/* Static Avatar */}
          <View style={styles.avatarContainer}>
              <LinearGradient
                  colors={['#ff9a9e', '#fad0c4', '#fad0c4', '#fbc2eb', '#a18cd1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradient}
              >
                  {/* Use the smaller baseAvatarSize */}
                  <Avatar size={baseAvatarSize} {...(avatarConfig as NiceAvatarConfig)} />
              </LinearGradient>
          </View>

          {/* Options List using standard ScrollView */}
          <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
          >
              {avatarOptions.map(({ label, options, property, isColor }) =>
                  renderOptionSelector(label, options, property, isColor)
              )}
          </ScrollView>

          {/* Save Button */}
          <ThemedButton
              label={t("editAvatarScreen.save")}
              onPress={handleSave}
              style={styles.saveButton}
          />

          {/* Bottom Sheet for Custom Color Input */}
          <ThemedReuseableSheet
              ref={customColorSheetRef}
              // Adjusted snap points for shorter content
              snapPoints={["55%", "65%"]}
              title={t(`editAvatarScreen.customColorFor`)}
              contentType="custom"
              customContent={
                  customColorProperty && (
                      <View style={styles.customSheetContent}>
                          <ColorPicker
                              style={styles.colorPickerContainer}
                              value={temporaryColor}
                              // --- UPDATED: Use onCompleteJS for performance ---
                              onCompleteJS={handleColorComplete}
                          >
                              <Preview style={styles.previewStyle} hideInitialColor/>
                              <Panel1 style={styles.panelStyle} />
                              <HueSlider style={styles.hueSliderStyle}  />
                              {/* Removed OpacitySlider and Swatches */}
                          </ColorPicker>
                          {/* Confirm Button remains */}
                          <View style={styles.selectButtonContainer}>
                              <ThemedButton
                                  label={t("editAvatarScreen.selectColor")}
                                  onPress={handleConfirmColor}
                                  style={styles.selectButton}
                              />
                          </View>
                      </View>
                  )
              }
          />
      </ThemedView>
  );
};

export default EditAvatarScreen;