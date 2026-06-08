// plugins/withFmtConstevalFix.js
// Xcode 26 (신형 Clang)에서 fmt 라이브러리의 consteval 컴파일 에러 우회.
// fmt에 FMT_USE_CONSTEVAL=0 을 정의하면 consteval 대신 일반 함수로 처리되어 빌드가 통과됨.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'withFmtConstevalFix';
const FIX = `
  # ${MARKER}: Xcode 26 fmt consteval 우회
  installer.pods_project.targets.each do |fmt_fix_target|
    fmt_fix_target.build_configurations.each do |fmt_fix_config|
      defs = Array(fmt_fix_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)'])
      unless defs.include?('FMT_USE_CONSTEVAL=0')
        defs << 'FMT_USE_CONSTEVAL=0'
      end
      fmt_fix_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
    end
  end
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes(MARKER)) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          (match) => `${match}\n${FIX}`
        );
        fs.writeFileSync(podfilePath, contents);
      }
      return config;
    },
  ]);
};
