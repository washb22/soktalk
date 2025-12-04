// screens/TermsScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>이용약관</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.title}>마음다락방방 이용약관</Text>
          <Text style={styles.date}>시행일: 2025년 1월 1일</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제1조 (목적)</Text>
            <Text style={styles.text}>
              본 약관은 워시비 주식회사(이하 "회사")가 제공하는 마음다락방방 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제2조 (정의)</Text>
            <Text style={styles.text}>
              1. "서비스"란 회사가 제공하는 모바일 애플리케이션 마음다락방방 및 관련 제반 서비스를 의미합니다.{'\n\n'}
              2. "회원"이란 본 약관에 동의하고 회사와 서비스 이용계약을 체결한 자를 의미합니다.{'\n\n'}
              3. "게시물"이란 회원이 서비스에 게시한 문자, 문서, 그림, 음성, 영상 또는 이들의 조합으로 이루어진 모든 정보를 의미합니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제3조 (약관의 효력 및 변경)</Text>
            <Text style={styles.text}>
              1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.{'\n\n'}
              2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.{'\n\n'}
              3. 약관이 변경되는 경우 회사는 변경사항을 시행일자 7일 전부터 공지합니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제4조 (회원가입)</Text>
            <Text style={styles.text}>
              1. 회원가입은 이용자가 약관의 내용에 동의하고 회사가 정한 가입 양식에 따라 회원정보를 기입하여 신청합니다.{'\n\n'}
              2. 회사는 다음 각 호에 해당하는 경우 회원가입을 거부할 수 있습니다:{'\n'}
              - 타인의 명의를 도용한 경우{'\n'}
              - 허위 정보를 기재한 경우{'\n'}
              - 만 14세 미만인 경우{'\n'}
              - 기타 회사가 정한 이용신청 요건이 미비한 경우
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제5조 (서비스의 제공)</Text>
            <Text style={styles.text}>
              회사는 회원에게 다음과 같은 서비스를 제공합니다:{'\n\n'}
              1. 게시판 서비스 (연애상담, 잡담){'\n'}
              2. 궁합 분석 서비스{'\n'}
              3. 댓글 및 좋아요 기능{'\n'}
              4. 기타 회사가 추가 개발하거나 다른 회사와의 제휴 등을 통해 회원에게 제공하는 일체의 서비스
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제6조 (서비스의 중단)</Text>
            <Text style={styles.text}>
              1. 회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.{'\n\n'}
              2. 회사는 천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우 서비스의 전부 또는 일부를 제한하거나 중지할 수 있습니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제7조 (회원의 의무)</Text>
            <Text style={styles.text}>
              회원은 다음 행위를 하여서는 안 됩니다:{'\n\n'}
              1. 타인의 정보 도용{'\n'}
              2. 회사가 게시한 정보의 변경{'\n'}
              3. 회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해{'\n'}
              4. 회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위{'\n'}
              5. 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위{'\n'}
              6. 욕설, 비방, 음란, 정치적 내용의 글 게시{'\n'}
              7. 허위 사실 유포{'\n'}
              8. 상업적 목적의 광고성 게시물 작성
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제8조 (게시물의 관리)</Text>
            <Text style={styles.text}>
              1. 회원의 게시물이 관련 법령에 위반되거나 공서양속에 반하는 경우, 회사는 사전 통지 없이 삭제할 수 있습니다.{'\n\n'}
              2. 회사는 게시물에 대한 모니터링 의무가 없으며, 게시물로 인한 법적 책임은 게시자에게 있습니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제9조 (저작권의 귀속)</Text>
            <Text style={styles.text}>
              1. 서비스에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.{'\n\n'}
              2. 회원이 서비스 내에 게시한 게시물의 저작권은 해당 게시물의 저작자에게 귀속됩니다.{'\n\n'}
              3. 회원은 자신이 서비스 내에 게시한 게시물을 회사가 국내외에서 다음 목적으로 사용하는 것을 허락합니다:{'\n'}
              - 서비스 내에서 게시물의 복제, 전송, 전시{'\n'}
              - 서비스의 홍보를 위한 활용
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제10조 (면책조항)</Text>
            <Text style={styles.text}>
              1. 회사는 천재지변, 전쟁 및 기타 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우 서비스 제공에 대한 책임이 면제됩니다.{'\n\n'}
              2. 회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.{'\n\n'}
              3. 회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖에 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.{'\n\n'}
              4. 궁합 분석 서비스는 재미와 참고를 위한 것이며, 회사는 그 정확성이나 결과에 대해 보증하지 않습니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제11조 (분쟁의 해결)</Text>
            <Text style={styles.text}>
              1. 회사와 회원은 서비스와 관련하여 발생한 분쟁을 원만하게 해결하기 위하여 필요한 모든 노력을 하여야 합니다.{'\n\n'}
              2. 본 약관 및 서비스 이용에 관한 분쟁에 대해서는 대한민국 법을 적용하며, 소송이 필요한 경우 회사의 본사 소재지를 관할하는 법원을 합의 관할법원으로 합니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>부칙</Text>
            <Text style={styles.text}>
              본 약관은 2025년 1월 1일부터 시행합니다.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>워시비 주식회사</Text>
            <Text style={styles.footerText}>경기도 용인시 수지구 포은대로 59번길 37 702호</Text>
            <Text style={styles.footerText}>이메일: sbro@sbrother.co.kr</Text>
          </View>
        </ScrollView>
      </View>
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  footer: {
    marginTop: 40,
    marginBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});