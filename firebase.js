// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';  // 일단 기본 getAuth 사용
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDPgnZ65UpVrUvgsw6UbzLJxxpx-4UPR4s",
  authDomain: "gunghabnote.firebaseapp.com",
  projectId: "gunghabnote",
  storageBucket: "gunghabnote.firebasestorage.app",
  messagingSenderId: "326295807676",
  appId: "1:326295807676:web:cca29b80fdc267ad5a52b9",
  measurementId: "G-FV50ME949G"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);  // 일단 기본으로
export const db = getFirestore(app);
export const storage = getStorage(app);