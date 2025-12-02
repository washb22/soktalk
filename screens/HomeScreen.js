// screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

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

// 🔥 인기 점수 계산 함수
const calculatePopularityScore = (post) => {
  const now = new Date();
  let postDate = now; // 기본값: 현재 시간
  
  // createdAtDate가 유효한지 확인
  if (post.createdAtDate instanceof Date && !isNaN(post.createdAtDate)) {
    postDate = post.createdAtDate;
  }
  
  // 게시글 나이 (시간 단위)
  const ageInHours = Math.max(0, (now - postDate) / (1000 * 60 * 60));
  
  // 시간 가중치 계산 (최신 글일수록 높은 점수)
  let timeWeight = 1.0;
  if (ageInHours < 24) {
    timeWeight = 1.5;
  } else if (ageInHours < 168) { // 7일
    timeWeight = 1.2;
  } else if (ageInHours < 720) { // 30일
    timeWeight = 1.0;
  } else {
    timeWeight = 0.8;
  }
  
  // 기본 점수 계산
  const views = Number(post.views) || 0;
  const likes = Number(post.likes) || 0;
  const comments = Number(post.comments) || 0;
  
  // 인기 점수 = (조회수 × 1) + (좋아요 × 5) + (댓글 × 10)
  const baseScore = (views * 1) + (likes * 5) + (comments * 10);
  
  // 시간 가중치 적용
  const finalScore = baseScore * timeWeight;
  
  return Math.round(finalScore);
};

