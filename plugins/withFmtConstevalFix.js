// plugins/withFmtConstevalFix.js
// Xcode 26 (신형 Clang)에서 fmt 라이브러리의 consteval 컴파일 에러 우회.
// fmt에 FMT_USE_CONSTEVAL=0 을 정의하면 consteval 대신 일반 함수로 처리되어 빌드가 통과됨.
// 전처리기 정의 + C++ 플래그 양쪽에 주입(belt-and-suspenders).
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'withFmtConstevalFix';
const FIX = `
  # ${MARKER}: Xcode 26 fmt consteval 우회
  installer.pods_project.targets.each do |fmt_fix_target|
    fmt_fix_target.build_configurations.each do |fmt_fix_config|
      defs = Array(fmt_fix_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)'])
      defs << 'FMT_USE_CONSTEVAL=0' unless defs.include?('FMT_USE_CONSTEVAL=0')
      fmt_fix_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs

      cxxflags = Array(fmt_fix_config.build_settings['OTHER_CPLUSPLUSFLAGS'] || ['$(inherited)'])
      cxxflags << '-DFMT_USE_CONSTEVAL=0' unless cxxflags.include?('-DFMT_USE_CONSTEVAL=0')
      fmt_fix_config.build_settings['OTHER_CPLUSPLUSFLAGS'] = cxxflags
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
        // 주입 지점을 못 찾으면 조용히 넘어가지 말고 명시적으로 실패시킴
        throw new Error(
          `[${MARKER}] Podfile에서 "${anchor}" 를 찾지 못해 패치를 주입할 수 없습니다.`
        );
      }

      contents = contents.replace(anchor, `${anchor}\n${FIX}`);
      fs.writeFileSync(podfilePath, contents);
      console.log(`[${MARKER}] Podfile에 fmt consteval 우회 패치를 주입했습니다.`);
      return config;
    },
  ]);
};
