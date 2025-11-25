import 'react-native-gesture-handler';  // 👈 ⭐ 이 줄을 반드시 1번으로 넣으세요!
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);