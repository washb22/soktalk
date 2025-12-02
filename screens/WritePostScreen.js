// screens/WritePostScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImage } from '../utils/imageUpload';

export default function WritePostScreen({ route, navigation }) {
  const { user } = useAuth();
  const initialCategory = route.params?.category || '연애상담';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('알림', '사진 라이브러리 접근 권한이 필요합니다.');
        return;
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        // aspect 제거! → 사용자가 자유롭게 비율 조정
        quality: 0.8,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('이미지 선택 에러:', error);
      Alert.alert('오류', '이미지를 선택하는 중 문제가 발생했습니다.');
    }
  };

  const removeImage = () => {
    setImageUri(null);
  };
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요');
      return;
    }
    if (!content.trim()) {
      Alert.alert('알림', '내용을 입력해주세요');
      return;
    }
    if (content.trim().length < 10) {
      Alert.alert('알림', '내용을 10자 이상 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    setUploading(true);

    try {
      let imageUrl = null;
      
      // 이미지가 있으면 업로드
      if (imageUri) {
        imageUrl = await uploadImage(imageUri, 'posts');
      }

      const postData = {
        title: title.trim(),
        content: content.trim(),
        category,
        author: isAnonymous ? '익명' : (user?.nickname || '사용자'),
        authorId: user?.uid || 'anonymous',
        isAnonymous,
        views: 0,
        likes: 0,
        likesArray: [],
        commentsCount: 0,
        imageUrl: imageUrl, // 이미지 URL 추가
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'posts'), postData);

      Alert.alert('완료', '게시글이 등록되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            navigation.navigate('MainTabs', {
              screen: '인기글'
            });
          }
        }
      ]);
    } catch (error) {
      console.error('게시글 등록 에러:', error);
      Alert.alert('오류', '게시글 등록에 실패했습니다');
    } finally {
      setIsSubmitting(false);
      setUploading(false);
    }
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
            style={styles.headerButton}
          >
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>글쓰기</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.submitButtonText,
                isSubmitting && styles.submitButtonTextDisabled,
              ]}
            >
              {isSubmitting ? '등록중...' : '완료'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.categoryContainer}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                category === '연애상담' && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory('연애상담')}
            >
              <Ionicons
                name="heart"
                size={18}
                color={category === '연애상담' ? '#fff' : '#FF6B6B'}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  category === '연애상담' && styles.categoryButtonTextActive,
                ]}
              >
                연애상담
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.categoryButton,
                category === '잡담' && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory('잡담')}
            >
              <Ionicons
                name="chatbubbles"
                size={18}
                color={category === '잡담' ? '#fff' : '#FF6B6B'}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  category === '잡담' && styles.categoryButtonTextActive,
                ]}
              >
                잡담
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.anonymousContainer}
            onPress={() => setIsAnonymous(!isAnonymous)}
          >
            <View style={styles.anonymousLeft}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.anonymousText}>익명으로 작성</Text>
            </View>
            <View
              style={[
                styles.toggleSwitch,
                isAnonymous && styles.toggleSwitchActive,
              ]}
            >
              <View
                style={[
                  styles.toggleCircle,
                  isAnonymous && styles.toggleCircleActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* 이미지 선택 버튼 */}
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={pickImage}
          >
            <Ionicons name="image-outline" size={24} color="#FF6B6B" />
            <Text style={styles.imagePickerText}>사진 추가</Text>
          </TouchableOpacity>

          {/* 선택된 이미지 미리보기 */}
          {imageUri && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={removeImage}
              >
                <Ionicons name="close-circle" size={30} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={styles.titleInput}
            placeholder="제목을 입력하세요"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />

          <TextInput
            style={styles.contentInput}
            placeholder="내용을 입력하세요 (최소 10자)"
            placeholderTextColor="#999"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.charCount}>{content.length}자</Text>
        </ScrollView>
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
  headerButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    minWidth: 70,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    backgroundColor: '#fff',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  anonymousContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 20,
  },
  anonymousLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  anonymousText: {
    fontSize: 15,
    color: '#333',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#FF6B6B',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  imagePickerText: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    color: '#333',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    minHeight: 300,
    lineHeight: 24,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
});