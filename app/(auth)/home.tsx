import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, FlatList, InteractionManager } from 'react-native';
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
import { throttle } from 'lodash';
import BottomSheet from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

// Types, constants, services, hooks, and components
import QRRecord from '@/types/qrType';
import ServerRecord from '@/types/serverDataTypes';
import { height } from '@/constants/Constants';
import { RootState } from '@/store/rootReducer';
import { setQrData } from '@/store/reducers/qrSlice';
import {
  getQrCodesByUserId,
  deleteQrCode,
  syncQrCodes,
  fetchServerData,
  getUnsyncedQrCodes,
  insertOrUpdateQrCodes,
  updateQrIndexes,
  filterQrCodesByType,
  hasLocalData,
} from '@/services/localDB/qrDB';
import { useThemeColor } from '@/hooks/useThemeColor';
import { triggerHapticFeedback } from '@/utils/haptic';
import { useGalleryPicker } from '@/hooks/useGalleryPicker';
import SheetType from '@/types/sheetType';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedFAB } from '@/components/buttons';
import { ThemedButton } from '@/components/buttons';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import ThemedCardItem from '@/components/cards/ThemedCardItem';
import { ThemedFilterSkeleton, ThemedCardSkeleton } from '@/components/skeletons';
import { ThemedStatusToast } from '@/components/toast/ThemedStatusToast';
import ThemedBottomToast from '@/components/toast/ThemedBottomToast';
import { ThemedTopToast } from '@/components/toast/ThemedTopToast';
import { ThemedModal } from '@/components/modals/ThemedIconModal';
import ThemedFilter from '@/components/ThemedFilter';
import EmptyListItem from '@/components/lists/EmptyListItem';
import LinkingSheetContent from '@/components/bottomsheet/LinkingSheetContent';
import SettingSheetContent from '@/components/bottomsheet/SettingSheetContent';
import WifiSheetContent from '@/components/bottomsheet/WifiSheetContent';
import { getResponsiveHeight, getResponsiveWidth, getResponsiveFontSize } from '@/utils/responsive';
import { t } from '@/i18n';

