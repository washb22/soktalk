// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { updateProfile, deleteUser, reauthenticateWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [compatibilityHistory, setCompatibilityHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    postsCount: 0,
    likesCount: 0,
    commentsCount: 0,
    visitCount: 0,
  });

  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [updatingNickname, setUpdatingNickname] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (user) {
      loadStats();
      loadData();
    }
  }, [user, activeTab]);

  const loadStats = async () => {
    try {
      const postsQuery = query(
        collection(db, 'posts'),
        where('authorId', '==', user.uid)
      );
      const postsSnapshot = await getDocs(postsQuery);
      const postsCount = postsSnapshot.size;

      const likedQuery = query(
        collection(db, 'posts'),
        where('likesArray', 'array-contains', user.uid)
      );
      const likedSnapshot = await getDocs(likedQuery);
      const likesCount = likedSnapshot.size;

      const commentsQuery = query(
        collection(db, 'comments'),
        where('authorId', '==', user.uid)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const commentsCount = commentsSnapshot.size;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const visitCount = userDocSnap.exists() ? 
        userDocSnap.data().visitCount || 1 : 1;

      setStats({
        postsCount,
        likesCount,
        commentsCount,
        visitCount,
      });
    } catch (error) {
      console.error('통계 로드 에러:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'posts') {
        const q = query(
          collection(db, 'posts'),
          where('authorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(postsData);
      } 
      else if (activeTab === 'bookmarked') {
        const q = query(
          collection(db, 'bookmarks'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        
        const bookmarkedData = [];
        for (const docSnap of snapshot.docs) {
          const bookmarkData = docSnap.data();
          const postRef = doc(db, 'posts', bookmarkData.postId);
          const postSnap = await getDoc(postRef);
          
          if (postSnap.exists()) {
            bookmarkedData.push({
              id: postSnap.id,
              ...postSnap.data(),
            });
          }
        }
        setBookmarkedPosts(bookmarkedData);
      } 
      else if (activeTab === 'compatibility') {
        const historyRef = collection(db, 'users', user.uid, 'compatibilityHistory');
        const q = query(historyRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const historyData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setCompatibilityHistory(historyData);
      }
    } catch (error) {
      console.error('데이터 로드 에러:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNicknameChange = async () => {
    if (!newNickname.trim()) {
      Alert.alert('오류', '닉네임을 입력해주세요.');
      return;
    }

    if (newNickname.trim().length < 2) {
      Alert.alert('오류', '닉네임은 2자 이상이어야 합니다.');
      return;
    }

    if (newNickname.trim().length > 20) {
      Alert.alert('오류', '닉네임은 20자 이하여야 합니다.');
      return;
    }

    setUpdatingNickname(true);

    try {
      await updateProfile(user, {
        displayName: newNickname.trim()
      });

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: newNickname.trim(),
        updatedAt: new Date()
      });

      setNicknameModalVisible(false);
      setNewNickname('');
      Alert.alert('성공', '닉네임이 변경되었습니다.');
      
      loadStats();
    } catch (error) {
      console.error('닉네임 변경 에러:', error);
      Alert.alert('오류', '닉네임 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdatingNickname(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            console.log('로그아웃 성공');
          } catch (error) {
            console.error('로그아웃 에러:', error);
            Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
          }
        },
      },
    ]);
  };

  // 회원 탈퇴 처리
  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '정말 탈퇴하시겠습니까?\n\n탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.\n\n• 작성한 게시글\n• 작성한 댓글\n• 북마크\n• 궁합 분석 기록',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => confirmDeleteAccount(),
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      '최종 확인',
      '이 작업은 되돌릴 수 없습니다.\n정말 탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '네, 탈퇴합니다',
          style: 'destructive',
          onPress: () => executeDeleteAccount(),
        },
      ]
    );
  };

  const executeDeleteAccount = async () => {
    setDeletingAccount(true);
    setSettingsModalVisible(false);

    try {
      const currentUser = auth.currentUser;
      const userId = currentUser.uid;

      // 1. Firestore 데이터 삭제
      const batch = writeBatch(db);

      // 사용자 문서 삭제
      const userDocRef = doc(db, 'users', userId);
      batch.delete(userDocRef);

      // 사용자가 작성한 게시글 삭제
      const postsQuery = query(
        collection(db, 'posts'),
        where('authorId', '==', userId)
      );
      const postsSnapshot = await getDocs(postsQuery);
      postsSnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // 사용자가 작성한 댓글 삭제
      const commentsQuery = query(
        collection(db, 'comments'),
        where('authorId', '==', userId)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      commentsSnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // 사용자의 북마크 삭제
      const bookmarksQuery = query(
        collection(db, 'bookmarks'),
        where('userId', '==', userId)
      );
      const bookmarksSnapshot = await getDocs(bookmarksQuery);
      bookmarksSnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // 배치 실행
      await batch.commit();

      // 궁합 기록 삭제 (서브컬렉션은 별도 처리)
      const compatibilityRef = collection(db, 'users', userId, 'compatibilityHistory');
      const compatibilitySnapshot = await getDocs(compatibilityRef);
      const deletePromises = compatibilitySnapshot.docs.map((docSnap) => 
        deleteDoc(docSnap.ref)
      );
      await Promise.all(deletePromises);

      // 2. Google 로그인 사용자인 경우 재인증
      const providerData = currentUser.providerData;
      const isGoogleUser = providerData.some(
        (provider) => provider.providerId === 'google.com'
      );

      if (isGoogleUser) {
        try {
          // Google 재로그인으로 credential 획득
          await GoogleSignin.hasPlayServices();
          const userInfo = await GoogleSignin.signIn();
          const { idToken } = userInfo;
          const googleCredential = GoogleAuthProvider.credential(idToken);
          
          // 재인증
          await reauthenticateWithCredential(currentUser, googleCredential);
        } catch (reauthError) {
          console.log('재인증 스킵:', reauthError);
          // 재인증 실패해도 계속 진행 시도
        }
      }

      // 3. Firebase Auth에서 사용자 삭제
      await deleteUser(currentUser);

      Alert.alert(
        '탈퇴 완료',
        '회원 탈퇴가 완료되었습니다.\n그동안 이용해 주셔서 감사합니다.',
        [{ text: '확인' }]
      );

    } catch (error) {
      console.error('회원 탈퇴 에러:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          '재로그인 필요',
          '보안을 위해 다시 로그인한 후 탈퇴를 진행해 주세요.',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '로그아웃',
              onPress: async () => {
                await logout();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          '오류',
          '회원 탈퇴 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.'
        );
      }
    } finally {
      setDeletingAccount(false);
    }
  };
  
  const renderCompatibilityItem = ({ item }) => {
    const createdDate = item.createdAt?.toDate ? 
      item.createdAt.toDate().toLocaleDateString('ko-KR') : 
      '날짜 없음';

    return (
      <TouchableOpacity 
        style={styles.compatibilityCard}
        onPress={() => {
          Alert.alert(
            `${item.myName} ❤️ ${item.partnerName}`,
            `궁합 ${item.result?.percentage || 0}%\n\n${item.result?.headline || ''}\n\n${item.result?.summary || ''}\n\n강점: ${item.result?.strengths || ''}\n\n주의: ${item.result?.watchouts || ''}\n\n팁: ${item.result?.tip || ''}`,
            [{ text: '확인' }]
          );
        }}
      >
        <View style={styles.compatibilityHeader}>
          <Text style={styles.compatibilityNames}>
            {item.myName} ❤️ {item.partnerName}
          </Text>
          <Text style={styles.compatibilityDate}>{createdDate}</Text>
        </View>
        
        <View style={styles.compatibilityResult}>
          <View style={styles.percentageCircle}>
            <Text style={styles.percentageText}>
              {item.result?.percentage || 0}%
            </Text>
          </View>
          <View style={styles.compatibilityDetails}>
            <Text style={styles.compatibilityHeadline}>
              {item.result?.headline || ''}
            </Text>
            <Text style={styles.compatibilitySummary} numberOfLines={2}>
              {item.result?.summary || ''}
            </Text>
          </View>
        </View>
        
        <View style={styles.compatibilityInfo}>
          <Text style={styles.infoLabel}>내 정보: </Text>
          <Text style={styles.infoText}>
            {item.myName} ({item.myGender}, {item.myBirthDate})
          </Text>
        </View>
        
        <View style={styles.compatibilityInfo}>
          <Text style={styles.infoLabel}>상대 정보: </Text>
          <Text style={styles.infoText}>
            {item.partnerName} ({item.partnerGender}, {item.partnerBirthDate})
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPostItem = ({ item }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetail', { post: { id: item.id, ...item } })}
    >
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category || '일반'}</Text>
      </View>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent} numberOfLines={2}>
        {item.content}
      </Text>
      <View style={styles.postMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="eye-outline" size={16} color="#999" />
          <Text style={styles.metaText}>{item.views || 0}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="heart" size={16} color="#FF6B6B" />
          <Text style={styles.metaText}>{item.likes?.length || 0}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="chatbubble-outline" size={16} color="#999" />
          <Text style={styles.metaText}>{item.commentsCount || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      );
    }

    if (activeTab === 'posts') {
      return (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>작성한 게시글이 없습니다.</Text>
          }
        />
      );
    } else if (activeTab === 'bookmarked') {
      return (
        <FlatList
          data={bookmarkedPosts}
          renderItem={renderPostItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>북마크한 글이 없습니다.</Text>
          }
        />
      );
    } else if (activeTab === 'compatibility') {
      return (
        <FlatList
          data={compatibilityHistory}
          renderItem={renderCompatibilityItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>궁합 분석 기록이 없습니다.</Text>
          }
        />
      );
    }
  };

  // 탈퇴 진행 중 로딩 화면
  if (deletingAccount) {
    return (
      <View style={styles.deletingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.deletingText}>회원 탈퇴 처리 중...</Text>
        <Text style={styles.deletingSubText}>잠시만 기다려 주세요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#FF6B6B" />
        </View>
        <Text style={styles.displayName}>{user?.displayName || '사용자'}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.postsCount}</Text>
            <Text style={styles.statLabel}>작성글</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.likesCount}</Text>
            <Text style={styles.statLabel}>좋아요</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.commentsCount}</Text>
            <Text style={styles.statLabel}>댓글</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.visitCount}</Text>
            <Text style={styles.statLabel}>방문</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              setNewNickname(user?.displayName || '');
              setNicknameModalVisible(true);
            }}
          >
            <Ionicons name="create-outline" size={18} color="#FF6B6B" />
            <Text style={styles.editButtonText}>닉네임 변경</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setSettingsModalVisible(true)}
          >
            <Ionicons name="settings-outline" size={18} color="#666" />
            <Text style={styles.settingsButtonText}>설정</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 닉네임 변경 모달 */}
      <Modal
        visible={nicknameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNicknameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>닉네임 변경</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="새 닉네임 입력 (2-20자)"
              value={newNickname}
              onChangeText={setNewNickname}
              maxLength={20}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setNicknameModalVisible(false);
                  setNewNickname('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  updatingNickname && styles.modalButtonDisabled,
                ]}
                onPress={handleNicknameChange}
                disabled={updatingNickname}
              >
                {updatingNickname ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>변경</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 설정 모달 */}
      <Modal
        visible={settingsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.settingsModalOverlay}>
          <View style={styles.settingsModalContent}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>설정</Text>
              <TouchableOpacity
                onPress={() => setSettingsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsItems}>
              {/* 약관 및 정책 */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>약관 및 정책</Text>
                
                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => {
                    setSettingsModalVisible(false);
                    navigation.navigate('Terms');
                  }}
                >
                  <Ionicons name="document-text-outline" size={20} color="#666" />
                  <Text style={styles.settingsItemText}>이용약관</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => {
                    setSettingsModalVisible(false);
                    navigation.navigate('Privacy');
                  }}
                >
                  <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
                  <Text style={styles.settingsItemText}>개인정보 처리방침</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              </View>

              {/* 고객센터 */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>고객센터</Text>
                
                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => {
                    Alert.alert(
                      '문의하기',
                      '이메일: sbro@sbrother.co.kr\n\n부적절한 콘텐츠 신고, 서비스 문의 등\n위 이메일로 연락해 주세요.\n\n운영시간: 평일 10:00 - 18:00',
                      [{ text: '확인' }]
                    );
                  }}
                >
                  <Ionicons name="mail-outline" size={20} color="#666" />
                  <Text style={styles.settingsItemText}>문의하기</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => {
                    Alert.alert(
                      '신고 안내',
                      '부적절한 콘텐츠나 사용자를 발견하셨나요?\n\n1. 게시글/댓글의 메뉴(⋯)에서 신고하기\n2. 이메일로 상세 내용 신고\n   sbro@sbrother.co.kr\n\n신고 접수 후 24시간 내 검토됩니다.',
                      [{ text: '확인' }]
                    );
                  }}
                >
                  <Ionicons name="warning-outline" size={20} color="#666" />
                  <Text style={styles.settingsItemText}>신고 안내</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              </View>

              {/* 계정 */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>계정</Text>
                
                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => {
                    setSettingsModalVisible(false);
                    handleLogout();
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                  <Text style={[styles.settingsItemText, { color: '#FF6B6B' }]}>로그아웃</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => {
                    setSettingsModalVisible(false);
                    handleDeleteAccount();
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#999" />
                  <Text style={[styles.settingsItemText, { color: '#999' }]}>회원 탈퇴</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              </View>

              {/* 앱 정보 */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>앱 정보</Text>
                
                <View style={styles.settingsItem}>
                  <Ionicons name="information-circle-outline" size={20} color="#666" />
                  <Text style={styles.settingsItemText}>버전</Text>
                  <Text style={styles.versionText}>1.0.1</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
            내 게시글
          </Text>
          {activeTab === 'posts' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('bookmarked')}
        >
          <Text style={[styles.tabText, activeTab === 'bookmarked' && styles.activeTabText]}>
            북마크
          </Text>
          {activeTab === 'bookmarked' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('compatibility')}
        >
          <Text style={[styles.tabText, activeTab === 'compatibility' && styles.activeTabText]}>
            궁합
          </Text>
          {activeTab === 'compatibility' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  deletingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  deletingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deletingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  profileSection: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 5,
  },
  editButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 5,
  },
  settingsButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  // 닉네임 변경 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: '#FF6B6B',
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  // 설정 모달
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  settingsModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  settingsItems: {
    padding: 20,
  },
  settingsSection: {
    marginBottom: 30,
  },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 15,
    paddingLeft: 5,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 8,
  },
  settingsItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 15,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
  // 탭
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 2,
    backgroundColor: '#FF6B6B',
  },
  listContent: {
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 50,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  // 궁합 카드
  compatibilityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  compatibilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  compatibilityNames: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  compatibilityDate: {
    fontSize: 12,
    color: '#999',
  },
  compatibilityResult: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  percentageCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  compatibilityDetails: {
    flex: 1,
  },
  compatibilityHeadline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  compatibilitySummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  compatibilityInfo: {
    flexDirection: 'row',
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
});