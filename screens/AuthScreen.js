// screens/AuthScreen.js
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ navigation }) {
  // 구글 인증 설정 - response 변수 제거
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '336220678179-gemki8b9a1c6232tckdaqma565vn2ttf.apps.googleusercontent.com',
    // Expo 프록시 사용 설정 추가
    redirectUri: makeRedirectUri({ useProxy: true }),
  });

  // 리디렉션 URI 확인용 로그
  useEffect(() => {
    if (request) {
      console.log('=== IMPORTANT: Copy this Redirect URI to Google Console ===');
      console.log('Redirect URI:', request.redirectUri);
      console.log('=========================================================');
    }
  }, [request]);

  const handleGoogleLogin = () => {
    console.log('구글 로그인 버튼 클릭');
    console.log('Request 상태:', request ? 'Available' : 'Not available');
    
    if (request) {
      promptAsync().then((response) => {
        if (response?.type === 'success') {
          const { id_token } = response.params;
          handleGoogleSignIn(id_token);
        } else if (response?.type === 'cancel') {
          console.log('구글 로그인 취소');
        }
      }).catch((error) => {
        console.error('구글 로그인 에러:', error);
        Alert.alert('오류', '구글 로그인에 실패했습니다.');
      });
    } else {
      Alert.alert('알림', '구글 로그인을 준비 중입니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleGoogleSignIn = async (idToken) => {
    try {
      console.log('ID Token received, signing in...');
      
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      
      console.log('Firebase 로그인 성공:', user.email);
      
      // Firestore에서 사용자 정보 확인
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // 신규 사용자인 경우 기본 정보 저장
        await setDoc(userDocRef, {
          email: user.email,
          nickname: user.displayName || user.email.split('@')[0],
          profileImage: user.photoURL,
          provider: 'google',
          createdAt: serverTimestamp(),
          gender: '',
          birthYear: 0,
          introduction: '',
          currentSituation: '',
          visitCount: 1,
        });
        
        console.log('신규 구글 사용자 등록 완료');
        
        Alert.alert(
          '환영합니다!',
          '구글 계정으로 가입되었습니다.',
          [{ text: '확인' }]
        );
      } else {
        // 기존 사용자 방문 횟수 증가
        await setDoc(userDocRef, {
          visitCount: (userDoc.data().visitCount || 0) + 1,
          lastVisit: serverTimestamp(),
        }, { merge: true });
        
        console.log('기존 사용자 로그인 완료');
      }
    } catch (error) {
      console.error('구글 로그인 에러:', error);
      Alert.alert('오류', '로그인 처리 중 문제가 발생했습니다.');
    }
  };

  const handleKakaoLogin = () => {
    Alert.alert('알림', '카카오 로그인은 준비 중입니다.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.logo}>속마음톡</Text>
        <Text style={styles.tagline}>연애 고민, 이제 혼자 하지 마세요</Text>

        <TouchableOpacity 
          style={[styles.socialButton, styles.googleButton]} 
          onPress={handleGoogleLogin}
        >
          <Ionicons name="logo-google" size={24} color="#DB4437" />
          <Text style={styles.socialButtonText}>구글로 시작하기</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.socialButton, styles.kakaoButton]} 
          onPress={handleKakaoLogin}
        >
          <Ionicons name="chatbubble" size={24} color="#3C1E1E" />
          <Text style={[styles.socialButtonText, styles.kakaoButtonText]}>
            카카오로 시작하기
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity 
          style={styles.signupButton} 
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.signupButtonText}>이메일로 회원가입</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>이메일로 로그인</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          로그인 시 이용약관 및 개인정보처리방침에 동의합니다
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginBottom: 50,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 12,
    width: '85%',
    elevation: 3,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderWidth: 0,
  },
  socialButtonText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
    fontWeight: '500',
  },
  kakaoButtonText: {
    color: '#3C1E1E',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '85%',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 16,
  },
  signupButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    width: '85%',
    alignItems: 'center',
  },
  signupButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  loginButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    width: '85%',
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  terms: {
    fontSize: 12,
    color: '#999',
    marginTop: 30,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});