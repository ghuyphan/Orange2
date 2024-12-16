import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, TextInput, FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { debounce, throttle } from 'lodash';
import BottomSheet from '@gorhom/bottom-sheet';
import ImagePicker from 'react-native-image-crop-picker';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

// 1. Types and constants
import QRRecord from '@/types/qrType';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { height } from '@/constants/Constants';

// 2. Services and store
import { fetchQrData } from '@/services/auth/fetchQrData';
import { RootState } from '@/store/rootReducer';
import {
  setQrData,
  addQrData,
  updateQrData,
  removeQrData
} from '@/store/reducers/qrSlice';

// 2.a Local Database Services
import {
  createTable,
  getQrCodesByUserId,
  deleteQrCode,
  syncQrCodes,
  getLocallyDeletedQrCodes,
  insertOrUpdateQrCodes,
  updateQrIndexes,
  filterQrCodesByType,
} from '@/services/localDB/qrDB';


// 3. Hooks and utils
import { useThemeColor } from '@/hooks/useThemeColor';
import { triggerHapticFeedback } from '@/utils/haptic';
import { useLocale } from '@/context/LocaleContext';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/utils/storage';
import { useTheme } from '@/context/ThemeContext';

// 4. Components
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
// import { ThemedIconInput } from '@/components/Inputs';
import { ThemedFAB, ThemedButton } from '@/components/buttons';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import ThemedCardItem from '@/components/cards/ThemedCardItem';
import { ThemedFilterSkeleton, ThemedCardSkeleton } from '@/components/skeletons';
import { ThemedStatusToast } from '@/components/toast/ThemedStatusToast';
import { ThemedModal } from '@/components/modals/ThemedIconModal';
import { ThemedBottomToast } from '@/components/toast/ThemedBottomToast';
import ThemedFilter from '@/components/ThemedFilter';
import EmptyListItem from '@/components/lists/EmptyListItem';

// 5. Internationalization
import { t } from '@/i18n';


