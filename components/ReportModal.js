// components/ReportModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const REPORT_REASONS = [
  { id: 'abuse', label: '욕설/비방', icon: 'alert-circle' },
  { id: 'adult', label: '음란물', icon: 'warning' },
  { id: 'spam', label: '광고/홍보', icon: 'megaphone' },
  { id: 'flood', label: '도배', icon: 'copy' },
  { id: 'other', label: '기타', icon: 'ellipsis-horizontal' },
];

export default function ReportModal({ 
  visible, 
  onClose, 
  targetType, // 'post' or 'comment'
  targetId,
  targetAuthorId,
  targetContent,
}) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('알림', '신고 사유를 선택해주세요.');
      return;
    }

    if (selectedReason === 'other' && !description.trim()) {
      Alert.alert('알림', '기타 사유를 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Firestore에 신고 저장
      await addDoc(collection(db, 'reports'), {
        type: targetType,
        targetId: targetId,
        targetAuthorId: targetAuthorId,
        targetContent: targetContent,
        reporterId: user.uid,
        reporterName: user.displayName || '익명',
        reason: selectedReason,
        reasonLabel: REPORT_REASONS.find(r => r.id === selectedReason)?.label,
        description: description.trim(),
        status: 'pending',
        createdAt: new Date(),
      });

      Alert.alert(
        '신고 완료',
        '신고가 접수되었습니다.\n관리자가 검토 후 조치하겠습니다.',
        [
          {
            text: '확인',
            onPress: () => {
              setSelectedReason('');
              setDescription('');
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('신고 에러:', error);
      Alert.alert('오류', '신고 접수 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {targetType === 'post' ? '게시글' : '댓글'} 신고
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>신고 사유를 선택해주세요</Text>
            
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonItem,
                  selectedReason === reason.id && styles.reasonItemSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <View style={styles.reasonLeft}>
                  <Ionicons
                    name={reason.icon}
                    size={20}
                    color={selectedReason === reason.id ? '#FF6B6B' : '#999'}
                  />
                  <Text
                    style={[
                      styles.reasonLabel,
                      selectedReason === reason.id && styles.reasonLabelSelected,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </View>
                {selectedReason === reason.id && (
                  <Ionicons name="checkmark-circle" size={22} color="#FF6B6B" />
                )}
              </TouchableOpacity>
            ))}

            {selectedReason && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>
                  {selectedReason === 'other' 
                    ? '기타 사유를 입력해주세요 (필수)' 
                    : '상세 내용을 입력해주세요 (선택)'}
                </Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="신고 사유에 대해 자세히 설명해주세요"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={500}
                />
                <Text style={styles.charCount}>{description.length}/500</Text>
              </View>
            )}

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color="#999" />
              <Text style={styles.infoText}>
                허위 신고 시 서비스 이용이 제한될 수 있습니다.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedReason || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? '접수 중...' : '신고하기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonItemSelected: {
    backgroundColor: '#FFE8E8',
    borderColor: '#FF6B6B',
  },
  reasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reasonLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  reasonLabelSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  descriptionContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  descriptionInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});