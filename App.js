// App.js
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';

// AuthProvider 임포트
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

// 푸시 알림 서비스
import { setupNotificationListener } from './services/notificationService';

// 푸시 알림 유도 팝업
import PushNotificationPrompt from './components/PushNotificationPrompt';

// 강제 업데이트 체크
import ForceUpdateCheck from './components/ForceUpdateCheck';

// 🎯 광고 초기화
import { initializeAds } from './services/adsConfig';

// 화면 컴포넌트들 임포트
import AuthScreen from './screens/AuthScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import WritePostScreen from './screens/WritePostScreen';
import PostDetailScreen from './screens/PostDetailScreen';
import EditPostScreen from './screens/EditPostScreen';
import ProfileScreen from './screens/ProfileScreen';
import CompatibilityScreen from './screens/CompatibilityScreen';
import LikedPostsScreen from './screens/LikedPostsScreen';
import CommentedPostsScreen from './screens/CommentedPostsScreen';
import TermsScreen from './screens/TermsScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import NoticeDetailScreen from './screens/NoticeDetailScreen';

function BoardScreen({ navigation }) {
  return <HomeScreen navigation={navigation} category="연애상담" />;
}

function ChatScreen({ navigation }) {
  return <HomeScreen navigation={navigation} category="잡담" />;
}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === '인기글') {
            iconName = focused ? 'flame' : 'flame-outline';
          } else if (route.name === '연애상담') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === '잡담') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === '궁합') {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          } else if (route.name === 'MY') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="인기글" component={HomeScreen} />
      <Tab.Screen name="연애상담" component={BoardScreen} />
      <Tab.Screen name="잡담" component={ChatScreen} />
      <Tab.Screen name="궁합" component={CompatibilityScreen} />
      <Tab.Screen name="MY" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="WritePost" component={WritePostScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="EditPost" component={EditPostScreen} />
      <Stack.Screen name="LikedPosts" component={LikedPostsScreen} />
      <Stack.Screen name="CommentedPosts" component={CommentedPostsScreen} />
      <Stack.Screen name="NoticeDetail" component={NoticeDetailScreen} />
      <Stack.Screen 
        name="Terms" 
        component={TermsScreen}
        options={{ 
          headerShown: true,
          title: '이용약관',
          headerStyle: {
            backgroundColor: '#FF6B6B',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen 
        name="Privacy" 
        component={PrivacyScreen}
        options={{ 
          headerShown: true,
          title: '개인정보 처리방침',
          headerStyle: {
            backgroundColor: '#FF6B6B',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen 
        name="Terms" 
        component={TermsScreen}
        options={{ 
          headerShown: true,
          title: '이용약관',
          headerStyle: {
            backgroundColor: '#FF6B6B',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen 
        name="Privacy" 
        component={PrivacyScreen}
        options={{ 
          headerShown: true,
          title: '개인정보 처리방침',
          headerStyle: {
            backgroundColor: '#FF6B6B',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const navigationRef = useRef();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [pendingNotification, setPendingNotification] = useState(null);

  // 🎯 광고 초기화 (앱 시작 시 한 번만)
  useEffect(() => {
    initializeAds();
  }, []);

  // 🔔 푸시 알림 프롬프트 표시 (로그인 후 약간의 딜레이)
  useEffect(() => {
    if (user) {
      // 방문 횟수 업데이트
      updateUserVisitCount(user.uid);
      
      // 앱이 완전히 로드된 후 푸시 프롬프트 표시 (5초 딜레이 - 앱 탐색 시간 확보)
      const timer = setTimeout(() => {
        setShowPushPrompt(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setShowPushPrompt(false);
    }
  }, [user]);

  // 🔔 알림 리스너 설정 (앱 실행 중 알림 클릭)
  useEffect(() => {
    const cleanup = setupNotificationListener(navigationRef.current);
    return cleanup;
  }, [isNavigationReady]);

  // 🔔 앱 종료/백그라운드 상태에서 알림 클릭 처리
  useEffect(() => {
    const checkInitialNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          const data = response.notification.request.content.data;
          if (data?.screen === 'PostDetail' && data?.postId) {
            setPendingNotification(data);
          }
        }
      } catch (error) {
        console.error('초기 알림 확인 에러:', error);
      }
    };
    
    checkInitialNotification();
  }, []);

  // 🔔 대기 중인 알림 처리 (네비게이션 준비 + 로그인 완료 후)
  useEffect(() => {
    if (pendingNotification && isNavigationReady && user && navigationRef.current) {
      const { screen, postId } = pendingNotification;
      
      // 약간의 딜레이 후 네비게이션 (화면 렌더링 대기)
      setTimeout(() => {
        if (screen === 'PostDetail' && postId) {
          navigationRef.current.navigate('PostDetail', { postId });
        }
        setPendingNotification(null);
      }, 500);
    }
  }, [pendingNotification, isNavigationReady, user]);

  const updateUserVisitCount = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        const updates = {
          visitCount: increment(1),
          lastVisit: serverTimestamp(),
        };
        // 깡통 문서(createdAt 누락) 자동 보정
        if (!data.createdAt) {
          updates.createdAt = serverTimestamp();
        }
        await updateDoc(userDocRef, updates);
      } else {
        // 신규 문서: createdAt 반드시 박기 (어드민 회원관리 정렬 의존)
        await setDoc(userDocRef, {
          visitCount: 1,
          lastVisit: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('방문 횟수 업데이트 에러:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>로딩 중...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer 
      ref={navigationRef}
      onReady={() => setIsNavigationReady(true)}
    >
      {user ? (
        <>
          <MainStack />
          {/* 🔔 푸시 알림 유도 팝업 */}
          {showPushPrompt && (
            <PushNotificationPrompt 
              userId={user.uid}
              onComplete={() => setShowPushPrompt(false)}
            />
          )}
        </>
      ) : (
        <AuthStack />
      )}
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ForceUpdateCheck>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ForceUpdateCheck>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});