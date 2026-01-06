// components/ForceUpdateCheck.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// 스토어 URL
const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/id6740539614', // 실제 앱스토어 ID로 변경
  android: 'https://play.google.com/store/apps/details?id=com.wkrgud.soktalk',
});

export default function ForceUpdateCheck({ children }) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    checkForUpdate();
  }, []);

  // 안드로이드 뒤로가기 버튼 막기
  useEffect(() => {
    if (showUpdateModal) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // 뒤로가기 막기
        return true;
      });
      return () => backHandler.remove();
    }
  }, [showUpdateModal]);

  const checkForUpdate = async () => {
    try {
      // 현재 앱 버전
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      
      // Firestore에서 최소 버전 정보 가져오기
      const configRef = doc(db, 'appConfig', 'version');
      const configSnap = await getDoc(configRef);
      
      if (!configSnap.exists()) {
        console.log('버전 설정이 없습니다.');
        return;
      }
      
      const config = configSnap.data();
      const minVersion = config.minVersion || '1.0.0';
      const forceUpdate = config.forceUpdate || false;
      const updateMessage = config.updateMessage || '새로운 버전이 출시되었습니다.\n더 나은 서비스를 위해 업데이트해주세요.';
      
      console.log(`현재 버전: ${currentVersion}, 최소 버전: ${minVersion}`);
      
      // 버전 비교
      if (forceUpdate && compareVersions(currentVersion, minVersion) < 0) {
        setUpdateInfo({
          currentVersion,
          minVersion,
          message: updateMessage,
        });
        setShowUpdateModal(true);
      }
    } catch (error) {
      console.error('업데이트 체크 에러:', error);
    }
  };

  // 버전 비교 함수 (1.0.0 형식)
  const compareVersions = (current, minimum) => {
    const currentParts = current.split('.').map(Number);
    const minimumParts = minimum.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      const curr = currentParts[i] || 0;
      const min = minimumParts[i] || 0;
      
      if (curr < min) return -1;
      if (curr > min) return 1;
    }
    return 0;
  };

  // 스토어로 이동
  const goToStore = () => {
    Linking.openURL(STORE_URL);
  };

  return (
    <>
      {children}
      
      <Modal
        visible={showUpdateModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}} // 닫기 방지
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* 아이콘 */}
            <View style={styles.iconContainer}>
              <Ionicons name="download" size={50} color="#FF6B6B" />
            </View>
            
            {/* 제목 */}
            <Text style={styles.title}>업데이트가 필요해요</Text>
            
            {/* 설명 */}
            <Text style={styles.message}>
              {updateInfo?.message || '새로운 버전이 출시되었습니다.\n더 나은 서비스를 위해 업데이트해주세요.'}
            </Text>
            
            {/* 버전 정보 */}
            <View style={styles.versionInfo}>
              <Text style={styles.versionText}>
                현재 버전: {updateInfo?.currentVersion}
              </Text>
              <Text style={styles.versionText}>
                최신 버전: {updateInfo?.minVersion}
              </Text>
            </View>
            
            {/* 업데이트 버튼 */}
            <TouchableOpacity
              style={styles.updateButton}
              onPress={goToStore}
            >
              <Ionicons name="arrow-up-circle" size={22} color="#fff" />
              <Text style={styles.updateButtonText}>업데이트하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  versionInfo: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 24,
    width: '100%',
  },
  versionText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginVertical: 2,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});