export default function HomeScreen({ navigation, route, category }) {
  const nav = useNavigation();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [blockedUserIds, setBlockedUserIds] = useState([]);

  useEffect(() => {
    loadBlockedUsers();
  }, [user]);

  useEffect(() => {
    if (route?.params?.refresh) {
      setCurrentPage(1);
      fetchPosts(1);
    }
  }, [route?.params?.refresh]);

  useEffect(() => {
    setCurrentPage(1);
    fetchPosts(1);
  }, [category, blockedUserIds]);

  // 차단된 사용자 목록 불러오기
  const loadBlockedUsers = async () => {
    if (!user) return;
    
    try {
      const blockedRef = collection(db, 'users', user.uid, 'blockedUsers');
      const snapshot = await getDocs(blockedRef);
      
      const blockedIds = snapshot.docs.map(doc => doc.id);
      setBlockedUserIds(blockedIds);
    } catch (error) {
      console.error('차단 목록 로드 에러:', error);
    }
  };

  const fetchPosts = async (page = 1) => {
    try {
      const postsRef = collection(db, 'posts');
      
      let q;
      if (category) {
        // 연애상담, 잡담은 최신순 정렬
        q = query(
          postsRef, 
          where('category', '==', category),
          orderBy('createdAt', 'desc'),
          limit(50) // 필터링을 위해 더 많이 가져옴
        );
      } else {
        // 🔥 인기글: 모든 게시글을 가져와서 점수 계산 후 정렬
        q = query(postsRef, limit(100)); // 최근 100개 글만 가져오기
      }
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setPosts([]);
        setTotalPages(1);
        return;
      }
      
      let postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // createdAt을 안전하게 처리
        let createdAtDate = null;
        let createdAtFormatted = '방금 전';
        
        try {
          if (data.createdAt?.toDate) {
            createdAtDate = data.createdAt.toDate();
            createdAtFormatted = formatTimeAgo(createdAtDate);
          } else if (data.createdAt instanceof Date) {
            createdAtDate = data.createdAt;
            createdAtFormatted = formatTimeAgo(createdAtDate);
          }
        } catch (error) {
          console.log('createdAt 파싱 에러:', error);
        }
        
        return {
          id: String(doc.id),
          title: String(data.title || '제목 없음'),
          content: String(data.content || ''),
          author: String(data.author || '익명'),
          authorId: data.authorId || null,
          views: Number(data.views || 0),
          likes: Number(data.likes || 0),
          comments: Number(data.commentsCount || 0),
          category: String(data.category || '잡담'),
          createdAtDate: createdAtDate,
          createdAtFormatted: String(createdAtFormatted),
        };
      });
      
      // 🚫 차단된 사용자 게시글 필터링
      if (blockedUserIds.length > 0) {
        postsData = postsData.filter(post => !blockedUserIds.includes(post.authorId));
      }
      
      // 🔥 인기글인 경우 점수 계산 후 정렬
      if (!category) {
        postsData = postsData
          .map(post => ({
            ...post,
            popularityScore: calculatePopularityScore(post)
          }))
          .sort((a, b) => b.popularityScore - a.popularityScore)
          .slice(0, 15); // 상위 15개만 표시
      } else {
        // 카테고리별은 최신순으로 15개
        postsData = postsData.slice(0, 15);
      }
      
      // 최종 데이터 준비
      const finalPostsData = postsData.map(post => ({
        id: String(post.id),
        title: String(post.title),
        content: String(post.content),
        author: String(post.author),
        authorId: post.authorId,
        views: Number(post.views),
        likes: Number(post.likes),
        comments: Number(post.comments),
        category: String(post.category),
        createdAt: String(post.createdAtFormatted),
        popularityScore: post.popularityScore ? Number(post.popularityScore) : undefined
      }));
      
      setPosts(finalPostsData);
      setTotalPages(Math.ceil(finalPostsData.length / 15));
    } catch (error) {
      console.log('게시글 로딩 에러:', error);
      setPosts([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await loadBlockedUsers(); // 차단 목록도 새로고침
    await fetchPosts(1);
    setRefreshing(false);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      fetchPosts(newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      fetchPosts(newPage);
    }
  };

  const getHeaderTitle = () => {
    if (category === '연애상담') return '연애상담';
    if (category === '잡담') return '잡담';
    return '인기글';
  };

  const renderPost = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => nav.navigate('PostDetail', { post: item })}
    >
      <View style={styles.postHeader}>
        <Text style={styles.category}>{String(item.category || '잡담')}</Text>
        <View style={styles.headerRight}>
          {/* 🏆 인기글 1~5위만 표시 */}
          {!category && index < 5 && (
            <View style={styles.rankBadge}>
              <Ionicons name="trophy" size={14} color="#FFB800" />
              <Text style={styles.rankText}>{index + 1}위</Text>
            </View>
          )}
          <Text style={styles.time}>{String(item.createdAt || '방금 전')}</Text>
        </View>
      </View>
      
      <Text style={styles.postTitle} numberOfLines={2}>
        {String(item.title || '제목 없음')}
      </Text>
      
      <Text style={styles.postContent} numberOfLines={2}>
        {String(item.content || '')}
      </Text>
      
      <View style={styles.postFooter}>
        <Text style={styles.author}>{String(item.author || '익명')}</Text>
        <View style={styles.stats}>
          <View style={[styles.stat, { marginLeft: 0 }]}>
            <Ionicons name="eye-outline" size={16} color="#999" />
            <Text style={styles.statText}>{String(item.views || 0)}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="heart-outline" size={16} color="#999" />
            <Text style={styles.statText}>{String(item.likes || 0)}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble-outline" size={16} color="#999" />
            <Text style={styles.statText}>{String(item.comments || 0)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity 
          style={styles.writeButton}
          onPress={() => nav.navigate('WritePost', { 
            category: category || '연애상담'
          })}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={({ item, index }) => renderPost({ item, index })}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B6B']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>아직 게시글이 없어요</Text>
          </View>
        }
        ListFooterComponent={
          posts.length > 0 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                onPress={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#ccc' : '#FF6B6B'} />
              </TouchableOpacity>
              
              <Text style={styles.pageText}>
                {currentPage} / {totalPages}
              </Text>
              
              <TouchableOpacity
                style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                onPress={goToNextPage}
                disabled={currentPage === totalPages}
              >
                <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#ccc' : '#FF6B6B'} />
              </TouchableOpacity>
            </View>
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => nav.navigate('WritePost', { 
          category: category || '연애상담'
        })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FF5252',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  writeButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  category: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  // 🏆 순위 뱃지 스타일
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  rankText: {
    fontSize: 12,
    color: '#FFB800',
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  postContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  author: {
    fontSize: 13,
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 20,
  },
  pageButton: {
    padding: 8,
  },
  pageButtonDisabled: {
    opacity: 0.3,
  },
  pageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
