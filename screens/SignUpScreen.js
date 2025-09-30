// screens/SignUpScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState(''); // male, female
  const [birthYear, setBirthYear] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [currentSituation, setCurrentSituation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해주세요');
      return false;
    }
    if (!password.trim() || password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상 입력해주세요');
      return false;
    }
    if (password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다');
      return false;
    }
    if (!nickname.trim() || nickname.length < 2) {
      Alert.alert('알림', '닉네임은 2자 이상 입력해주세요');
      return false;
    }
    if (!gender) {
      Alert.alert('알림', '성별을 선택해주세요');
      return false;
    }
    if (!birthYear.trim() || birthYear.length !== 4) {
      Alert.alert('알림', '출생년도를 4자리로 입력해주세요');
      return false;
    }
    const year = parseInt(birthYear);
    if (year < 1900 || year > new Date().getFullYear()) {
      Alert.alert('알림', '올바른 출생년도를 입력해주세요');
      return false;
    }
    if (introduction.trim().length < 10) {
      Alert.alert('알림', '자기소개는 10자 이상 입력해주세요');
      return false;
    }
    if (currentSituation.trim().length < 10) {
      Alert.alert('알림', '현재상황은 10자 이상 입력해주세요');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // 1. Firebase Auth로 회원가입
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      // 2. Firestore에 사용자 프로필 저장
      await setDoc(doc(db, 'users', user.uid), {
        email: email.trim(),
        nickname: nickname.trim(),
        gender,
        birthYear: parseInt(birthYear),
        introduction: introduction.trim(),
        currentSituation: currentSituation.trim(),
        createdAt: serverTimestamp(),
      });

      // 3. 자기소개 + 현재상황을 잡담 게시판에 자동 등록
      const postContent = `${introduction.trim()}\n\n${currentSituation.trim()}`;
      
      await addDoc(collection(db, 'posts'), {
        title: `${nickname.trim()}님의 이야기`,
        content: postContent,
        category: '잡담',
        author: nickname.trim(),
        authorId: user.uid,
        isAnonymous: false,
        views: 0,
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
      });

      Alert.alert('가입 완료', '회원가입이 완료되었습니다!', [
        {
          text: '확인',
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          }),
        },
      ]);
    } catch (error) {
      console.error('회원가입 에러:', error);
      let errorMessage = '회원가입에 실패했습니다';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '올바른 이메일 형식이 아닙니다';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다';
      }
      
      Alert.alert('오류', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>회원가입</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.description}>
            속마음톡에 오신 것을 환영합니다!{'\n'}
            회원가입 후 자유롭게 고민을 나눠보세요.
          </Text>

          {/* 이메일 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일 *</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* 비밀번호 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 * (6자 이상)</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 입력하세요"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* 비밀번호 확인 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 확인 *</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 다시 입력하세요"
              placeholderTextColor="#999"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
            />
          </View>

          {/* 닉네임 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>닉네임 * (2자 이상)</Text>
            <TextInput
              style={styles.input}
              placeholder="사용할 닉네임을 입력하세요"
              placeholderTextColor="#999"
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
            />
          </View>

          {/* 성별 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>성별 *</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'male' && styles.genderButtonActive,
                ]}
                onPress={() => setGender('male')}
              >
                <Ionicons
                  name="male"
                  size={20}
                  color={gender === 'male' ? '#fff' : '#FF6B6B'}
                />
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'male' && styles.genderButtonTextActive,
                  ]}
                >
                  남성
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'female' && styles.genderButtonActive,
                ]}
                onPress={() => setGender('female')}
              >
                <Ionicons
                  name="female"
                  size={20}
                  color={gender === 'female' ? '#fff' : '#FF6B6B'}
                />
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'female' && styles.genderButtonTextActive,
                  ]}
                >
                  여성
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 출생년도 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>출생년도 *</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 1995"
              placeholderTextColor="#999"
              value={birthYear}
              onChangeText={setBirthYear}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>

          {/* 자기소개 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>자기소개 * (10자 이상)</Text>
            <Text style={styles.helperText}>
              예: 현재 남자친구랑 5년째 사귀고 있어요
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="자신에 대해 자유롭게 소개해주세요"
              placeholderTextColor="#999"
              value={introduction}
              onChangeText={setIntroduction}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{introduction.length}/10</Text>
          </View>

          {/* 현재상황 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>현재상황 * (10자 이상)</Text>
            <Text style={styles.helperText}>
              예: 헤어졌는데 어떻게 해야할지 모르겠어요
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="지금 겪고 있는 고민이나 상황을 적어주세요"
              placeholderTextColor="#999"
              value={currentSituation}
              onChangeText={setCurrentSituation}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{currentSituation.length}/10</Text>
          </View>

          <Text style={styles.notice}>
            * 회원가입 시 자기소개와 현재상황이 잡담 게시판에 자동으로 등록됩니다.
          </Text>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? '가입 중...' : '회원가입'}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 30,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 6,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    backgroundColor: '#fff',
    gap: 6,
  },
  genderButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  genderButtonText: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: '#fff',
  },
  notice: {
    fontSize: 12,
    color: '#FF6B6B',
    lineHeight: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpace: {
    height: 40,
  },
});