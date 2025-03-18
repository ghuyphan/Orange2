// Preload all icons into a single object
const iconPaths = {
  'ABB': require('@/assets/images/logoIcons/ABB.png'),
  'ACB': require('@/assets/images/logoIcons/ACB.png'),
  'VBA': require('@/assets/images/logoIcons/VBA.png'),
  'BAB': require('@/assets/images/logoIcons/BAB.png'),
  'BKB': require('@/assets/images/logoIcons/BKB.png'),
  'BOC': require('@/assets/images/logoIcons/BOC.png'),
  'BVB': require('@/assets/images/logoIcons/BVB.png'),
  'BIC': require('@/assets/images/logoIcons/BIC.png'),
  'BIDV': require('@/assets/images/logoIcons/BIDV.png'),
  'CAKE': require('@/assets/images/logoIcons/CAKE.png'),
  'CAT': require('@/assets/images/logoIcons/CAT.png'),
  'CBB': require('@/assets/images/logoIcons/CBB.png'),
  'CHS': require('@/assets/images/logoIcons/CHS.png'),
  'CIMB': require('@/assets/images/logoIcons/CIMB.png'),
  'CITIBANK': require('@/assets/images/logoIcons/CITIBANK.png'),
  'CBA': require('@/assets/images/logoIcons/CBA.png'),
  'COOPBANK': require('@/assets/images/logoIcons/COOPBANK.png'),
  'DBK': require('@/assets/images/logoIcons/DBK.png'),
  'DAB': require('@/assets/images/logoIcons/DAB.png'),
  'DSB': require('@/assets/images/logoIcons/DSB.png'),
  'EIB': require('@/assets/images/logoIcons/EIB.png'),
  'GPB': require('@/assets/images/logoIcons/GPB.png'),
  'HDB': require('@/assets/images/logoIcons/HDB.png'),
  'HLBVN': require('@/assets/images/logoIcons/HLBVN.png'),
  'HSBC': require('@/assets/images/logoIcons/HSBC.png'),
  'BOK': require('@/assets/images/logoIcons/BOK.png'),
  'IVB': require('@/assets/images/logoIcons/IVB.png'),
  'KBHN': require('@/assets/images/logoIcons/KBHN.png'),
  'KEBHANAHCM': require('@/assets/images/logoIcons/KEBHANAHCM.png'),
  'KLB': require('@/assets/images/logoIcons/KLB.png'),
  'LVB': require('@/assets/images/logoIcons/LVB.png'),
  'MB': require('@/assets/images/logoIcons/MB.png'),
  'MGB': require('@/assets/images/logoIcons/MGB.png'),
  'MZH': require('@/assets/images/logoIcons/MZH.png'),
  'MSB': require('@/assets/images/logoIcons/MSB.png'),
  'NAB': require('@/assets/images/logoIcons/NAB.png'),
  'NCB': require('@/assets/images/logoIcons/NCB.png'),
  'OCB': require('@/assets/images/logoIcons/OCB.png'),
  'OCE': require('@/assets/images/logoIcons/OCE.png'),
  'Oceanbank': require('@/assets/images/logoIcons/Oceanbank.png'),
  'PGB': require('@/assets/images/logoIcons/PGB.png'),
  'PBVN': require('@/assets/images/logoIcons/PBVN.png'),
  'PVB': require('@/assets/images/logoIcons/PVB.png'),
  'PVCB': require('@/assets/images/logoIcons/PVCB.png'),
  'SCB': require('@/assets/images/logoIcons/SCB.png'),
  'SEA': require('@/assets/images/logoIcons/SEA.png'),
  'SHB': require('@/assets/images/logoIcons/SHB.png'),
  'SHBVN': require('@/assets/images/logoIcons/SHBVN.png'),
  'SMF': require('@/assets/images/logoIcons/SMF.png'),
  'STC': require('@/assets/images/logoIcons/STC.png'),
  'TCB': require('@/assets/images/logoIcons/TCB.png'),
  'TIM': require('@/assets/images/logoIcons/TIM.png'),
  'TPB': require('@/assets/images/logoIcons/TPB.png'),
  'TYM': require('@/assets/images/logoIcons/TYM.png'),
  'TYB': require('@/assets/images/logoIcons/TYB.png'),
  'UBB': require('@/assets/images/logoIcons/UBB.png'),
  'UBS': require('@/assets/images/logoIcons/UBS.png'),
  'VIB': require('@/assets/images/logoIcons/VIB.png'),
  'VIETBANK': require('@/assets/images/logoIcons/VIETBANK.png'),
  'VAB': require('@/assets/images/logoIcons/VAB.png'),
  'VCP': require('@/assets/images/logoIcons/VCP.png'),
  'VCB': require('@/assets/images/logoIcons/VCB.png'),
  'VPB': require('@/assets/images/logoIcons/VPB.png'),
  'ICB': require('@/assets/images/logoIcons/VTB.png'),
  'SGICB': require('@/assets/images/logoIcons/SGICB.png'),
  'WVN': require('@/assets/images/logoIcons/WVN.png'),
  'AEO': require('@/assets/images/logoIcons/AEO.png'),
  'BHX': require('@/assets/images/logoIcons/BAX.png'),
  'CIR': require('@/assets/images/logoIcons/CIR.png'),
  'COO': require('@/assets/images/logoIcons/COO.png'),
  'EMM': require('@/assets/images/logoIcons/EMM.png'),
  'FMI': require('@/assets/images/logoIcons/FMI.png'),
  'GOO': require('@/assets/images/logoIcons/GOO.png'),
  'GS2': require('@/assets/images/logoIcons/GS2.png'),
  'LOT': require('@/assets/images/logoIcons/LOT.png'),
  'MMM': require('@/assets/images/logoIcons/MMM.png'),
  'MIN': require('@/assets/images/logoIcons/MIN.png'),
  'SVL': require('@/assets/images/logoIcons/SVL.png'),
  'TOP': require('@/assets/images/logoIcons/TOP.png'),
  'WNM': require('@/assets/images/logoIcons/WNM.png'),
  'MOMO': require('@/assets/images/logoIcons/MOMO.png'),
  'ZALOPAY': require('@/assets/images/logoIcons/ZLP.png'),
  'SPP': require('@/assets/images/logoIcons/SPP.png'),
  'VNP': require('@/assets/images/logoIcons/VNP.png'),
  'VTP': require('@/assets/images/logoIcons/VTP.png'),
} as const;

// Optimized function to get the icon path
export function getIconPath(key: string): any {
  return (iconPaths as { [key: string]: any })[key] || require('@/assets/images/logoIcons/default.png');
}
