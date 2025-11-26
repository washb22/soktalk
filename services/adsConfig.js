// services/adsConfig.js
import { Platform } from 'react-native';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

// 광고 초기화
export const initializeAds = async () => {
  try {
    await mobileAds().initialize();
    
    // 광고 설정
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

// 실제 광고 단위 ID (플랫폼별)
export const AD_UNITS = {
  // 홈화면 배너 광고
  BANNER_HOME: Platform.select({
    android: 'ca-app-pub-3077862428685229/5849163096',
    ios: 'ca-app-pub-3077862428685229/2971718313',
  }),
  
  // 게시글 배너 광고
  BANNER_POST_DETAIL: Platform.select({
    android: 'ca-app-pub-3077862428685229/6582416993',
    ios: 'ca-app-pub-3077862428685229/1658636643',
  }),
  
  // 궁합분석 전면 광고
  INTERSTITIAL_COMPATIBILITY: Platform.select({
    android: 'ca-app-pub-3077862428685229/9208580336',
    ios: 'ca-app-pub-3077862428685229/7723791045',
  }),
  
  // 조언 전면 광고
  INTERSTITIAL_ADVICE: Platform.select({
    android: 'ca-app-pub-3077862428685229/3245807216',
    ios: 'ca-app-pub-3077862428685229/1653206711',
  }),
};