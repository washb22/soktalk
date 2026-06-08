// components/EventPopup.js
// 어드민 공지(notices) 중 showAsPopup=true 인 항목을 앱 실행 시 "세로 포스터형" 팝업으로 표시.
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

  const hasImage = !!popup.imageUrl;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 닫기 X (이미지 위에 떠있음) */}
          <TouchableOpacity style={styles.closeIcon} onPress={handleClose}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          {hasImage ? (
            // 포스터형: 세로 이미지가 팝업 전체. 탭하면 자세히 보기
            <TouchableOpacity activeOpacity={0.9} onPress={handleDetail}>
              <Image
                source={{ uri: popup.imageUrl }}
                style={styles.posterImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            // 이미지 없으면 텍스트 카드로 대체
            <View style={styles.textBlock}>
              <Text style={styles.title}>{popup.title}</Text>
              {!!popup.content && (
                <ScrollView style={styles.contentScroll}>
                  <Text style={styles.content}>{popup.content}</Text>
                </ScrollView>
              )}
              <TouchableOpacity style={styles.primaryButton} onPress={handleDetail}>
                <Text style={styles.primaryButtonText}>자세히 보기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 하단 바: 오늘 하루 보지 않기 / 닫기 */}
          <View style={styles.bottomBar}>
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
    width: '100%',
    maxWidth: 330,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterImage: {
    width: '100%',
    aspectRatio: 3 / 4, // 세로 포스터 비율 (예: 1080x1440)
  },
  textBlock: {
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  contentScroll: {
    maxHeight: 220,
    marginBottom: 12,
  },
  content: {
    fontSize: 15,
    color: '#555',
    lineHeight: 23,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
