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
  ActivityIndicator,
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
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { sendCommentNotification, sendLikeNotification } from '../services/notificationService';
import ReportModal from '../components/ReportModal';
import PushNotificationPrompt from '../components/PushNotificationPrompt';

// 🎯 광고 추가
import BannerAdComponent from '../components/BannerAd';
import { AD_UNITS } from '../services/adsConfig';

export default function PostDetailScreen({ route, navigation }) {
  // ✅ post 객체 또는 postId 둘 다 지원 (푸시 알림 대응)
  const postParam = route.params?.post;
  const postIdParam = route.params?.postId || postParam?.id;
  
  const { user } = useAuth();
  const [postId, setPostId] = useState(postIdParam);
  const [postData, setPostData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  // 🔔 내 글에 댓글이 달려있고 푸시 토큰이 없으면 prompt
  const [showCommentPushPrompt, setShowCommentPushPrompt] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  
  // 익명 번호 매핑
  const [anonymousMap, setAnonymousMap] = useState({});
  const [nextAnonymousNumber, setNextAnonymousNumber] = useState(1);
  
  // 답글 관련 상태
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isAnonymousReply, setIsAnonymousReply] = useState(false);
  
  // 신고 모달 상태
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  useEffect(() => {
    if (postIdParam) {
      loadPost();
      loadComments();
      checkBookmarkStatus();
    } else {
      Alert.alert('오류', '게시글을 찾을 수 없습니다.');
      navigation.goBack();
    }
  }, [postIdParam]);

  const loadPost = async () => {
    try {
      setIsLoading(true);
      const postRef = doc(db, 'posts', postIdParam);
      
      // ✅ 조회수 증가
      await updateDoc(postRef, {
        views: increment(1)
      });
      
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const data = postSnap.data();
        setPostId(postSnap.id);
        setPostData(data);
        
        if (Array.isArray(data.likes)) {
          setIsLiked(data.likes.includes(user.uid));
        } else {
          const likesArray = data.likesArray || [];
          setIsLiked(likesArray.includes(user.uid));
        }
      } else {
        Alert.alert('오류', '게시글을 찾을 수 없습니다.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('게시글 로드 에러:', error);
      Alert.alert('오류', '게시글을 불러올 수 없습니다.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const checkBookmarkStatus = async () => {
    try {
      const bookmarkRef = doc(db, 'bookmarks', `${user.uid}_${postIdParam}`);
      const bookmarkSnap = await getDoc(bookmarkRef);
      setIsBookmarked(bookmarkSnap.exists());
    } catch (error) {
      console.error('북마크 상태 확인 에러:', error);
    }
  };

  const toggleBookmark = async () => {
    try {
      const bookmarkRef = doc(db, 'bookmarks', `${user.uid}_${postId}`);
      
      if (isBookmarked) {
        await deleteDoc(bookmarkRef);
        setIsBookmarked(false);
        Alert.alert('알림', '북마크가 해제되었습니다.');
      } else {
        await setDoc(bookmarkRef, {
          userId: user.uid,
          postId: postId,
          postTitle: postData.title,
          postCategory: postData.category,
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
      const commentsRef = collection(db, 'posts', postIdParam, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const commentsData = [];
      const tempAnonymousMap = {};
      let tempNextNumber = 1;
      
      querySnapshot.forEach((doc) => {
        const commentData = { id: doc.id, ...doc.data() };
        
        if (commentData.isAnonymous && commentData.userId) {
          if (!tempAnonymousMap[commentData.userId]) {
            tempAnonymousMap[commentData.userId] = tempNextNumber;
            tempNextNumber++;
          }
        }
        
        commentsData.push(commentData);
      });
      
      // 고정된 댓글을 맨 위로 정렬
      commentsData.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
      
      setAnonymousMap(tempAnonymousMap);
      setNextAnonymousNumber(tempNextNumber);
      setComments(commentsData);

      // 🔔 골든모먼트: 내 글에 댓글이 달렸고, 내 푸시 토큰이 없으면 prompt
      try {
        if (
          user &&
          postData &&
          postData.authorId === user.uid &&
          commentsData.length > 0
        ) {
          const myDoc = await getDoc(doc(db, 'users', user.uid));
          if (myDoc.exists() && !myDoc.data().pushToken) {
            setShowCommentPushPrompt(true);
          }
        }
      } catch (e) {
        console.log('push prompt 체크 실패:', e);
      }

      await updateDoc(doc(db, 'posts', postIdParam), {
        commentsCount: commentsData.length,
      });
    } catch (error) {
      console.error('댓글 로드 에러:', error);
    }
  };

  const handleLike = async () => {
    try {
      const postRef = doc(db, 'posts', postId);
      
      if (isLiked) {
        await updateDoc(postRef, {
          likesArray: arrayRemove(user.uid),
        });
        setIsLiked(false);
      } else {
        await updateDoc(postRef, {
          likesArray: arrayUnion(user.uid),
        });
        setIsLiked(true);
        
        // 좋아요 알림 전송
        if (postData.authorId && postData.authorId !== user.uid) {
          await sendLikeNotification(
            postData.authorId,           // 1. 글 작성자 ID
            user.displayName || '익명',  // 2. 좋아요 누른 사람 이름
            postData.title,              // 3. 게시글 제목
            postId                        // 4. 게시글 ID
          );
        }
      }
      
      await loadPost();
    } catch (error) {
      console.error('좋아요 에러:', error);
      Alert.alert('오류', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) {
      Alert.alert('알림', '댓글 내용을 입력해주세요.');
      return;
    }

    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const newComment = {
        text: comment,
        userId: user.uid,
        userName: isAnonymousComment ? null : (user.displayName || '익명'),
        isAnonymous: isAnonymousComment,
        createdAt: new Date(),
        likes: [],
        isPinned: false,
      };
      
      await addDoc(commentsRef, newComment);
      
      // 댓글 알림 전송
      if (postData.authorId && postData.authorId !== user.uid) {
        await sendCommentNotification(
          postData.authorId,                                          // 1. 글 작성자 ID
          isAnonymousComment ? '익명' : (user.displayName || '익명'), // 2. 댓글 작성자 이름
          postData.title,                                             // 3. 게시글 제목
          postId                                                       // 4. 게시글 ID
        );
      }
      
      setComment('');
      setIsAnonymousComment(false);
      await loadComments();
      Alert.alert('알림', '댓글이 등록되었습니다.');
    } catch (error) {
      console.error('댓글 작성 에러:', error);
      Alert.alert('오류', '댓글 작성 중 오류가 발생했습니다.');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('알림', '답글 내용을 입력해주세요.');
      return;
    }

    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const newReply = {
        text: replyText,
        userId: user.uid,
        userName: isAnonymousReply ? null : (user.displayName || '익명'),
        isAnonymous: isAnonymousReply,
        createdAt: new Date(),
        likes: [],
        parentCommentId: replyingTo.id,
        replyTo: replyingTo.isAnonymous 
          ? `익명${anonymousMap[replyingTo.userId] || ''}` 
          : replyingTo.userName,
        isPinned: false,
      };
      
      await addDoc(commentsRef, newReply);
      
      setReplyText('');
      setReplyingTo(null);
      setIsAnonymousReply(false);
      await loadComments();
      Alert.alert('알림', '답글이 등록되었습니다.');
    } catch (error) {
      console.error('답글 작성 에러:', error);
      Alert.alert('오류', '답글 작성 중 오류가 발생했습니다.');
    }
  };

  const handlePinComment = async (commentId, isPinned) => {
    try {
      await updateDoc(doc(db, 'posts', postId, 'comments', commentId), {
        isPinned: !isPinned,
      });
      await loadComments();
      Alert.alert('알림', !isPinned ? '댓글이 고정되었습니다.' : '댓글 고정이 해제되었습니다.');
    } catch (error) {
      console.error('댓글 고정 에러:', error);
      Alert.alert('오류', '댓글 고정 처리 중 오류가 발생했습니다.');
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
              await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
              await loadComments();
              Alert.alert('알림', '댓글이 삭제되었습니다.');
            } catch (error) {
              console.error('댓글 삭제 에러:', error);
              Alert.alert('오류', '댓글 삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
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
              await deleteDoc(doc(db, 'posts', postId));
              Alert.alert('알림', '게시글이 삭제되었습니다.');
              navigation.goBack();
            } catch (error) {
              console.error('삭제 에러:', error);
              Alert.alert('오류', '삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleReport = (target) => {
    setReportTarget(target);
    setReportModalVisible(true);
  };

  // 사용자 차단 처리
  const handleBlockUser = () => {
    if (!postData.authorId || postData.authorId === user.uid) {
      return;
    }

    const authorName = postData.isAnonymous ? '익명' : (postData.author || '알 수 없음');

    Alert.alert(
      '사용자 차단',
      `${authorName}님을 차단하시겠습니까?\n\n차단하면 이 사용자의 게시글과 댓글이 더 이상 표시되지 않습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              const blockedRef = doc(db, 'users', user.uid, 'blockedUsers', postData.authorId);
              await setDoc(blockedRef, {
                blockedUserName: authorName,
                blockedAt: serverTimestamp(),
              });
              
              Alert.alert(
                '차단 완료',
                `${authorName}님을 차단했습니다.\n\n설정 > 차단 목록에서 해제할 수 있습니다.`,
                [
                  {
                    text: '확인',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('차단 에러:', error);
              Alert.alert('오류', '차단 처리 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  // 댓글 작성자 차단
  const handleBlockCommentUser = (commentUserId, commentUserName) => {
    if (!commentUserId || commentUserId === user.uid) {
      return;
    }

    Alert.alert(
      '사용자 차단',
      `${commentUserName}님을 차단하시겠습니까?\n\n차단하면 이 사용자의 게시글과 댓글이 더 이상 표시되지 않습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              const blockedRef = doc(db, 'users', user.uid, 'blockedUsers', commentUserId);
              await setDoc(blockedRef, {
                blockedUserName: commentUserName,
                blockedAt: serverTimestamp(),
              });
              
              Alert.alert(
                '차단 완료',
                `${commentUserName}님을 차단했습니다.\n\n설정 > 차단 목록에서 해제할 수 있습니다.`
              );
              
              // 댓글 목록 새로고침
              await loadComments();
            } catch (error) {
              console.error('차단 에러:', error);
              Alert.alert('오류', '차단 처리 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date) => {
    if (!date) return '';
    
    let dateObj;
    if (date instanceof Date) {
      dateObj = date;
    } else if (date.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else {
      return '';
    }
    
    return dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDisplayName = (comment) => {
    if (comment.isAnonymous) {
      return `익명${anonymousMap[comment.userId] || ''}`;
    }
    return comment.userName || '익명';
  };

  // ✅ 로딩 중 표시 개선
  if (isLoading || !postData) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시글</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={{ marginTop: 12, color: '#666' }}>게시글을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // authorId로 변경!
  const isPostAuthor = postData.authorId === user.uid;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 커스텀 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>게시글</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleBookmark} style={styles.headerButton}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isBookmarked ? '#FF6B6B' : '#333'}
            />
          </TouchableOpacity>
          
          {/* authorId로 변경! */}
          {postData.authorId === user.uid && (
            <>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.navigate('EditPost', { post: { id: postId, ...postData } })}
              >
                <Ionicons name="create-outline" size={24} color="#333" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={styles.scrollView}>
          {/* 게시글 내용 */}
          <View style={styles.postContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{postData.category}</Text>
            </View>
            
            <Text style={styles.title}>{postData.title}</Text>
            
            <View style={styles.authorInfo}>
              <Text style={styles.author}>
                {postData.isAnonymous ? '익명' : postData.author}
              </Text>
              <Text style={styles.date}>{formatDate(postData.createdAt)}</Text>
            </View>
            
            <Text style={styles.content}>{postData.content}</Text>
            
            {postData.imageUrl && (
              <Image source={{ uri: postData.imageUrl }} style={styles.postImage} />
            )}
            
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isLiked ? '#FF6B6B' : '#666'}
                />
                <Text style={styles.actionText}>
                  {Array.isArray(postData.likesArray) ? postData.likesArray.length : 0}
                </Text>
              </TouchableOpacity>

              {/* authorId로 변경! - 신고 & 차단 버튼 */}
              {postData.authorId !== user.uid && (
                <View style={styles.actionButtonsRight}>
                  <TouchableOpacity
                    style={styles.blockButton}
                    onPress={handleBlockUser}
                  >
                    <Ionicons name="person-remove-outline" size={16} color="#999" />
                    <Text style={styles.blockButtonText}>차단</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.reportButton}
                    onPress={() => handleReport({ type: 'post', id: postId, content: postData.title })}
                  >
                    <Text style={styles.reportButtonText}>신고</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* 🎯 배너 광고 - 게시글 내용 바로 아래 */}
          <BannerAdComponent adUnitId={AD_UNITS.BANNER_POST_DETAIL} />

          <View style={styles.commentsContainer}>
            <Text style={styles.commentsTitle}>댓글 {comments.length}개</Text>
            
            {comments.map((item) => (
              <View 
                key={item.id} 
                style={[
                  styles.commentItem,
                  item.parentCommentId && styles.replyCommentItem,
                  item.isPinned && styles.pinnedComment
                ]}
              >
                {item.isPinned && (
                  <View style={styles.pinnedBadge}>
                    <Ionicons name="pin" size={12} color="#FF6B6B" />
                    <Text style={styles.pinnedText}>고정됨</Text>
                  </View>
                )}

                {item.replyTo && (
                  <View style={styles.replyIndicator}>
                    <Ionicons name="arrow-undo" size={16} color="#FF6B6B" />
                    <Text style={styles.replyToText}>@{item.replyTo}</Text>
                  </View>
                )}
                
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{getDisplayName(item)}</Text>
                  <View style={styles.commentHeaderRight}>
                    <Text style={styles.commentDate}>{formatDate(item.createdAt)}</Text>
                    
                    {/* 게시글 작성자만 답글 아닌 다른 사람 댓글 고정 가능 */}
                    {isPostAuthor && item.userId !== user.uid && !item.parentCommentId && (
                      <TouchableOpacity
                        style={styles.pinButton}
                        onPress={() => handlePinComment(item.id, item.isPinned)}
                      >
                        <Ionicons
                          name={item.isPinned ? 'pin' : 'pin-outline'}
                          size={16}
                          color={item.isPinned ? '#FF6B6B' : '#999'}
                        />
                      </TouchableOpacity>
                    )}
                    
                    {/* 내 댓글 삭제 버튼 */}
                    {item.userId === user.uid && (
                      <TouchableOpacity
                        style={styles.deleteIconButton}
                        onPress={() => handleDeleteComment(item.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#999" />
                      </TouchableOpacity>
                    )}

                    {/* 다른 사람 댓글 차단 & 신고 버튼 */}
                    {item.userId !== user.uid && (
                      <>
                        <TouchableOpacity
                          style={styles.blockIconButton}
                          onPress={() => handleBlockCommentUser(item.userId, getDisplayName(item))}
                        >
                          <Ionicons name="person-remove-outline" size={16} color="#999" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.reportIconButton}
                          onPress={() => handleReport({ type: 'comment', id: item.id, content: item.text })}
                        >
                          <Ionicons name="flag-outline" size={16} color="#999" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
                
                <Text style={styles.commentText}>{item.text}</Text>
                
                <View style={styles.commentActions}>
                  <TouchableOpacity
                    style={styles.replyButton}
                    onPress={() => setReplyingTo(item)}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color="#999" />
                    <Text style={styles.replyButtonText}>답글</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* 답글 작성 중일 때 표시 */}
        {replyingTo && (
          <View style={styles.replyingContainer}>
            <View style={styles.replyingInfo}>
              <Ionicons name="arrow-undo" size={16} color="#FF6B6B" />
              <Text style={styles.replyingText}>
                {getDisplayName(replyingTo)}님에게 답글 작성 중
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close-circle" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {/* 댓글 입력 */}
        <View style={styles.inputContainer}>
          <View style={styles.anonymousToggle}>
            <TouchableOpacity
              onPress={() => replyingTo 
                ? setIsAnonymousReply(!isAnonymousReply) 
                : setIsAnonymousComment(!isAnonymousComment)
              }
            >
              <Ionicons
                name={(replyingTo ? isAnonymousReply : isAnonymousComment) 
                  ? 'checkbox' 
                  : 'square-outline'
                }
                size={24}
                color="#FF6B6B"
              />
            </TouchableOpacity>
            <Text style={styles.anonymousText}>익명으로 작성</Text>
          </View>
          
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={replyingTo ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
              value={replyingTo ? replyText : comment}
              onChangeText={replyingTo ? setReplyText : setComment}
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={replyingTo ? handleReply : handleComment}
            >
              <Ionicons name="send" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        target={reportTarget}
      />

      {/* 🔔 내 글에 댓글이 달려있고 푸시 미등록이면 prompt */}
      {showCommentPushPrompt && user && (
        <PushNotificationPrompt
          userId={user.uid}
          trigger="comment"
          onComplete={() => setShowCommentPushPrompt(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 4,
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  postContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  authorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  author: {
    fontSize: 14,
    color: '#666',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  actionButtonsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 4,
  },
  blockButtonText: {
    color: '#999',
    fontSize: 12,
  },
  reportButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  reportButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
  },
  commentsContainer: {
    padding: 20,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  replyCommentItem: {
    marginLeft: 24,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFE8E8',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
  },
  pinnedComment: {
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#FFE0E0',
    borderRadius: 8,
    padding: 12,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pinnedText: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '600',
    marginLeft: 4,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  replyToText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  commentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  pinButton: {
    padding: 4,
    marginLeft: 8,
  },
  deleteIconButton: {
    padding: 4,
    marginLeft: 8,
  },
  blockIconButton: {
    padding: 4,
    marginLeft: 8,
  },
  reportIconButton: {
    padding: 4,
    marginLeft: 8,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#999',
  },
  replyingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderTopWidth: 2,
    borderTopColor: '#FFE8E8',
  },
  replyingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    padding: 12,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  anonymousText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
});