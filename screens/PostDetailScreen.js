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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
// 🔔 알림 서비스 import
import { sendCommentNotification, sendLikeNotification } from '../services/notificationService';
// 🚨 신고 모달 import
import ReportModal from '../components/ReportModal';

export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params;
  const { user } = useAuth();
  const [postData, setPostData] = useState(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  
  // 🚨 신고 모달 상태
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  useEffect(() => {
    loadPost();
    loadComments();
    checkBookmarkStatus();
  }, []);

  const loadPost = async () => {
    try {
      const postRef = doc(db, 'posts', post.id);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const data = postSnap.data();
        setPostData(data);
        
        if (Array.isArray(data.likes)) {
          setIsLiked(data.likes.includes(user.uid));
        } else {
          const likesArray = data.likesArray || [];
          setIsLiked(likesArray.includes(user.uid));
        }
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
        await deleteDoc(bookmarkRef);
        setIsBookmarked(false);
        Alert.alert('알림', '북마크가 해제되었습니다.');
      } else {
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

  // 🔔 좋아요 + 알림
  const handleLike = async () => {
    try {
      const postRef = doc(db, 'posts', post.id);
      const postSnap = await getDoc(postRef);
      const currentData = postSnap.data();
      
      const likesArray = currentData.likesArray || [];
      
      if (isLiked) {
        // 좋아요 취소
        await updateDoc(postRef, {
          likesArray: arrayRemove(user.uid),
          likes: Math.max((currentData.likes || 1) - 1, 0),
        });
        setIsLiked(false);
      } else {
        // 좋아요 추가
        await updateDoc(postRef, {
          likesArray: arrayUnion(user.uid),
          likes: (currentData.likes || 0) + 1,
        });
        setIsLiked(true);

        // 🔔 게시글 작성자에게 알림 (본인 게시글 제외)
        if (postData.authorId && postData.authorId !== user.uid) {
          const likerName = user.displayName || '사용자';
          const postTitle = postData.title || '게시글';
          
          // 알림 전송
          await sendLikeNotification(
            postData.authorId,
            likerName,
            postTitle,
            post.id
          );
          
          console.log('✅ 좋아요 알림 전송 완료');
        }
      }
      
      loadPost();
    } catch (error) {
      console.error('좋아요 에러:', error);
      Alert.alert('오류', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // 🔔 댓글 작성 + 알림
  const handleAddComment = async () => {
    if (!comment.trim()) {
      Alert.alert('알림', '댓글 내용을 입력해주세요.');
      return;
    }

    try {
      // 1. 댓글 작성
      const commentsRef = collection(db, 'posts', post.id, 'comments');
      await addDoc(commentsRef, {
        content: comment,
        authorId: user.uid,
        author: isAnonymousComment ? '익명' : (user.displayName || '익명'),
        isAnonymous: isAnonymousComment,
        createdAt: new Date(),
      });

      // 2. 게시글 댓글 수 증가
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        commentsCount: (postData?.commentsCount || 0) + 1,
      });

      // 🔔 3. 게시글 작성자에게 알림 (본인 게시글 제외)
      if (postData.authorId && postData.authorId !== user.uid) {
        const commenterName = isAnonymousComment ? '익명' : (user.displayName || '사용자');
        const postTitle = postData.title || '게시글';
        
        // 알림 전송
        await sendCommentNotification(
          postData.authorId,
          commenterName,
          postTitle,
          post.id
        );
        
        console.log('✅ 댓글 알림 전송 완료');
      }

      // 4. 초기화 및 새로고침
      setComment('');
      setIsAnonymousComment(false);
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

  const handleEditPost = () => {
    navigation.navigate('EditPost', { post: { id: post.id, ...postData } });
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

  // 🚨 게시글 신고
  const handleReportPost = () => {
    setReportTarget({
      type: 'post',
      id: post.id,
      authorId: postData.authorId,
      content: `${postData.title}\n\n${postData.content}`,
    });
    setReportModalVisible(true);
  };

  // 🚨 댓글 신고
  const handleReportComment = (commentData) => {
    setReportTarget({
      type: 'comment',
      id: commentData.id,
      authorId: commentData.authorId,
      content: commentData.content,
    });
    setReportModalVisible(true);
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
            {/* 🚨 신고 버튼 (본인 게시글 아닐 때만) */}
            {postData.authorId !== user.uid && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={handleReportPost}
              >
                <Ionicons name="alert-circle-outline" size={24} color="#333" />
              </TouchableOpacity>
            )}
            
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

          {postData.imageUrl && (
            <Image 
              source={{ uri: postData.imageUrl }} 
              style={styles.postImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? '#FF6B6B' : '#999'}
              />
              <Text style={[styles.likeText, isLiked && styles.likedText]}>
                {postData.likes || 0}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              댓글 {comments.length}개
            </Text>

            {comments.map((commentItem) => (
              <View key={commentItem.id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{commentItem.author}</Text>
                  <View style={styles.commentRight}>
                    <Text style={styles.commentTime}>
                      {commentItem.createdAt?.toDate?.().toLocaleDateString('ko-KR')}
                    </Text>
                    {/* 🚨 본인 댓글: 삭제, 남의 댓글: 신고 */}
                    {commentItem.authorId === user.uid ? (
                      <TouchableOpacity
                        style={styles.deleteCommentButton}
                        onPress={() => handleDeleteComment(commentItem.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#999" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.deleteCommentButton}
                        onPress={() => handleReportComment(commentItem)}
                      >
                        <Ionicons name="alert-circle-outline" size={16} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={styles.commentContent}>{commentItem.content}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <View style={styles.commentInputWrapper}>
            <View style={styles.anonymousToggleRow}>
              <TouchableOpacity
                style={styles.anonymousToggle}
                onPress={() => setIsAnonymousComment(!isAnonymousComment)}
              >
                <Ionicons 
                  name={isAnonymousComment ? "checkbox" : "square-outline"} 
                  size={20} 
                  color={isAnonymousComment ? "#FF6B6B" : "#999"} 
                />
                <Text style={[
                  styles.anonymousText,
                  isAnonymousComment && styles.anonymousTextActive
                ]}>
                  익명으로 작성
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="댓글을 입력하세요..."
              value={comment}
              onChangeText={setComment}
              multiline
            />
          </View>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAddComment}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 🚨 신고 모달 */}
        <ReportModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            setReportTarget(null);
          }}
          targetType={reportTarget?.type}
          targetId={reportTarget?.id}
          targetAuthorId={reportTarget?.authorId}
          targetContent={reportTarget?.content}
        />
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerBackButton: {
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconButton: {
    padding: 12,
    minWidth: 48,
    minHeight: 48,
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
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 8,
  },
  commentInputWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    overflow: 'hidden',
  },
  anonymousToggleRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anonymousText: {
    fontSize: 13,
    color: '#999',
  },
  anonymousTextActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  commentInput: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
});