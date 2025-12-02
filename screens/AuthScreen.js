// screens/AuthScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { 
  GoogleAuthProvider, 
  signInWithCredential,
  OAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

export default function AuthScreen({ navigation }) {
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
    // Google Sign-In 설정
    GoogleSignin.configure({
      webClientId: '671138886263-ibtsvptfbe2co6fup7skhuoumhfs2dba.apps.googleusercontent.com',
      offlineAccess: true,
    });

    // Apple 로그인 가능 여부 확인 (iOS만)
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      console.log('구글 로그인 시작');
      
      // Google Play Services 확인
      await GoogleSignin.hasPlayServices();
      
      // 구글 로그인 실행
      const userInfo = await GoogleSignin.signIn();
      
      console.log('구글 로그인 성공:', userInfo);
      
      // ID 토큰 가져오기
      const { idToken } = userInfo;
      
      // Firebase 인증
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, googleCredential);
      const user = result.user;
      
      console.log('Firebase 로그인 성공:', user.email);
      
      // Firestore에서 사용자 정보 확인
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // 신규 사용자인 경우 기본 정보 저장
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
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
      
      if (error.code === 'SIGN_IN_CANCELLED') {
        console.log('사용자가 로그인을 취소했습니다');
      } else if (error.code === 'IN_PROGRESS') {
        console.log('이미 로그인 진행 중입니다');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('오류', 'Google Play 서비스를 사용할 수 없습니다');
      } else {
        Alert.alert('오류', '구글 로그인에 실패했습니다');
      }
    }
  };

  // Apple 로그인 처리
  const handleAppleLogin = async () => {
    try {
      console.log('Apple 로그인 시작');
      
      // nonce 생성 (보안용)
      const nonce = Math.random().toString(36).substring(2, 10);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );
      
      // Apple 로그인 실행
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      
      console.log('Apple 로그인 성공:', credential);
      
      // Firebase 인증
      const provider = new OAuthProvider('apple.com');
      const oAuthCredential = provider.credential({
        idToken: credential.identityToken,
        rawNonce: nonce,
      });
      
      const result = await signInWithCredential(auth, oAuthCredential);
      const user = result.user;
      
      console.log('Firebase Apple 로그인 성공:', user.uid);
      
      // Firestore에서 사용자 정보 확인
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Apple은 이름을 첫 로그인 때만 제공
        const fullName = credential.fullName;
        let displayName = '사용자';
        
        if (fullName) {
          const givenName = fullName.givenName || '';
          const familyName = fullName.familyName || '';
          displayName = `${familyName}${givenName}`.trim() || '사용자';
        }
        
        // 신규 사용자인 경우 기본 정보 저장
        await setDoc(userDocRef, {
          email: credential.email || user.email || '',
          displayName: displayName,
          nickname: displayName,
          profileImage: null,
          provider: 'apple',
          createdAt: serverTimestamp(),
          gender: '',
          birthYear: 0,
          introduction: '',
          currentSituation: '',
          visitCount: 1,
        });
        
        console.log('신규 Apple 사용자 등록 완료');
        
        Alert.alert(
          '환영합니다!',
          'Apple 계정으로 가입되었습니다.',
          [{ text: '확인' }]
        );
      } else {
        // 기존 사용자 방문 횟수 증가
        await setDoc(userDocRef, {
          visitCount: (userDoc.data().visitCount || 0) + 1,
          lastVisit: serverTimestamp(),
        }, { merge: true });
        
        console.log('기존 Apple 사용자 로그인 완료');
      }
    } catch (error) {
      console.error('Apple 로그인 에러:', error);
      
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('사용자가 Apple 로그인을 취소했습니다');
      } else {
        Alert.alert('오류', 'Apple 로그인에 실패했습니다');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.logo}>마음다락방</Text>
        <Text style={styles.tagline}>연애 고민, 이제 혼자 하지 마세요</Text>

        {/* Apple 로그인 버튼 (iOS만 표시) */}
        {Platform.OS === 'ios' && appleAuthAvailable && (
          <TouchableOpacity 
            style={[styles.socialButton, styles.appleButton]} 
            onPress={handleAppleLogin}
          >
            <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
            <Text style={[styles.socialButtonText, styles.appleButtonText]}>
              Apple로 시작하기
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.socialButton, styles.googleButton]} 
          onPress={handleGoogleLogin}
        >
          <Ionicons name="logo-google" size={24} color="#DB4437" />
          <Text style={styles.socialButtonText}>구글로 시작하기</Text>
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
  appleButton: {
    backgroundColor: '#000000',
  },
  appleButtonText: {
    color: '#FFFFFF',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  socialButtonText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
    fontWeight: 'bold',
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