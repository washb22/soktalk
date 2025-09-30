// screens/PostDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc,
  setDoc,
  getDoc 
} from 'firebase/firestore';

export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params;
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMyPost = user?.uid === post.authorId;

  useEffect(() => {
    incrementViews();
    loadComments();
    checkIfLiked();
  }, []);

  const incrementViews = async () => {
    try {
      if (/^\d+$/.test(post.id)) {
        console.log('임시 데이터이므로 조회수 업데이트 스킵');
        return;
      }
      
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        views: increment(1),
      });
    } catch (error) {
      console.log('조회수 증가 에러:', error);
    }
  };

  const checkIfLiked = async () => {
    if (!user?.uid) return;
    
    try {
      const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
      const likeSnap = await getDoc(likeRef);
      
      if (likeSnap.exists()) {
        setLiked(true);
      }
    } catch (error) {
      console.log('좋아요 확인 에러:', error);
    }
  };

  const loadComments = async () => {
    try {
      const commentsRef = collection(db, 'posts', post.id, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? 
          formatTimeAgo(doc.data().createdAt.toDate()) : '방금 전'
      }));
      
      setComments(commentsData);
    } catch (error) {
      console.log('댓글 로딩 에러:', error);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  const handleLike = async () => {
    if (!user?.uid) {
      Alert.alert('알림', '로그인이 필요합니다');
      return;
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
      
      if (liked) {
        // 좋아요 취소
        await deleteDoc(likeRef);
        await updateDoc(postRef, {
          likes: increment(-1),
        });
        setLikeCount(prev => prev - 1);
        setLiked(false);
      } else {
        // 좋아요 추가
        await setDoc(likeRef, {
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
        await updateDoc(postRef, {
          likes: increment(1),
        });
        setLikeCount(prev => prev + 1);
        setLiked(true);
      }
    } catch (error) {
      console.log('좋아요 에러:', error);
      Alert.alert('오류', '좋아요 처리에 실패했습니다');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('알림', '댓글 내용을 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      const commentsRef = collection(db, 'posts', post.id, 'comments');
      const newComment = {
        content: commentText.trim(),
        author: user?.nickname || '익명',
        authorId: user?.uid || 'anonymous',
        createdAt: serverTimestamp(),
      };

      await addDoc(commentsRef, newComment);
      
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        comments: increment(1),
      });

      setCommentText('');
      loadComments();
    } catch (error) {
      console.log('댓글 등록 에러:', error);
      Alert.alert('오류', '댓글 등록에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = () => {
    Alert.alert(
      '게시글 삭제',
      '정말 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'posts', post.id));
              Alert.alert('완료', '게시글이 삭제되었습니다');
              navigation.goBack();
            } catch (error) {
              console.log('삭제 에러:', error);
              Alert.alert('오류', '삭제에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  const handleEditPost = () => {
    navigation.navigate('EditPost', { post });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.headerBackButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시글</Text>
          {isMyPost && (
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleEditPost} style={styles.headerIconButton}>
                <Ionicons name="create-outline" size={22} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeletePost} style={styles.headerIconButton}>
                <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}
          {!isMyPost && <View style={{ width: 24 }} />}
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{post.category}</Text>
          </View>

          <Text style={styles.title}>{post.title}</Text>

          <View style={styles.authorInfo}>
            <View style={styles.authorLeft}>
              <Ionicons name="person-circle" size={24} color="#666" />
              <Text style={styles.authorName}>{post.author}</Text>
            </View>
            <Text style={styles.timeText}>{post.createdAt}</Text>
          </View>

          <Text style={styles.contentText}>{post.content}</Text>

          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? '#FF6B6B' : '#999'}
              />
              <Text style={[styles.statText, liked && styles.likedText]}>
                {likeCount}
              </Text>
            </TouchableOpacity>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={20} color="#999" />
              <Text style={styles.statText}>{post.views}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              댓글 {comments.length}개
            </Text>

            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubble-outline" size={40} color="#ccc" />
                <Text style={styles.emptyCommentsText}>
                  첫 댓글을 작성해보세요
                </Text>
              </View>
            ) : (
              comments.map(comment => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAuthor}>
                      <Ionicons name="person-circle" size={20} color="#666" />
                      <Text style={styles.commentAuthorName}>
                        {comment.author}
                      </Text>
                    </View>
                    <Text style={styles.commentTime}>{comment.createdAt}</Text>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글을 입력하세요"
            placeholderTextColor="#999"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.commentSubmitButton,
              (!commentText.trim() || isSubmitting) &&
                styles.commentSubmitButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || isSubmitting}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerBackButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    margin: 16,
    marginBottom: 8,
  },
  categoryText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 30,
  },
  authorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  authorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 14,
    color: '#666',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  contentText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 26,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 16,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#999',
  },
  likedText: {
    color: '#FF6B6B',
  },
  divider: {
    height: 8,
    backgroundColor: '#f5f5f5',
    marginVertical: 16,
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
  },
  commentSubmitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#ccc',
  },
});