// components/EventPopup.js
// 어드민 공지(notices) 중 showAsPopup=true 인 항목을 앱 실행 시 팝업으로 표시.
// 내용·이미지·노출 여부 모두 Firestore에서 읽으므로, 새 이벤트는 앱 업데이트 없이 어드민에서 제어 가능.
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const DISMISS_KEY_PREFIX = 'event_popup_dismissed_'; // + noticeId → 'YYYY-M-D' (그날 하루 숨김)

export default function EventPopup({ navigationRef }) {
  const [popup, setPopup] = useState(null);
  const [dontShowToday, setDontShowToday] = useState(false);

  useEffect(() => {
    loadPopup();
  }, []);

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const loadPopup = async () => {
    try {
      // 단일 equality 쿼리 → 별도 복합 인덱스 불필요
      const q = query(collection(db, 'notices'), where('showAsPopup', '==', true));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      // 활성화된 것만 + 최신순 정렬
      const candidates = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((n) => n.isActive !== false)
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });

      // '오늘 하루 보지 않기'로 숨기지 않은 첫 항목을 노출
      const today = todayStr();
      for (const notice of candidates) {
        const dismissed = await AsyncStorage.getItem(DISMISS_KEY_PREFIX + notice.id);
        if (dismissed !== today) {
          setPopup(notice);
          return;
        }
      }
    } catch (error) {
      console.log('이벤트 팝업 로드 에러:', error);
    }
  };

  const handleClose = async () => {
    if (popup && dontShowToday) {
      await AsyncStorage.setItem(DISMISS_KEY_PREFIX + popup.id, todayStr());
    }
    setPopup(null);
  };

  const handleDetail = async () => {
    const target = popup;
    await handleClose();
    if (target && navigationRef?.current) {
      navigationRef.current.navigate('NoticeDetail', { notice: target });
    }
  };

  if (!popup) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 닫기 X */}
          <TouchableOpacity style={styles.closeIcon} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#999" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {!!popup.imageUrl && (
              <Image
                source={{ uri: popup.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            )}

            <Text style={styles.title}>{popup.title}</Text>

            {!!popup.content && (
              <Text style={styles.content}>{popup.content}</Text>
            )}
          </ScrollView>

          {/* 자세히 보기 */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleDetail}>
            <Text style={styles.primaryButtonText}>자세히 보기</Text>
          </TouchableOpacity>

          {/* 오늘 하루 보지 않기 / 닫기 */}
          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setDontShowToday((v) => !v)}
            >
              <Ionicons
                name={dontShowToday ? 'checkbox' : 'square-outline'}
                size={20}
                color={dontShowToday ? '#FF6B6B' : '#bbb'}
              />
              <Text style={styles.checkText}>오늘 하루 보지 않기</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
  },
  closeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  content: {
    fontSize: 15,
    color: '#555',
    lineHeight: 23,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkText: {
    fontSize: 13,
    color: '#888',
  },
  closeText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