function HomeScreen() {
  // Redux and Context
  const dispatch = useDispatch();
  const qrData = useSelector((state: RootState) => state.qr.qrData);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');

  // Theme and Appearance
  const color = useThemeColor({ light: '#3A2E24', dark: '#FFF5E1' }, 'text');

  // Loading and Syncing
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isEmpty = useMemo(() => qrData.length === 0, [qrData]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // UI State
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
  const [wifiIsHidden, setWifiIsHidden] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Refs
  const flatListRef = useRef<FlatList<QRRecord> | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const timeoutRefs = useRef<{[key: string]: NodeJS.Timeout | null}>({
    sync: null,
    idle: null,
    edit: null,
    delete: null,
    sheet: null,
    toast: null,
    network: null,
  });

  // Shared Values (Reanimated)
  const isEmptyShared = useSharedValue(qrData.length === 0 ? 1 : 0);
  const emptyCardOffset = useSharedValue(350);
  const scrollY = useSharedValue(0);

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // Sync with server
  const syncWithServer = useCallback(async (userIdToSync: string) => {
    // Prevent concurrent syncs or syncing when offline
    if (isOffline || isSyncing) {
      return;
    }
    
    // Update UI states immediately
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    // Show top toast for sync starting
    setTopToastMessage(t('homeScreen.syncStarted'));
    setIsTopToastVisible(true);
  
    // Wait for any animations/interactions to complete before starting network operations
    InteractionManager.runAfterInteractions(async () => {
      try {
        // Step 1: Upload local changes (if any) to the server
        await syncQrCodes(userIdToSync);
  
        // Step 2: Fetch latest data from the server
        const serverData: ServerRecord[] = await fetchServerData(userIdToSync);
  
        // Step 3: Insert or update local DB with server data (if any)
        if (serverData.length > 0) {
          await insertOrUpdateQrCodes(serverData);
        }
  
        // Step 4: Get the final, merged data from the local DB
        const finalLocalData = await getQrCodesByUserId(userIdToSync);
  
        // Step 5: Update the UI state via Redux
        dispatch(setQrData(finalLocalData));
  
        // Step 6: Update sync status and notify user
        setSyncStatus('synced');
        setTopToastMessage(t('homeScreen.syncSuccess'));
        setIsTopToastVisible(true);
  
        // Step 7: Reset status back to idle after a delay
        if (timeoutRefs.current.sync) clearTimeout(timeoutRefs.current.sync);
        timeoutRefs.current.sync = setTimeout(() => setSyncStatus('idle'), 3000);
  
      } catch (error) {
        console.error('Error during sync process:', error);
        setSyncStatus('error');
        setTopToastMessage(t('homeScreen.syncError'));
        setIsTopToastVisible(true);
      } finally {
        // Step 8: Always ensure syncing state is reset
        setIsSyncing(false);
      }
    });
  }, [isOffline, isSyncing, dispatch, t]);  

  // Initialize data
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setSyncStatus('idle');
      return; // Stop execution
    }
  
    let isMounted = true; // Flag to prevent state updates after unmount
  
    const initializeData = async () => {
      // --- Phase 1: Load and Display Local Data Quickly ---
      setIsLoading(true);
  
      let localLoadSuccess = false;
      try {
        const currentLocalData = await getQrCodesByUserId(userId);
  
        if (!isMounted) {
          // No state updates, but ensure loading stops in finally
          return; // Exit initializeData early
        }
  
        dispatch(setQrData(currentLocalData));
        setSyncStatus('idle'); // Reset sync status after successful local load
        localLoadSuccess = true;
  
      } catch (error) {
        if (isMounted) {
          setSyncStatus('error'); // Indicate error state
          setTopToastMessage(t('homeScreen.loadError'));
          setIsTopToastVisible(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
  
      // --- Phase 2: Schedule Network Sync (Only if Phase 1 succeeded & mounted) ---
      if (!localLoadSuccess || !isMounted) {
        return; // Don't proceed if local load failed or component unmounted
      }
  
      InteractionManager.runAfterInteractions(async () => {
        if (!isMounted || syncStatus === 'error' || isOffline) {
          return;
        }
  
        try {
          const unsyncedCodes = await getUnsyncedQrCodes(userId);
          const localDbExists = await hasLocalData(userId);
          const needsSync = !localDbExists || unsyncedCodes.length > 0;
  
          if (needsSync && isMounted) {
            // Directly perform sync operations instead of calling syncWithServer
            // to avoid nested InteractionManager calls
            setIsSyncing(true);
            setSyncStatus('syncing');
            setTopToastMessage(t('homeScreen.syncStarted'));
            setIsTopToastVisible(true);
  
            try {
              // Step 1: Upload local changes to the server
              await syncQrCodes(userId);
  
              // Step 2: Fetch latest data from the server
              const serverData = await fetchServerData(userId);
  
              // Step 3: Insert or update local DB with server data
              if (serverData.length > 0) {
                await insertOrUpdateQrCodes(serverData);
              }
  
              // Step 4: Get the final, merged data
              const finalLocalData = await getQrCodesByUserId(userId);
  
              if (isMounted) {
                // Step 5: Update Redux state
                dispatch(setQrData(finalLocalData));
                
                // Step 6: Update sync status and notify
                setSyncStatus('synced');
                setTopToastMessage(t('homeScreen.syncSuccess'));
                setIsTopToastVisible(true);
                
                // Step 7: Reset status after delay
                if (timeoutRefs.current.sync) clearTimeout(timeoutRefs.current.sync);
                timeoutRefs.current.sync = setTimeout(() => {
                  if (isMounted) setSyncStatus('idle');
                }, 3000);
              }
            } catch (syncError) {
              console.error('Error during sync process:', syncError);
              if (isMounted) {
                setSyncStatus('error');
                setTopToastMessage(t('homeScreen.syncError'));
                setIsTopToastVisible(true);
              }
            } finally {
              if (isMounted) {
                setIsSyncing(false);
              }
            }
          } else if (isMounted) {
            // Already in sync
            setSyncStatus('synced');
            
            if (timeoutRefs.current.idle) clearTimeout(timeoutRefs.current.idle);
            timeoutRefs.current.idle = setTimeout(() => {
              if (isMounted && syncStatus === 'synced') {
                setSyncStatus('idle');
              }
            }, 3000);
          }
        } catch (error) {
          if (isMounted) {
            setSyncStatus('error');
          }
        }
      });
    };
  
    initializeData();
  
    // Cleanup function
    return () => {
      isMounted = false;
      
      // Clear any pending timeouts from this effect
      if (timeoutRefs.current.idle) clearTimeout(timeoutRefs.current.idle);
      if (timeoutRefs.current.sync) clearTimeout(timeoutRefs.current.sync);
    };
  }, [userId]);
  
  // Network status toasts
  const prevIsOffline = useRef(isOffline);
  useEffect(() => {
    if (isOffline) {
      // Show persistent offline toast
      setBottomToastIcon('wifi-off');
      setBottomToastMessage(t('homeScreen.offline'));
      setBottomToastColor('#f2726f');
      setIsBottomToastVisible(true);
    } else {
      // If it *was* offline before, show temporary online toast
      if (prevIsOffline.current) {
        setBottomToastIcon('wifi');
        setBottomToastMessage(t('homeScreen.online'));
        setBottomToastColor('#4caf50');
        setIsBottomToastVisible(true);
        
        // Hide after a delay
        if (timeoutRefs.current.network) clearTimeout(timeoutRefs.current.network);
        timeoutRefs.current.network = setTimeout(() => setIsBottomToastVisible(false), 2000);
      } else {
        // If it was already online, ensure the toast is hidden
        setIsBottomToastVisible(false);
      }
    }
    // Update ref for next render
    prevIsOffline.current = isOffline;
    
    return () => {
      if (timeoutRefs.current.network) clearTimeout(timeoutRefs.current.network);
    };
  }, [isOffline, t]);

  // Animate empty card
  useEffect(() => {
    isEmptyShared.value = isEmpty ? 1 : 0;
    animateEmptyCard();
  }, [isEmpty, isEmptyShared]);

  const animateEmptyCard = () => {
    emptyCardOffset.value = withSpring(0, { damping: 30, stiffness: 150 });
  };

  // Animated styles
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

    const shouldReduceZIndex = scrollY.value > 120 || isActive || isSheetOpen;

    return { opacity, transform: [{ translateY }], zIndex: shouldReduceZIndex ? 0 : 1 };
  }, [isActive, isSheetOpen]);

  const listHeaderStyle = useAnimatedStyle(() => {
    const opacity = withTiming(
      interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP),
      { duration: 200, easing: Easing.out(Easing.ease) }
    );

    const scale = withTiming(
      interpolate(scrollY.value, [0, 50], [1, 0.95], Extrapolation.CLAMP),
      { duration: 150, easing: Easing.out(Easing.ease) }
    );

    const translateY = withTiming(
      interpolate(scrollY.value, [0, 50], [0, -5], Extrapolation.CLAMP),
      { duration: 150, easing: Easing.out(Easing.ease) }
    );

    return { opacity, transform: [{ scale }, { translateY }] };
  }, []);

  const fabStyle = useAnimatedStyle(() => {
    const marginBottom = withTiming(
      isBottomToastVisible ? 30 : isToastVisible ? 80 : 10,
      { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
    );
    return { marginBottom };
  });

  const emptyCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emptyCardOffset.value }],
  }));

  // Navigation handlers
  const onNavigateToEmptyScreen = useCallback(() => router.push('/empty'), []);
  const onNavigateToDetailScreen = useCallback(
    throttle((item: QRRecord) => {
      router.push({
        pathname: `/detail`,
        params: { id: item.id, item: encodeURIComponent(JSON.stringify(item)), user_id: userId },
      });
    }, 300),
    [userId]
  );
  const onNavigateToScanScreen = useCallback(() => router.push('/(scan)/scan-main'), []);
  const onNavigateToSettingsScreen = useCallback(() => router.push('/settings'), []);
  const onNavigateToAddScreen = useCallback(
    throttle(
      (codeFormat?: number, codeValue?: string, bin?: string, codeType?: string, codeProvider?: string) => {
        router.push({
          pathname: `/(auth)/(add)/add-new`,
          params: { codeFormat, codeValue, codeBin: bin, codeType, codeProvider },
        });
      },
      300
    ),
    []
  );
  const onNavigateToEditScreen = useCallback(
    throttle(() => {
      if (!selectedItemId) return;
      bottomSheetRef.current?.close();
      
      if (timeoutRefs.current.edit) clearTimeout(timeoutRefs.current.edit);
      timeoutRefs.current.edit = setTimeout(() => {
        router.push({ pathname: `/(edit)/edit`, params: { id: selectedItemId } });
      }, 200);
    }, 300),
    [selectedItemId]
  );

  // Sheet handlers
  const onOpenSheet = useCallback(
    (type: SheetType, id?: string, url?: string, ssid?: string, password?: string, isWep?: boolean, isHidden?: boolean) => {
      setSheetType(type);
      setIsSheetOpen(true);
      setSelectedItemId(id || null);

      switch (type) {
        case 'wifi':
          if (ssid && password) {
            setWifiSsid(ssid);
            setWifiPassword(password);
            setWifiIsWep(isWep ?? false);
            setWifiIsHidden(isHidden ?? false);
          }
          break;
        case 'linking':
          if (url) setLinkingUrl(url);
          break;
        default:
          break;
      }
      bottomSheetRef.current?.snapToIndex(0);
    },
    []
  );

  const onOpenGallery = useGalleryPicker({ onOpenSheet, onNavigateToAddScreen });

  // Scroll handler
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    if (event.contentOffset.y > 50 && fabOpen) {
      setFabOpen(false);
    } else if (event.contentOffset.y <= 50 && !fabOpen) {
      setFabOpen(true);
    }
  });

  const onScrollOffsetChange = useCallback((offset: number) => {
    scrollY.value = offset;
  }, [scrollY]);

  // Drag handlers
  const onDragBegin = useCallback(() => {
    triggerHapticFeedback();
    setIsActive(true);
  }, []);

  // Memoize filtered data
  const filteredData = useMemo(() => {
    if (filter === 'all') return qrData;
    return qrData.filter(item => item.type === filter);
  }, [qrData, filter]);

  const handleSync = useCallback(() => {
    // Directly call the actual sync function
    syncWithServer(userId);
  }, [syncWithServer, userId]);

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);

  // Optimize renderItem with useCallback
  const renderItem = useCallback(
    ({ item, drag, isActive }: { item: QRRecord; drag: () => void; isActive: boolean }) => (
      <ScaleDecorator activeScale={0.9}>
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
    ),
    [onNavigateToDetailScreen, onOpenSheet]
  );

  // Optimize onDragEnd with useCallback
  const onDragEnd = useCallback(
    ({ data: reorderedData }: { data: QRRecord[] }) => {
      // Provide immediate haptic feedback
      triggerHapticFeedback();
      setIsActive(false);
      
      // Handle filtered vs unfiltered case differently
      if (filter === 'all') {
        // Simple case: no filtering - update everything
        dispatch(setQrData(reorderedData));
        
        InteractionManager.runAfterInteractions(() => {
          const updatedData = reorderedData.map((item, index) => ({
            ...item,
            qr_index: index,
            updated: new Date().toISOString()
          }));
          updateQrIndexes(updatedData).catch(console.error);
        });
      } else {
        // Complex case: filtering is active - need to merge changes
        
        // Create a map of the filtered items by ID for quick lookup
        const reorderedItemsMap = new Map(
          reorderedData.map(item => [item.id, item])
        );
        
        // Get IDs of all items in the filter 
        const filteredItemIds = new Set(reorderedData.map(item => item.id));
        
        // Create a new array with non-filtered items preserved
        // and filtered items in their new order
        const newFullList = qrData.map(item => {
          // If item is part of the current filter, return the reordered version
          if (filteredItemIds.has(item.id)) {
            return reorderedItemsMap.get(item.id)!;
          }
          // Otherwise return the original item (not part of the filter)
          return item;
        });
        
        // Update UI immediately
        dispatch(setQrData(newFullList));
        
        // Defer database update
        InteractionManager.runAfterInteractions(() => {
          const finalData = newFullList.map((item, index) => ({
            ...item,
            qr_index: index, 
            updated: new Date().toISOString()
          }));
          updateQrIndexes(finalData).catch(console.error);
        });
      }
    },
    [dispatch, qrData, filter]
  );
  
  
  // Toast handler
  const showToast = useCallback((message: string) => {
    setTopToastMessage(message);
    setIsTopToastVisible(true);
  }, []);

  const handleCopySuccess = useCallback(() => showToast(t('homeScreen.copied')), [showToast, t]);

  // Delete handlers
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

      await deleteQrCode(selectedItemId);
      const updatedData = qrData.filter((item) => item.id !== selectedItemId);
      const reindexedData = updatedData.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(),
      }));
      dispatch(setQrData(reindexedData));
      await updateQrIndexes(reindexedData);

      setIsModalVisible(false);
      setIsToastVisible(false);
    } catch (error) {
      setToastMessage(t('homeScreen.deleteError'));
      setIsToastVisible(true);
    } finally {
      setSelectedItemId(null);
      
      if (timeoutRefs.current.delete) clearTimeout(timeoutRefs.current.delete);
      timeoutRefs.current.delete = setTimeout(() => setIsSyncing(false), 400);
    }
  }, [selectedItemId, qrData, dispatch, t]);

  // Padding values
  const paddingValues = useMemo(() => {
    // Define padding values based on the number of items in the list
    switch (qrData.length) {
      case 0:
        return 0; // No padding when the list is empty
      case 1:
        return height * 0.7; // Larger padding for a single item
      case 2:
        return height * 0.45; // Moderate padding for two items
      case 3:
        return height * 0.2; // Smaller padding for three items
      default:
        return 100; // Default padding for more than three items
    }
  }, [qrData.length]);

  const listContainerPadding = useMemo(() => paddingValues, [paddingValues]);

  // Sheet content
  const renderSheetContent = () => {
    switch (sheetType) {
      case 'wifi':
        return <WifiSheetContent ssid={wifiSsid || ''} password={wifiPassword || ''} isWep={wifiIsWep} isHidden={wifiIsHidden} />;
      case 'linking':
        return <LinkingSheetContent url={linkingUrl} onCopySuccess={handleCopySuccess} />;
      case 'setting':
        return <SettingSheetContent onEdit={onNavigateToEditScreen} onDelete={onDeleteSheetPress} />;
      default:
        return null;
    }
  };

  // Memoize the header component
  const HeaderComponent = React.memo(({ titleContainerStyle, syncStatus, isLoading, onSync, onScan, onSettings }: {
    titleContainerStyle: any;
    syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
    isLoading: boolean;
    onSync: () => void;
    onScan: () => void;
    onSettings: () => void;
  }) => (
    <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
      <View style={styles.headerContainer}>
        <ThemedText style={styles.titleText} type="title">
          {t('homeScreen.title')}
        </ThemedText>
        <View style={styles.titleButtonContainer}>
          <ThemedButton
            iconName="cloud-sync"
            syncStatus={syncStatus}
            style={styles.titleButton}
            onPress={onSync}
            disabled={syncStatus === 'syncing' || isLoading}
          />
          <ThemedButton
            iconName="camera"
            style={styles.titleButton}
            onPress={onScan}
            disabled={isLoading}
          />
          <ThemedButton
            iconName="cog"
            style={styles.titleButton}
            onPress={onSettings}
            disabled={isLoading}
          />
        </View>
      </View>
    </Animated.View>
  ));

  // Memoize the loading component
  const LoadingComponent = React.memo(() => (
    <View style={styles.loadingContainer}>
      <View style={{ marginBottom: 20 }}>
        <ThemedFilterSkeleton show={true} />
      </View>
      {Array.from({ length: 3 }).map((_, index) => (
        <ThemedCardSkeleton key={index} index={index} />
      ))}
    </View>
  ));

  // Memoize the list header component
  const ListHeaderComponent = React.memo(({ listHeaderStyle, filter, onFilterChange }: {
    listHeaderStyle: any;
    filter: string;
    onFilterChange: (filter: string) => void;
  }) => (
    <Animated.View style={[listHeaderStyle, { marginBottom: getResponsiveHeight(3.6) }]}>
      <ThemedFilter selectedFilter={filter} onFilterChange={onFilterChange} />
    </Animated.View>
  ));

  // Memoize the empty item component
  const EmptyItemComponent = React.memo(({ color }: { color: string }) => (
    <View style={styles.emptyItem}>
      <MaterialIcons color={color} name="search" size={50} />
      <ThemedText style={{ textAlign: 'center', lineHeight: 30 }}>
        {t('homeScreen.noItemFound')}
      </ThemedText>
    </View>
  ));

  return (
    <ThemedView style={styles.container}>
      <HeaderComponent
        titleContainerStyle={titleContainerStyle}
        syncStatus={syncStatus}
        isLoading={isLoading}
        onSync={handleSync}
        onScan={onNavigateToScanScreen}
        onSettings={onNavigateToSettingsScreen}
      />

      {isLoading ? (
        <LoadingComponent />
      ) : isEmpty ? (
        <EmptyListItem
          scrollHandler={scrollHandler}
          emptyCardStyle={emptyCardStyle}
          onNavigateToEmptyScreen={onNavigateToEmptyScreen}
          onNavigateToScanScreen={onNavigateToScanScreen}
          dropdownOptions={[
            { label: 'homeScreen.fab.add', onPress: onNavigateToAddScreen },
            { label: 'homeScreen.fab.scan', onPress: onNavigateToScanScreen },
            { label: 'homeScreen.fab.gallery', onPress: onOpenGallery },
          ]}
        />
      ) : (
        <Animated.View style={[emptyCardStyle, { flex: 1 }]}>
          <DraggableFlatList
            ref={flatListRef}
            bounces={true}
            ListHeaderComponent={
              <ListHeaderComponent
                listHeaderStyle={listHeaderStyle}
                filter={filter}
                onFilterChange={handleFilterChange}
              />
            }
            ListEmptyComponent={<EmptyItemComponent color={color} />}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}
            data={[...filteredData]}
            renderItem={renderItem}
            keyExtractor={(item) => `draggable-item-${item.id}`}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={[styles.listContainer, qrData.length > 0 && { paddingBottom: listContainerPadding }]}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onDragBegin={onDragBegin}
            onDragEnd={onDragEnd}
            dragItemOverflow={false}
            onScrollOffsetChange={onScrollOffsetChange}
            decelerationRate={'fast'}
            // scrollEnabled={!fabOpen}
          />
        </Animated.View>
      )}

      {!isLoading && qrData.length > 0 && (
        <ThemedFAB
          actions={[
            { text: 'homeScreen.fab.add', iconName: 'plus-circle', onPress: onNavigateToAddScreen },
            { text: 'homeScreen.fab.scan', iconName: 'camera', onPress: onNavigateToScanScreen },
            { text: 'homeScreen.fab.gallery', iconName: 'image', onPress: onOpenGallery },
          ]}
          style={styles.fab}
          animatedStyle={fabStyle}
        />
      )}

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
        title={
          sheetType === 'setting'
            ? t('homeScreen.manage')
            : sheetType === 'wifi'
              ? t('homeScreen.wifi')
              : sheetType === 'linking'
                ? t('homeScreen.linking')
                : t('homeScreen.settings')
        }
        onClose={() => {
          if (timeoutRefs.current.sheet) clearTimeout(timeoutRefs.current.sheet);
          timeoutRefs.current.sheet = setTimeout(() => setIsSheetOpen(false), 50);
        }}
        snapPoints={
          sheetType === 'setting'
            ? ['25%']
            : sheetType === 'wifi'
              ? ['38%']
              : sheetType === 'linking'
                ? ['35%']
                : ['35%']
        }
        styles={{
          customContent: {
            borderRadius: getResponsiveWidth(4),
            marginHorizontal: getResponsiveWidth(3.6),
          },
        }}
        customContent={<View>{renderSheetContent()}</View>}
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
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  titleText: {
    fontSize: getResponsiveFontSize(28),
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleButton: {},
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
    bottom: getResponsiveHeight(2),
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
