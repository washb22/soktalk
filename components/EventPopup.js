// components/EventPopup.js
// 어드민 공지(notices) 중 showAsPopup=true 인 항목을 앱 실행 시 "세로 포스터형" 팝업으로 표시.
// 최대 2개까지 순차로 노출(하나 닫으면 다음이 뜸). 내용·이미지·노출 여부 모두 Firestore에서 제어.
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
const MAX_POPUPS = 2; // 앱 실행 시 최대 노출 개수

export default function EventPopup({ navigationRef }) {
  const [queue, setQueue] = useState([]); // 노출할 공지들(최신순, 최대 MAX_POPUPS)
  const [index, setIndex] = useState(0); // 현재 보여주는 순번
  const [dontShowToday, setDontShowToday] = useState(false);

  useEffect(() => {
    loadPopups();
  }, []);

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const loadPopups = async () => {
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

      // '오늘 하루 보지 않기'로 숨기지 않은 것만, 최대 MAX_POPUPS개
      const today = todayStr();
      const fresh = [];
      for (const notice of candidates) {
        const dismissed = await AsyncStorage.getItem(DISMISS_KEY_PREFIX + notice.id);
        if (dismissed !== today) {
          fresh.push(notice);
          if (fresh.length >= MAX_POPUPS) break;
        }
      }
      if (fresh.length > 0) setQueue(fresh);
    } catch (error) {
      console.log('이벤트 팝업 로드 에러:', error);
    }
  };

  // 현재 팝업 닫고 다음으로 (없으면 종료)
  const advance = async () => {
    const cur = queue[index];
    if (cur && dontShowToday) {
      await AsyncStorage.setItem(DISMISS_KEY_PREFIX + cur.id, todayStr());
    }
    setDontShowToday(false);
    setIndex((i) => i + 1);
  };

  const handleDetail = async () => {
    const cur = queue[index];
    if (cur && dontShowToday) {
      await AsyncStorage.setItem(DISMISS_KEY_PREFIX + cur.id, todayStr());
    }
    setIndex(queue.length); // 팝업 흐름 종료
    if (cur && navigationRef?.current) {
      navigationRef.current.navigate('NoticeDetail', { notice: cur });
    }
  };

  const popup = queue[index];
  if (!popup) return null;

  const hasImage = !!popup.imageUrl;
  const remaining = queue.length - index; // 남은 개수(현재 포함)

  return (
    <Modal key={popup.id} visible transparent animationType="fade" onRequestClose={advance}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 여러 개일 때 진행 표시 (예: 1/2) */}
          {queue.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {index + 1}/{queue.length}
              </Text>
            </View>
          )}

          {/* 닫기 X (이미지 위에 떠있음) */}
          <TouchableOpacity style={styles.closeIcon} onPress={advance}>
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

          {/* 하단 바: 오늘 하루 보지 않기 / 다음·닫기 */}
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

            <TouchableOpacity onPress={advance}>
              <Text style={styles.closeText}>{remaining > 1 ? '다음' : '닫기'}</Text>
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
  counter: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    color: '#FF6B6B',
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
