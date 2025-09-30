// firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCjaY7osfewzSEhuJTRfqfGLkxfx6nRkH8",
  authDomain: "soktalk-3e359.firebaseapp.com",
  projectId: "soktalk-3e359",
  storageBucket: "soktalk-3e359.firebasestorage.app",
  messagingSenderId: "671138886263",
  appId: "1:671138886263:web:ba2ca48eb7d18e0f2fcc72",
  measurementId: "G-X2ZQMH14VP"
};

// 이미 초기화된 앱이 있으면 재사용, 없으면 새로 초기화
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);