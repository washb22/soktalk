// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy 
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

const formatTimeAgo = (date) => {
  if (!date) return '방금 전';
  
  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else if (date.toDate && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } else {
    return '방금 전';
  }
  
  const now = new Date();
  const diff = Math.floor((now - dateObj) / 1000);
  
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  
  const [activeTab, setActiveTab] = useState('myPosts'); // myPosts, likedPosts, comments
  const [userProfile, setUserProfile] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [commentedPosts, setCommentedPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // 닉네임 수정 모달
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  useEffect(() => {
    loadUserProfile();
    loadMyPosts();
  }, []);

  useEffect(() => {
    if (activeTab === 'myPosts') {
      loadMyPosts();
    } else if (activeTab === 'likedPosts') {
      loadLikedPosts();
    } else if (activeTab === 'comments') {
      loadCommentedPosts();
    }
  }, [activeTab]);

  const loadUserProfile = async () => {
    if (!user?.uid) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setUserProfile(userSnap.data());
      }
    } catch (error) {
      console.log('프로필 로드 에러:', error);
    }
  };

  const loadMyPosts = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef, 
        where('authorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? 
          formatTimeAgo(doc.data().createdAt.toDate()) : '방금 전',
      }));
      
      setMyPosts(posts);
    } catch (error) {
      console.log('내 게시글 로드 에러:', error);
      setMyPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLikedPosts = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      // 모든 게시글을 순회하면서 좋아요한 글 찾기
      const postsRef = collection(db, 'posts');
      const postsSnapshot = await getDocs(postsRef);
      
      const likedPostsList = [];
      
      for (const postDoc of postsSnapshot.docs) {
        const likeRef = doc(db, 'posts', postDoc.id, 'likes', user.uid);
        const likeSnap = await getDoc(likeRef);
        
        if (likeSnap.exists()) {
          const postData = postDoc.data();
          likedPostsList.push({
            id: postDoc.id,
            ...postData,
            createdAt: postData.createdAt?.toDate ? 
              formatTimeAgo(postData.createdAt.toDate()) : '방금 전',
          });
        }
      }
      
      setLikedPosts(likedPostsList);
    } catch (error) {
      console.log('좋아요한 글 로드 에러:', error);
      setLikedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCommentedPosts = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      // 댓글 단 게시글 찾기
      const postsRef = collection(db, 'posts');
      const postsSnapshot = await getDocs(postsRef);
      
      const commentedPostsList = [];
      
      for (const postDoc of postsSnapshot.docs) {
        const commentsRef = collection(db, 'posts', postDoc.id, 'comments');
        const commentsQuery = query(commentsRef, where('authorId', '==', user.uid));
        const commentsSnapshot = await getDocs(commentsQuery);
        
        if (!commentsSnapshot.empty) {
          const postData = postDoc.data();
          commentedPostsList.push({
            id: postDoc.id,
            ...postData,
            createdAt: postData.createdAt?.toDate ? 
              formatTimeAgo(postData.createdAt.toDate()) : '방금 전',
          });
        }
      }
      
      setCommentedPosts(commentedPostsList);
    } catch (error) {
      console.log('댓글 단 글 로드 에러:', error);
      setCommentedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    if (activeTab === 'myPosts') {
      await loadMyPosts();
    } else if (activeTab === 'likedPosts') {
      await loadLikedPosts();
    } else if (activeTab === 'comments') {
      await loadCommentedPosts();
    }
    setRefreshing(false);
  };

  const handleNicknameChange = async () => {
    if (!newNickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요');
      return;
    }

    if (newNickname.trim().length < 2) {
      Alert.alert('알림', '닉네임은 2자 이상 입력해주세요');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        nickname: newNickname.trim()
      });

      setUserProfile({ ...userProfile, nickname: newNickname.trim() });
      setNicknameModalVisible(false);
      setNewNickname('');
      Alert.alert('성공', '닉네임이 변경되었습니다');
    } catch (error) {
      console.log('닉네임 변경 에러:', error);
      Alert.alert('오류', '닉네임 변경에 실패했습니다');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '로그아웃', 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  const renderPostItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetail', { post: item })}
    >
      <View style={styles.postHeader}>
        <Text style={styles.postCategory}>{item.category}</Text>
        <Text style={styles.postTime}>{item.createdAt}</Text>
      </View>
      
      <Text style={styles.postTitle} numberOfLines={2}>
        {item.title}
      </Text>
      
      <Text style={styles.postContent} numberOfLines={2}>
        {item.content}
      </Text>
      
      <View style={styles.postStats}>
        <View style={styles.statItem}>
          <Ionicons name="eye-outline" size={16} color="#999" />
          <Text style={styles.statText}>{item.views || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="heart-outline" size={16} color="#999" />
          <Text style={styles.statText}>{item.likes || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={16} color="#999" />
          <Text style={styles.statText}>{item.comments || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    let message = '작성한 글이 없어요';
    if (activeTab === 'likedPosts') message = '좋아요한 글이 없어요';
    if (activeTab === 'comments') message = '댓글 단 글이 없어요';

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={60} color="#ccc" />
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  };

  const getCurrentPosts = () => {
    if (activeTab === 'myPosts') return myPosts;
    if (activeTab === 'likedPosts') return likedPosts;
    if (activeTab === 'comments') return commentedPosts;
    return [];
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
          />
        }
      >
        {/* 프로필 헤더 */}
        <View style={styles.profileHeader}>
          <Ionicons name="person-circle" size={80} color="#FF6B6B" />
          
          <Text style={styles.nickname}>
            {userProfile?.nickname || user?.nickname || '익명'}
          </Text>
          
          <Text style={styles.email}>
            {user?.email || ''}
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{myPosts.length}</Text>
              <Text style={styles.statLabel}>작성글</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{likedPosts.length}</Text>
              <Text style={styles.statLabel}>좋아요</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{commentedPosts.length}</Text>
              <Text style={styles.statLabel}>댓글</Text>
            </View>
          </View>

          {/* 프로필 설정 버튼 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                setNewNickname(userProfile?.nickname || user?.nickname || '');
                setNicknameModalVisible(true);
              }}
            >
              <Ionicons name="pencil" size={16} color="#FF6B6B" />
              <Text style={styles.editButtonText}>닉네임 변경</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={16} color="#666" />
              <Text style={styles.logoutButtonText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 탭 메뉴 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'myPosts' && styles.activeTab]}
            onPress={() => setActiveTab('myPosts')}
          >
            <Text style={[styles.tabText, activeTab === 'myPosts' && styles.activeTabText]}>
              내 게시글
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'likedPosts' && styles.activeTab]}
            onPress={() => setActiveTab('likedPosts')}
          >
            <Text style={[styles.tabText, activeTab === 'likedPosts' && styles.activeTabText]}>
              좋아요한 글
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
            onPress={() => setActiveTab('comments')}
          >
            <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
              댓글 단 글
            </Text>
          </TouchableOpacity>
        </View>

        {/* 게시글 리스트 */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>로딩중...</Text>
          </View>
        ) : (
          <FlatList
            data={getCurrentPosts()}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={renderEmptyState}
          />
        )}
      </ScrollView>

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
              placeholder="새 닉네임 입력"
              value={newNickname}
              onChangeText={setNewNickname}
              maxLength={20}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setNicknameModalVisible(false);
                  setNewNickname('');
                }}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleNicknameChange}
              >
                <Text style={styles.confirmButtonText}>변경</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nickname: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    width: '100%',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    gap: 6,
  },
  editButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  logoutButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postCategory: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  postTime: {
    fontSize: 12,
    color: '#999',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  postContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  postStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});