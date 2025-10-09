// components/BannerAd.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

export default function BannerAdComponent({ adUnitId }) {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('✅ 배너 광고 로드 성공');
        }}
        onAdFailedToLoad={(error) => {
          console.error('❌ 배너 광고 로드 실패:', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#f5f5f5',
  },
});