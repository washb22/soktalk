// screens/NoticeDetailScreen.js
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
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  increment,
} from 'firebase/firestore';

export default function NoticeDetailScreen({ route, navigation }) {
  const { notice } = route.params;
  const { user } = useAuth();
  const [noticeData, setNoticeData] = useState(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);
  
  // 익명 번호 매핑
  const [anonymousMap, setAnonymousMap] = useState({});
  
  // 답글 관련 상태
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isAnonymousReply, setIsAnonymousReply] = useState(false);

  useEffect(() => {
    loadNotice();
    loadComments();
  }, []);

  const loadNotice = async () => {
    try {
      const noticeRef = doc(db, 'notices', notice.id);
      
      // 조회수 증가
      await updateDoc(noticeRef, {
        views: increment(1)
      });
      
      const noticeSnap = await getDoc(noticeRef);
      
      if (noticeSnap.exists()) {
        setNoticeData(noticeSnap.data());
      }
    } catch (error) {
      console.error('공지사항 로드 에러:', error);
    }
  };

  const loadComments = async () => {
    try {
      const commentsRef = collection(db, 'notices', notice.id, 'comments');
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
      
      setAnonymousMap(tempAnonymousMap);
      setComments(commentsData);
      
      // 댓글 수 업데이트
      await updateDoc(doc(db, 'notices', notice.id), {
        commentsCount: commentsData.length,
      });
    } catch (error) {
      console.error('댓글 로드 에러:', error);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) {
      Alert.alert('알림', '댓글 내용을 입력해주세요.');
      return;
    }

    try {
      const commentsRef = collection(db, 'notices', notice.id, 'comments');
      const newComment = {
        text: comment,
        userId: user.uid,
        userName: isAnonymousComment ? null : (user.displayName || '익명'),
        isAnonymous: isAnonymousComment,
        createdAt: new Date(),
        likes: [],
      };
      
      await addDoc(commentsRef, newComment);
      
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
      const commentsRef = collection(db, 'notices', notice.id, 'comments');
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
              await deleteDoc(doc(db, 'notices', notice.id, 'comments', commentId));
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

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  const getCommentAuthorName = (commentData) => {
    if (commentData.isAnonymous) {
      const num = anonymousMap[commentData.userId] || '';
      return `익명${num}`;
    }
    return commentData.userName || '익명';
  };

  // 댓글 트리 구성
  const organizeComments = () => {
    const rootComments = comments.filter(c => !c.parentCommentId);
    const result = [];
    
    const addWithReplies = (comment, depth = 0) => {
      result.push({ ...comment, depth });
      const replies = comments.filter(c => c.parentCommentId === comment.id);
      replies.forEach(reply => addWithReplies(reply, depth + 1));
    };
    
    rootComments.forEach(comment => addWithReplies(comment));
    return result;
  };

  const renderComment = (item) => {
    const isReply = item.depth > 0;
    const isMyComment = item.userId === user.uid;
    
    return (
      <View 
        key={item.id}
        style={[
          styles.commentItem,
          isReply && styles.replyCommentItem,
          { marginLeft: Math.min(item.depth * 20, 40) }
        ]}
      >
        {item.replyTo && (
          <View style={styles.replyIndicator}>
            <Ionicons name="return-down-forward" size={14} color="#FF6B6B" />
            <Text style={styles.replyToText}>@{item.replyTo}</Text>
          </View>
        )}
        
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{getCommentAuthorName(item)}</Text>
          <View style={styles.commentHeaderRight}>
            <Text style={styles.commentDate}>{formatDate(item.createdAt)}</Text>
            {isMyComment && (
              <TouchableOpacity
                style={styles.deleteIconButton}
                onPress={() => handleDeleteComment(item.id)}
              >
                <Ionicons name="trash-outline" size={16} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <Text style={styles.commentText}>{item.text}</Text>
        
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => {
              setReplyingTo(item);
              setIsAnonymousReply(false);
            }}
          >
            <Ionicons name="chatbubble-outline" size={14} color="#999" />
            <Text style={styles.replyButtonText}>답글</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!noticeData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const organizedComments = organizeComments();

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>공지사항</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView}>
          {/* 공지사항 내용 */}
          <View style={styles.noticeContainer}>
            <View style={styles.noticeBadge}>
              <Ionicons name="megaphone" size={14} color="#FF6B6B" />
              <Text style={styles.noticeBadgeText}>공지</Text>
            </View>
            
            <Text style={styles.title}>{noticeData.title}</Text>
            
            <View style={styles.metaInfo}>
              <Text style={styles.date}>{formatDate(noticeData.createdAt)}</Text>
              <Text style={styles.views}>조회 {noticeData.views || 0}</Text>
            </View>
            
            {noticeData.imageUrl && (
              <Image
                source={{ uri: noticeData.imageUrl }}
                style={styles.noticeImage}
                resizeMode="contain"
              />
            )}
            
            <Text style={styles.content}>{noticeData.content}</Text>
          </View>

          {/* 댓글 영역 */}
          <View style={styles.commentsContainer}>
            <Text style={styles.commentsTitle}>
              댓글 {comments.length}개
            </Text>
            
            {organizedComments.map(item => renderComment(item))}
          </View>
        </ScrollView>

        {/* 답글 대상 표시 */}
        {replyingTo && (
          <View style={styles.replyingContainer}>
            <View style={styles.replyingInfo}>
              <Ionicons name="return-down-forward" size={16} color="#FF6B6B" />
              <Text style={styles.replyingText}>
                {getCommentAuthorName(replyingTo)}님에게 답글
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* 댓글 입력 */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.anonymousToggle}
            onPress={() => {
              if (replyingTo) {
                setIsAnonymousReply(!isAnonymousReply);
              } else {
                setIsAnonymousComment(!isAnonymousComment);
              }
            }}
          >
            <Ionicons
              name={(replyingTo ? isAnonymousReply : isAnonymousComment) ? 'checkbox' : 'square-outline'}
              size={20}
              color="#FF6B6B"
            />
            <Text style={styles.anonymousText}>익명</Text>
          </TouchableOpacity>
          
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
  },
  scrollView: {
    flex: 1,
  },
  noticeContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  noticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 4,
  },
  noticeBadgeText: {
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
  metaInfo: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  date: {
    fontSize: 13,
    color: '#999',
  },
  views: {
    fontSize: 13,
    color: '#999',
  },
  noticeImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    color: '#333',
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
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFE8E8',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
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
  deleteIconButton: {
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