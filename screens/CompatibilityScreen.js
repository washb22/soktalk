// screens/CompatibilityScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CompatibilityScreen() {
  const [myName, setMyName] = useState('');
  const [myBirthDate, setMyBirthDate] = useState(new Date());
  const [myGender, setMyGender] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerBirthDate, setPartnerBirthDate] = useState(new Date());
  const [partnerGender, setPartnerGender] = useState('');
  const [showMyDatePicker, setShowMyDatePicker] = useState(false);
  const [showPartnerDatePicker, setShowPartnerDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleAnalyze = async () => {
    if (!myName || !myGender || !partnerName || !partnerGender) {
      Alert.alert('알림', '모든 정보를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      console.log('API 호출 시작...');
      
      const response = await fetch('https://soktalk.vercel.app/api/compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          myName,
          myBirthDate: formatDate(myBirthDate),
          myGender,
          partnerName,
          partnerBirthDate: formatDate(partnerBirthDate),
          partnerGender,
        }),
      });

      console.log('응답 상태:', response.status);
      
      // 응답이 JSON인지 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버 응답이 JSON 형식이 아닙니다.');
      }

      const data = await response.json();
      console.log('받은 데이터:', data);
      
      if (data.success && data.loveStyle) {
        const match = data.loveStyle.match(/궁합\s*(\d+)%\s*-\s*(.+)/);
        if (match) {
          setResult({
            percentage: parseInt(match[1]),
            message: match[2].trim(),
          });
        } else {
          // 매칭 실패 시 전체 메시지 사용
          setResult({
            percentage: 70,
            message: data.loveStyle,
          });
        }
      } else {
        throw new Error('유효하지 않은 응답 데이터');
      }
    } catch (error) {
      console.error('에러 상세:', error);
      Alert.alert('오류', `궁합 분석 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setMyName('');
    setPartnerName('');
    setMyGender('');
    setPartnerGender('');
  };

  if (result) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>궁합 분석 결과</Text>
          
          <View style={styles.percentageCircle}>
            <Text style={styles.percentageText}>{result.percentage}%</Text>
          </View>

          <Text style={styles.resultMessage}>{result.message}</Text>

          <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
            <Text style={styles.resetButtonText}>다시 분석하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>오늘의 궁합</Text>
        <Text style={styles.subtitle}>1일 1회 무료 궁합보기</Text>

        {/* 내 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>내 정보</Text>
          
          <TextInput
            style={styles.input}
            placeholder="이름"
            value={myName}
            onChangeText={setMyName}
          />

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowMyDatePicker(true)}
          >
            <Text>{formatDate(myBirthDate)}</Text>
          </TouchableOpacity>

          {showMyDatePicker && (
            <DateTimePicker
              value={myBirthDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowMyDatePicker(false);
                if (selectedDate) setMyBirthDate(selectedDate);
              }}
            />
          )}

          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[styles.genderButton, myGender === '남성' && styles.genderButtonActive]}
              onPress={() => setMyGender('남성')}
            >
              <Text style={myGender === '남성' ? styles.genderTextActive : styles.genderText}>
                남성
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, myGender === '여성' && styles.genderButtonActive]}
              onPress={() => setMyGender('여성')}
            >
              <Text style={myGender === '여성' ? styles.genderTextActive : styles.genderText}>
                여성
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 상대 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>상대 정보</Text>
          
          <TextInput
            style={styles.input}
            placeholder="이름"
            value={partnerName}
            onChangeText={setPartnerName}
          />

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPartnerDatePicker(true)}
          >
            <Text>{formatDate(partnerBirthDate)}</Text>
          </TouchableOpacity>

          {showPartnerDatePicker && (
            <DateTimePicker
              value={partnerBirthDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowPartnerDatePicker(false);
                if (selectedDate) setPartnerBirthDate(selectedDate);
              }}
            />
          )}

          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[styles.genderButton, partnerGender === '남성' && styles.genderButtonActive]}
              onPress={() => setPartnerGender('남성')}
            >
              <Text style={partnerGender === '남성' ? styles.genderTextActive : styles.genderText}>
                남성
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, partnerGender === '여성' && styles.genderButtonActive]}
              onPress={() => setPartnerGender('여성')}
            >
              <Text style={partnerGender === '여성' ? styles.genderTextActive : styles.genderText}>
                여성
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>궁합 분석하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    color: '#FF6B6B',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  genderText: {
    color: '#666',
  },
  genderTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  analyzeButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultContainer: {
    padding: 30,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  percentageCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  percentageText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  resultMessage: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 30,
    paddingHorizontal: 20,
    color: '#333',
  },
  resetButton: {
    backgroundColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    paddingHorizontal: 40,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});