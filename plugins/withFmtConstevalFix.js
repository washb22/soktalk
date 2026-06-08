// plugins/withFmtConstevalFix.js
// Xcode 26 (Apple clang 21)에서 RN 내장 fmt 라이브러리의 consteval 컴파일 에러 우회.
//
// 해법: fmt 팟을 C++17로 컴파일 (+ FMT_USE_CONSTEVAL=0). C++17엔 consteval이 없어 에러가 사라짐.
// 핵심: 이 설정을 react_native_post_install(...) "뒤"에 주입해야 한다.
//       (앞에 두면 RN의 post_install이 C++ 표준을 다시 덮어써서 무효가 됨)
// 참고: facebook/react-native#55601, fmtlib/fmt#4740, bleepingswift.com fmt-consteval 가이드
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'withFmtConstevalFix';
const FIX = `
  # ${MARKER}: Xcode 26 fmt consteval 우회 — RN post_install 이후에 적용해야 유효
  installer.pods_project.targets.each do |fmt_fix_target|
    if fmt_fix_target.name == 'fmt'
      fmt_fix_target.build_configurations.each do |fmt_fix_config|
        fmt_fix_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        flags = Array(fmt_fix_config.build_settings['OTHER_CPLUSPLUSFLAGS'] || ['$(inherited)'])
        flags << '-std=c++17' unless flags.include?('-std=c++17')
        flags << '-DFMT_USE_CONSTEVAL=0' unless flags.include?('-DFMT_USE_CONSTEVAL=0')
        fmt_fix_config.build_settings['OTHER_CPLUSPLUSFLAGS'] = flags
      end
    end
  end
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(MARKER)) {
        return config; // 이미 주입됨
      }

      // 1순위: react_native_post_install(...) 호출 "뒤"에 주입 (RN이 덮어쓰지 못하게)
      const rnCall = /react_native_post_install\([^)]*\)/;
      if (rnCall.test(contents)) {
        contents = contents.replace(rnCall, (m) => `${m}\n${FIX}`);
      } else if (contents.includes('post_install do |installer|')) {
        // 차선책: post_install 블록 시작 직후
        contents = contents.replace(
          'post_install do |installer|',
          (m) => `${m}\n${FIX}`
        );
      } else {
        throw new Error(`[${MARKER}] Podfile에서 주입 지점을 찾지 못했습니다.`);
      }

      fs.writeFileSync(podfilePath, contents);
      console.log(`[${MARKER}] Podfile에 fmt C++17 패치를 주입했습니다 (RN post_install 이후).`);
      return config;
    },
  ]);
};
