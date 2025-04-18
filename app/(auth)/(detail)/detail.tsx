import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, FlatList, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { useDispatch, useSelector } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUnmountBrightness } from '@reeq/react-native-device-brightness';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { throttle } from 'lodash';
import { MMKV } from 'react-native-mmkv';
import * as Clipboard from 'expo-clipboard';

// Local imports
import { RootState } from '@/store/rootReducer';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';
// Components
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedPinnedCard } from '@/components/cards';
import { ThemedText } from '@/components/ThemedText';
import { ThemedStatusToast } from '@/components/toast/ThemedStatusToast';
import { ThemedModal } from '@/components/modals/ThemedIconModal';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';

// Utilities
import { returnItemData } from '@/utils/returnItemData';
import { getVietQRData } from '@/utils/vietQR';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemsByType } from '@/utils/returnItemData';
import { deleteQrCode, updateQrIndexes } from '@/services/localDB/qrDB';

import { setQrData } from '@/store/reducers/qrSlice';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { ThemedTopToast } from '@/components/toast/ThemedTopToast';
import SettingSheetContent from '@/components/bottomsheet/SettingSheetContent';

// Constants
const AMOUNT_SUGGESTIONS = ['10,000', '20,000', '50,000', '100,000', '500,000', '1,000,000'];
const LAST_USED_BANK_KEY = 'lastUsedBank';

// Types
interface ItemData {
  id: string;
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  metadata_type: 'qr' | 'barcode';
  account_name?: string;
  account_number?: string;
  style?: object;
}

interface BankItem {
  code: string;
  name: string;
}

// MMKV instance
const storage = new MMKV();

