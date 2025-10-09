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

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    console.log('✅ 댓글 알림 전송 완료');
  } catch (error) {
    console.error('❌ 댓글 알림 전송 에러:', error);
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

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    console.log('✅ 좋아요 알림 전송 완료');
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