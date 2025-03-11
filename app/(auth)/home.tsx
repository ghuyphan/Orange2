import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { router } from 'expo-router';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { throttle } from 'lodash';
import BottomSheet from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

// 1. Types and constants
import QRRecord from '@/types/qrType';
import ServerRecord from '@/types/serverDataTypes';
// import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { height } from '@/constants/Constants';

// 2. Services and store
import { RootState } from '@/store/rootReducer';
import {
  setQrData,
} from '@/store/reducers/qrSlice';

// 2.a Local Database Services
import {
  getQrCodesByUserId,
  deleteQrCode,
  syncQrCodes,
  fetchServerData,
  getUnsyncedQrCodes,
  insertOrUpdateQrCodes,
  updateQrIndexes,
  filterQrCodesByType,
  hasLocalData
} from '@/services/localDB/qrDB';


// 3. Hooks and utils
import { useThemeColor } from '@/hooks/useThemeColor';
import { triggerHapticFeedback } from '@/utils/haptic';
import { useGalleryPicker } from '@/hooks/useGalleryPicker';
import SheetType from '@/types/sheetType';


// 4. Components
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedFAB, ThemedButton } from '@/components/buttons';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import ThemedCardItem from '@/components/cards/ThemedCardItem';
import { ThemedFilterSkeleton, ThemedCardSkeleton } from '@/components/skeletons';
import { ThemedStatusToast } from '@/components/toast/ThemedStatusToast';
import { ThemedTopToast } from '@/components/toast/ThemedTopToast';
import { ThemedModal } from '@/components/modals/ThemedIconModal';
import { ThemedBottomToast } from '@/components/toast/ThemedBottomToast';
import ThemedFilter from '@/components/ThemedFilter';
import EmptyListItem from '@/components/lists/EmptyListItem';
import LinkingSheetContent from '@/components/bottomsheet/LinkingSheetContent';
import SettingSheetContent from '@/components/bottomsheet/SettingSheetContent';
import WifiSheetContent from '@/components/bottomsheet/WifiSheetContent';
import { getResponsiveHeight, getResponsiveWidth } from '@/utils/responsive';

// 5. Internationalization
import { t } from '@/i18n';


