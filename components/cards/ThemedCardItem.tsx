import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View, Pressable, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColors } from '@/utils/returnMidpointColor';

export type ThemedCardItemProps = {
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  metadata_type: 'qr' | 'barcode';
  accountName?: string;
  accountNumber?: string;
  style?: object;
  animatedStyle?: object;
  onItemPress?: () => void;
  onMoreButtonPress?: () => void;
  onDrag?: () => void;
};

const ThemedCardItem = memo(function ThemedCardItem(props: ThemedCardItemProps): JSX.Element {
  const {
    code,
    type,
    metadata,
    metadata_type = 'qr',
    accountName,
    accountNumber,
    style,
    animatedStyle,
    onItemPress,
    onMoreButtonPress,
    onDrag,
  } = props;

  const { name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);
  const iconPath = useMemo(() => getIconPath(code), [code]);

  const accountDisplayName = useMemo(() => {
    if (type === 'bank' && accountNumber) {
      const maskedLength = Math.max(0, accountNumber.length - 4);
      return `${'*'.repeat(maskedLength)}${accountNumber.slice(-4)}`;
    }
    return accountName;
  }, [type, accountNumber, accountName]);

  const renderContent = () => (
    <LinearGradient
    colors={
      returnMidpointColors(
        color?.light || '#FAF3E7',
        accent_color?.light || '#D6C4AF',
        6
      ) || ['#FAF3E7', '#D6C4AF']
    }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardContainer}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.leftHeaderContainer}>
          <View style={styles.logoContainer}>
            <Image source={iconPath} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.cardName}>{name}</Text>
        </View>
        {onMoreButtonPress && (
          <Pressable
            onPress={onMoreButtonPress}
            hitSlop={{ bottom: 40, left: 30, right: 30, top: 30 }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={20} color="white" />
          </Pressable>
        )}
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.cardHolderName}>{accountName}</Text>
          {/* {type === 'bank' && ( */}
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cardType}>{accountNumber ? accountDisplayName : metadata}</Text>
          {/* )} */}
        </View>
        <View style={styles.qrContainer}>
          {metadata_type === 'qr' ? (
            <QRCode value={metadata} size={55} />
          ) : (
            <Barcode height={55} maxWidth={100} value={metadata} format="CODE128" />
          )}
        </View>
      </View>

      {/* Drag Handle */}
      {onDrag && (
        <View style={styles.dragHandle}>
          <MaterialCommunityIcons name="drag-horizontal" size={20} color="rgba(255,255,255,0.5)" />
        </View>
      )}
    </LinearGradient>
  );

  return (
    <View style={[styles.outerContainer, { marginHorizontal: 15, marginBottom: 15 }]}>
      <Animated.View style={[animatedStyle, style]}>
        {onItemPress ? (
          <Pressable
            onPress={onItemPress}
            onLongPress={onDrag}
            delayLongPress={150}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
            style={styles.pressableContainer}
          >
            {renderContent()}
          </Pressable>
        ) : (
          renderContent()
        )}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.1,
    // shadowRadius: 6,
    // elevation: 5,
  },
  cardContainer: {
    borderRadius: 16,
    // padding: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    aspectRatio: 1.6,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '60%',
    height: '60%',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    pointerEvents: 'none',
  },
  footerLeft: {
    flexDirection: 'column',
  },
  cardHolderName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cardType: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 5,
    maxWidth: 150, // Set a maximum width
    overflow: 'hidden',
  },
  qrContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 5,
  },
  dragHandle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pressableContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
});

export default ThemedCardItem;