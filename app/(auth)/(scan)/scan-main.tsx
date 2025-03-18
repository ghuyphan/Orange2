import React, { useEffect, useState, useRef, useCallback, Suspense, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  AppState,
  PermissionsAndroid,
  LayoutChangeEvent,
} from 'react-native';
import { Camera, useCodeScanner } from 'react-native-vision-camera';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedProps,
} from 'react-native-reanimated';
import { useUnmountBrightness } from '@reeq/react-native-device-brightness';
import { Redirect, useRouter } from 'expo-router';
import { GestureDetector } from 'react-native-gesture-handler';
import { throttle } from 'lodash';
import BottomSheet from '@gorhom/bottom-sheet';

// Local imports
import { t } from '@/i18n';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { MAX_ZOOM_FACTOR, width } from '@/constants/Constants';
import { storage } from '@/utils/storage';
import { triggerLightHapticFeedback } from '@/utils/haptic';
import SheetType from '@/types/sheetType';

// Components - Consider lazy loading for non-critical components
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ScannerFrame } from '@/components/camera/ScannerFrame';
import { FocusIndicator } from '@/components/camera/FocusIndicator';
import { ZoomControl } from '@/components/camera/ZoomControl';
import { QRResult } from '@/components/camera/CodeResult';
import { ThemedView } from '@/components/ThemedView';
import { ThemedStatusToast } from '@/components/toast/ThemedStatusToast';
// Lazy load the bottom sheet as it's not immediately visible
// const ThemedReuseableSheet = React.lazy(() => import('@/components/bottomsheet/ThemedReusableSheet'));
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';

// Hooks
import { useMMKVBoolean } from 'react-native-mmkv';
// import useHandleCodeScanned from '@/hooks/useHandleCodeScanned';
import { useLocale } from '@/context/LocaleContext';
import { useCameraScanner } from '@/hooks/useCameraScanner';
import { useCameraSetup } from '@/hooks/useCameraSetup';
import { useFocusGesture } from '@/hooks/useFocusGesture';
import { useGalleryPicker } from '@/hooks/useGalleryPicker';
import { getResponsiveHeight, getResponsiveWidth } from '@/utils/responsive';

// Create animated camera component
const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
Reanimated.addWhitelistedNativeProps({ zoom: true });