function HomeScreen() {
  // 1. Redux and Context
  const dispatch = useDispatch();
  const qrData = useSelector((state: RootState) => state.qr.qrData);

  // 3. Theme and Appearance
  const color = useThemeColor({ light: '#3A2E24', dark: '#FFF5E1' }, 'text');

  // 4. Loading and Syncing
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  // 5. UI State
  const [isActive, setIsActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState('');
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [isBottomToastVisible, setIsBottomToastVisible] = useState(false);
  const [bottomToastColor, setBottomToastColor] = useState('');
  const [bottomToastIcon, setBottomToastIcon] = useState('');
  const [bottomToastMessage, setBottomToastMessage] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType>(null);
  const [linkingUrl, setLinkingUrl] = useState<string | null>(null);
  const [wifiSsid, setWifiSsid] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState<string | null>(null);
  const [wifiIsWep, setWifiIsWep] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // 6. Data and Filtering
  const [filter, setFilter] = useState('all');
  // 7. Selected Item
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // 8. Refs
  // const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  // 9. Network Status
  const [wasOffline, setWasOffline] = useState(false);
  // const isOffline = useSelector(state => state.network.isOffline);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);

  // 10. User Data
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');

  // 11. Shared Values (Reanimated)
  const isEmptyShared = useSharedValue(qrData.length === 0 ? 1 : 0);
  const emptyCardOffset = useSharedValue(350);
  const scrollY = useSharedValue(0);

  const syncWithServer = useCallback(async (userId: string) => {
    if (isOffline || isSyncing) {
      if (isOffline) {
        const hasLocal = await hasLocalData(userId);
        setIsEmpty(!hasLocal);
        setIsLoading(false);
      }
      return;
    }

    setIsSyncing(true);
    setSyncStatus('syncing'); // Start syncing
    //   setToastMessage(t('homeScreen.syncing')); // Remove this toast
    //   setIsToastVisible(true);

    try {
      await syncQrCodes(userId);
      const serverData: ServerRecord[] = await fetchServerData(userId);
      if (serverData.length > 0) {
        await insertOrUpdateQrCodes(serverData);
      }
      const localData = await getQrCodesByUserId(userId);
      dispatch(setQrData(localData));
      const hasLocal = await hasLocalData(userId);
      setIsEmpty(!hasLocal);

      setSyncStatus('synced'); // Sync successful
      showToast(t('homeScreen.syncSuccess'));
      setTimeout(() => {
        setSyncStatus('idle'); // Reset to idle after a delay
      }, 3000);

    } catch (error) {
      console.error('Error during sync process:', error);
      //   setToastMessage(t('homeScreen.syncError')); // Keep error toasts
      //   setIsToastVisible(true);
      setSyncStatus('error'); // Set error status
      showToast(t('homeScreen.syncError'));

      const hasLocal = await hasLocalData(userId);
      setIsEmpty(!hasLocal);

    } finally {
      setIsLoading(false);
      //   setIsToastVisible(false); // Remove this toast
      setIsSyncing(false);
    }
  }, [isOffline, isSyncing, dispatch]);

  const debouncedSyncWithServer = useCallback(async (userId: string) => {
    await syncWithServer(userId);
  }, [syncWithServer]); // Keep syncWithServer in the dependencies array

  useEffect(() => {
    if (!userId) {
      return;
    }

    const initializeData = async () => {
      setIsLoading(true);
      try {
        let localData = qrData;

        if (localData.length === 0) {
          localData = await getQrCodesByUserId(userId);
          dispatch(setQrData(localData));
        }

        setIsEmpty(localData.length === 0);

        if (!isOffline) {
          if (localData.length === 0) {
            // Initial sync (if no local data)
            await syncWithServer(userId); // syncWithServer already handles setting syncStatus
          } else {
            const unSyncedData = await getUnsyncedQrCodes(userId);
            if (unSyncedData.length > 0) {
              // Sync unsynced changes
              await syncWithServer(userId); // syncWithServer already handles setting syncStatus
            } else {
              setSyncStatus('synced');  // Set synced here!
              setTimeout(() => {  //Added Timeout
                setSyncStatus('idle');
              }, 3000);
            }
          }
        } else {
          //If Offline, set status to Idle.
          setSyncStatus('idle');
        }
        // Fetch the updated local data to refresh the UI
        const updatedLocalData = await getQrCodesByUserId(userId);
        dispatch(setQrData(updatedLocalData));
        setIsEmpty(updatedLocalData.length === 0);

      } catch (error) {
        console.error('Error during data initialization:', error);
        setSyncStatus('error'); // Set error status in case of initialization error

      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [userId]); // Correct dependencies

  useEffect(() => {
    // Only show online/offline toast if there's an actual change in network state
    if (isOffline) {
      if (isBottomToastVisible && bottomToastMessage === t('homeScreen.offline')) return;
      setBottomToastIcon('wifi-off');
      setBottomToastMessage(t('homeScreen.offline'));
      setBottomToastColor('#f2726f');
      setIsBottomToastVisible(true);
      setWasOffline(true);
    } else {
      // Only show online toast if previously was offline
      if (wasOffline) {
        if (isBottomToastVisible && bottomToastMessage === t('homeScreen.online')) return;
        setBottomToastIcon('wifi');
        setBottomToastMessage(t('homeScreen.online'));
        setBottomToastColor('#4caf50');
        setIsBottomToastVisible(true);
        setTimeout(() => {
          setIsBottomToastVisible(false);
        }, 1000);
      }
      setWasOffline(false);
    }
  }, [isOffline, isBottomToastVisible, bottomToastMessage, isLoading, wasOffline]);

  // Animate empty card when isEmpty changes
  useEffect(() => {
    isEmptyShared.value = isEmpty ? 1 : 0;
    if (isEmpty) {
      animateEmptyCard();
    }
  }, [isEmpty, isEmptyShared]);

  useEffect(() => {
    animateEmptyCard();
  }, [qrData.length > 0]);

  const animateEmptyCard = () => {
    emptyCardOffset.value = withSpring(0, {
      damping: 30,
      stiffness: 150,
    });
  };

  const titleContainerStyle = useAnimatedStyle(() => {
    const SCROLL_THRESHOLD = 120;
    const ANIMATION_RANGE = 90;

    const opacity = interpolate(
      scrollY.value,
      [SCROLL_THRESHOLD, SCROLL_THRESHOLD + ANIMATION_RANGE],
      [1, 0],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [0, -35],
      Extrapolation.CLAMP
    );

    const shouldReduceZIndex =
      scrollY.value > 120 ||
      isActive ||
      isSheetOpen === true;

    return {
      opacity,
      transform: [{ translateY }],
      zIndex: shouldReduceZIndex ? 0 : 1,
    };
  }, [isActive, isSheetOpen]);

  const listHeaderStyle = useAnimatedStyle(() => {
    const opacity = withTiming(
      interpolate(
        scrollY.value,
        [0, 50],
        [1, 0],
        Extrapolation.CLAMP
      ),
      {
        duration: 200,
        easing: Easing.out(Easing.ease)
      }
    );

    const scale = withTiming(
      interpolate(
        scrollY.value,
        [0, 50],
        [1, 0.95],
        Extrapolation.CLAMP
      ),
      {
        duration: 150,
        easing: Easing.out(Easing.ease)
      }
    );

    const translateY = withTiming(
      interpolate(
        scrollY.value,
        [0, 50],
        [0, -5],
        Extrapolation.CLAMP
      ),
      {
        duration: 150,
        easing: Easing.out(Easing.ease)
      }
    );

    return {
      opacity,
      transform: [
        { scale },
        { translateY }
      ],
      // pointerEvents: scrollY.value > 50 ? 'none' : 'auto',
    };
  }, []);

  const fabStyle = useAnimatedStyle(() => {
    const marginBottom = withTiming(
      isBottomToastVisible
        ? 30
        : isToastVisible
          ? 80
          : 10,
      {
        duration: 200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }
    );
    return { marginBottom };
  });

  const emptyCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emptyCardOffset.value }],
  }));

  const onNavigateToEmptyScreen = useCallback(() => {
    router.push('/empty');
  }, []);

  const onNavigateToDetailScreen = useCallback(
    throttle((item: QRRecord) => {
      router.push({
        pathname: `/detail`,
        params: {
          id: item.id,
          item: encodeURIComponent(JSON.stringify(item)),
          user_id: userId,
        },
      });
    }, 300),
    [] // Empty dependencies if item structure is stable; adjust if props change frequently
  );

  const onNavigateToScanScreen = useCallback(() => {
    router.push('/(scan)/scan-main');
  }, []);

  const onNavigateToSettingsScreen = useCallback(() => {
    router.push('/settings');
  }, []);

  const onNavigateToAddScreen = useCallback(
    throttle(
      (
        codeFormat?: number,
        codeValue?: string,
        bin?: string,
        codeType?: string,
        codeProvider?: string // Add codeProvider parameter
      ) => {
        router.push({
          pathname: `/(auth)/(add)/add-new`,
          params: {
            codeFormat: codeFormat,
            codeValue: codeValue,
            codeBin: bin,
            codeType: codeType,
            codeProvider: codeProvider, // Pass codeProvider
          },
        });
      },
      300
    ), []
  );

  const onNavigateToEditScreen = useCallback(
    throttle(() => {  // Remove the unnecessary parameters

      if (!selectedItemId) {
        return; // Important: Don't navigate if no item is selected
      }

      bottomSheetRef.current?.close();

      setTimeout(() => {
        router.push({
          pathname: `/(edit)/edit`,  // Correct path
          params: {
            id: selectedItemId,  // Pass the item ID
          },
        });
      }, 200);

    }, 300),
    [selectedItemId, router] // Depend on selectedItemId and router
  );

  const onOpenSheet = useCallback((type: SheetType, id?: string, url?: string, ssid?: string, password?: string, isWep?: boolean, isHidden?: boolean) => {
    setSheetType(type);
    setIsSheetOpen(true);
    setSelectedItemId(id || null);

    switch (type) {
      case 'wifi':
        bottomSheetRef.current?.snapToIndex(0);
        if (ssid && password) {
          setWifiSsid(ssid);
          setWifiPassword(password);
          setWifiIsWep(isWep ?? false);
        }
        break;
      case 'setting':
        if (!id) return;
        bottomSheetRef.current?.snapToIndex(0);
        break;
      case 'linking':
        bottomSheetRef.current?.snapToIndex(0);
        if (url) {
          setLinkingUrl(url);
        }
        break;
      default:
    }
  }, [bottomSheetRef, setSheetType, setIsSheetOpen, setSelectedItemId, setLinkingUrl]);

  // Update the onOpenGallery usage to use the memoized onOpenSheet
  const onOpenGallery = useGalleryPicker({
    onOpenSheet,
    onNavigateToAddScreen,
  });

  // In your existing code where you define scrollHandler
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;

    // Use the existing shared value for FAB behavior
    if (event.contentOffset.y > 50 && fabOpen) {
    } else if (event.contentOffset.y <= 50 && !fabOpen) {
      setFabOpen(true);
    }
  });
  const onScrollOffsetChange = useCallback((offset: number) => {
    scrollY.value = offset;
  }, [scrollY]);

  const onDragBegin = useCallback(() => {
    triggerHapticFeedback();
    setIsActive(true);
  }, []);

  const onDragEnd = useCallback(async ({ data }: { data: QRRecord[] }) => {
    try {
      triggerHapticFeedback();

      // Check if the order has actually changed
      const hasOrderChanged = data.some((item, index) =>
        item.qr_index !== index
      );

      if (!hasOrderChanged) {
        setIsActive(false);
        return;
      }

      const updatedData = data.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(),
      }));

      // Update the component state with the new order
      dispatch(setQrData(updatedData));

      // Update the indexes and timestamps in the local database
      await updateQrIndexes(updatedData);
    } catch (error) {
      console.error('Error updating QR indexes and timestamps:', error);
    } finally {
      setIsActive(false);
    }
  }, [dispatch]);

  const handleFilterPress = useCallback((filter: string) => {
    setFilter(filter); // Update the filter state
    filterQrCodesByType(userId, filter)
      .then(filteredData => dispatch(setQrData(filteredData)));
  }, [userId, dispatch, setFilter]); // Add setFilter to the dependency array

  const showToast = useCallback((message: string) => {
    setTopToastMessage(message);
    setIsTopToastVisible(true);
  }, []);

  const handleCopySuccess = useCallback(() => {
    showToast(t('homeScreen.copied'));
  }, [])

  const onDeleteSheetPress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsModalVisible(true);
  }, []);

  const dropdownOptions = [
    { label: ('homeScreen.fab.add'), onPress: () => onNavigateToAddScreen(), icon: 'plus-circle' },
    { label: ('homeScreen.fab.scan'), onPress: () => onNavigateToScanScreen(), icon: 'camera' },
    { label: ('homeScreen.fab.gallery'), onPress: () => onOpenGallery(), icon: 'image' },
  ];

  const onDeletePress = useCallback(async () => {
    if (!selectedItemId) return;

    try {
      setIsSyncing(true);
      setIsToastVisible(true);
      setToastMessage(t('homeScreen.deleting'));

      // Delete the specific QR code from the database
      await deleteQrCode(selectedItemId);

      // 1. Update Redux store directly
      const updatedData = qrData.filter(item => item.id !== selectedItemId);
      const reindexedData = updatedData.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(),
      }));
      dispatch(setQrData(reindexedData));
      setIsEmpty(reindexedData.length === 0);

      // 2. Update indexes in the database
      await updateQrIndexes(reindexedData);

      // Reset UI state
      setIsModalVisible(false);
      setIsToastVisible(false);
    } catch (error) {
      setToastMessage(t('homeScreen.deleteError'));
      setIsToastVisible(true);
    } finally {
      setSelectedItemId(null);
      setTimeout(() => {
        setIsSyncing(false);
      }, 400);

    }
  }, [selectedItemId, qrData, dispatch]); // Include qrData in the dependency array

  const renderItem = useCallback(
    ({ item, drag, isActive }: { item: QRRecord; drag: () => void, isActive: boolean }) => {
      return (
        <ScaleDecorator activeScale={0.9} >
          <ThemedCardItem
            isActive={isActive}
            onItemPress={() => onNavigateToDetailScreen(item)}
            code={item.code}
            type={item.type}
            metadata={item.metadata}
            metadata_type={item.metadata_type}
            onMoreButtonPress={() => onOpenSheet('setting', item.id)}
            accountName={item.account_name}
            accountNumber={item.account_number}
            onDrag={drag}
          />
        </ScaleDecorator>
      );
    },
    [onNavigateToDetailScreen, onOpenSheet]
  );

  const paddingValues = useMemo(() => {
    return [0, height * 0.70, height * 0.45, height * 0.20];
  }, []);

  const listContainerPadding = useMemo(() => {
    return paddingValues[qrData.length] || 100;
  }, [qrData.length, paddingValues]);

  const renderSheetContent = () => {
    switch (sheetType) {
      case 'wifi':
        return (
          <>
            <WifiSheetContent
              ssid={wifiSsid || ''}
              password={wifiPassword || ''}
              isWep={wifiIsWep}
            // isHidden={wifiIsHidden}
            />
          </>
        );
      case 'linking':
        return (
          <>
            <LinkingSheetContent
              url={linkingUrl}
              onCopySuccess={handleCopySuccess}
            />
          </>
        );
      case 'setting':
        return (
          <>
            <SettingSheetContent
              onEdit={onNavigateToEditScreen}
              onDelete={onDeleteSheetPress}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Animated.View
        style={[styles.titleContainer, titleContainerStyle]}
      >
        <View
          style={styles.headerContainer}
        >
          <ThemedText style={styles.titleText} type="title">
            {t('homeScreen.title')}
          </ThemedText>
          <View
            style={styles.titleButtonContainer}
          >
            <ThemedButton
              iconName="cloud-sync"
              syncStatus={syncStatus}
              style={styles.titleButton}
              onPress={() => debouncedSyncWithServer(userId)}
              disabled={syncStatus === 'syncing'} // Use the new prop
            />
            <ThemedButton
              iconName="camera"
              style={styles.titleButton}
              onPress={onNavigateToScanScreen}
              disabled={isLoading}
            />
            <ThemedButton
              iconName="cog"
              style={styles.titleButton}
              onPress={onNavigateToSettingsScreen}
              disabled={isLoading}
            />
          </View>
        </View>
      </Animated.View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={{ marginBottom: 20 }}>
            <ThemedFilterSkeleton show={true} />
          </View>
          {Array.from({ length: 3 }).map((_, index) => (
            <ThemedCardSkeleton key={index} index={index} />
          ))}
        </View>
      ) : isEmpty ? (
        <EmptyListItem
          scrollHandler={scrollHandler}
          emptyCardStyle={emptyCardStyle}
          onNavigateToEmptyScreen={onNavigateToEmptyScreen}
          onNavigateToScanScreen={onNavigateToScanScreen}
          dropdownOptions={dropdownOptions}
        />
      ) : (
        <Animated.View style={[emptyCardStyle, [{ flex: 1 }]]}>


          <DraggableFlatList
            ref={flatListRef}
            bounces={true}
            ListHeaderComponent={
              <Animated.View
                style={[listHeaderStyle, { marginBottom: getResponsiveHeight(3.6) }]}
              >
                <ThemedFilter
                  selectedFilter={filter}
                  onFilterChange={handleFilterPress}
                />
              </Animated.View>
            }
            ListEmptyComponent={
              <View style={styles.emptyItem}>
                <MaterialIcons color={color} name="search" size={50} />
                <ThemedText style={{ textAlign: 'center', lineHeight: 30 }}>
                  {t('homeScreen.noItemFound')}
                </ThemedText>
              </View>
            }
            initialNumToRender={15}
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="on-drag"
            data={[...qrData]}
            renderItem={renderItem}
            keyExtractor={(item, index) => `draggable-item-${item.id}`}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={[styles.listContainer, qrData.length > 0 && { paddingBottom: listContainerPadding }]}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onDragBegin={onDragBegin}
            onDragEnd={onDragEnd}
            dragItemOverflow={false}
            onScrollOffsetChange={onScrollOffsetChange}
            decelerationRate={'fast'}
            scrollEnabled={!fabOpen}
            windowSize={10}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
          />
        </Animated.View>
      )}
      {(!isLoading && qrData.length > 0) &&

        <ThemedFAB
          actions={[
            {
              text: ('homeScreen.fab.add'),
              iconName: 'plus-circle',
              onPress: onNavigateToAddScreen
            },
            {
              text: ('homeScreen.fab.scan'),
              iconName: 'camera',
              onPress: onNavigateToScanScreen,
            },
            {
              text: ('homeScreen.fab.gallery'),
              iconName: 'image',
              onPress: onOpenGallery
            }
          ]}
          style={styles.fab}
          animatedStyle={fabStyle}

        />
      }
      <ThemedStatusToast
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
        isSyncing={isSyncing}
      />
      <ThemedTopToast
        message={topToastMessage}
        isVisible={isTopToastVisible}
        onVisibilityToggle={(isVisible) => setIsTopToastVisible(isVisible)}
        duration={2000}
      />

      <ThemedBottomToast
        isVisible={isBottomToastVisible}
        message={bottomToastMessage}
        iconName={bottomToastIcon as keyof typeof MaterialCommunityIcons.glyphMap}
        style={styles.bottomToastContainer}
        backgroundColor={bottomToastColor}

      />
      <ThemedReuseableSheet
        ref={bottomSheetRef}
        // title={t('homeScreen.manage')}
        title={sheetType === 'setting' ? t('homeScreen.manage') :
          sheetType === 'wifi' ? t('homeScreen.wifi') :
            sheetType === 'linking' ? t('homeScreen.linking') :
              t('homeScreen.settings')}
        onClose={() => {
          setTimeout(() => {
            setIsSheetOpen(false)
          }, 50);
        }}
        // snapPoints={['35%']}
        snapPoints={
          sheetType === 'setting' ? ['25%'] :
            sheetType === 'wifi' ? ['38%'] : // Assuming snap points for wifi
              sheetType === 'linking' ? ['35%'] : // Assuming snap points for linking
                ['35%'] // Default snap points
        }
        styles={{
          customContent: {
            borderRadius: getResponsiveWidth(4),
            marginHorizontal: getResponsiveWidth(3.6),
          }
        }}
        // enableDynamicSizing={true}
        customContent={
          <View>
            {renderSheetContent()}
          </View>
        }
      />
      <ThemedModal
        primaryActionText={t('homeScreen.move')}
        onPrimaryAction={onDeletePress}
        onDismiss={() => setIsModalVisible(false)}
        dismissable={true}
        onSecondaryAction={() => setIsModalVisible(false)}
        secondaryActionText={t('homeScreen.cancel')}
        title={t('homeScreen.confirmDeleteTitle')}
        message={t('homeScreen.confirmDeleteMessage')}
        isVisible={isModalVisible}
        iconName="delete-outline"
      />
    </ThemedView>
  );
}


export default React.memo(HomeScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    position: 'absolute',
    top: getResponsiveHeight(10),
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    // paddingHorizontal: 15,
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  titleText: {
    fontSize: 28,
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleButton: {
  },
  listContainer: {
    paddingTop: getResponsiveHeight(18.1),
    flexGrow: 1,
  },
  emptyItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    opacity: 0.7,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
  },
  bottomToastContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  fab: {
    // bottom: 20,
    bottom: getResponsiveHeight(2),
    // right: 15,
    right: getResponsiveWidth(3.6),
    position: 'absolute',
    zIndex: 3,
  },
  loadingContainer: {
    paddingTop: getResponsiveHeight(18),
    paddingHorizontal: 15,
    flex: 1,
  },
});
