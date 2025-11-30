import { Platform } from 'react-native';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

export const initializeAds = async () => {
  try {
    // iOS ATT 권한 요청
    if (Platform.OS === 'ios') {
      const { status } = await requestTrackingPermissionsAsync();
      console.log('ATT 권한 상태:', status);
    }

    await mobileAds().initialize();
    
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    
    console.log('✅ AdMob 초기화 완료');
  } catch (error) {
    console.error('❌ AdMob 초기화 실패:', error);
  }
};

export const AD_UNITS = {
  BANNER_HOME: Platform.select({
    android: 'ca-app-pub-3077862428685229/5849163096',
    ios: 'ca-app-pub-3077862428685229/2971718313',
  }),
  
  BANNER_POST_DETAIL: Platform.select({
    android: 'ca-app-pub-3077862428685229/6582416993',
    ios: 'ca-app-pub-3077862428685229/1658636643',
  }),
  
  INTERSTITIAL_COMPATIBILITY: Platform.select({
    android: 'ca-app-pub-3077862428685229/9208580336',
    ios: 'ca-app-pub-3077862428685229/7723791045',
  }),
  
  INTERSTITIAL_ADVICE: Platform.select({
    android: 'ca-app-pub-3077862428685229/3245807216',
    ios: 'ca-app-pub-3077862428685229/1653206711',
  }),
};