function HomeScreen() {
  // 1. Redux and Context
  const dispatch = useDispatch();
  const qrData = useSelector((state: RootState) => state.qr.qrData);
  // console.log(qrData);
  const { updateLocale } = useLocale();
  const { currentTheme } = useTheme();

  // 2. State with Persistence
  const [locale, setLocale] = useMMKVString('locale', storage);

  // 3. Theme and Appearance
  const color = useThemeColor({ light: '#3A2E24', dark: '#FFF5E1' }, 'text');

  // 4. Loading and Syncing
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  // 5. UI State
  const [isActive, setIsActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isBottomToastVisible, setIsBottomToastVisible] = useState(false);
  const [bottomToastColor, setBottomToastColor] = useState('');
  const [bottomToastIcon, setBottomToastIcon] = useState('');
  const [bottomToastMessage, setBottomToastMessage] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // 6. Data and Filtering
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // 7.  Selected Item
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // 8. Refs 
  // const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  // 9. Network Status
  const [wasOffline, setWasOffline] = useState(false);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);

  // 10. User Data
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');

  // 11. Shared Values (Reanimated)
  const isEmptyShared = useSharedValue(qrData.length === 0 ? 1 : 0);
  const emptyCardOffset = useSharedValue(300);
  const scrollY = useSharedValue(0);

  const syncWithServer = useCallback(async (userId: string) => {
    if (isOffline || isSyncing) {
      console.log('Cannot sync while offline or another sync is in progress');
      return;
    }
    await createTable();

    try {
      setBottomToastIcon('');
      setBottomToastColor('');
      setIsSyncing(true);
      setToastMessage(t('homeScreen.syncing'));
      setIsToastVisible(true);

      await syncQrCodes(userId);
      const serverData = await fetchServerData(userId);

      if (serverData.length > 0) {
        await insertOrUpdateQrCodes(serverData);

        // Update the UI with new data without triggering a full reload
        const updatedLocalData = await getQrCodesByUserId(userId);
        dispatch(setQrData(updatedLocalData));
        setIsEmpty(updatedLocalData.length === 0);
      }
    } catch (error) {
      console.error('Error syncing QR codes:', error);
      setToastMessage(t('homeScreen.syncError'));
      setIsToastVisible(true);
    } finally {
      setIsLoading(false);
      setIsToastVisible(false);
      setTimeout(() => {
        setIsSyncing(false);
      }, 200);

    }
  }, [isOffline, isSyncing, dispatch]);

  const fetchServerData = async (userId: string) => {
    try {
      const [serverData, locallyDeletedData] = await Promise.all([
        fetchQrData(userId, 1, 30),
        getLocallyDeletedQrCodes(userId),
      ]);

      return serverData.items.filter(
        item => !locallyDeletedData.some(deletedItem => deletedItem.id === item.id)
      );
    } catch (error) {
      console.error('Error fetching server data:', error);
      throw error;
    } finally {
    }
  };

  useEffect(() => {
    if (isOffline || !userId) return;

    const syncTimeout = setTimeout(() => {
      syncWithServer(userId);
    }, 1000);

    return () => clearTimeout(syncTimeout);
  }, [isOffline, userId]);

  useEffect(() => {
    if (isSyncing) return;

    // Only show online/offline toast if there's an actual change in network state
    if (!isLoading) {
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
    }
  }, [isOffline, isBottomToastVisible, bottomToastMessage, isLoading, wasOffline]);

  const debouncedSetSearchQuery = useCallback(
    debounce((query) => {
      setDebouncedSearchQuery(query);
    }, 300),
    [debounce, setDebouncedSearchQuery] // Include debounce here
  );

  // Update debounced search query whenever searchQuery changes
  useEffect(() => {
    debouncedSetSearchQuery(searchQuery);

    // Clean up on unmount to prevent memory leaks
    return () => {
      debouncedSetSearchQuery.cancel();
    };
  }, [searchQuery]);

  // Fetch filtered data from the database
  // useEffect(() => {
  //   if (userId) { 
  //     filterQrCodesByType(userId, filter)
  //       .then((filteredData) => dispatch(setQrData(filteredData)));
  //       console.log('update local data from filter funciton'); 
  //   }
  // }, [debouncedSearchQuery, filter, dispatch]);


  // Animate empty card when isEmpty changes
  useEffect(() => {
    isEmptyShared.value = isEmpty ? 1 : 0;
    if (isEmpty) {
      animateEmptyCard();
    }
  }, [isEmpty, isEmptyShared]);

  const animateEmptyCard = () => {
    emptyCardOffset.value = withSpring(0, {
      damping: 30,
      stiffness: 150,
    });
  };

  const titleContainerStyle = useAnimatedStyle(() => {
    const SCROLL_THRESHOLD = 130;
    const ANIMATION_RANGE = 50;

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
        duration: 250,
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
      pointerEvents: scrollY.value > 50 ? 'none' : 'auto',
    };
  }, []);

  const fabStyle = useAnimatedStyle(() => {
    const marginBottom = withTiming(isBottomToastVisible || isToastVisible ? isBottomToastVisible ? 50 : 80 : 10, {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    return {
      marginBottom,
    };
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
    }, 1000),
    [] // Empty dependencies if item structure is stable; adjust if props change frequently
  );

  const onNavigateToScanScreen = useCallback(() => {
    router.push('/(scan)/scan-main');
  }, []);

  const onNavigateToSettingsScreen = useCallback(() => {
    router.push('/settings');
  }, []);
  const onNavigateToAddScreen = useCallback(() => {
    router.push('/(add)/add-new');
  }, [])

  const onOpenGallery = async () => {
    try {
      const result = await ImagePicker.openPicker({
        width: 300,
        height: 400,
        includeBase64: true,
        mediaType: 'photo',
      });
    } catch (error) {
      console.log(error);
    }
  }

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
  }, [userId, dispatch, setFilter]);  // Add setFilter to the dependency array

  const handleExpandPress = useCallback((id: string) => {
    setSelectedItemId(id);
    setIsSheetOpen(true);
    bottomSheetRef.current?.expand();
  }, [setSelectedItemId, bottomSheetRef, setIsSheetOpen]);

  const onDeleteSheetPress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsModalVisible(true);
  }, []);

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
      setIsSyncing(false);
    }
  }, [selectedItemId, qrData, dispatch]); // Include qrData in the dependency array

  const renderItem = useCallback(
    ({ item, drag }: { item: QRRecord; drag: () => void }) => {
      return (
        <ScaleDecorator activeScale={0.9}>
          <ThemedCardItem
            onItemPress={() => onNavigateToDetailScreen(item)}
            code={item.code}
            type={item.type}
            metadata={item.metadata}
            metadata_type={item.metadata_type}
            onMoreButtonPress={() => handleExpandPress(item.id)}
            accountName={item.account_name}
            accountNumber={item.account_number}
            onDrag={drag}
          />
        </ScaleDecorator>
      );
    },
    [onNavigateToDetailScreen, handleExpandPress]
  );

  const paddingValues = useMemo(() => {
    return [0, height * 0.74, height * 0.44, height * 0.20];
  }, []);

  const listContainerPadding = useMemo(() => {
    return paddingValues[qrData.length] || 100;
  }, [qrData.length, paddingValues]);

  return (
    <ThemedView style={styles.container}>
      <Animated.View
        style={[styles.titleContainer, titleContainerStyle]}
        pointerEvents="box-none"
      >
        <View
          style={styles.headerContainer}
          pointerEvents="box-none"
        >
          <ThemedText style={styles.titleText} type="title">
            {t('homeScreen.title')}
          </ThemedText>
          <View
            style={styles.titleButtonContainer}
            pointerEvents="auto"  // Crucially, set this to 'auto'
          >
            <ThemedButton
              iconName="qrcode-scan"
              style={styles.titleButton}
              onPress={onNavigateToScanScreen}
            />
            <ThemedButton
              iconName="cog"
              style={styles.titleButton}
              onPress={onNavigateToSettingsScreen}
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
        />
      ) : (
        <DraggableFlatList
          ref={flatListRef}
          bounces={true}
          ListHeaderComponent={
            <Animated.View
              style={[listHeaderStyle, { marginBottom: 30 }]}
            >
              {/* <Animated.View
                style={[searchContainerStyle]}

              > */}
              {/* <View style={styles.searchContainer}>
                <ThemedIconInput
                  style={styles.searchInput}
                  placeholder={t('homeScreen.searchPlaceholder')}
                  iconName="magnify"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  ref={inputRef}
                />
              </View> */}
              {/* </Animated.View> */}
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
          activationDistance={10}
          onScrollOffsetChange={onScrollOffsetChange}
          decelerationRate={'fast'}
          scrollEnabled={!fabOpen}
        // pointerEvents='box-none'
        />
      )}
      {(!isLoading || qrData.length > 0) &&

        <ThemedFAB
          actions={[
            {
              text: t('homeScreen.fab.add'),
              iconName: 'plus-circle',
              onPress: onNavigateToAddScreen
            },
            {
              text: t('homeScreen.fab.scan'),
              iconName: 'camera',
              onPress: onNavigateToScanScreen,
            },
            {
              text: t('homeScreen.fab.gallery'),
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
      <ThemedBottomToast
        // isSyncing={isSyncing}
        isVisible={isBottomToastVisible}
        message={bottomToastMessage}
        iconName={bottomToastIcon as keyof typeof MaterialCommunityIcons.glyphMap}
        style={styles.bottomToastContainer}
        backgroundColor={bottomToastColor}

      />
      <ThemedReuseableSheet
        // isVisible={shouldRenderSheet}
        ref={bottomSheetRef}
        title={t('homeScreen.manage')}
        // description="Choose an action"
        onClose={() => {
          setTimeout(() => {
            setIsSheetOpen(false)
          }, 50);
        }}
        snapPoints={['25%']}
        actions={[
          {
            icon: 'pencil-outline',
            iconLibrary: 'MaterialCommunityIcons',
            text: t('homeScreen.edit'),
            onPress: () => bottomSheetRef.current?.close(),
          },
          {
            icon: 'delete-outline',
            iconLibrary: 'MaterialCommunityIcons',
            text: t('homeScreen.delete'),
            onPress: () => onDeleteSheetPress(),
          }
        ]}
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
    top: STATUSBAR_HEIGHT + 45,
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    pointerEvents: 'box-none',
  },
  titleText: {
    fontSize: 28,
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    pointerEvents: 'box-none',
  },
  titleButton: {
  },
  searchContainer: {
    paddingHorizontal: 15,
    marginBottom: 15
  },
  searchInput: {
    borderRadius: 16,
    paddingVertical: 0,
  },
  listContainer: {
    paddingTop: STATUSBAR_HEIGHT + 110,
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
    bottom: 20,
    right: 15,
    position: 'absolute',
    zIndex: 3,
  },
  loadingContainer: {
    paddingTop: STATUSBAR_HEIGHT + 105,
    paddingHorizontal: 15,
    flex: 1,
  },
});