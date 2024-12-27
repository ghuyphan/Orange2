import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import QRCode from 'react-native-qrcode-svg';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColors } from '@/utils/returnMidpointColor';
import { LinearGradient } from 'expo-linear-gradient';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export type ThemedVietQRProps = {
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  accountName?: string;
  accountNumber?: string;
  style?: object;
};

export const ThemedVietQRCard = ({
  code,
  type,
  metadata,
  accountName,
  accountNumber,
  style,
}: ThemedVietQRProps): JSX.Element => {
  // Calculate dimensions with useMemo
  const qrSize = useMemo(() => getResponsiveWidth(40), []);

  // Pre-calculate data with useMemo
  const itemData = useMemo(() => returnItemData(code, type), [code, type]);
  const { name, color, accent_color } = itemData;
  const iconPath = useMemo(() => getIconPath(code), [code]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      borderRadius: getResponsiveWidth(4),
      paddingHorizontal: getResponsiveWidth(4.8),
      paddingVertical: getResponsiveHeight(1.8),
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getResponsiveHeight(2.4),
      gap: getResponsiveWidth(3.6),
    },
    logoContainer: {
      width: getResponsiveWidth(9.6),
      height: getResponsiveWidth(9.6),
      borderRadius: getResponsiveWidth(6),
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: '60%',
      height: '60%',
    },
    companyName: {
      color: 'white',
      fontSize: getResponsiveFontSize(16),
      fontWeight: 'bold',
      flex: 1,
    },
    codeContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    codeWrapper: {
      backgroundColor: 'white',
      borderRadius: getResponsiveWidth(4),
      padding: getResponsiveWidth(2),
      marginBottom: getResponsiveHeight(1.8),
      alignItems: 'center',
      justifyContent: 'center',
    },
    additionalInfoContainer: {
      width: '100%',
    },
    brandContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      backgroundColor: 'rgba(255,255,255,0.4)',
      borderRadius: getResponsiveWidth(2.5),
      padding: getResponsiveWidth(1.2),
      marginBottom: getResponsiveHeight(1.8),
    },
    vietQRIcon: {
      width: '23%',
      height: getResponsiveHeight(3.6),
    },
    divider: {
      width: getResponsiveWidth(0.35),
      height: '50%',
      backgroundColor: '#535f78',
      marginHorizontal: getResponsiveWidth(3.6),
    },
    napasIcon: {
      width: '21%',
      height: getResponsiveHeight(2.4),
      marginTop: getResponsiveHeight(0.6),
    },
    infoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountName: {
      color: 'white',
      fontSize: getResponsiveFontSize(19),
      fontWeight: '600',
    },
    accountNumber: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: getResponsiveFontSize(15),
      maxWidth: getResponsiveWidth(60),
    },
  }), []);

  return (
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
      style={[styles.container, style]}
    >
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Image source={iconPath} style={styles.logo} resizeMode="contain" />
        </View>
        <ThemedText style={styles.companyName}>{name}</ThemedText>
      </View>

      <View style={styles.codeContainer}>
        <View style={styles.codeWrapper}>
          <QRCode
            value={metadata}
            size={qrSize}
            // logo={iconPath}
            // logoSize={qrSize * 0.2}
            // logoBackgroundColor="white"
            // logoBorderRadius={50}
            // logoMargin={5}
            quietZone={getResponsiveWidth(0.8)}
          />
        </View>

        <View style={styles.additionalInfoContainer}>
          <View style={styles.brandContainer}>
            <Image
              style={styles.vietQRIcon}
              source={require('@/assets/images/vietqr.png')}
              resizeMode="contain"
            />
            <View style={styles.divider} />
            <Image
              style={styles.napasIcon}
              source={require('@/assets/images/napas.png')}
              resizeMode="contain"
            />
          </View>

          <View style={styles.infoContainer}>
            <ThemedText type="defaultSemiBold" style={styles.accountName} numberOfLines={1}>
              {accountName}
            </ThemedText>
            <ThemedText style={styles.accountNumber} numberOfLines={1}>
              {accountNumber ? accountNumber : metadata}
            </ThemedText>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

export default ThemedVietQRCard;