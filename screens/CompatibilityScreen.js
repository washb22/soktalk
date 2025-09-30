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

  const parseResult = (resultText) => {
    // "궁합 72% - 헤드라인 이모지\n요약\n강점: ...\n주의: ...\n팁: ..." 파싱
    const lines = resultText.split('\n');
    
    // 첫 줄에서 퍼센트와 헤드라인 추출
    const firstLine = lines[0] || '';
    const percentMatch = firstLine.match(/(\d+)%/);
    const percentage = percentMatch ? parseInt(percentMatch[1]) : 70;
    const headline = firstLine.replace(/궁합\s*\d+%\s*-?\s*/, '').trim();
    
    // 나머지 라인 분류
    const summary = lines[1] || '';
    const strengths = lines.find(l => l.includes('강점:') || l.includes('좋은 점:') || l.includes('포인트:'))?.split(':')[1]?.trim() || '';
    const watchouts = lines.find(l => l.includes('주의:') || l.includes('유의점:') || l.includes('체크:'))?.split(':')[1]?.trim() || '';
    const tip = lines.find(l => l.includes('팁:') || l.includes('Tip:') || l.includes('바로 해보기:'))?.split(':')[1]?.trim() || '';
    
    return { percentage, headline, summary, strengths, watchouts, tip };
  };

  const handleAnalyze = async () => {
    if (!myName || !myGender || !partnerName || !partnerGender) {
      Alert.alert('알림', '모든 정보를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
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

      const data = await response.json();
      
      if (data.success && data.result) {
        const parsed = parseResult(data.result);
        setResult(parsed);
      } else {
        throw new Error('유효하지 않은 응답');
      }
    } catch (error) {
      console.error('에러:', error);
      Alert.alert('오류', '궁합 분석 중 오류가 발생했습니다.');
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

          <Text style={styles.headline}>{result.headline}</Text>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>종합 분석</Text>
            <Text style={styles.cardText}>{result.summary}</Text>
          </View>

          {result.strengths && (
            <View style={[styles.card, styles.strengthCard]}>
              <View style={styles.cardHeader}>
                <Ionicons name="heart" size={20} color="#FF6B6B" />
                <Text style={styles.cardTitle}>강점</Text>
              </View>
              <Text style={styles.cardText}>{result.strengths}</Text>
            </View>
          )}

          {result.watchouts && (
            <View style={[styles.card, styles.watchoutCard]}>
              <View style={styles.cardHeader}>
                <Ionicons name="alert-circle" size={20} color="#FFA500" />
                <Text style={styles.cardTitle}>주의할 점</Text>
              </View>
              <Text style={styles.cardText}>{result.watchouts}</Text>
            </View>
          )}

          {result.tip && (
            <View style={[styles.card, styles.tipCard]}>
              <View style={styles.cardHeader}>
                <Ionicons name="bulb" size={20} color="#4CAF50" />
                <Text style={styles.cardTitle}>오늘의 팁</Text>
              </View>
              <Text style={styles.cardText}>{result.tip}</Text>
            </View>
          )}

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
    padding: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  percentageCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  percentageText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  headline: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  strengthCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  watchoutCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  tipCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
  },
  resetButton: {
    backgroundColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});