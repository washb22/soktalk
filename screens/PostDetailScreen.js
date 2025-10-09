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
import { sendCommentNotification, sendLikeNotification } from '../services/notificationService';
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
  
  // 익명 번호 매핑
  const [anonymousMap, setAnonymousMap] = useState({});
  const [nextAnonymousNumber, setNextAnonymousNumber] = useState(1);
  
  // 답글 관련 상태
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  // 신고 모달 상태
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
      
      const tempAnonymousMap = {};
      let tempNextNumber = 1;

      const commentsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // 익명 판별
        const isAnon = data.isAnonymous || (data.author && data.author.includes('익명'));
        let displayAuthor = data.author || '익명';
        
        if (isAnon && data.authorId) {
          if (!tempAnonymousMap[data.authorId]) {
            tempAnonymousMap[data.authorId] = tempNextNumber;
            tempNextNumber++;
          }
          displayAuthor = `익명${tempAnonymousMap[data.authorId]}`;
        }

        // 답글 처리
        const processedReplies = (data.replies || []).map(reply => {
          const isReplyAnon = reply.isAnonymous || (reply.author && reply.author.includes('익명'));
          let replyDisplayAuthor = reply.author || '익명';
          
          if (isReplyAnon && reply.authorId) {
            if (!tempAnonymousMap[reply.authorId]) {
              tempAnonymousMap[reply.authorId] = tempNextNumber;
              tempNextNumber++;
            }
            replyDisplayAuthor = `익명${tempAnonymousMap[reply.authorId]}`;
          }

          return {
            ...reply,
            displayAuthor: replyDisplayAuthor,
          };
        });

        return {
          id: doc.id,
          ...data,
          displayAuthor,
          replies: processedReplies,
          likesCount: data.likesArray?.length || 0,
        };
      });
      
      setAnonymousMap(tempAnonymousMap);
      setNextAnonymousNumber(tempNextNumber);

      const sortedComments = commentsData.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.likesCount !== b.likesCount) return b.likesCount - a.likesCount;
        return b.createdAt?.seconds - a.createdAt?.seconds;
      });
      
      setComments(sortedComments);
    } catch (error) {
      console.error('댓글 로드 에러:', error);
    }
  };

  const handleLike = async () => {
    try {
      const postRef = doc(db, 'posts', post.id);
      const postSnap = await getDoc(postRef);
      const currentData = postSnap.data();
      const likesArray = currentData.likesArray || [];
      
      if (isLiked) {
        await updateDoc(postRef, {
          likesArray: arrayRemove(user.uid),
          likes: Math.max((currentData.likes || 1) - 1, 0),
        });
        setIsLiked(false);
      } else {
        await updateDoc(postRef, {
          likesArray: arrayUnion(user.uid),
          likes: (currentData.likes || 0) + 1,
        });
        setIsLiked(true);

        if (postData.authorId && postData.authorId !== user.uid) {
          await sendLikeNotification(postData.authorId, user.displayName || '사용자', postData.title || '게시글', post.id);
        }
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
      let authorName = user.displayName || '익명';
      if (isAnonymousComment) {
        if (!anonymousMap[user.uid]) {
          const newNumber = nextAnonymousNumber;
          setAnonymousMap(prev => ({ ...prev, [user.uid]: newNumber }));
          setNextAnonymousNumber(prev => prev + 1);
          authorName = `익명${newNumber}`;
        } else {
          authorName = `익명${anonymousMap[user.uid]}`;
        }
      }

      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        content: comment,
        authorId: user.uid,
        author: authorName,
        isAnonymous: isAnonymousComment,
        createdAt: new Date(),
        likesArray: [],
        isPinned: false,
        replies: [],
      });

      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: (postData?.commentsCount || 0) + 1,
      });

      if (postData.authorId && postData.authorId !== user.uid) {
        await sendCommentNotification(postData.authorId, authorName, postData.title || '게시글', post.id);
      }

      setComment('');
      setIsAnonymousComment(false);
      loadComments();
      loadPost();
    } catch (error) {
      console.error('댓글 작성 에러:', error);
    }
  };

  const handleAddReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('알림', '답글 내용을 입력해주세요.');
      return;
    }

    try {
      const commentRef = doc(db, 'posts', post.id, 'comments', replyingTo.commentId);
      const commentSnap = await getDoc(commentRef);
      const currentReplies = commentSnap.data().replies || [];

      let authorName = user.displayName || '익명';
      if (isAnonymousComment) {
        if (!anonymousMap[user.uid]) {
          const newNumber = nextAnonymousNumber;
          setAnonymousMap(prev => ({ ...prev, [user.uid]: newNumber }));
          setNextAnonymousNumber(prev => prev + 1);
          authorName = `익명${newNumber}`;
        } else {
          authorName = `익명${anonymousMap[user.uid]}`;
        }
      }

      const finalContent = replyingTo.mentionName 
        ? `@${replyingTo.mentionName} ${replyText}`
        : replyText;

      const newReply = {
        id: Date.now().toString(),
        content: finalContent,
        authorId: user.uid,
        author: authorName,
        isAnonymous: isAnonymousComment,
        createdAt: new Date(),
        likesArray: [],
      };

      await updateDoc(commentRef, {
        replies: [...currentReplies, newReply],
      });

      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: (postData?.commentsCount || 0) + 1,
      });

      setReplyText('');
      setReplyingTo(null);
      setIsAnonymousComment(false);
      loadComments();
      loadPost();
    } catch (error) {
      console.error('답글 작성 에러:', error);
    }
  };

  const handleCommentLike = async (commentId, currentLikesArray) => {
    try {
      const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
      const likesArray = currentLikesArray || [];
      const isLiked = likesArray.includes(user.uid);

      if (isLiked) {
        await updateDoc(commentRef, { likesArray: arrayRemove(user.uid) });
      } else {
        await updateDoc(commentRef, { likesArray: arrayUnion(user.uid) });
      }

      loadComments();
    } catch (error) {
      console.error('댓글 좋아요 에러:', error);
    }
  };

  const handleReplyLike = async (commentId, replyId, currentLikesArray) => {
    try {
      const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
      const commentSnap = await getDoc(commentRef);
      const currentReplies = commentSnap.data().replies || [];
      
      const updatedReplies = currentReplies.map(reply => {
        if (reply.id === replyId) {
          const likesArray = reply.likesArray || [];
          const isLiked = likesArray.includes(user.uid);
          
          return {
            ...reply,
            likesArray: isLiked
              ? likesArray.filter(uid => uid !== user.uid)
              : [...likesArray, user.uid],
          };
        }
        return reply;
      });

      await updateDoc(commentRef, { replies: updatedReplies });
      loadComments();
    } catch (error) {
      console.error('답글 좋아요 에러:', error);
    }
  };

  const handlePinComment = async (commentId, isPinned) => {
    try {
      await updateDoc(doc(db, 'posts', post.id, 'comments', commentId), {
        isPinned: !isPinned,
      });
      loadComments();
    } catch (error) {
      console.error('댓글 고정 에러:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert('댓글 삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
            const commentSnap = await getDoc(commentRef);
            const repliesCount = commentSnap.data().replies?.length || 0;

            await deleteDoc(commentRef);
            await updateDoc(doc(db, 'posts', post.id), {
              commentsCount: Math.max((postData?.commentsCount || 1) - 1 - repliesCount, 0),
            });

            loadComments();
            loadPost();
          } catch (error) {
            console.error('댓글 삭제 에러:', error);
          }
        },
      },
    ]);
  };

  const handleDeleteReply = async (commentId, replyId) => {
    Alert.alert('답글 삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
            const commentSnap = await getDoc(commentRef);
            const currentReplies = commentSnap.data().replies || [];
            
            await updateDoc(commentRef, {
              replies: currentReplies.filter(r => r.id !== replyId),
            });

            await updateDoc(doc(db, 'posts', post.id), {
              commentsCount: Math.max((postData?.commentsCount || 1) - 1, 0),
            });

            loadComments();
            loadPost();
          } catch (error) {
            console.error('답글 삭제 에러:', error);
          }
        },
      },
    ]);
  };

  const handleEditPost = () => {
    navigation.navigate('EditPost', { post: { id: post.id, ...postData } });
  };

  const handleDeletePost = () => {
    Alert.alert('게시글 삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'posts', post.id));
            navigation.goBack();
          } catch (error) {
            console.error('게시글 삭제 에러:', error);
          }
        },
      },
    ]);
  };

  const handleReportPost = () => {
    setReportTarget({
      type: 'post',
      id: post.id,
      authorId: postData.authorId,
      content: `${postData.title}\n\n${postData.content}`,
    });
    setReportModalVisible(true);
  };

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
            <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시글</Text>
          <View style={styles.headerButtons}>
            {postData.authorId !== user.uid && (
              <TouchableOpacity style={styles.headerIconButton} onPress={handleReportPost}>
                <Ionicons name="alert-circle-outline" size={24} color="#333" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.headerIconButton} onPress={toggleBookmark}>
              <Ionicons 
                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={24} 
                color={isBookmarked ? "#FF6B6B" : "#333"} 
              />
            </TouchableOpacity>
            
            {postData.authorId === user.uid && (
              <>
                <TouchableOpacity style={styles.headerIconButton} onPress={handleEditPost}>
                  <Ionicons name="create-outline" size={24} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIconButton} onPress={handleDeletePost}>
                  <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
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
              <Image source={{ uri: postData.imageUrl }} style={styles.postImage} resizeMode="cover" />
            )}

            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isLiked ? '#FF6B6B' : '#999'}
                />
                <Text style={[styles.likeText, isLiked && styles.likedText]}>{postData.likes || 0}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>댓글 {comments.length}개</Text>

              {comments.map((commentItem) => {
                const isCommentLiked = commentItem.likesArray?.includes(user.uid);
                const isPostAuthor = postData.authorId === user.uid;

                return (
                  <View key={commentItem.id} style={styles.commentContainer}>
                    <View style={[styles.commentItem, commentItem.isPinned && styles.pinnedComment]}>
                      {commentItem.isPinned && (
                        <View style={styles.pinnedBadge}>
                          <Ionicons name="pin" size={12} color="#FF6B6B" />
                          <Text style={styles.pinnedText}>고정됨</Text>
                        </View>
                      )}

                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{commentItem.displayAuthor}</Text>
                        <View style={styles.commentRight}>
                          <Text style={styles.commentTime}>
                            {commentItem.createdAt?.toDate?.().toLocaleDateString('ko-KR')}
                          </Text>

                          {isPostAuthor && commentItem.authorId !== user.uid && (
                            <TouchableOpacity
                              style={styles.pinButton}
                              onPress={() => handlePinComment(commentItem.id, commentItem.isPinned)}
                            >
                              <Ionicons
                                name={commentItem.isPinned ? 'pin' : 'pin-outline'}
                                size={16}
                                color={commentItem.isPinned ? '#FF6B6B' : '#999'}
                              />
                            </TouchableOpacity>
                          )}

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

                      <View style={styles.commentActions}>
                        <TouchableOpacity
                          style={styles.commentLikeButton}
                          onPress={() => handleCommentLike(commentItem.id, commentItem.likesArray)}
                        >
                          <Ionicons
                            name={isCommentLiked ? 'heart' : 'heart-outline'}
                            size={16}
                            color={isCommentLiked ? '#FF6B6B' : '#999'}
                          />
                          <Text style={[styles.commentLikeText, isCommentLiked && styles.commentLikedText]}>
                            {commentItem.likesCount || 0}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.replyButton}
                          onPress={() => setReplyingTo({ 
                            commentId: commentItem.id, 
                            authorName: commentItem.displayAuthor,
                            mentionName: null,
                            isReplyToReply: false
                          })}
                        >
                          <Ionicons name="arrow-undo-outline" size={16} color="#999" />
                          <Text style={styles.replyButtonText}>답글</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {commentItem.replies && commentItem.replies.length > 0 && (
                      <View style={styles.repliesContainer}>
                        {commentItem.replies.map((reply) => {
                          const isReplyLiked = reply.likesArray?.includes(user.uid);
                          
                          return (
                            <View key={reply.id} style={styles.replyItem}>
                              <Ionicons name="arrow-forward" size={16} color="#999" style={styles.replyIcon} />
                              <View style={styles.replyContent}>
                                <View style={styles.replyHeader}>
                                  <Text style={styles.replyAuthor}>{reply.displayAuthor}</Text>
                                  <View style={styles.replyRight}>
                                    <Text style={styles.replyTime}>
                                      {reply.createdAt?.toDate?.().toLocaleDateString('ko-KR')}
                                    </Text>
                                    {reply.authorId === user.uid && (
                                      <TouchableOpacity
                                        style={styles.deleteReplyButton}
                                        onPress={() => handleDeleteReply(commentItem.id, reply.id)}
                                      >
                                        <Ionicons name="trash-outline" size={14} color="#999" />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                </View>
                                <Text style={styles.replyText}>{reply.content}</Text>
                                <View style={styles.replyActions}>
                                  <TouchableOpacity
                                    style={styles.replyLikeButton}
                                    onPress={() => handleReplyLike(commentItem.id, reply.id, reply.likesArray)}
                                  >
                                    <Ionicons
                                      name={isReplyLiked ? 'heart' : 'heart-outline'}
                                      size={14}
                                      color={isReplyLiked ? '#FF6B6B' : '#999'}
                                    />
                                    <Text style={[styles.replyLikeText, isReplyLiked && styles.replyLikedText]}>
                                      {reply.likesArray?.length || 0}
                                    </Text>
                                  </TouchableOpacity>
                                  
                                  <TouchableOpacity
                                    style={styles.replyToReplyButton}
                                    onPress={() => setReplyingTo({
                                      commentId: commentItem.id,
                                      authorName: commentItem.displayAuthor,
                                      mentionName: reply.displayAuthor,
                                      isReplyToReply: true
                                    })}
                                  >
                                    <Ionicons name="arrow-undo-outline" size={12} color="#999" />
                                    <Text style={styles.replyToReplyText}>답글</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.commentInputContainer}>
            {replyingTo && (
              <View style={styles.replyingToBar}>
                <Text style={styles.replyingToText}>
                  {replyingTo.isReplyToReply 
                    ? `@${replyingTo.mentionName}님에게 답글 작성 중`
                    : `${replyingTo.authorName}님에게 답글 작성 중`
                  }
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputRow}>
              <View style={styles.commentInputWrapper}>
                <View style={styles.anonymousToggleRow}>
                  <TouchableOpacity
                    style={styles.anonymousToggle}
                    onPress={() => setIsAnonymousComment(!isAnonymousComment)}
                  >
                    <Ionicons
                      name={isAnonymousComment ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isAnonymousComment ? '#FF6B6B' : '#999'}
                    />
                    <Text style={[styles.anonymousText, isAnonymousComment && styles.anonymousTextActive]}>
                      익명으로 작성
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.commentInput}
                  placeholder={replyingTo ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
                  value={replyingTo ? replyText : comment}
                  onChangeText={replyingTo ? setReplyText : setComment}
                  multiline
                />
              </View>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={replyingTo ? handleAddReply : handleAddComment}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerBackButton: { padding: 12, minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginLeft: -12 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  headerIconButton: { padding: 8 },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#FFF0F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 12 },
  categoryText: { color: '#FF6B6B', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  authorInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  authorLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { fontSize: 14, fontWeight: '600', color: '#666' },
  timeText: { fontSize: 12, color: '#999' },
  contentText: { fontSize: 16, lineHeight: 24, color: '#333', marginBottom: 20 },
  postImage: { width: '100%', height: 250, borderRadius: 12, marginBottom: 20 },
  statsContainer: { flexDirection: 'row', gap: 20, paddingVertical: 15 },
  likeButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeText: { fontSize: 14, color: '#999', fontWeight: '600' },
  likedText: { color: '#FF6B6B' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  commentsSection: { marginBottom: 20 },
  commentsTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  commentContainer: { marginBottom: 12 },
  commentItem: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12 },
  pinnedComment: { backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: '#FFE0E0' },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  pinnedText: { fontSize: 11, color: '#FF6B6B', fontWeight: '600' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  commentAuthor: { fontSize: 14, fontWeight: '600', color: '#333' },
  commentRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentTime: { fontSize: 12, color: '#999' },
  pinButton: { padding: 4 },
  deleteCommentButton: { padding: 4 },
  commentContent: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 8 },
  commentActions: { flexDirection: 'row', gap: 16 },
  commentLikeButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentLikeText: { fontSize: 12, color: '#999' },
  commentLikedText: { color: '#FF6B6B' },
  replyButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyButtonText: { fontSize: 12, color: '#999' },
  repliesContainer: { marginTop: 8, marginLeft: 20, borderLeftWidth: 2, borderLeftColor: '#eee', paddingLeft: 12 },
  replyItem: { flexDirection: 'row', backgroundColor: '#FAFAFA', padding: 12, borderRadius: 8, marginBottom: 8 },
  replyIcon: { marginRight: 8, marginTop: 2 },
  replyContent: { flex: 1 },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  replyAuthor: { fontSize: 13, fontWeight: '600', color: '#555' },
  replyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyTime: { fontSize: 11, color: '#999' },
  deleteReplyButton: { padding: 4 },
  replyText: { fontSize: 13, color: '#333', lineHeight: 18, marginBottom: 6 },
  replyActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  replyLikeButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyLikeText: { fontSize: 11, color: '#999' },
  replyLikedText: { color: '#FF6B6B' },
  replyToReplyButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyToReplyText: { fontSize: 11, color: '#999' },
  commentInputContainer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingBottom: Platform.OS === 'ios' ? 0 : 8 },
  replyingToBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF8F8' },
  replyingToText: { fontSize: 13, color: '#FF6B6B', fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  commentInputWrapper: { flex: 1, backgroundColor: '#F9F9F9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginLeft: 12, marginTop: 12, marginBottom: 12 },
  anonymousToggleRow: { marginBottom: 8 },
  anonymousToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  anonymousText: { fontSize: 12, color: '#999' },
  anonymousTextActive: { color: '#FF6B6B', fontWeight: '600' },
  commentInput: { fontSize: 14, color: '#333', maxHeight: 100 },
  submitButton: { width: 44, height: 44, backgroundColor: '#FF6B6B', borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 12, marginBottom: 12 },
});