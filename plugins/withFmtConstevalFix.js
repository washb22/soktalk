// plugins/withFmtConstevalFix.js
// Xcode 26 (Apple clang 21)에서 React Native 내장 fmt 라이브러리의 consteval 컴파일 에러 우회.
//
// 핵심 해법: fmt 팟만 C++17로 컴파일한다.
//   - C++17에는 consteval이 없으므로 fmt가 consteval 경로를 타지 않아 에러가 사라짐.
//   - 스코프를 'fmt' 타겟으로만 좁혀, 다른 팟(C++20 필요)은 영향 없음.
// 참고: facebook/react-native#55601, expo/expo#44229, fmtlib/fmt#4740
//       https://bleepingswift.com/blog/fmt-consteval-error-xcode-26-4-react-native
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'withFmtConstevalFix';
const FIX = `
  # ${MARKER}: Xcode 26 fmt consteval 우회 (fmt 팟만 C++17)
  installer.pods_project.targets.each do |fmt_fix_target|
    if fmt_fix_target.name == 'fmt'
      fmt_fix_target.build_configurations.each do |fmt_fix_config|
        fmt_fix_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        defs = Array(fmt_fix_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)'])
        defs << 'FMT_USE_CONSTEVAL=0' unless defs.include?('FMT_USE_CONSTEVAL=0')
        fmt_fix_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
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

      const anchor = 'post_install do |installer|';
      if (!contents.includes(anchor)) {
        throw new Error(
          `[${MARKER}] Podfile에서 "${anchor}" 를 찾지 못해 패치를 주입할 수 없습니다.`
        );
      }

      contents = contents.replace(anchor, `${anchor}\n${FIX}`);
      fs.writeFileSync(podfilePath, contents);
      console.log(`[${MARKER}] Podfile에 fmt C++17 패치를 주입했습니다.`);
      return config;
    },
  ]);
};
