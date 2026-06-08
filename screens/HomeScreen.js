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
  let postDate = now;
  
  if (post.createdAtDate instanceof Date && !isNaN(post.createdAtDate)) {
    postDate = post.createdAtDate;
  }
  
  const ageInHours = Math.max(0, (now - postDate) / (1000 * 60 * 60));
  
  let timeWeight = 1.0;
  if (ageInHours < 24) {
    timeWeight = 2.0;       // 24시간 이내 - 강력 부스트
  } else if (ageInHours < 72) {
    timeWeight = 1.5;       // 3일 이내
  } else if (ageInHours < 168) {
    timeWeight = 1.0;       // 7일 이내
  } else if (ageInHours < 336) {
    timeWeight = 0.3;       // 2주 이내 - 급격 감소
  } else {
    timeWeight = 0.05;      // 2주 이후 - 거의 사라짐
  }
  
  const views = Number(post.views) || 0;
  const likes = Number(post.likes) || 0;
  const comments = Number(post.comments) || 0;
  
  const baseScore = (views * 1) + (likes * 5) + (comments * 10);
  const finalScore = baseScore * timeWeight;
  
  return Math.round(finalScore);
};

export default function HomeScreen({ navigation, route, category }) {
  const nav = useNavigation();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [notices, setNotices] = useState([]);
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
      loadNotices();
    }
  }, [route?.params?.refresh]);

  useEffect(() => {
    setCurrentPage(1);
    fetchPosts(1);
    loadNotices();
  }, [category, blockedUserIds]);

  // 📢 공지사항 불러오기
  const loadNotices = async () => {
    try {
      const noticesRef = collection(db, 'notices');
      const q = query(
        noticesRef,
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      let noticesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 해당 카테고리 또는 '전체' 공지만 필터링
      noticesData = noticesData.filter(notice => {
        if (notice.category === '전체') return true;
        if (category && notice.category === category) return true;
        if (!category && notice.category === '전체') return true;
        return false;
      });
      
      setNotices(noticesData);
    } catch (error) {
      console.log('공지사항 로드 에러:', error);
      setNotices([]);
    }
  };

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
      const POSTS_PER_PAGE = 15;
      
      let q;
      if (category) {
        q = query(
          postsRef, 
          where('category', '==', category),
          orderBy('createdAt', 'desc'),
          limit(200)
        );
      } else {
        q = query(postsRef, limit(200));
      }
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setPosts([]);
        setTotalPages(1);
        return;
      }
      
      let postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
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
      
      if (blockedUserIds.length > 0) {
        postsData = postsData.filter(post => !blockedUserIds.includes(post.authorId));
      }
      
      if (!category) {
        postsData = postsData
          .map(post => ({
            ...post,
            popularityScore: calculatePopularityScore(post)
          }))
          .sort((a, b) => b.popularityScore - a.popularityScore);
      }
      
      const totalPosts = postsData.length;
      const calculatedTotalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
      setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
      
      const startIndex = (page - 1) * POSTS_PER_PAGE;
      const endIndex = startIndex + POSTS_PER_PAGE;
      const pagedPosts = postsData.slice(startIndex, endIndex);
      
      const finalPostsData = pagedPosts.map((post, index) => ({
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
        popularityScore: post.popularityScore ? Number(post.popularityScore) : undefined,
        globalRank: !category ? startIndex + index : undefined
      }));
      
      setPosts(finalPostsData);
    } catch (error) {
      console.log('게시글 로딩 에러:', error);
      setPosts([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await loadBlockedUsers();
    await loadNotices();
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
    if (category === '뷰티') return '뷰티';
    return '인기글';
  };

  // 📢 공지사항 렌더링
  const renderNotices = () => {
    if (notices.length === 0) return null;
    
    return (
      <View style={styles.noticesContainer}>
        {notices.map(notice => (
          <TouchableOpacity
            key={notice.id}
            style={styles.noticeCard}
            onPress={() => nav.navigate('NoticeDetail', { notice })}
          >
            <View style={styles.noticeIcon}>
              <Ionicons name="megaphone" size={16} color="#FF6B6B" />
            </View>
            <View style={styles.noticeContent}>
              <Text style={styles.noticeLabel}>공지</Text>
              <Text style={styles.noticeTitle} numberOfLines={1}>
                {notice.title}
              </Text>
              {notice.imageUrl && (
                <Ionicons name="image-outline" size={14} color="#999" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPost = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => nav.navigate('PostDetail', { post: item })}
    >
      <View style={styles.postHeader}>
        <Text style={styles.category}>{String(item.category || '잡담')}</Text>
        <View style={styles.headerRight}>
          {!category && item.globalRank !== undefined && item.globalRank < 5 && (
            <View style={styles.rankBadge}>
              <Ionicons name="trophy" size={14} color="#FFB800" />
              <Text style={styles.rankText}>{item.globalRank + 1}위</Text>
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
        ListHeaderComponent={renderNotices}
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
          posts.length > 0 && totalPages > 1 && (
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
  // 📢 공지사항 스타일
  noticesContainer: {
    marginBottom: 12,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  noticeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  noticeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF6B6B',
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  noticeTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  // 게시글 스타일
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