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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc 
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

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
  const [newNickname, setNewNickname] = useState('');
  const [updatingNickname, setUpdatingNickname] = useState(false);

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
        where('likes', 'array-contains', user.uid)
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
      const visitCount = userDocSnap.exists() ? userDocSnap.data().visitCount || 1 : 1;

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
      } else if (activeTab === 'bookmarked') {
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
      } else if (activeTab === 'compatibility') {
        const q = query(
          collection(db, 'compatibility'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const compatibilityData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCompatibilityHistory(compatibilityData);
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
  
  const renderCompatibilityItem = ({ item }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => {
        Alert.alert(
          `${item.myName} ❤️ ${item.partnerName}`,
          `궁합 ${item.result.percentage}%\n\n${item.result.headline}\n\n${item.result.summary}\n\n강점: ${item.result.strengths}\n\n주의: ${item.result.watchouts}\n\n팁: ${item.result.tip}`,
          [{ text: '확인' }]
        );
      }}
    >
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>궁합</Text>
      </View>
      <Text style={styles.postTitle}>{item.myName} ❤️ {item.partnerName}</Text>
      <Text style={styles.postContent} numberOfLines={1}>
        {item.result.headline}
      </Text>
      <View style={styles.postMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="heart" size={16} color="#FF6B6B" />
          <Text style={styles.metaText}>{item.result.percentage}%</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color="#999" />
          <Text style={styles.metaText}>
            {item.createdAt?.toDate().toLocaleDateString('ko-KR')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigation.navigate('LikedPosts')}
          >
            <Text style={styles.statNumber}>{stats.likesCount}</Text>
            <Text style={styles.statLabel}>좋아요</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => navigation.navigate('CommentedPosts')}
          >
            <Text style={styles.statNumber}>{stats.commentsCount}</Text>
            <Text style={styles.statLabel}>댓글</Text>
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#666" />
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </View>

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
              placeholder="새 닉네임 (2-20자)"
              placeholderTextColor="#999"
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
                disabled={updatingNickname}
              >
                <Text style={styles.modalCancelButtonText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.modalConfirmButton,
                  updatingNickname && styles.modalButtonDisabled
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

// 기존 스타일 동일
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  logoutButton: {
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
  logoutButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
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
});