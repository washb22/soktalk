// firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCjaY7osEpwz5Ehu7WI0fqEHkxfx6nR4H0",
  authDomain: "soktalk-3e359.firebaseapp.com",
  projectId: "soktalk-3e359",
  storageBucket: "soktalk-3e359.firebasestorage.app",
  messagingSenderId: "671138886263",
  appId: "1:671138886263:web:ba2ca48eb7d18e0f2fcc72",
  measurementId: "G-X22QMH14VP"
};

// 이미 초기화된 앱이 있으면 재사용, 없으면 새로 초기화
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth 초기화 (AsyncStorage persistence 추가)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);