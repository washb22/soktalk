import { initializeApp } from "firebase/app";
// 1. getAuth 대신 initializeAuth, getReactNativePersistence 추가
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// 2. AsyncStorage 임포트 (이게 없으면 에러 남!)
import AsyncStorage from "@react-native-async-storage/async-storage";

// 작형님의 Firebase 설정 (기존 것 그대로 두시면 됩니다)
const firebaseConfig = {
  apiKey: "AIzaSy...", // 기존 키 유지
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};

// 앱 초기화
const app = initializeApp(firebaseConfig);

// 🚨 여기가 핵심 수정 포인트! 🚨
// const auth = getAuth(app);  <-- (X) 웹 방식이라 에러 남
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

export { auth, db };