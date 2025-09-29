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
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// 시간 변환 함수
const formatTimeAgo = (date) => {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // 초 단위
  
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      // Firebase에서 인기 게시글 가져오기 (조회수 순)
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, orderBy('views', 'desc'), limit(15));
      const snapshot = await getDocs(q);
      
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Date 객체를 문자열로 변환
          createdAt: data.createdAt?.toDate ? 
            formatTimeAgo(data.createdAt.toDate()) : 
            '방금 전'
        };
      });
      
      setPosts(postsData);
    } catch (error) {
      console.log('게시글 로딩 에러:', error);
      // 임시 데이터
      setPosts([
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
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const renderPost = ({ item }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => navigation.navigate('PostDetail', { post: item })}
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
      />
      
      {/* 글쓰기 버튼 */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('WritePost')}
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
  listContainer: {
    padding: 12,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    lineHeight: 22,
  },
  postContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  author: {
    fontSize: 12,
    color: '#999',
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  statText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});