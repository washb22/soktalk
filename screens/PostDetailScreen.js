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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';

export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params;
  const { user } = useAuth();
  const [postData, setPostData] = useState(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false); // 북마크 상태 추가

  useEffect(() => {
    loadPost();
    loadComments();
    checkBookmarkStatus(); // 북마크 상태 확인
  }, []);

  const loadPost = async () => {
    try {
      const postRef = doc(db, 'posts', post.id);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const data = postSnap.data();
        setPostData(data);
        setIsLiked(data.likes?.includes(user.uid));
      }
    } catch (error) {
      console.error('게시글 로드 에러:', error);
    }
  };

  const checkBookmarkStatus = async () => {
    try {
      const bookmarkRef = doc(db, 'bookmarks', `${user.uid}_${post.id}`);
      const bookmarkSnap = await getDoc(bookmarkRef);
      setIsBookmarked(bookmarkSnap.exists());
    } catch (error) {
      console.error('북마크 상태 확인 에러:', error);
    }
  };

  const toggleBookmark = async () => {
    try {
      const bookmarkRef = doc(db, 'bookmarks', `${user.uid}_${post.id}`);
      
      if (isBookmarked) {
        // 북마크 해제
        await deleteDoc(bookmarkRef);
        setIsBookmarked(false);
        Alert.alert('알림', '북마크가 해제되었습니다.');
      } else {
        // 북마크 추가
        await setDoc(bookmarkRef, {
          userId: user.uid,
          postId: post.id,
          postTitle: postData?.title || post.title,
          postCategory: postData?.category || post.category,
          createdAt: new Date(),
        });
        setIsBookmarked(true);
        Alert.alert('알림', '북마크에 추가되었습니다.');
      }
    } catch (error) {
      console.error('북마크 토글 에러:', error);
      Alert.alert('오류', '북마크 처리 중 오류가 발생했습니다.');
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
      }));
      
      setComments(commentsData);
    } catch (error) {
      console.error('댓글 로드 에러:', error);
    }
  };

  const handleLike = async () => {
    try {
      const postRef = doc(db, 'posts', post.id);
      
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid),
        });
        setIsLiked(false);
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid),
        });
        setIsLiked(true);
      }
      
      loadPost();
    } catch (error) {
      console.error('좋아요 에러:', error);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      Alert.alert('알림', '댓글 내용을 입력해주세요.');
      return;
    }

    try {
      const commentsRef = collection(db, 'posts', post.id, 'comments');
      await addDoc(commentsRef, {
        content: comment,
        authorId: user.uid,
        author: user.displayName || '익명',
        createdAt: new Date(),
      });

      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        commentsCount: (postData?.commentsCount || 0) + 1,
      });

      setComment('');
      loadComments();
      loadPost();
      Alert.alert('성공', '댓글이 작성되었습니다.');
    } catch (error) {
      console.error('댓글 작성 에러:', error);
      Alert.alert('오류', '댓글 작성 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      '댓글 삭제',
      '정말 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
              await deleteDoc(commentRef);

              const postRef = doc(db, 'posts', post.id);
              await updateDoc(postRef, {
                commentsCount: Math.max((postData?.commentsCount || 1) - 1, 0),
              });

              loadComments();
              loadPost();
              Alert.alert('성공', '댓글이 삭제되었습니다.');
            } catch (error) {
              console.error('댓글 삭제 에러:', error);
              Alert.alert('오류', '댓글 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
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
              const postRef = doc(db, 'posts', post.id);
              await deleteDoc(postRef);
              Alert.alert('성공', '게시글이 삭제되었습니다.');
              navigation.goBack();
            } catch (error) {
              console.error('게시글 삭제 에러:', error);
              Alert.alert('오류', '게시글 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleEditPost = () => {
    navigation.navigate('EditPost', { post: { id: post.id, ...postData } });
  };

  if (!postData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>게시글</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.content}>
            <Text>로딩 중...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시글</Text>
          <View style={styles.headerButtons}>
            {/* 북마크 버튼 추가 */}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={toggleBookmark}
            >
              <Ionicons 
                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={24} 
                color={isBookmarked ? "#FF6B6B" : "#333"} 
              />
            </TouchableOpacity>
            
            {postData.authorId === user.uid && (
              <>
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={handleEditPost}
                >
                  <Ionicons name="create-outline" size={24} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={handleDeletePost}
                >
                  <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{postData.category}</Text>
          </View>

          <Text style={styles.title}>{postData.title}</Text>

          <View style={styles.authorInfo}>
            <View style={styles.authorLeft}>
              <Text style={styles.authorName}>{postData.author}</Text>
              <Text style={styles.timeText}>
                {postData.createdAt?.toDate?.().toLocaleDateString('ko-KR')}
              </Text>
            </View>
          </View>

          <Text style={styles.contentText}>{postData.content}</Text>

          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? '#FF6B6B' : '#999'}
              />
              <Text style={[styles.likeText, isLiked && styles.likedText]}>
                {postData.likes?.length || 0}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              댓글 {comments.length}개
            </Text>

            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.author}</Text>
                  <View style={styles.commentRight}>
                    <Text style={styles.commentTime}>
                      {comment.createdAt?.toDate?.().toLocaleDateString('ko-KR')}
                    </Text>
                    {comment.authorId === user.uid && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment.id)}
                        style={styles.deleteCommentButton}
                      >
                        <Ionicons name="trash-outline" size={16} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글을 입력하세요..."
            placeholderTextColor="#999"
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleAddComment}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 기존 스타일 유지
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  likeText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
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
  commentItem: {
    marginBottom: 20,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  deleteCommentButton: {
    padding: 4,
  },
  commentContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});