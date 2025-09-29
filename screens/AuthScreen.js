// screens/AuthScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen({ navigation }) {
  const { testLogin } = useAuth();

  const handleGoogleLogin = () => {
    Alert.alert('알림', '구글 로그인 준비중');
    testLogin(); // 임시 로그인
  };

  const handleKakaoLogin = () => {
    Alert.alert('알림', '카카오 로그인 준비중');
    testLogin(); // 임시 로그인
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
          <Text style={[styles.socialButtonText, styles.kakaoButtonText]}>카카오로 시작하기</Text>
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
  terms: {
    fontSize: 12,
    color: '#999',
    marginTop: 30,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});