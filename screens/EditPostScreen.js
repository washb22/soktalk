// screens/EditPostScreen.js
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function EditPostScreen({ route, navigation }) {
    const { post } = route.params;
    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(post.content);
    const [category, setCategory] = useState(post.category);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdate = async () => {
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

        try {
            const postRef = doc(db, 'posts', post.id);
            await updateDoc(postRef, {
                title: title.trim(),
                content: content.trim(),
                category,
            });

            Alert.alert('완료', '게시글이 수정되었습니다', [
                {
                    text: '확인',
                    onPress: () => navigation.goBack(),
                },
            ]);
        } catch (error) {
            console.error('게시글 수정 에러:', error);
            Alert.alert('오류', '게시글 수정에 실패했습니다');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
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
                <Text style={styles.headerTitle}>글 수정</Text>
                <TouchableOpacity
                    onPress={handleUpdate}
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
                        {isSubmitting ? '수정중...' : '완료'}
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
    );
}

const styles = StyleSheet.create({
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
    submitButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#FF6B6B',
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
});