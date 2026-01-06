// components/PushNotificationPrompt.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const PROMPT_STORAGE_KEY = 'push_prompt_shown';
const REMINDER_STORAGE_KEY = 'push_reminder_last_shown';
const REMINDER_INTERVAL_DAYS = 7; // 7일마다 리마인더

export default function PushNotificationPrompt({ userId, onComplete }) {
  const [showPrePermission, setShowPrePermission] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    checkAndShowPrompt();
  }, []);

  const checkAndShowPrompt = async () => {
    try {
      // 현재 권한 상태 확인
      const { status } = await Notifications.getPermissionsAsync();
      
      if (status === 'granted') {
        // 이미 허용됨 - 아무것도 안 함
        onComplete && onComplete();
        return;
      }

      // 사전 설명 팝업을 이미 봤는지 확인
      const promptShown = await AsyncStorage.getItem(PROMPT_STORAGE_KEY);
      
      if (!promptShown) {
        // 처음 - 사전 설명 팝업 표시
        setShowPrePermission(true);
      } else {
        // 이미 봤음 - 리마인더 체크
        await checkReminder(status);
      }
    } catch (error) {
      console.error('푸시 프롬프트 체크 에러:', error);
    }
  };

  const checkReminder = async (status) => {
    if (status === 'denied' || status === 'undetermined') {
      const lastShown = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
      
      if (lastShown) {
        const daysSinceLastShown = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastShown >= REMINDER_INTERVAL_DAYS) {
          setShowReminder(true);
        }
      } else {
        // 처음 리마인더
        setShowReminder(true);
      }
    }
  };

  // 사전 설명 후 실제 권한 요청
  const handleAcceptPrePermission = async () => {
    setShowPrePermission(false);
    await AsyncStorage.setItem(PROMPT_STORAGE_KEY, 'true');
    
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        // 토큰 저장
        const token = (await Notifications.getExpoPushTokenAsync({
          projectId: 'b0255ada-c852-4ab5-b44c-5d5ba275781d'
        })).data;
        
        if (token && userId) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            pushToken: token,
            pushTokenUpdatedAt: new Date(),
          });
          console.log('✅ 푸시 토큰 저장 완료');
        }
      }
    } catch (error) {
      console.error('권한 요청 에러:', error);
    }
    
    onComplete && onComplete();
  };

  // 사전 설명에서 나중에 선택
  const handleDeclinePrePermission = async () => {
    setShowPrePermission(false);
    await AsyncStorage.setItem(PROMPT_STORAGE_KEY, 'true');
    await AsyncStorage.setItem(REMINDER_STORAGE_KEY, Date.now().toString());
    onComplete && onComplete();
  };

  // 리마인더에서 설정으로 이동
  const handleGoToSettings = async () => {
    setShowReminder(false);
    await AsyncStorage.setItem(REMINDER_STORAGE_KEY, Date.now().toString());
    
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  // 리마인더에서 나중에 선택
  const handleDeclineReminder = async () => {
    setShowReminder(false);
    await AsyncStorage.setItem(REMINDER_STORAGE_KEY, Date.now().toString());
  };

  // 사전 설명 팝업 (첫 번째)
  const renderPrePermissionModal = () => (
    <Modal
      visible={showPrePermission}
      transparent
      animationType="fade"
      onRequestClose={handleDeclinePrePermission}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 아이콘 */}
          <View style={styles.iconContainer}>
            <Ionicons name="notifications" size={50} color="#FF6B6B" />
          </View>
          
          {/* 제목 */}
          <Text style={styles.title}>알림을 켜시겠어요?</Text>
          
          {/* 설명 */}
          <View style={styles.benefitList}>
            <View style={styles.benefitItem}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FF6B6B" />
              <Text style={styles.benefitText}>내 글에 댓글이 달리면 바로 알려드려요</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="heart" size={20} color="#FF6B6B" />
              <Text style={styles.benefitText}>누군가 내 글을 좋아하면 알려드려요</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="megaphone" size={20} color="#FF6B6B" />
              <Text style={styles.benefitText}>이벤트, 공지사항도 놓치지 마세요</Text>
            </View>
          </View>
          
          {/* 버튼들 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAcceptPrePermission}
            >
              <Ionicons name="notifications" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>알림 받기</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleDeclinePrePermission}
            >
              <Text style={styles.secondaryButtonText}>나중에</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 리마인더 팝업 (거부한 사용자용)
  const renderReminderModal = () => (
    <Modal
      visible={showReminder}
      transparent
      animationType="fade"
      onRequestClose={handleDeclineReminder}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 아이콘 */}
          <View style={styles.iconContainerReminder}>
            <Ionicons name="notifications-off" size={40} color="#999" />
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>!</Text>
            </View>
          </View>
          
          {/* 제목 */}
          <Text style={styles.title}>알림이 꺼져있어요</Text>
          
          {/* 설명 */}
          <Text style={styles.reminderDescription}>
            내 글에 댓글이 달려도 모를 수 있어요!{'\n'}
            알림을 켜면 바로 확인할 수 있어요.
          </Text>
          
          {/* 버튼들 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGoToSettings}
            >
              <Ionicons name="settings" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>설정에서 켜기</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleDeclineReminder}
            >
              <Text style={styles.secondaryButtonText}>나중에</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {renderPrePermissionModal()}
      {renderReminderModal()}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainerReminder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  alertBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  benefitList: {
    width: '100%',
    marginBottom: 25,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  benefitText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 12,
    flex: 1,
  },
  reminderDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: '#999',
    fontSize: 15,
  },
});