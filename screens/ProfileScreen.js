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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [compatibilityHistory, setCompatibilityHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    postsCount: 0,
    likesCount: 0,
    commentsCount: 0,
    visitCount: 0,
  });

  useEffect(() => {
    if (user) {
      loadStats();
      loadData();
    }
  }, [user, activeTab]);

  const loadStats = async () => {
    try {
      // 작성글 수
      const postsQuery = query(
        collection(db, 'posts'),
        where('authorId', '==', user.uid)
      );
      const postsSnapshot = await getDocs(postsQuery);
      const postsCount = postsSnapshot.size;

      // 좋아요 수
      const likedQuery = query(
        collection(db, 'posts'),
        where('likes', 'array-contains', user.uid)
      );
      const likedSnapshot = await getDocs(likedQuery);
      const likesCount = likedSnapshot.size;

      // 댓글 수
      const commentsQuery = query(
        collection(db, 'comments'),
        where('authorId', '==', user.uid)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const commentsCount = commentsSnapshot.size;

      // 방문 횟수
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const visitCount = userDocSnap.exists() ? (userDocSnap.data().visitCount || 0) : 0;

      setStats({ postsCount, likesCount, commentsCount, visitCount });
    } catch (error) {
      console.error('통계 로드 실패:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'posts') {
        await loadMyPosts();
      } else if (activeTab === 'liked') {
        await loadLikedPosts();
      } else if (activeTab === 'comments') {
        await loadMyComments();
      } else if (activeTab === 'compatibility') {
        await loadCompatibilityHistory();
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyPosts = async () => {
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const loadLikedPosts = async () => {
    const q = query(
      collection(db, 'posts'),
      where('likes', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    setLikedPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const loadMyComments = async () => {
    const q = query(
      collection(db, 'comments'),
      where('authorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const commentsWithPosts = await Promise.all(
      snapshot.docs.map(async (commentDoc) => {
        const commentData = commentDoc.data();
        try {
          const postDoc = await getDoc(doc(db, 'posts', commentData.postId));
          return {
            id: commentDoc.id,
            ...commentData,
            postTitle: postDoc.exists() ? postDoc.data().title : '삭제된 게시글',
          };
        } catch (error) {
          return {
            id: commentDoc.id,
            ...commentData,
            postTitle: '삭제된 게시글',
          };
        }
      })
    );
    
    setComments(commentsWithPosts);
  };

  const loadCompatibilityHistory = async () => {
    const q = query(
      collection(db, 'users', user.uid, 'compatibilityHistory'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    setCompatibilityHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleLogout = async () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            navigation.replace('Auth');
          } catch (error) {
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
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
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
          <Text style={styles.metaText}>{item.commentCount || 0}</Text>
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

  const renderCommentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetail', { postId: item.postId })}
    >
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>댓글</Text>
      </View>
      <Text style={styles.postTitle}>{item.postTitle}</Text>
      <Text style={styles.postContent} numberOfLines={2}>
        {item.content}
      </Text>
      <View style={styles.postMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color="#999" />
          <Text style={styles.metaText}>
            {item.createdAt?.toDate().toLocaleDateString('ko-KR')}
          </Text>
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
    } else if (activeTab === 'liked') {
      return (
        <FlatList
          data={likedPosts}
          renderItem={renderPostItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>좋아요한 게시글이 없습니다.</Text>
          }
        />
      );
    } else if (activeTab === 'comments') {
      return (
        <FlatList
          data={comments}
          renderItem={renderCommentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>작성한 댓글이 없습니다.</Text>
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
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={18} color="#FF6B6B" />
            <Text style={styles.editButtonText}>닉네임 변경</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#666" />
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </View>

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
          onPress={() => setActiveTab('liked')}
        >
          <Text style={[styles.tabText, activeTab === 'liked' && styles.activeTabText]}>
            좋아요한 글
          </Text>
          {activeTab === 'liked' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('comments')}
        >
          <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
            댓글 단 글
          </Text>
          {activeTab === 'comments' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('compatibility')}
        >
          <Text style={[styles.tabText, activeTab === 'compatibility' && styles.activeTabText]}>
            궁합 기록
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