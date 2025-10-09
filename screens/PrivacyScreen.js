// screens/PrivacyScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen({ navigation }) {
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
          <Text style={styles.headerTitle}>개인정보 처리방침</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.title}>개인정보 처리방침</Text>
          <Text style={styles.date}>시행일: 2025년 1월 1일</Text>

          <View style={styles.section}>
            <Text style={styles.text}>
              워시비 주식회사(이하 "회사")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제1조 개인정보의 처리 목적</Text>
            <Text style={styles.text}>
              회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.{'\n\n'}
              
              1. 회원 가입 및 관리{'\n'}
              - 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지 목적{'\n\n'}
              
              2. 재화 또는 서비스 제공{'\n'}
              - 게시판 서비스, 궁합 분석 서비스, 콘텐츠 제공, 맞춤 서비스 제공 목적{'\n\n'}
              
              3. 마케팅 및 광고에의 활용{'\n'}
              - 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공, 서비스의 유효성 확인, 접속빈도 파악 또는 회원의 서비스 이용에 대한 통계
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제2조 수집하는 개인정보의 항목</Text>
            <Text style={styles.text}>
              회사는 다음의 개인정보 항목을 처리하고 있습니다:{'\n\n'}
              
              1. 필수항목{'\n'}
              - 이메일 주소{'\n'}
              - 닉네임{'\n'}
              - 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보{'\n\n'}
              
              2. 선택항목 (궁합 분석 서비스 이용 시){'\n'}
              - 생년월일{'\n'}
              - 성별{'\n\n'}
              
              3. 소셜 로그인 이용 시{'\n'}
              - 구글: 이메일, 프로필 정보, 고유 ID
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제3조 개인정보의 처리 및 보유기간</Text>
            <Text style={styles.text}>
              1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.{'\n\n'}
              
              2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:{'\n'}
              - 회원 가입 및 관리: 회원 탈퇴 시까지{'\n'}
              - 재화 또는 서비스 제공: 재화·서비스 공급완료 및 요금결제·정산 완료 시까지{'\n'}
              - 다만, 관계법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지{'\n\n'}
              
              3. 관계법령에 의한 개인정보 보유:{'\n'}
              - 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률){'\n'}
              - 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률){'\n'}
              - 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률){'\n'}
              - 표시·광고에 관한 기록: 6개월 (전자상거래 등에서의 소비자보호에 관한 법률){'\n'}
              - 웹사이트 방문 기록: 3개월 (통신비밀보호법)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제4조 개인정보의 제3자 제공</Text>
            <Text style={styles.text}>
              회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제5조 개인정보처리의 위탁</Text>
            <Text style={styles.text}>
              1. 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:{'\n\n'}
              
              - 위탁받는 자: Google LLC (Firebase){'\n'}
              - 위탁하는 업무의 내용: 서버 호스팅, 데이터 저장 및 관리, 사용자 인증{'\n\n'}
              
              - 위탁받는 자: OpenAI{'\n'}
              - 위탁하는 업무의 내용: 궁합 분석 서비스 제공{'\n\n'}
              
              2. 회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제6조 정보주체의 권리·의무 및 행사방법</Text>
            <Text style={styles.text}>
              1. 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:{'\n'}
              - 개인정보 열람 요구{'\n'}
              - 오류 등이 있을 경우 정정 요구{'\n'}
              - 삭제 요구{'\n'}
              - 처리정지 요구{'\n\n'}
              
              2. 제1항에 따른 권리 행사는 회사에 대해 서면, 전화, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체없이 조치하겠습니다.{'\n\n'}
              
              3. 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제7조 개인정보의 파기</Text>
            <Text style={styles.text}>
              1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.{'\n\n'}
              
              2. 개인정보 파기의 절차 및 방법은 다음과 같습니다:{'\n'}
              - 파기절차: 불필요한 개인정보 및 개인정보파일은 개인정보책임자의 책임 하에 내부방침 절차에 따라 파기합니다.{'\n'}
              - 파기방법: 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 파기하며, 종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제8조 개인정보의 안전성 확보조치</Text>
            <Text style={styles.text}>
              회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:{'\n\n'}
              
              1. 관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육{'\n\n'}
              
              2. 기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 개인정보의 암호화, 보안프로그램 설치{'\n\n'}
              
              3. 물리적 조치: 전산실, 자료보관실 등의 접근통제
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제9조 개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항</Text>
            <Text style={styles.text}>
              1. 회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.{'\n\n'}
              
              2. 쿠키는 웹사이트를 운영하는데 이용되는 서버(http)가 이용자의 컴퓨터 브라우저에게 보내는 소량의 정보이며 이용자들의 PC 컴퓨터내의 하드디스크에 저장되기도 합니다.{'\n\n'}
              
              3. 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서, 이용자는 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제10조 개인정보 보호책임자</Text>
            <Text style={styles.text}>
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:{'\n\n'}
              
              ▶ 개인정보 보호책임자{'\n'}
              성명: 워시비 대표{'\n'}
              이메일: sbro@sbrother.co.kr{'\n\n'}
              
              ▶ 개인정보 보호 담당부서{'\n'}
              부서명: 운영팀{'\n'}
              이메일: sbro@sbrother.co.kr
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제11조 권익침해 구제방법</Text>
            <Text style={styles.text}>
              정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.{'\n\n'}
              
              ▶ 개인정보분쟁조정위원회: 1833-6972 (www.kopico.go.kr){'\n'}
              ▶ 개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr){'\n'}
              ▶ 대검찰청: (국번없이) 1301 (www.spo.go.kr){'\n'}
              ▶ 경찰청: (국번없이) 182 (ecrm.cyber.go.kr)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제12조 개인정보 처리방침의 변경</Text>
            <Text style={styles.text}>
              이 개인정보 처리방침은 2025년 1월 1일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>워시비 주식회사</Text>
            <Text style={styles.footerText}>경기도 용인시 수지구 포은대로 59번길 37 702호</Text>
            <Text style={styles.footerText}>이메일: sbro@sbrother.co.kr</Text>
            <Text style={styles.footerText}>공고일자: 2025년 1월 1일</Text>
            <Text style={styles.footerText}>시행일자: 2025년 1월 1일</Text>
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