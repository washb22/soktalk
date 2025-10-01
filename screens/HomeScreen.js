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

export default function HomeScreen({ navigation, route, category }) {
  const nav = useNavigation();
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (route?.params?.refresh) {
      setCurrentPage(1);
      fetchPosts(1);
    }
  }, [route?.params?.refresh]);

  useEffect(() => {
    setCurrentPage(1);
    fetchPosts(1);
  }, [category]);

  const fetchPosts = async (page = 1) => {
    try {
      const postsRef = collection(db, 'posts');
      
      let q;
      if (category) {
        q = query(
          postsRef, 
          where('category', '==', category),
          limit(15)
        );
      } else {
        q = query(postsRef, orderBy('views', 'desc'), limit(15));
      }
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        const tempPosts = [
          {
            id: '1',
            title: '남자친구가 갑자기 연락이 뜸해졌어요',
            content: '3년 사귄 남자친구가 요즘 연락이 너무 뜸해졌는데...',
            author: '익명의 토끼',
            views: 342,
            likes: 23,
            comments: 15,
            category: '연애상담',
            createdAt: '10분 전'
          },
          {
            id: '2',
            title: '썸 타는 사람이 있는데 고백 타이밍',
            content: '2달째 썸타고 있는데 언제 고백하는게 좋을까요?',
            author: '익명의 고양이',
            views: 256,
            likes: 18,
            comments: 12,
            category: '연애상담',
            createdAt: '30분 전'
          },
          {
            id: '3',
            title: '헤어진 전 여자친구가 자꾸 생각나요',
            content: '6개월 전에 헤어졌는데 아직도 잊혀지지 않아요...',
            author: '익명의 강아지',
            views: 189,
            likes: 14,
            comments: 8,
            category: '잡담',
            createdAt: '1시간 전'
          },
        ];
        
        setPosts(
          category 
            ? tempPosts.filter(p => p.category === category)
            : tempPosts
        );
        setTotalPages(1);
        return;
      }
      
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: String(doc.id),
          title: String(data.title || '제목 없음'),
          content: String(data.content || ''),
          author: String(data.author || '익명'),
          views: Number(data.views || 0),
          likes: Number(data.likes || 0),
          comments: Number(data.comments || 0),
          category: String(data.category || '잡담'),
          createdAt: data.createdAt?.toDate ? formatTimeAgo(data.createdAt.toDate()) : '방금 전',
        };
      });
      
      setPosts(postsData);
      setTotalPages(Math.ceil(snapshot.size / 15));
    } catch (error) {
      console.log('게시글 로딩 에러:', error);
      setPosts([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
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

  const renderPost = ({ item }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => nav.navigate('PostDetail', { post: item })}
    >
      <View style={styles.postHeader}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.time}>{item.createdAt}</Text>
      </View>
      
      <Text style={styles.postTitle} numberOfLines={2}>
        {item.title}
      </Text>
      
      <Text style={styles.postContent} numberOfLines={2}>
        {item.content}
      </Text>
      
      <View style={styles.postFooter}>
        <Text style={styles.author}>{item.author}</Text>
        <View style={styles.stats}>
          <View style={[styles.stat, { marginLeft: 0 }]}>
            <Ionicons name="eye-outline" size={16} color="#999" />
            <Text style={styles.statText}>{item.views}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="heart-outline" size={16} color="#999" />
            <Text style={styles.statText}>{item.likes}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble-outline" size={16} color="#999" />
            <Text style={styles.statText}>{item.comments}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 헤더 추가 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity 
          style={styles.writeButton}
          onPress={() => nav.navigate('WritePost')}
        >
          <Ionicons name="create-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
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
        onPress={() => nav.navigate('WritePost')}
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
  category: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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