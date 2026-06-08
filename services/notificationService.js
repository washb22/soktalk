// services/notificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../firebase';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

// 알림 기본 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// 푸시 알림 권한 요청 및 토큰 가져오기
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
    });
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('알림 권한이 거부되었습니다.');
      return null;
    }
    
    // projectId 명시적으로 추가
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'b0255ada-c852-4ab5-b44c-5d5ba275781d'
    })).data;
    console.log('===== 푸시 토큰 생성 성공! =====');
    console.log('토큰:', token);
  } catch (error) {
    console.error('푸시 토큰 생성 에러:', error);
    console.error('에러 상세:', error.message);
  }

  return token;
}

// 앱 시작 시 호출: 권한이 "이미 허용된" 경우에만 토큰을 조용히 저장/갱신
// (권한 요청 다이얼로그를 띄우지 않음 → iOS 영구거부 위험 없음)
export async function syncPushTokenIfGranted(userId) {
  if (!userId) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      // 아직 허용 안 함 → 글쓰기/댓글 trigger 모달에서 유도하므로 여기선 아무것도 안 함
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'b0255ada-c852-4ab5-b44c-5d5ba275781d',
    })).data;

    if (token) {
      await savePushToken(userId, token);
      console.log('🔄 앱 시작 시 푸시 토큰 동기화 완료');
    }
  } catch (error) {
    console.error('푸시 토큰 동기화 에러:', error);
  }
}

// Firestore에 FCM 토큰 저장
export async function savePushToken(userId, token) {
  if (!token) return;

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      pushToken: token,
      pushTokenUpdatedAt: new Date(),
    });
    console.log('✅ 푸시 토큰 저장 완료');
  } catch (error) {
    console.error('❌ 푸시 토큰 저장 에러:', error);
  }
}

// 댓글 알림 전송
export async function sendCommentNotification(postAuthorId, commenterName, postTitle, postId) {
  try {
    // 게시글 작성자의 푸시 토큰 가져오기
    const userRef = doc(db, 'users', postAuthorId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log('사용자를 찾을 수 없습니다.');
      return;
    }

    const pushToken = userSnap.data().pushToken;
    
    if (!pushToken) {
      console.log('푸시 토큰이 없습니다.');
      return;
    }

    // Expo Push API로 알림 전송
    const message = {
      to: pushToken,
      sound: 'default',
      title: '새 댓글 💬',
      body: `${commenterName}님이 "${postTitle}"에 댓글을 남겼습니다.`,
      data: { 
        type: 'comment',
        postId: postId,
        screen: 'PostDetail'
      },
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('📨 댓글 알림 응답:', JSON.stringify(result));
    await handlePushReceipt(result, postAuthorId);
  } catch (error) {
    console.error('❌ 댓글 알림 전송 에러:', error);
  }
}

// Expo 푸시 응답 처리: 에러 로깅 + 만료 토큰 정리
async function handlePushReceipt(result, userId) {
  const ticket = result && result.data;
  if (!ticket) {
    console.warn('⚠️ 푸시 응답에 data 없음:', JSON.stringify(result));
    return;
  }

  if (ticket.status === 'ok') {
    console.log('✅ 알림 전송 완료');
    return;
  }

  // 전송 실패
  console.error('❌ 알림 전송 실패:', ticket.message, ticket.details);

  // 토큰이 더 이상 유효하지 않으면 Firestore에서 제거 → 다음 로그인 때 재발급
  if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
    try {
      await updateDoc(doc(db, 'users', userId), { pushToken: null });
      console.log('🧹 만료된 푸시 토큰 제거 완료');
    } catch (e) {
      console.error('토큰 제거 실패:', e);
    }
  }
}

// 답글 알림 전송 (원댓글 작성자에게)
export async function sendReplyNotification(commentAuthorId, replierName, postTitle, postId) {
  try {
    const userRef = doc(db, 'users', commentAuthorId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log('사용자를 찾을 수 없습니다.');
      return;
    }

    const pushToken = userSnap.data().pushToken;
    if (!pushToken) {
      console.log('푸시 토큰이 없습니다.');
      return;
    }

    const message = {
      to: pushToken,
      sound: 'default',
      title: '새 답글 💬',
      body: `${replierName}님이 내 댓글에 답글을 남겼습니다.`,
      data: {
        type: 'reply',
        postId: postId,
        screen: 'PostDetail',
      },
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('📨 답글 알림 응답:', JSON.stringify(result));
    await handlePushReceipt(result, commentAuthorId);
  } catch (error) {
    console.error('❌ 답글 알림 전송 에러:', error);
  }
}

// 좋아요 알림 전송
export async function sendLikeNotification(postAuthorId, likerName, postTitle, postId) {
  try {
    // 게시글 작성자의 푸시 토큰 가져오기
    const userRef = doc(db, 'users', postAuthorId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log('사용자를 찾을 수 없습니다.');
      return;
    }

    const pushToken = userSnap.data().pushToken;
    
    if (!pushToken) {
      console.log('푸시 토큰이 없습니다.');
      return;
    }

    // Expo Push API로 알림 전송
    const message = {
      to: pushToken,
      sound: 'default',
      title: '새 좋아요 ❤️',
      body: `${likerName}님이 "${postTitle}"을(를) 좋아합니다.`,
      data: { 
        type: 'like',
        postId: postId,
        screen: 'PostDetail'
      },
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('📨 좋아요 알림 응답:', JSON.stringify(result));
    await handlePushReceipt(result, postAuthorId);
  } catch (error) {
    console.error('❌ 좋아요 알림 전송 에러:', error);
  }
}

// 알림 리스너 설정
export function setupNotificationListener(navigation) {
  // 포그라운드에서 알림 받았을 때
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('🔔 알림 수신:', notification);
  });

  // 알림 클릭했을 때
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('🔔 알림 클릭:', response);
    const { screen, postId } = response.notification.request.content.data;
    
    if (screen === 'PostDetail' && postId) {
      navigation.navigate('PostDetail', { postId });
    }
  });

  // cleanup 함수 반환
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}