// screens/CompatibilityScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function CompatibilityScreen() {
  const [activeTab, setActiveTab] = useState('analysis');
  
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

  const [selectedPartner, setSelectedPartner] = useState(null);
  const [situation, setSituation] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceResult, setAdviceResult] = useState(null);
  const [partnersList, setPartnersList] = useState([]);

  const SITUATION_EXAMPLES = [
    '오늘 싸웠어요',
    '내일 만나요',
    '고백하고 싶어요',
    '연락이 뜸해요',
    '화해하고 싶어요',
  ];

  useEffect(() => {
    loadPartnersList();
  }, []);

  const loadPartnersList = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const historyRef = collection(db, 'users', user.uid, 'compatibilityHistory');
      const q = query(historyRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const partners = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setPartnersList(partners);
    } catch (error) {
      console.error('파트너 목록 로드 에러:', error);
    }
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseResult = (resultText) => {
    const lines = resultText.split('\n');
    
    const firstLine = lines[0] || '';
    const percentMatch = firstLine.match(/(\d+)%/);
    const percentage = percentMatch ? parseInt(percentMatch[1]) : 70;
    const headline = firstLine.replace(/궁합\s*\d+%\s*-?\s*/, '').trim();
    
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

        const user = auth.currentUser;
        if (user) {
          try {
            await addDoc(collection(db, 'users', user.uid, 'compatibilityHistory'), {
              myName,
              myBirthDate: formatDate(myBirthDate),
              myGender,
              partnerName,
              partnerBirthDate: formatDate(partnerBirthDate),
              partnerGender,
              result: parsed,
              createdAt: serverTimestamp(),
            });
            
            loadPartnersList();
          } catch (saveError) {
            console.error('저장 실패:', saveError);
          }
        }
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

  const handleGetAdvice = async () => {
    if (!selectedPartner) {
      Alert.alert('알림', '상대방을 선택해주세요.');
      return;
    }

    if (!situation.trim()) {
      Alert.alert('알림', '현재 상황을 입력해주세요.');
      return;
    }

    setAdviceLoading(true);
    try {
      const timestamp = Date.now();
      
      const response = await fetch(`https://soktalk.vercel.app/api/advice?t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partnerName: selectedPartner.partnerName,
          situation: situation,
          compatibilityScore: selectedPartner.result.percentage,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.advice) {
        setAdviceResult(data.advice);

        const user = auth.currentUser;
        if (user) {
          try {
            await addDoc(collection(db, 'users', user.uid, 'adviceHistory'), {
              partnerName: selectedPartner.partnerName,
              situation: situation,
              advice: data.advice,
              createdAt: serverTimestamp(),
            });
          } catch (saveError) {
            console.error('조언 저장 실패:', saveError);
          }
        }
      } else {
        throw new Error('유효하지 않은 응답');
      }
    } catch (error) {
      console.error('에러:', error);
      Alert.alert(
        '알림', 
        'OpenAI API 요청 제한으로 일시적으로 서비스를 이용할 수 없습니다.\n\n1-2분 후에 다시 시도해주세요.',
        [{ text: '확인' }]
      );
    } finally {
      setAdviceLoading(false);
    }
  };

  if (result && activeTab === 'analysis') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'analysis' && styles.activeTab]}
            onPress={() => setActiveTab('analysis')}
          >
            <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>
              궁합 분석
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'advice' && styles.activeTab]}
            onPress={() => setActiveTab('advice')}
          >
            <Text style={[styles.tabText, activeTab === 'advice' && styles.activeTabText]}>
              오늘의 조언
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'analysis' && (
          <ScrollView style={styles.content}>
            <Text style={styles.title}>💘 궁합 분석</Text>
            <Text style={styles.subtitle}>두 사람의 궁합을 확인해보세요</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>내 정보</Text>
              <TextInput
                style={styles.input}
                placeholder="이름"
                placeholderTextColor="#999"
                value={myName}
                onChangeText={setMyName}
              />
              
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowMyDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  생년월일: {formatDate(myBirthDate)}
                </Text>
              </TouchableOpacity>
              
              {showMyDatePicker && (
                <DateTimePicker
                  value={myBirthDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    setShowMyDatePicker(false);
                    if (date) setMyBirthDate(date);
                  }}
                  maximumDate={new Date()}
                />
              )}
              
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    myGender === 'male' && styles.genderButtonActive,
                  ]}
                  onPress={() => setMyGender('male')}
                >
                  <Ionicons
                    name="male"
                    size={20}
                    color={myGender === 'male' ? '#fff' : '#FF6B6B'}
                  />
                  <Text style={myGender === 'male' ? styles.genderTextActive : styles.genderText}>
                    남성
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    myGender === 'female' && styles.genderButtonActive,
                  ]}
                  onPress={() => setMyGender('female')}
                >
                  <Ionicons
                    name="female"
                    size={20}
                    color={myGender === 'female' ? '#fff' : '#FF6B6B'}
                  />
                  <Text style={myGender === 'female' ? styles.genderTextActive : styles.genderText}>
                    여성
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>상대방 정보</Text>
              <TextInput
                style={styles.input}
                placeholder="이름"
                placeholderTextColor="#999"
                value={partnerName}
                onChangeText={setPartnerName}
              />
              
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowPartnerDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  생년월일: {formatDate(partnerBirthDate)}
                </Text>
              </TouchableOpacity>
              
              {showPartnerDatePicker && (
                <DateTimePicker
                  value={partnerBirthDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    setShowPartnerDatePicker(false);
                    if (date) setPartnerBirthDate(date);
                  }}
                  maximumDate={new Date()}
                />
              )}
              
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    partnerGender === 'male' && styles.genderButtonActive,
                  ]}
                  onPress={() => setPartnerGender('male')}
                >
                  <Ionicons
                    name="male"
                    size={20}
                    color={partnerGender === 'male' ? '#fff' : '#FF6B6B'}
                  />
                  <Text style={partnerGender === 'male' ? styles.genderTextActive : styles.genderText}>
                    남성
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    partnerGender === 'female' && styles.genderButtonActive,
                  ]}
                  onPress={() => setPartnerGender('female')}
                >
                  <Ionicons
                    name="female"
                    size={20}
                    color={partnerGender === 'female' ? '#fff' : '#FF6B6B'}
                  />
                  <Text style={partnerGender === 'female' ? styles.genderTextActive : styles.genderText}>
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
          </ScrollView>
        )}

        {activeTab === 'advice' && (
          <ScrollView style={styles.content}>
            <Text style={styles.title}>💬 오늘의 조언</Text>
            <Text style={styles.subtitle}>현재 상황에 맞는 조언을 받아보세요</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>상대방 선택</Text>
              
              {partnersList.length === 0 ? (
                <Text style={styles.emptyText}>
                  먼저 궁합 분석을 해주세요!
                </Text>
              ) : (
                <FlatList
                  data={partnersList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.partnerChip,
                        selectedPartner?.id === item.id && styles.partnerChipActive,
                      ]}
                      onPress={() => setSelectedPartner(item)}
                    >
                      <Text
                        style={[
                          styles.partnerChipText,
                          selectedPartner?.id === item.id && styles.partnerChipTextActive,
                        ]}
                      >
                        {item.partnerName} ({item.result.percentage}%)
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>

            {selectedPartner && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>현재 상황</Text>
                  <Text style={styles.helperText}>
                    💡 자세할수록 좋은 조언을 받을 수 있어요!{'\n'}
                    • 만난 지 얼마나 됐는지{'\n'}
                    • 현재 관계 (사귀는 중, 썸, 친구 등){'\n'}
                    • 구체적인 상황과 감정
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="예: 정유미랑 만난 지 3개월 됐어요. 어제 약속을 자기 맘대로 잡아서 너무 화났어요. 아직 사귀는 사이는 아니지만 좋아하는 감정은 확실해요."
                    placeholderTextColor="#999"
                    value={situation}
                    onChangeText={setSituation}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                  
                  <Text style={styles.exampleTitle}>예시 상황:</Text>
                  <View style={styles.examplesContainer}>
                    {SITUATION_EXAMPLES.map((example, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.exampleChip}
                        onPress={() => setSituation(example)}
                      >
                        <Text style={styles.exampleChipText}>{example}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={handleGetAdvice}
                  disabled={adviceLoading}
                >
                  {adviceLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.analyzeButtonText}>조언 받기</Text>
                  )}
                </TouchableOpacity>

                {adviceResult && (
                  <View style={[styles.card, styles.adviceCard]}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="chatbubbles" size={20} color="#FF6B6B" />
                      <Text style={styles.cardTitle}>AI 조언</Text>
                    </View>
                    <Text style={styles.cardText}>{adviceResult}</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
      </View>
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
    backgroundColor: '#FFF5F5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF6B6B',
  },
  content: {
    flex: 1,
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
  helperText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderRadius: 10,
    padding: 15,
    gap: 8,
  },
  genderButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  genderText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  analyzeButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
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
    textAlign: 'center',
    marginBottom: 30,
    color: '#FF6B6B',
  },
  percentageCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  percentageText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  headline: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
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
  adviceCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    marginTop: 20,
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 20,
  },
  partnerChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  partnerChipActive: {
    backgroundColor: '#FF6B6B',
  },
  partnerChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  partnerChipTextActive: {
    color: '#fff',
  },
  exampleTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    marginBottom: 10,
  },
  examplesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    backgroundColor: '#FFE5E5',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exampleChipText: {
    fontSize: 13,
    color: '#FF6B6B',
  },
});