// Utility function to format the amount
const formatAmount = (amount: string): string =>
  amount.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const DetailScreen = () => {
  const { currentTheme } = useTheme();
  const dispatch = useDispatch();
  const { item: encodedItem, id } = useLocalSearchParams();
  const qrData = useSelector((state: RootState) => state.qr.qrData);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const router = useRouter();
  useUnmountBrightness(1, true);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const [toastKey, setToastKey] = useState(0); // Add a key
  const [amount, setAmount] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState('');
  const [vietQRBanks, setVietQRBanks] = useState<BankItem[]>([]);

  const item = useMemo<ItemData | null>(() => {
    if (!encodedItem) return null;
    try {
      return JSON.parse(decodeURIComponent(String(encodedItem)));
    } catch (error) {
      console.error('Failed to parse item:', error);
      return null;
    }
  }, [encodedItem]);

  const cardColor = useMemo(
    () =>
      currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
    [currentTheme]
  );
  const buttonColor = useMemo(
    () =>
      currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
    [currentTheme]
  );
  const buttonTextColor = useMemo(
    () => (currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon),
    [currentTheme]
  );
  const iconColor = useMemo(
    () => (currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon),
    [currentTheme]
  );

  useEffect(() => {
    const loadBanks = async () => {
      if (item?.type !== 'store') return;

      const lastUsedBankCode = storage.getString(LAST_USED_BANK_KEY);
      let banks = returnItemsByType('vietqr');

      if (lastUsedBankCode) {
        const lastUsedBankIndex = banks.findIndex((bank) => bank.code === lastUsedBankCode);
        if (lastUsedBankIndex !== -1) {
          const lastUsedBank = banks.splice(lastUsedBankIndex, 1)[0];
          banks.unshift(lastUsedBank);
        }
      }

      setVietQRBanks(banks);
    };

    setTimeout(() => {
      loadBanks();
    }, 300);
  }, [item?.type]);

  const handleExpandPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const onEditPress = useCallback(
    throttle(() => {  // Remove the unnecessary parameters
      bottomSheetRef.current?.close();

      setTimeout(() => {
        router.push({
          pathname: `/(edit)/edit`,  // Correct path
          params: {
            id: id,  // Pass the item ID
          },
        });
      }, 10);

    }, 1000),
    [id, router] // Depend on selectedItemId and router
  );

  const onDeletePress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsModalVisible(true);
  }, [])

  const onDeleteItem = useCallback(
    async () => {
      if (!id || Array.isArray(id)) return;

      try {
        setIsSyncing(true);
        setIsToastVisible(true);
        setToastMessage(t('homeScreen.deleting'));

        await deleteQrCode(id);

        const updatedData = qrData.filter((qrItem) => qrItem.id !== id);
        const reindexedData = updatedData.map((qrItem, index) => ({
          ...qrItem,
          qr_index: index,
          updated: new Date().toISOString(),
        }));
        dispatch(setQrData(reindexedData));

        await updateQrIndexes(reindexedData);

        setIsModalVisible(false);
        setIsToastVisible(false);
        router.replace('/home');
      } catch (error) {
        console.error('Error deleting QR code:', error);
        setToastMessage(t('homeScreen.deleteError'));
        setIsToastVisible(true);
      } finally {
        setIsSyncing(false);
      }
    },
    [id, qrData, dispatch, router]
  );

  const handleOpenMap = useCallback(() => {
    if (!item) return;

    const itemName = returnItemData(item.code, item.type);
    if (!itemName?.name) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      itemName.name
    )}`;

    Linking.openURL(url).catch((err) => {
      console.error('Failed to open Google Maps:', err);
      setIsToastVisible(true);
      setToastMessage(t('detailsScreen.failedToOpenGoogleMaps'));
    });
  }, [item]);

  const handleOpenBank = useCallback(
    async (code: string) => {
      let lowerCaseCode = code.toLowerCase();

      // Handle special cases for bank codes
      if (lowerCaseCode === 'vib') {
        lowerCaseCode = 'vib-2';
      } else if (lowerCaseCode === 'acb') {
        lowerCaseCode = 'acb-biz';
      }

      const url = `https://dl.vietqr.io/pay?app=${lowerCaseCode}`;

      try {
        const canOpen = await Linking.canOpenURL(url);

        if (canOpen) {
          await Linking.openURL(url);

          storage.set(LAST_USED_BANK_KEY, code); // Store the last used bank

          // Update the bank list only for store type items
          if (item?.type === 'store') {
            const updatedBanks = [...vietQRBanks];
            const bankIndex = updatedBanks.findIndex((bank) => bank.code === code);

            // Move the selected bank to the front of the list
            if (bankIndex !== -1) {
              const [selectedBank] = updatedBanks.splice(bankIndex, 1);
              updatedBanks.unshift(selectedBank);
              setVietQRBanks(updatedBanks);
            }
          }
        } else {
          // If the bank app cannot be opened, show a toast and open VietQR's website as a fallback.
          console.warn(`Cannot open URL: ${url}`);
          setIsToastVisible(true);
          setToastMessage(t('detailsScreen.cannotOpenBankApp'));
          await Linking.openURL('https://vietqr.io'); // Await the fallback
        }
      } catch (err) {
        // If there's an error, show a toast.
        console.error('Failed to open bank app:', err);
        setIsToastVisible(true);
        setToastMessage(t('detailsScreen.failedToOpenBankApp'));
      }
    },
    [vietQRBanks, item?.type, setIsToastVisible, setToastMessage]
  );

  const showTopToast = useCallback((message: string) => {
    setIsTopToastVisible(true);
    setTopToastMessage(message);
    setToastKey(prevKey => prevKey + 1); // Increment key on *new* toast
  }, []);

  const onVisibilityToggle = useCallback((isVisible: boolean) => {
    setIsTopToastVisible(isVisible);
  }, []);

  const onNavigateToSelectScreen = useCallback(() => {
    router.push('/(auth)/(detail)/bank-select');
  }, [])

  const handleTransferAmount = useCallback(
    throttle(async () => {
      if (!item || !amount) return;

      if (isOffline) {
        showTopToast(t('detailsScreen.offlineMessage'));
        return;
      }

      setIsSyncing(true);
      setIsToastVisible(true);
      setToastMessage(t('detailsScreen.generatingQRCode'));

      try {
        const itemName = returnItemData(item.code, item.type);
        const message = `${t('detailsScreen.transferMessage')} ${item.account_name}`;
        const response = await getVietQRData(
          item.account_number ?? '',
          item.account_name ?? '',
          itemName?.bin || '',
          parseInt(amount.replace(/,/g, '')),
          message
        );

        const qrCode = response.data.qrCode;
        router.replace({
          pathname: '/qr-screen',
          params: {
            metadata: qrCode,
            amount: amount,
            originalItem: encodeURIComponent(JSON.stringify(item)),
          },
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
        setIsToastVisible(true);
        setToastMessage(t('detailsScreen.generateError'));
      } finally {
        setIsSyncing(false);
        // setIsToastVisible(false);
      }
    }, 500),
    [item, amount, router, showTopToast]
  );

  const onCopyAccountNumber = useCallback(() => {
    Clipboard.setStringAsync(item?.account_number ?? '');
    showTopToast(t('detailsScreen.copiedToClipboard'));
  }, [item?.account_number, showTopToast])

  const renderSuggestionItem = useCallback(
    ({ item: suggestionItem }: { item: string }) => (
      <Pressable
        onPress={() => setAmount(suggestionItem)}
        style={[
          styles.suggestionItem,
          {
            backgroundColor:
              currentTheme === 'light'
                ? Colors.light.buttonBackground
                : Colors.dark.buttonBackground,
            overflow: 'hidden',
          },
        ]}
      >
        <ThemedText style={styles.suggestionText}>{suggestionItem}</ThemedText>
      </Pressable>
    ),
    [currentTheme]
  );

  const renderPaymentMethodItem = useCallback(
    ({ item: bankItem }: { item: BankItem }) => (
      <Pressable
        style={[styles.bankItemPressable, { backgroundColor: buttonColor }]}
        onPress={() => handleOpenBank(bankItem.code)}
      >
        <View style={styles.bankIconContainer}>
          <Image
            source={getIconPath(bankItem.code)}
            style={styles.bankIcon}
            resizeMode="contain"
          />
        </View>
        <ThemedText
          numberOfLines={1}
          style={[styles.bankItemText, { color: buttonTextColor }]}
        >
          {bankItem.name}
        </ThemedText>
      </Pressable>
    ),
    [handleOpenBank, buttonColor, buttonTextColor]
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.loadingSkeleton}>
        <ActivityIndicator size={getResponsiveFontSize(25)} color={iconColor} />
      </View>
    ),
    [iconColor]
  );

  if (!item) {
    return (
      <ThemedView style={styles.loadingWrapper}>
        <ThemedText>No item found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      style={[
        {
          backgroundColor:
            currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
        },
      ]}
      contentContainerStyle={styles.container}
      // extraScrollHeight={-getResponsiveHeight(10)} // Adjust this negative value (-5, -15, etc.)
      enableOnAndroid
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerWrapper}>
        <ThemedButton onPress={router.back} iconName="chevron-left" />
        <ThemedButton onPress={handleExpandPress} iconName="dots-vertical" />
      </View>

      <ThemedPinnedCard
        style={styles.pinnedCardWrapper}
        metadata_type={item.metadata_type}
        code={item.code}
        type={item.type}
        metadata={item.metadata}
        accountName={item.account_name}
        accountNumber={item.account_number}
        onAccountNumberPress={onCopyAccountNumber}
      />

      {(item.type === 'bank' || item.type === "store") && (
        <View style={[styles.infoWrapper, { backgroundColor: cardColor }]}>
          {/* Map Action */}
          {(item.type === 'bank' || item.type === "store") && (
            <Pressable onPress={handleOpenMap} style={styles.actionButton}>
              <View style={styles.actionHeader}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={getResponsiveFontSize(16)}
                  color={iconColor}
                />
                <ThemedText style={styles.labelText}>{t('detailsScreen.nearbyLocation')}</ThemedText>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={getResponsiveFontSize(16)}
                color={iconColor}
              />
            </Pressable>
          )}

          {/* Transfer Section for Bank */}
          {(item.type === 'bank') && (
            <View
              style={[
                styles.transferContainer,
              ]}
            >
              <View style={styles.transferHeader}>
                <MaterialCommunityIcons
                  name="qrcode"
                  size={getResponsiveFontSize(16)}
                  color={iconColor}
                />
                <ThemedText style={styles.labelText}>{t('detailsScreen.createQrCode')}</ThemedText>
              </View>
              <View style={styles.transferSection}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        color:
                          currentTheme === 'light' ? Colors.light.text : Colors.dark.text,
                      },
                    ]}
                    placeholder={t('detailsScreen.receivePlaceholder')}
                    keyboardType="numeric"
                    value={amount}
                    placeholderTextColor={
                      currentTheme === 'light'
                        ? Colors.light.placeHolder
                        : Colors.dark.placeHolder
                    }
                    onChangeText={(text) => setAmount(formatAmount(text))}
                  />
                  {amount && (
                    <Pressable
                      hitSlop={{
                        bottom: getResponsiveHeight(2.4),
                        left: getResponsiveWidth(3.6),
                        right: getResponsiveWidth(3.6),
                        top: getResponsiveHeight(2.4),
                      }}
                      onPress={() => setAmount('')}
                      style={[styles.transferButton]}

                    >
                      <MaterialCommunityIcons
                        name={'close-circle'}
                        size={getResponsiveFontSize(16)}
                        color={iconColor}
                      />
                    </Pressable>
                  )}
                  <View
                    style={[
                      styles.currencyContainer,
                      currentTheme === 'light'
                        ? { borderColor: 'rgba(0, 0, 0, 0.2)' }
                        : { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.currencyText,
                        currentTheme === 'light'
                          ? { color: 'rgba(0, 0, 0, 0.2)' }
                          : { color: 'rgba(255, 255, 255, 0.2)' },
                      ]}
                    >
                      đ
                    </ThemedText>
                  </View>
                  <Pressable
                    hitSlop={{
                      bottom: getResponsiveHeight(2.4),
                      left: getResponsiveWidth(3.6),
                      right: getResponsiveWidth(3.6),
                      top: getResponsiveHeight(2.4),
                    }}
                    onPress={handleTransferAmount}
                    style={[styles.transferButton, { opacity: amount ? 1 : 0.3 }]}
                  >
                    <MaterialCommunityIcons
                      name={amount ? 'chevron-right' : 'chevron-right'}
                      size={getResponsiveFontSize(16)}
                      color={iconColor}
                    />
                  </Pressable>
                </View>
                <FlatList
                  data={AMOUNT_SUGGESTIONS}
                  horizontal
                  style={styles.suggestionList}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item}
                  contentContainerStyle={styles.suggestionListContent}
                  renderItem={renderSuggestionItem}
                  initialNumToRender={3}
                  maxToRenderPerBatch={3}
                  windowSize={3}
                />
              </View>
            </View>
          )}

          {/* Bank Transfer Section for Store */}
          {item.type === 'store' && (
            <View style={[styles.bottomContainer, { backgroundColor: cardColor }]}>
              <Pressable onPress={onNavigateToSelectScreen} style={styles.bottomTitle}>
                <View style={styles.bankTransferHeader}>
                  <MaterialCommunityIcons
                    name="bank-outline"
                    size={getResponsiveFontSize(18)}
                    color={iconColor}
                  />
                  <ThemedText>{t('detailsScreen.bankTransfer')}</ThemedText>
                  <Image
                    source={require('@/assets/images/vietqr.png')}
                    style={styles.vietQRLogo}
                    resizeMode="contain"
                  />
                </View>
                <MaterialCommunityIcons
                  name="magnify"
                  size={getResponsiveFontSize(18)}
                  color={iconColor}
                />
              </Pressable>

              <FlatList
                data={vietQRBanks}
                horizontal
                style={styles.bankList}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.code}
                contentContainerStyle={styles.bankListContent}
                renderItem={renderPaymentMethodItem}
                ListEmptyComponent={renderEmptyComponent}
              />
            </View>
          )}

          <ThemedStatusToast
            isSyncing={isSyncing}
            isVisible={isToastVisible}
            message={toastMessage}
            iconName="wifi-off"
            onDismiss={() => setIsToastVisible(false)}
            style={styles.toastContainer}
          />
        </View>
      )}

      <ThemedReuseableSheet
        ref={bottomSheetRef}
        title={t('homeScreen.manage')}
        snapPoints={['25%']}
        customContent={
          <>
            <SettingSheetContent
              onEdit={onEditPress}
              onDelete={onDeletePress}
            />
          </>
        }
      />

      <ThemedModal
        primaryActionText={t('homeScreen.move')}
        onPrimaryAction={onDeleteItem}
        onDismiss={() => setIsModalVisible(false)}
        dismissable={true}
        onSecondaryAction={() => setIsModalVisible(false)}
        secondaryActionText={t('homeScreen.cancel')}
        title={t('homeScreen.confirmDeleteTitle')}
        message={t('homeScreen.confirmDeleteMessage')}
        isVisible={isModalVisible}
        iconName="delete-outline"
      />
      <ThemedTopToast
        key={toastKey}
        isVisible={isTopToastVisible}
        message={topToastMessage}
        onVisibilityToggle={onVisibilityToggle}
      />
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    // flexGrow: 1,
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  headerWrapper: {
    paddingTop: getResponsiveHeight(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveHeight(3.6),
  },
  pinnedCardWrapper: {
    marginTop: getResponsiveHeight(0.3),
    marginBottom: getResponsiveHeight(3.6),
  },
  infoWrapper: {
    paddingBottom: getResponsiveHeight(1.8),
    borderRadius: getResponsiveWidth(4),
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    gap: getResponsiveWidth(2.4),
    borderRadius: getResponsiveWidth(4),
    overflow: 'hidden',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontSize: getResponsiveFontSize(16),
  },
  transferContainer: {
    // No changes needed here
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    gap: getResponsiveWidth(2.4),
    borderRadius: getResponsiveWidth(4),
    overflow: 'hidden',
  },
  transferSection: {
    gap: getResponsiveHeight(1.2),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  inputField: {
    marginVertical: getResponsiveHeight(1.8),
    fontSize: getResponsiveFontSize(16),
    flexGrow: 1,
    flexShrink: 1,
  },
  transferButton: {
    marginLeft: getResponsiveWidth(1.2),
  },
  loadingSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: getResponsiveHeight(9),
  },
  bankItemPressable: {
    borderRadius: getResponsiveWidth(4),
    overflow: 'hidden',
    height: getResponsiveHeight(9.6),
    width: getResponsiveWidth(16.8),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: getResponsiveHeight(0.36),
  },
  bankIcon: {
    width: '55%',
    height: '55%',
    pointerEvents: 'none',
  },
  bankIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: getResponsiveWidth(8.4),
    height: getResponsiveWidth(8.4),
    backgroundColor: 'white',
    borderRadius: getResponsiveWidth(12),
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  bankItemText: {
    fontSize: getResponsiveFontSize(12),
    maxWidth: getResponsiveWidth(14.4),
    textAlign: 'center',
    pointerEvents: 'none',
  },
  vietQRLogo: {
    height: getResponsiveHeight(3.6),
    width: getResponsiveWidth(16.8),
    marginLeft: -getResponsiveWidth(3.6),
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 25,
    height: 25,
    borderRadius: 25,
    overflow: 'hidden',
    marginHorizontal: getResponsiveWidth(2.9),
    borderWidth: 1,
  },
  currencyText: {
    fontSize: getResponsiveFontSize(16),
    alignSelf: 'center',
    marginRight: getResponsiveWidth(0.25),
  },
  suggestionList: {
    // No changes needed here
  },
  suggestionListContent: {
    gap: getResponsiveWidth(2.4),
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  suggestionItem: {
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingVertical: getResponsiveHeight(0.6),
    borderRadius: getResponsiveWidth(4),
    overflow: 'hidden',
  },
  suggestionText: {
    fontSize: getResponsiveFontSize(16),
  },
  bankList: {
    // No changes needed here
  },
  bankListContent: {
    gap: getResponsiveWidth(3.6),
    paddingHorizontal: getResponsiveWidth(4.8),
    flexGrow: 1,
  },
  toastContainer: {
    position: 'absolute',
    bottom: getResponsiveHeight(3.6),
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
  },
  bottomContainer: {
    flexDirection: 'column',
    borderRadius: getResponsiveWidth(4),
  },
  bankTransferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
  },
  bottomTitle: {
    flexDirection: 'row',
    gap: getResponsiveWidth(2.4),
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
  },
});

export default DetailScreen;