// Main component
export default function ScanScreen() {
  // Context and Navigation
  const { locale } = useLocale();
  const router = useRouter();
  const isMounted = useRef(true);

  // Camera Ref and Setup - Defer camera setup until component is mounted
  const cameraRef = useRef(null);
  const [setupCamera, setSetupCamera] = useState(false);
  const { device, hasPermission, torch, toggleFlash } = useCameraSetup(cameraRef);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [allPermissionsGranted, setAllPermissionsGranted] = useState<boolean | null>(null);

  const zoom = useSharedValue(1);
  const minZoom = device?.minZoom ?? 1;
  const maxZoom = Math.min(device?.maxZoom ?? 1, MAX_ZOOM_FACTOR);

  const cameraAnimatedProps = useAnimatedProps(() => ({
    zoom: Math.max(Math.min(zoom.value, maxZoom), minZoom),
  }), [maxZoom, minZoom, zoom]);

  // Use effect to defer camera setup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) {
        setSetupCamera(true);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      isMounted.current = false;
    };
  }, []);

  // Focus Gesture - Only initialize when camera is ready
  const { gesture, focusPoint, animatedFocusStyle } = useFocusGesture(cameraRef, zoom);

  // Camera Scanner - Memoize scanner to prevent unnecessary re-renders
  const {
    scanFrame,
    codeScannerHighlights,
    codeMetadata,
    codeValue,
    codeType,
    iconName,
    quickScan,
    showIndicator,
    toggleQuickScan,
    toggleShowIndicator,
    createCodeScannerCallback,
  } = useCameraScanner();

  // Auto Brightness - Memoize callback
  const [autoBrightness, setAutoBrightness] = useMMKVBoolean('autoBrightness', storage);

  useEffect(() => {
    if (autoBrightness === undefined) {
      setAutoBrightness(true);
    }
  }, [setAutoBrightness, autoBrightness]);

  const toggleAutoBrightness = useCallback(() => {
    setAutoBrightness(prev => !prev);
    triggerLightHapticFeedback();
  }, [setAutoBrightness]);

  // Layout and State
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [cameraIsActive, setCameraIsActive] = useState(true);
  const [sheetType, setSheetType] = useState<SheetType | null>(null);

  // Toast handler
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => {
      if (isMounted.current) {
        setIsToastVisible(false);
      }
    }, 2500);
  }, []);

  const handleExpandPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  // Layout handler
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  }, []);

  // Unmount brightness handler
  useUnmountBrightness(1, true);

  // Code scanner - Memoize to prevent re-creation
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'code-39', 'ean-13', 'ean-8', 'upc-a', 'upc-e', 'data-matrix'],
    onCodeScanned: createCodeScannerCallback,
  });

  // Navigation handler - Memoized and throttled
  const onNavigateToAddScreen = useCallback(
    throttle(
      (codeFormat, codeValue, bin, codeType, codeProvider) => {
        if (isMounted.current) {
          router.push({
            pathname: `/(auth)/(add)/add-new`,
            params: {
              codeFormat,
              codeValue,
              codeBin: bin,
              codeType,
              codeProvider,
            },
          });
        }
      },
      1000,
      { leading: true, trailing: false }
    ),
    [router]
  );

  // Sheet handler
  const onOpenSheet = useCallback((type: SheetType) => {
    setSheetType(type);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  // Gallery picker
  const onOpenGallery = useGalleryPicker({
    onOpenSheet,
    onNavigateToAddScreen,
  });

  // Animation values
  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Update opacity when code is scanned
  useEffect(() => {
    if (codeMetadata.length > 0) {
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [codeMetadata, opacity]);

  // Camera opacity animation
  const cameraOpacity = useSharedValue(0);
  const animatedCameraStyle = useAnimatedStyle(() => ({
    opacity: withTiming(cameraOpacity.value, { duration: 500 }),
  }));

  // App state handler to manage camera activation
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        setCameraIsActive(true);
      } else {
        setCameraIsActive(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Camera ready handler - Defer camera activation
  useEffect(() => {
    if (device && setupCamera) {
      const timeout = setTimeout(() => {
        if (isMounted.current) {
          cameraOpacity.value = 1;
          setIsCameraReady(true);
        }
      }, 200); // Reduced timeout from 800ms to 300ms

      return () => clearTimeout(timeout);
    }
  }, [device, cameraOpacity, setupCamera]);

  const checkAllPermissions = async () => {
    try {
      // Check camera permission
      if (!hasPermission) {
        return false;
      }

      // Check location permissions
      const hasFineLocationPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      const hasCoarseLocationPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      );

      return hasFineLocationPermission && hasCoarseLocationPermission;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  };

  useEffect(() => {
    const verifyPermissions = async () => {
      const permissionsGranted = await checkAllPermissions();
      setAllPermissionsGranted(permissionsGranted);
    };

    verifyPermissions();
  }, []);

  // Redirect to permission screen if permissions are not granted
  if (allPermissionsGranted === false) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Redirect href="/(auth)/(scan)/permission" />
      </ThemedView>
    );
  }

  // Show loader while camera is initializing
  if (!device) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loaderText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.cameraContainer}>
        <GestureDetector gesture={gesture}>
          <Reanimated.View onLayout={onLayout} style={[StyleSheet.absoluteFill, animatedCameraStyle]}>
            {isCameraReady && (
              <ReanimatedCamera
                ref={cameraRef}
                torch={torch}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={cameraIsActive}
                codeScanner={codeScanner}
                resizeMode='cover'
                videoStabilizationMode='auto'
                animatedProps={cameraAnimatedProps}
              />
            )}
            {isCameraReady && (
              <>
                <View>
                  <FocusIndicator focusPoint={focusPoint} animatedFocusStyle={animatedFocusStyle} />
                  <ScannerFrame highlight={codeScannerHighlights[0]} layout={layout} scanFrame={scanFrame} />
                </View>
                <View style={{ position: 'absolute', bottom: 20, left: 0, right: 0 }}>
                  {codeMetadata ? (
                    <QRResult
                      codeValue={codeValue}
                      codeType={codeType}
                      iconName={iconName}
                      animatedStyle={animatedStyle}
                      onNavigateToAdd={onNavigateToAddScreen}
                    />
                  ) : null}
                </View>
              </>
            )}
          </Reanimated.View>
        </GestureDetector>
      </SafeAreaView>

      <View style={styles.bottomContainer}>
        <View style={{ flexDirection: 'column', alignItems: 'center', paddingTop: 20 }}>
          {device && (
            <View style={styles.zoomControlContainer}>
              <ZoomControl
                zoom={zoom}
                minZoom={Number(minZoom.toFixed(2))}
                maxZoom={maxZoom}
              />
            </View>
          )}
        </View>

        <View style={styles.bottomButtonsContainer}>
          <ThemedButton
            iconName="image"
            iconColor="white"
            underlayColor='#fff'
            onPress={onOpenGallery}
            style={styles.bottomButton}
            loading={isDecoding}
            loadingColor='#fff'
          />
          <ThemedButton
            iconName="cog"
            iconColor="white"
            underlayColor='#fff'
            onPress={() => {}}
            style={styles.bottomButton}
          />
        </View>
      </View>

      <View style={styles.headerContainer}>
        <ThemedButton
          iconColor='#fff'
          style={styles.headerButton}
          onPress={() => router.back()}
          iconName="chevron-left"
        />
        <ThemedButton
          underlayColor='#fff'
          iconColor={torch === 'on' ? '#FFCC00' : '#fff'}
          style={styles.headerButton}
          onPress={toggleFlash}
          iconName={torch === 'on' ? 'flash' : 'flash-off'}
        />
      </View>

      <ThemedStatusToast
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
      />

      <StatusBar barStyle="light-content" />

      {/* Lazy load the bottom sheet */}
      {isCameraReady && (
        <Suspense fallback={null}>
          <ThemedReuseableSheet
            ref={bottomSheetRef}
            title={t('homeScreen.manage')}
            enableDynamicSizing={true}
            contentType='scroll'
            customContent={
              <View style={{ flex: 1, backgroundColor: 'black' }} />
            }
          />
        </Suspense>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraContainer: {
    marginTop: STATUSBAR_HEIGHT,
    flex: getResponsiveHeight(0.26),
    backgroundColor: 'black',
    borderRadius: getResponsiveWidth(8),
    overflow: 'hidden',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loaderText: {
    color: 'white',
    marginTop: 10,
  },
  headerContainer: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 15,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveWidth(3.6),
    zIndex: 10,
  },
  headerButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  bottomContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center'
  },
  zoomControlContainer: {
    alignItems: 'center',
  },
  bottomButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: width * 0.8,
    flexGrow: 0.8,
  },
  bottomButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 50,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 35,
    left: 15,
    right: 15,
  },
});
